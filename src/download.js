/* eslint-disable no-unused-vars */

"use strict";

const fs = require("fs");

const { trimSiaPrefix } = require("./utils");
const { SkynetClient } = require("./client");
const { DEFAULT_DOWNLOAD_OPTIONS } = require("./defaults");

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
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
