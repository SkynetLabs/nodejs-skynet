"use strict";

const { fromByteArray, toByteArray } = require("base64-js");
const base32Decode = require("base32-decode");
const base32Encode = require("base32-encode");

const { URI_SKYNET_PREFIX } = require("skynet-js");
const {
  RAW_SKYLINK_SIZE,
  BASE32_ENCODED_SKYLINK_SIZE,
  BASE64_ENCODED_SKYLINK_SIZE,
  ERR_SKYLINK_INCORRECT_SIZE,
} = require("./skylink_sia");
const { trimUriPrefix } = require("./utils_string");
const { validateStringLen } = require("./utils_validation");

const BASE32_ENCODING_VARIANT = "RFC4648-HEX";

/**
 * Decodes the skylink encoded using base32 encoding to bytes.
 *
 * @param skylink - The encoded skylink.
 * @returns - The decoded bytes.
 */
const decodeSkylinkBase32 = function (skylink) {
  validateStringLen("skylink", skylink, "parameter", BASE32_ENCODED_SKYLINK_SIZE);
  skylink = skylink.toUpperCase();
  const bytes = base32Decode(skylink, BASE32_ENCODING_VARIANT);
  return new Uint8Array(bytes);
};

/**
 * Encodes the bytes to a skylink encoded using base32 encoding.
 *
 * @param bytes - The bytes to encode.
 * @returns - The encoded skylink.
 */
const encodeSkylinkBase32 = function (bytes) {
  return base32Encode(bytes, BASE32_ENCODING_VARIANT, { padding: false }).toLowerCase();
};

/**
 * Decodes the skylink encoded using base64 raw URL encoding to bytes.
 *
 * @param skylink - The encoded skylink.
 * @returns - The decoded bytes.
 */
function decodeSkylinkBase64(skylink) {
  // Check if Skylink is 46 bytes long.
  if (skylink.length !== BASE64_ENCODED_SKYLINK_SIZE) {
    throw new Error("Skylink is not 46 bytes long.");
  }
  // Add padding.
  skylink = `${skylink}==`;
  // Convert from URL encoding.
  skylink = skylink.replace(/-/g, "+").replace(/_/g, "/");
  return toByteArray(skylink);
}

/**
 * Encodes the bytes to a skylink encoded using base64 raw URL encoding.
 *
 * @param bytes - The bytes to encode.
 * @returns - The encoded skylink.
 */
const encodeSkylinkBase64 = function (bytes) {
  let base64 = fromByteArray(bytes);
  // Convert to URL encoding.
  base64 = base64.replace(/\+/g, "-").replace(/\//g, "_");
  // Remove trailing "==". This will always be present as the skylink encoding
  // gets padded so that the string is a multiple of 4 characters in length.
  return base64.slice(0, -2);
};

/**
 * A helper function that decodes the given string representation of a skylink
 * into raw bytes. It either performs a base32 decoding, or base64 decoding,
 * depending on the length.
 *
 * @param encoded - The encoded string.
 * @returns - The decoded raw bytes.
 * @throws - Will throw if the skylink is not a V1 or V2 skylink string.
 */
const decodeSkylink = function (encoded) {
  encoded = trimUriPrefix(encoded, URI_SKYNET_PREFIX);

  let bytes;
  if (encoded.length === BASE32_ENCODED_SKYLINK_SIZE) {
    bytes = decodeSkylinkBase32(encoded);
  } else if (encoded.length === BASE64_ENCODED_SKYLINK_SIZE) {
    bytes = decodeSkylinkBase64(encoded);
  } else {
    throw new Error(ERR_SKYLINK_INCORRECT_SIZE);
  }

  // Sanity check the size of the given data.
  if (bytes.length != RAW_SKYLINK_SIZE) {
    throw new Error("failed to load skylink data");
  }

  return bytes;
};

module.exports = {
  decodeSkylinkBase32,
  encodeSkylinkBase32,
  decodeSkylinkBase64,
  encodeSkylinkBase64,
  decodeSkylink,
};
