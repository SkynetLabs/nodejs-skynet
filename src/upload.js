"use strict";

const FormData = require("form-data");
const fs = require("fs");
const p = require("path");

const { Upload } = require("tus-js-client");

const { buildRequestHeaders, SkynetClient } = require("./client");
const { DEFAULT_UPLOAD_OPTIONS, TUS_CHUNK_SIZE } = require("./defaults");
const { getFileMimeType, makeUrl, walkDirectory, uriSkynetPrefix } = require("./utils");

/**
 * Uploads in-memory data to Skynet.
 *
 * @param {string|Buffer} data - The data to upload, either a string or raw bytes.
 * @param {string} filename - The filename to use on Skynet.
 * @param {Object} [customOptions={}] - Configuration options.
 * @returns - The skylink.
 */
SkynetClient.prototype.uploadData = async function (data, filename, customOptions = {}) {
  const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  const sizeInBytes = data.length;

  if (sizeInBytes < opts.largeFileSize) {
    return await uploadSmallFile(this, data, filename, opts);
  }
  return await uploadLargeFile(this, data, filename, sizeInBytes, opts);
};

SkynetClient.prototype.uploadFile = async function (path, customOptions = {}) {
  const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  const stat = await fs.promises.stat(path);
  const sizeInBytes = stat.size;
  const filename = opts.customFilename ? opts.customFilename : p.basename(path);
  const stream = fs.createReadStream(path);

  if (sizeInBytes < opts.largeFileSize) {
    return await uploadSmallFile(this, stream, filename, opts);
  }
  return await uploadLargeFile(this, stream, filename, sizeInBytes, opts);
};

async function uploadSmallFile(client, stream, filename, opts) {
  const params = {};
  if (opts.dryRun) params.dryrun = true;

  const formData = new FormData();
  formData.append(opts.portalFileFieldname, stream, filename);
  const headers = formData.getHeaders();
  console.log(headers);

  const response = await client.executeRequest({
    ...opts,
    method: "post",
    data: formData,
    headers,
    params,
  });

  const skylink = response.data.skylink;
  return `${uriSkynetPrefix}${skylink}`;
}

async function uploadLargeFile(client, stream, filename, filesize, opts) {
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

    const upload = new Upload(stream, tusOpts);
    upload.start();
  });
}

SkynetClient.prototype.uploadDirectory = async function (path, customOptions = {}) {
  const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  // Check if there is a directory at given path.
  const stat = await fs.promises.stat(path);
  if (!stat.isDirectory()) {
    throw new Error(`Given path is not a directory: ${path}`);
  }

  const formData = new FormData();
  path = p.resolve(path);
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

  // Use either the custom dirname, or the last portion of the path.
  let filename = opts.customDirname || p.basename(path);
  if (filename.startsWith("/")) {
    filename = filename.slice(1);
  }
  const params = { filename };
  if (opts.tryFiles) {
    params.tryfiles = JSON.stringify(opts.tryFiles);
  }
  if (opts.errorPages) {
    params.errorpages = JSON.stringify(opts.errorPages);
  }

  if (opts.dryRun) params.dryrun = true;

  const response = await this.executeRequest({
    ...opts,
    method: "post",
    data: formData,
    headers: formData.getHeaders(),
    params,
  });

  return `${uriSkynetPrefix}${response.data.skylink}`;
};
