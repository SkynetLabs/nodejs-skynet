"use strict";

const path = require("path");
const fs = require("fs");

const mime = require("mime/lite");
const urljoin = require("url-join");

/**
 * The default URL of the Skynet portal to use in the absence of configuration.
 */
const defaultSkynetPortalUrl = "https://siasky.net";

/**
 * The URI prefix for Skynet.
 */
const uriSkynetPrefix = "sia://";

function defaultOptions(endpointPath) {
  return {
    portalUrl: defaultPortalUrl(),
    endpointPath: endpointPath,

    APIKey: "",
    skynetApiKey: "",
    customUserAgent: "",
  };
}

/**
 * Selects the default portal URL to use when initializing a client. May involve network queries to several candidate portals.
 */
function defaultPortalUrl() {
  return defaultSkynetPortalUrl;
}

/**
 * Get the file mime type. Try to guess the file type based on the extension.
 *
 * @param filename - The filename.
 * @returns - The mime type.
 */
function getFileMimeType(filename) {
  let ext = path.extname(filename);
  ext = trimPrefix(ext, ".");
  if (ext !== "") {
    const mimeType = mime.getType(ext);
    if (mimeType) {
      return mimeType;
    }
  }
  return "";
}

/**
 * Properly joins paths together to create a URL. Takes a variable number of
 * arguments.
 */
function makeUrl() {
  let args = Array.from(arguments);
  return args.reduce(function (acc, cur) {
    return urljoin(acc, cur);
  });
}

/**
 * Removes a prefix from the beginning of the string.
 *
 * @param str - The string to process.
 * @param prefix - The prefix to remove.
 * @param [limit] - Maximum amount of times to trim. No limit by default.
 * @returns - The processed string.
 */
function trimPrefix(str, prefix, limit) {
  if (typeof limit !== "number" && typeof limit !== "undefined") {
    throw new Error(`Invalid input: 'limit' must be type 'number | undefined', was '${typeof limit}'`);
  }

  while (str.startsWith(prefix)) {
    if (limit !== undefined && limit <= 0) {
      break;
    }
    str = str.slice(prefix.length);
    if (limit) {
      limit -= 1;
    }
  }
  return str;
}

function walkDirectory(filepath, out) {
  let files = [];
  if (!fs.existsSync(filepath)) {
    return files;
  }

  for (const subpath of fs.readdirSync(filepath)) {
    const fullpath = path.join(filepath, subpath);
    if (fs.statSync(fullpath).isDirectory()) {
      files = files.concat(walkDirectory(fullpath, out));
      continue;
    }
    files.push(fullpath);
  }
  return files;
}

function trimSiaPrefix(str) {
  return trimPrefix(str, uriSkynetPrefix);
}

module.exports = {
  defaultOptions,
  defaultPortalUrl,
  defaultSkynetPortalUrl,
  getFileMimeType,
  makeUrl,
  trimSiaPrefix,
  uriSkynetPrefix,
  walkDirectory,
};
