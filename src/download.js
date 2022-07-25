/* eslint-disable no-unused-vars */

"use strict";

const fs = require("fs");

const { SkynetClient } = require("./client");
const { DEFAULT_DOWNLOAD_OPTIONS, DEFAULT_DOWNLOAD_HNS_OPTIONS } = require("./defaults");
const { trimSiaPrefix } = require("./utils_string");

/**
 * Downloads in-memory data from a skylink.
 *
 * @param {string} skylink - The skylink.
 * @param {Object} [customOptions={}] - Configuration options.
 * @returns - The data.
 */
SkynetClient.prototype.downloadData = async function (skylink, customOptions = {}) {
  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  skylink = trimSiaPrefix(skylink);

  const response = await this.executeRequest({
    ...opts,
    method: "get",
    extraPath: skylink,
    responseType: "arraybuffer",
  });
  return response.data;
};

/**
 * Downloads a file from the given skylink.
 *
 * @param {string} path - The path to download the file to.
 * @param {Object} [customOptions] - Configuration options.
 * @param {Object} [customOptions.format] - The format (tar or zip) to download the file as.
 * @returns - The skylink.
 */
SkynetClient.prototype.downloadFile = function (path, skylink, customOptions = {}) {
  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  skylink = trimSiaPrefix(skylink);

  const writer = fs.createWriteStream(path);

  const params = buildDownloadParams(opts.format);

  return new Promise((resolve, reject) => {
    this.executeRequest({
      ...opts,
      method: "get",
      extraPath: skylink,
      responseType: "stream",
      params,
    })
      .then((response) => {
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * Downloads a file from the given HNS domain.
 *
 * @param {string} path - The path to download the file to.
 * @param {Object} [customOptions] - Configuration options.
 * @param {Object} [customOptions.format] - The format (tar or zip) to download the file as.
 * @returns - The skylink.
 */
SkynetClient.prototype.downloadFileHns = async function (path, domain, customOptions = {}) {
  const opts = { ...DEFAULT_DOWNLOAD_HNS_OPTIONS, ...this.customOptions, ...customOptions };

  const url = await this.getHnsUrl(domain);
  const params = buildDownloadParams(opts.format);

  const writer = fs.createWriteStream(path);

  await new Promise((resolve, reject) => {
    this.executeRequest({
      ...opts,
      method: "get",
      url: url,
      responseType: "stream",
      params,
    })
      .then((response) => {
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      })
      .catch((error) => {
        reject(error);
      });
  });

  return url;
};

function buildDownloadParams(format) {
  const params = {};
  if (format) {
    params.format = format;
  }
  return params;
}
