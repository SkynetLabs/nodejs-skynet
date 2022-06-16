"use strict";

const path = require("path");
const fs = require("fs");
const mime = require("mime/lite");
const urljoin = require("url-join");
const { sign } = require("tweetnacl");

const { URI_SKYNET_PREFIX, DEFAULT_SKYNET_PORTAL_URL } = require("skynet-js");
const { trimPrefix } = require("./utils_string");
const { validateString } = require("./validation");

/**
 * The default URL of the Skynet portal to use in the absence of configuration.
 */
const defaultSkynetPortalUrl = `${DEFAULT_SKYNET_PORTAL_URL}`;

/**
 * The URI prefix for Skynet.
 */
const uriSkynetPrefix = `${URI_SKYNET_PREFIX}`;

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
 * Extract only the model's custom options from the given options.
 *
 * @param opts - The given options.
 * @param model - The model options.
 * @returns - The extracted custom options.
 * @throws - If the given opts don't contain all properties of the model.
 */
function extractOptions(opts, model) {
  const result = {};
  for (const property in model) {
    /* istanbul ignore next */
    if (!Object.prototype.hasOwnProperty.call(model, property)) {
      continue;
    }
    // Throw if the given options don't contain the model's property.
    if (!Object.prototype.hasOwnProperty.call(opts, property)) {
      throw new Error(`Property '${property}' not found`);
    }
    result[property] = opts[property];
  }

  return result;
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

/**
 * Get the publicKey from privateKey.
 *
 * @param privateKey - The privateKey.
 * @returns - The publicKey.
 */
const getPublicKeyFromPrivateKey = function (privateKey) {
  const publicKey = Buffer.from(
    sign.keyPair.fromSecretKey(Uint8Array.from(Buffer.from(privateKey, "hex"))).publicKey
  ).toString("hex");
  return publicKey;
};

/**
 * Formats the skylink by adding the sia: prefix.
 *
 * @param skylink - The skylink.
 * @returns - The formatted skylink.
 */
const formatSkylink = function (skylink) {
  validateString("skylink", skylink, "parameter");

  if (skylink === "") {
    return skylink;
  }
  if (!skylink.startsWith(URI_SKYNET_PREFIX)) {
    skylink = `${URI_SKYNET_PREFIX}${skylink}`;
  }
  return skylink;
};

module.exports = {
  defaultSkynetPortalUrl,
  uriSkynetPrefix,
  defaultOptions,
  defaultPortalUrl,
  extractOptions,
  getFileMimeType,
  makeUrl,
  walkDirectory,
  getPublicKeyFromPrivateKey,
  formatSkylink,
};
