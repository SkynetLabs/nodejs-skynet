"use strict";

/**
 * The raw size in bytes of the data that gets put into a link.
 */
const RAW_SKYLINK_SIZE = 34;

/**
 * The string length of the Skylink after it has been encoded using base32.
 */
const BASE32_ENCODED_SKYLINK_SIZE = 55;

/**
 * The string length of the Skylink after it has been encoded using base64.
 */
const BASE64_ENCODED_SKYLINK_SIZE = 46;

/**
 * Returned when a string could not be decoded into a Skylink due to it having
 * an incorrect size.
 */
const ERR_SKYLINK_INCORRECT_SIZE = "skylink has incorrect size";

module.exports = {
  RAW_SKYLINK_SIZE,
  BASE32_ENCODED_SKYLINK_SIZE,
  BASE64_ENCODED_SKYLINK_SIZE,
  ERR_SKYLINK_INCORRECT_SIZE,
};
