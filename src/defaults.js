"use strict";

//const { sign } = require("tweetnacl");
const { toByteArray } = require("base64-js");
const { MAX_REVISION, JsonData } = require("skynet-js");
//const parse = require("url-parse");
const base32Decode = require("base32-decode");

const { defaultOptions, trimUriPrefix, validateString, throwValidationError } = require("./utils");

const open = require("open");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
require("global-jsdom")();
global.document = new JSDOM(`...`).window.document;
global.window = global.document.defaultView;
global.navigator = global.document.defaultView.navigator;
global.window.open = function (url) {
  open(url);
};

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

const DEFAULT_DOWNLOAD_HNS_OPTIONS = {
  ...DEFAULT_DOWNLOAD_OPTIONS,
  endpointDownloadHns: "hns",
  hnsSubdomain: "hns",
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
 * The string length of the Skylink after it has been encoded using base64.
 */
const BASE64_ENCODED_SKYLINK_SIZE = 46;

/**
 * The raw size in bytes of the data that gets put into a link.
 */
const RAW_SKYLINK_SIZE = 34;

/**
 * Regex for JSON revision value without quotes.
 */
const REGEX_REVISION_NO_QUOTES = /"revision":\s*([0-9]+)/;

/**
 * The string length of the Skylink after it has been encoded using base32.
 */
const BASE32_ENCODED_SKYLINK_SIZE = 55;

/**
 * Returned when a string could not be decoded into a Skylink due to it having
 * an incorrect size.
 */
const ERR_SKYLINK_INCORRECT_SIZE = "skylink has incorrect size";

const BASE32_ENCODING_VARIANT = "RFC4648-HEX";

const JSONResponse = {
  data: JsonData | null,
  dataLink: "" | null,
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
 * Sets the hidden _data and _v fields on the given raw JSON data.
 *
 * @param data - The given JSON data.
 * @returns - The Skynet JSON data.
 */
const buildSkynetJsonObject = function (data) {
  return { _data: data, _v: JSON_RESPONSE_VERSION };
};

/**
 * Validates the given value as a string of the given length.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param len - The length to check.
 * @throws - Will throw if not a valid string of the given length.
 */
const validateStringLen = function (name, value, valueKind, len) {
  validateString(name, value, valueKind);
  const actualLen = value.length;
  if (actualLen !== len) {
    throwValidationError(name, value, valueKind, `type 'string' of length ${len}, was length ${actualLen}`);
  }
};

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
  /* istanbul ignore next */
  if (bytes.length != RAW_SKYLINK_SIZE) {
    throw new Error("failed to load skylink data");
  }

  return bytes;
};

/**
 * Gets the settled values from `Promise.allSettled`. Throws if an error is
 * found. Returns all settled values if no errors were found.
 *
 * @param values - The settled values.
 * @returns - The settled value if no errors were found.
 * @throws - Will throw if an unexpected error occurred.
 */
const getSettledValues = function (values) {
  const receivedValues = [];

  for (const value of values) {
    if (value.status === "rejected") {
      throw value.reason;
    } else if (value.value) {
      receivedValues.push(value.value);
    }
  }

  return receivedValues;
};

module.exports = {
  MAX_REVISION,
  DEFAULT_BASE_OPTIONS,
  DEFAULT_DOWNLOAD_OPTIONS,
  DEFAULT_DOWNLOAD_HNS_OPTIONS,
  DEFAULT_GET_METADATA_OPTIONS,
  DEFAULT_UPLOAD_OPTIONS,
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  DEFAULT_GET_JSON_OPTIONS,
  DEFAULT_SET_JSON_OPTIONS,
  URI_SKYNET_PREFIX,
  JSON_RESPONSE_VERSION,
  BASE64_ENCODED_SKYLINK_SIZE,
  RAW_SKYLINK_SIZE,
  TUS_CHUNK_SIZE,
  REGEX_REVISION_NO_QUOTES,
  BASE32_ENCODED_SKYLINK_SIZE,
  BASE32_ENCODING_VARIANT,
  ERR_SKYLINK_INCORRECT_SIZE,
  JSONResponse,
  decodeSkylinkBase64,
  formatSkylink,
  buildSkynetJsonObject,
  decodeSkylink,
  getSettledValues,
};
