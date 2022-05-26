"use strict";
const FormData = require("form-data");
const { defaultOptions } = require("./utils");
const { sign } = require("tweetnacl");
const { toByteArray } = require("base64-js");
const { MAX_REVISION } = require("skynet-js");

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const DEFAULT_BASE_OPTIONS = {
  APIKey: "",
  skynetApiKey: "",
  customUserAgent: "",
  customCookie: "",
  onDownloadProgress: undefined,
  onUploadProgress: undefined,
  loginFn: undefined,
};

const DEFAULT_GET_ENTRY_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  endpointGetEntry: "/skynet/registry",
};

const DEFAULT_SET_ENTRY_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  endpointSetEntry: "/skynet/registry",
};

const DEFAULT_SKYDB_OPTIONS = {
  ...defaultOptions("/skynet/skyfile"),
  portalFileFieldname: "file",
};

/**
 * URI_SKYNET_PREFIX.
 */
const URI_SKYNET_PREFIX = "sia://";

const JSON_RESPONSE_VERSION = 2;

/**
 * Sets the hidden _data and _v fields on the given raw JSON data.
 *
 * @param data - The given JSON data.
 * @returns - The Skynet JSON data.
 */
const buildSkynetJsonObject = function (data) {
  return { _data: data, _v: JSON_RESPONSE_VERSION };
};

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
 * The string length of the Skylink after it has been encoded using base64.
 */
const BASE64_ENCODED_SKYLINK_SIZE = 46;

/**
 * The raw size in bytes of the data that gets put into a link.
 */
const RAW_SKYLINK_SIZE = 34;

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
 * Formats the skylink by adding the sia: prefix.
 *
 * @param skylink - The skylink.
 * @returns - The formatted skylink.
 */
function formatSkylink(skylink) {
  //validateString("skylink", skylink, "parameter");
  if (typeof skylink !== "string") {
    throw new Error("skylink is not a sting.");
  }

  if (skylink === "") {
    return skylink;
  }
  if (!skylink.startsWith(URI_SKYNET_PREFIX)) {
    skylink = `${URI_SKYNET_PREFIX}${skylink}`;
  }
  return skylink;
}

/**
 * Uploads only jsonData from in-memory to Skynet for SkyDB V1 and V2.
 *
 * @param {string|Buffer} data - The data to upload, either a string or raw bytes.
 * @param {string} filename - The filename to use on Skynet.
 * @param {Object} [customOptions={}] - Configuration options.
 * @returns - The skylink and shortSkylink is a trimUriPrefix from skylink
 */
const uploadJsonData = async function (client, fullData, dataKey, customOptions = {}) {
  const opts = { ...DEFAULT_SKYDB_OPTIONS, ...client.customOptions, ...customOptions };

  // uploads in-memory data to skynet
  const params = {};
  if (opts.dryRun) params.dryrun = true;

  const formData = new FormData();
  formData.append(opts.portalFileFieldname, fullData, dataKey);

  const response = await client.executeRequest({
    ...opts,
    method: "post",
    data: formData,
    headers: formData.getHeaders(),
    params,
  });

  // shortSkylink is a trimUriPrefix from skylink
  const shortSkylink = response.data.skylink;
  const skylink = URI_SKYNET_PREFIX + shortSkylink;

  return { skylink: formatSkylink(skylink), shortSkylink: shortSkylink };
};

module.exports = {
  MAX_REVISION,
  DEFAULT_BASE_OPTIONS,
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  DEFAULT_SKYDB_OPTIONS,
  URI_SKYNET_PREFIX,
  JSON_RESPONSE_VERSION,
  buildSkynetJsonObject,
  getPublicKeyFromPrivateKey,
  BASE64_ENCODED_SKYLINK_SIZE,
  RAW_SKYLINK_SIZE,
  decodeSkylinkBase64,
  formatSkylink,
  uploadJsonData,
};
