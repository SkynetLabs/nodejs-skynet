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
const DEFAULT_TUS_RETRY_DELAYS = [0, 5000, 15000, 60000, 300000, 600000];

const defaultUploadOptions = {
  ...defaultOptions("/skynet/skyfile"),
  endpointLargeUpload: "/skynet/tus",

  portalFileFieldname: "file",
  portalDirectoryFileFieldname: "files[]",
  customFilename: "",
  customDirname: "",
  dryRun: false,
  errorPages: undefined,
  largeFileSize: TUS_CHUNK_SIZE,
  retryDelays: DEFAULT_TUS_RETRY_DELAYS,
  tryFiles: undefined,
};

const nodejs_db_setJSON = async function (privateKey, dataKey, data, customOptions = {}) {
    const opts = { ...defaultUploadOptions, ...this.customOptions, ...customOptions };
    const SkydbFormatedData = '{"_data":' + JSON.stringify(data) + ',"_v":2}';

    const params = {};
    if (opts.dryRun) params.dryrun = true;

    const formData = new FormData();
    formData.append(opts.portalFileFieldname, SkydbFormatedData, dataKey);

    const response = await this.executeRequest({
        ...opts,
        method: "post",
        data: formData,
        headers: formData.getHeaders(),
        params,
    });
    const skylink = response.data.skylink;
    this.db.setDataLink(privateKey, dataKey, skylink)

    return `${uriSkynetPrefix}${skylink}`;
};

module.exports = { nodejs_db_setJSON };














