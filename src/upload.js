"use strict";

const FormData = require("form-data");
const fs = require("fs");
const p = require("path");

const { Upload } = require("tus-js-client");

const { buildRequestHeaders, SkynetClient } = require("./client");
const { defaultOptions, getFileMimeType, makeUrl, walkDirectory, uriSkynetPrefix } = require("./utils");

/**
 * The tus chunk size is (4MiB - encryptionOverhead) * dataPieces, set in skyd.
 */
const TUS_CHUNK_SIZE = (1 << 22) * 10;

/**
 * The retry delays, in ms. Data is stored in skyd for up to 20 minutes, so the
 * total delays should not exceed that length of time.
 */
const DEFAULT_TUS_RETRY_DELAYS = [0, 5_000, 15_000, 60_000, 300_000, 600_000];

const defaultUploadOptions = {
  ...defaultOptions("/skynet/skyfile"),
  endpointLargeUpload: "/skynet/tus",

  portalFileFieldname: "file",
  portalDirectoryFileFieldname: "files[]",
  customFilename: "",
  customDirname: "",
  dryRun: false,
  largeFileSize: TUS_CHUNK_SIZE,
  retryDelays: DEFAULT_TUS_RETRY_DELAYS,
};

SkynetClient.prototype.uploadFile = async function (path, customOptions = {}) {
  const opts = { ...defaultUploadOptions, ...this.customOptions, ...customOptions };

  const sizeInBytes = fs.statSync(path).size;
  const filename = opts.customFilename ? opts.customFilename : p.basename(path);

  if (sizeInBytes < opts.largeFileSize) {
    return await uploadSmallFile(this, path, filename, opts);
  } else {
    return await uploadLargeFile(this, path, filename, sizeInBytes, opts);
  }
};

async function uploadSmallFile(client, path, filename, opts) {
  const params = {};
  if (opts.dryRun) params.dryrun = true;

  const formData = new FormData();
  formData.append(opts.portalFileFieldname, fs.createReadStream(path), filename);

  const response = await client.executeRequest({
    ...opts,
    method: "post",
    data: formData,
    headers: formData.getHeaders(),
    params,
  });

  const skylink = response.data.skylink;
  return `${uriSkynetPrefix}${skylink}`;
}

async function uploadLargeFile(client, path, filename, filesize, opts) {
  const url = makeUrl(opts.portalUrl, opts.endpointLargeUpload);

  // Build headers.
  const headers = buildRequestHeaders({}, opts.customUserAgent, opts.customCookie);

  return new Promise((resolve, reject) => {
    const tusOpts = {
      endpoint: url,
      chunkSize: TUS_CHUNK_SIZE,
      retryDelays: opts.retryDelays,
      metadata: {
        filename,
        filetype: getFileMimeType(filename),
      },
      uploadSize: filesize,
      headers,
      onError: (error) => {
        // Return error body rather than entire error.
        const res = error.originalResponse;
        const newError = res ? new Error(res.getBody().trim()) || error : error;
        reject(newError);
      },
      onSuccess: async () => {
        if (!upload.url) {
          reject(new Error("'upload.url' was not set"));
          return;
        }

        // Call HEAD to get the metadata, including the skylink.
        const resp = await client.executeRequest({
          ...opts,
          url: upload.url,
          endpointPath: opts.endpointLargeUpload,
          method: "head",
          headers: { ...headers, "Tus-Resumable": "1.0.0" },
        });
        const skylink = resp.headers["skynet-skylink"];
        resolve(`${uriSkynetPrefix}${skylink}`);
      },
    };

    const upload = new Upload(fs.createReadStream(path), tusOpts);
    upload.start();
  });
}

SkynetClient.prototype.uploadDirectory = async function (path, customOptions = {}) {
  const opts = { ...defaultUploadOptions, ...this.customOptions, ...customOptions };

  // Check if there is a directory at given path.
  const stat = fs.statSync(path);
  if (!stat.isDirectory()) {
    throw new Error(`Given path is not a directory: ${path}`);
  }

  const formData = new FormData();
  path = p.normalize(path);
  let basepath = path;
  // Ensure the basepath ends in a slash.
  if (!basepath.endsWith("/")) {
    basepath += "/";
    // Normalize the slash on non-Unix filesystems.
    basepath = p.normalize(basepath);
  }

  for (const file of walkDirectory(path)) {
    // Remove the dir path from the start of the filename if it exists.
    let filename = file;
    if (file.startsWith(basepath)) {
      filename = file.replace(basepath, "");
    }
    formData.append(opts.portalDirectoryFileFieldname, fs.createReadStream(file), { filepath: filename });
  }

  let filename = opts.customDirname || path;
  if (filename.startsWith("/")) {
    filename = filename.slice(1);
  }
  const params = { filename };

  if (opts.dryRun) params.dryrun = true;

  const response = await this.executeRequest({
    ...opts,
    method: "post",
    data: formData,
    headers: formData.getHeaders(),
    params: params,
  });

  return `${uriSkynetPrefix}${response.data.skylink}`;
};
