"use strict";

const { sign } = require("tweetnacl");
const { toByteArray } = require("base64-js");
const { MAX_REVISION } = require("skynet-js");

const { defaultOptions } = require("./utils");

BigInt.prototype.toJSON = function () {
  return this.toString();
};

/**
 * The tus chunk size is (4MiB - encryptionOverhead) * dataPieces, set in skyd.
 */
const TUS_CHUNK_SIZE = (1 << 22) * 10;

/**
 * The retry delays, in ms. Data is stored in skyd for up to 20 minutes, so the
 * total delays should not exceed that length of time.
 */
const DEFAULT_TUS_RETRY_DELAYS = [0, 5000, 15000, 60000, 300000, 600000];

const DEFAULT_BASE_OPTIONS = {
  APIKey: "",
  skynetApiKey: "",
  customUserAgent: "",
  customCookie: "",
  onDownloadProgress: undefined,
  onUploadProgress: undefined,
  loginFn: undefined,
};

const DEFAULT_DOWNLOAD_OPTIONS = {
  ...defaultOptions("/"),
};

const DEFAULT_GET_METADATA_OPTIONS = {
  ...defaultOptions("/"),
};

const DEFAULT_UPLOAD_OPTIONS = {
  ...defaultOptions("/skynet/skyfile"),
  endpointLargeUpload: "/skynet/tus",

  portalFileFieldname: "file",
  portalDirectoryFileFieldname: "files[]",
  customFilename: "",
  customDirname: "",
  dryRun: false,
  errorPages: undefined,
  largeFileSize: TUS_CHUNK_SIZE,
  retryDelays: DEFAULT_TUS_RETRY_DELAYS,
  tryFiles: undefined,
};

const DEFAULT_GET_ENTRY_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  endpointGetEntry: "/skynet/registry",
};

const DEFAULT_SET_ENTRY_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  endpointSetEntry: "/skynet/registry",
};

/**
 * The default options for get JSON. Includes the default get entry and download
 * options.
 */
const DEFAULT_GET_JSON_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  ...DEFAULT_GET_ENTRY_OPTIONS,
  ...DEFAULT_DOWNLOAD_OPTIONS,
  endpointPath: "/skynet/skyfile",
  cachedDataLink: undefined,
};

/**
 * The default options for set JSON. Includes the default upload, get JSON, and
 * set entry options.
 */
const DEFAULT_SET_JSON_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  ...DEFAULT_UPLOAD_OPTIONS,
  ...DEFAULT_GET_JSON_OPTIONS,
  ...DEFAULT_SET_ENTRY_OPTIONS,
  endpointPath: "/skynet/skyfile",
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

module.exports = {
  MAX_REVISION,
  DEFAULT_BASE_OPTIONS,
  DEFAULT_DOWNLOAD_OPTIONS,
  DEFAULT_GET_METADATA_OPTIONS,
  DEFAULT_UPLOAD_OPTIONS,
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  DEFAULT_GET_JSON_OPTIONS,
  DEFAULT_SET_JSON_OPTIONS,
  URI_SKYNET_PREFIX,
  JSON_RESPONSE_VERSION,
  buildSkynetJsonObject,
  getPublicKeyFromPrivateKey,
  BASE64_ENCODED_SKYLINK_SIZE,
  RAW_SKYLINK_SIZE,
  decodeSkylinkBase64,
  formatSkylink,
  TUS_CHUNK_SIZE,
};
