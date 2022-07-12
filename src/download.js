/* eslint-disable no-unused-vars */

"use strict";

const fs = require("fs");

const { SkynetClient } = require("./client");
const { onDownloadProgress } = require("./utils");
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

SkynetClient.prototype.downloadFile = function (path, skylink, customOptions = {}) {
  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  skylink = trimSiaPrefix(skylink);

  const writer = fs.createWriteStream(path);

  return new Promise((resolve, reject) => {
    this.executeRequest({
      ...opts,
      method: "get",
      extraPath: skylink,
      responseType: "stream",
    })
      .then((response) => {
        onDownloadProgress(response, opts);
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

SkynetClient.prototype.downloadFileHns = async function (path, domain, customOptions = {}) {
  const opts = { ...DEFAULT_DOWNLOAD_HNS_OPTIONS, ...this.customOptions, ...customOptions };

  const url = await this.getHnsUrl(domain);

  const writer = fs.createWriteStream(path);

  new Promise((resolve, reject) => {
    this.executeRequest({
      ...opts,
      method: "get",
      url: url,
      responseType: "stream",
    })
      .then((response) => {
        onDownloadProgress(response, opts);
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
