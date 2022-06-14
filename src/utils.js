"use strict";

const path = require("path");
const fs = require("fs");

const mime = require("mime/lite");
const urljoin = require("url-join");

const { sign } = require("tweetnacl");
//const { toByteArray } = require("base64-js");
const parse = require("url-parse");
//const base32Decode = require("base32-decode");

const { parseSkylink } = require("skynet-js");

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
 * Removes a suffix from the end of the string.
 *
 * @param str - The string to process.
 * @param suffix - The suffix to remove.
 * @param [limit] - Maximum amount of times to trim. No limit by default.
 * @returns - The processed string.
 */
const trimSuffix = function (str, suffix, limit) {
  while (str.endsWith(suffix)) {
    if (limit !== undefined && limit <= 0) {
      break;
    }
    str = str.substring(0, str.length - suffix.length);
    if (limit) {
      limit -= 1;
    }
  }
  return str;
};

/**
 * Removes slashes from the beginning and end of the string.
 *
 * @param str - The string to process.
 * @returns - The processed string.
 */
const trimForwardSlash = function (str) {
  return trimPrefix(trimSuffix(str, "/"), "/");
};
/**
 * Extracts the non-skylink part of the path from the url.
 *
 * @param url - The input URL.
 * @param skylink - The skylink to remove, if it is present.
 * @returns - The non-skylink part of the path.
 */
const extractNonSkylinkPath = function (url, skylink) {
  const parsed = parse(url, {});
  let path = parsed.pathname.replace(skylink, ""); // Remove skylink to get the path.
  // Ensure there are no leading or trailing slashes.
  path = trimForwardSlash(path);
  // Add back the slash, unless there is no path.
  if (path !== "") {
    path = `/${path}`;
  }
  return path;
};
/**
 * Convert a byte array to a hex string.
 *
 * @param byteArray - The byte array to convert.
 * @returns - The hex string.
 * @see {@link https://stackoverflow.com/a/44608819|Stack Overflow}
 */
const toHexString = function (byteArray) {
  let s = "";
  byteArray.forEach(function (byte) {
    s += ("0" + (byte & 0xff).toString(16)).slice(-2);
  });
  return s;
};

/**
 * Removes a URI prefix from the beginning of the string.
 *
 * @param str - The string to process.
 * @param prefix - The prefix to remove. Should contain double slashes, e.g. sia://.
 * @returns - The processed string.
 */
const trimUriPrefix = function (str, prefix) {
  const longPrefix = prefix.toLowerCase();
  const shortPrefix = trimSuffix(longPrefix, "/");
  // Make sure the trimming is case-insensitive.
  const strLower = str.toLowerCase();
  if (strLower.startsWith(longPrefix)) {
    // longPrefix is exactly at the beginning
    return str.slice(longPrefix.length);
  }
  if (strLower.startsWith(shortPrefix)) {
    // else shortPrefix is exactly at the beginning
    return str.slice(shortPrefix.length);
  }
  return str;
};

/**
 * Returns an error for the given value
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param expected - The expected aspect of the value that could not be validated (e.g. "type 'string'" or "non-null").
 * @returns - The validation error.
 */
const validationError = function (name, value, valueKind, expected) {
  let actualValue;
  if (value === undefined) {
    actualValue = "type 'undefined'";
  } else if (value === null) {
    actualValue = "type 'null'";
  } else {
    actualValue = `type '${typeof value}', value '${value}'`;
  }
  return new Error(`Expected ${valueKind} '${name}' to be ${expected}, was ${actualValue}`);
};

/**
 * Throws an error for the given value
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param expected - The expected aspect of the value that could not be validated (e.g. "type 'string'" or "non-null").
 * @throws - Will always throw.
 */
const throwValidationError = function (name, value, valueKind, expected) {
  throw validationError(name, value, valueKind, expected);
};

/**
 * Validates the given value as a string.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid string.
 */
const validateString = function (name, value, valueKind) {
  if (typeof value !== "string") {
    throwValidationError(name, value, valueKind, "type 'string'");
  }
};

/**
 * Validates the given value as a skylink string.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @returns - The validated and parsed skylink.
 * @throws - Will throw if not a valid skylink string.
 */
const validateSkylinkString = function (name, value, valueKind) {
  validateString(name, value, valueKind);

  const parsedSkylink = parseSkylink(value);
  if (parsedSkylink === null) {
    throw validationError(name, value, valueKind, `valid skylink of type 'string'`);
  }

  return parsedSkylink;
};

/**
 * Checks whether the raw data link matches the cached data link, if provided.
 *
 * @param rawDataLink - The raw, unformatted data link.
 * @param cachedDataLink - The cached data link, if provided.
 * @returns - Whether the cached data link is a match.
 * @throws - Will throw if the given cached data link is not a valid skylink.
 */
const checkCachedDataLink = function (rawDataLink, cachedDataLink) {
  if (cachedDataLink) {
    cachedDataLink = validateSkylinkString("cachedDataLink", cachedDataLink, "optional parameter");
    return rawDataLink === cachedDataLink;
  }
  return false;
};

module.exports = {
  defaultOptions,
  defaultPortalUrl,
  defaultSkynetPortalUrl,
  extractOptions,
  getFileMimeType,
  makeUrl,
  trimSiaPrefix,
  trimPrefix,
  uriSkynetPrefix,
  walkDirectory,
  getPublicKeyFromPrivateKey,
  trimSuffix,
  trimForwardSlash,
  extractNonSkylinkPath,
  toHexString,
  trimUriPrefix,
  checkCachedDataLink,
  validateString,
  throwValidationError,
};
