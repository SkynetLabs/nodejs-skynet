"use strict";
const { defaultOptions } = require("./utils");
const { sign } = require("tweetnacl");
const { toByteArray } = require("base64-js");

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const defaultBaseOptions = {
  APIKey: "",
  skynetApiKey: "",
  customUserAgent: "",
  customCookie: "",
  onDownloadProgress: undefined,
  onUploadProgress: undefined,
  loginFn: undefined,
};

const defaultGetEntryOptions = {
  ...defaultBaseOptions,
  endpointGetEntry: "/skynet/registry",
  hashedDataKeyHex: false,
};

const defaultSetEntryOptions = {
  ...defaultBaseOptions,
  endpointSetEntry: "/skynet/registry",
  hashedDataKeyHex: false,
};

const defaultSkydbOptions = {
  ...defaultOptions("/skynet/skyfile"),
  portalFileFieldname: "file",
};

const json_response_version = 2;

/**
 * Sets the hidden _data and _v fields on the given raw JSON data.
 *
 * @param data - The given JSON data.
 * @returns - The Skynet JSON data.
 */
const buildSkynetJsonObject = async function (data) {
  return { _data: data, _v: json_response_version };
};

const getPublicKeyfromPrivateKey = function (privateKey) {
  const publicKey = Buffer.from(
    sign.keyPair.fromSecretKey(Uint8Array.from(Buffer.from(privateKey, "hex"))).publicKey
  ).toString("hex");
  return publicKey;
};

/**
 * The string length of the Skylink after it has been encoded using base64.
 */
const base64_encoded_skylink_size = 46;

/**
 * The raw size in bytes of the data that gets put into a link.
 */
const raw_skylink_size = 34;

/**
 * Decodes the skylink encoded using base64 raw URL encoding to bytes.
 *
 * @param skylink - The encoded skylink.
 * @returns - The decoded bytes.
 */
function decodeSkylinkBase64(skylink) {
  // Check if Skylink is 46 bytes long.
  if (skylink.length !== base64_encoded_skylink_size) {
    throw new Error("Skylink is not 46 bytes long.");
  }
  // Add padding.
  skylink = `${skylink}==`;
  // Convert from URL encoding.
  skylink = skylink.replace(/-/g, "+").replace(/_/g, "/");
  return toByteArray(skylink);
}

/**
 * The maximum allowed value for an entry revision. Setting an entry revision to this value prevents it from being updated further.
 */
const max_revision = BigInt("18446744073709551615");

module.exports = {
  defaultOptions,
  defaultBaseOptions,
  defaultGetEntryOptions,
  defaultSetEntryOptions,
  defaultSkydbOptions,
  json_response_version,
  buildSkynetJsonObject,
  max_revision,
  getPublicKeyfromPrivateKey,
  base64_encoded_skylink_size,
  raw_skylink_size,
  decodeSkylinkBase64,
};
