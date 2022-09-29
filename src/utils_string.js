"use strict";

const { uriSkynetPrefix } = require("skynet-js");
const { validateHexString, validationError } = require("./utils_validation");

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

function trimSiaPrefix(str) {
  return trimPrefix(str, uriSkynetPrefix);
}

/**
 * Converts a hex encoded string to a uint8 array.
 *
 * @param str - The string to convert.
 * @returns - The uint8 array.
 * @throws - Will throw if the input is not a valid hex-encoded string or is an empty string.
 */
const hexToUint8Array = function (str) {
  validateHexString("str", str, "parameter");

  const matches = str.match(/.{1,2}/g);
  if (matches === null) {
    throw validationError("str", str, "parameter", "a hex-encoded string");
  }

  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
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

module.exports = {
  trimPrefix,
  trimSuffix,
  trimForwardSlash,
  trimUriPrefix,
  trimSiaPrefix,
  hexToUint8Array,
  toHexString,
};
