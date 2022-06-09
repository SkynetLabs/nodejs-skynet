"use strict";
const FormData = require("form-data");
const parse = require("url-parse");
const base32Decode = require("base32-decode");
const { defaultOptions } = require("./utils");
const { sign } = require("tweetnacl");
const { toByteArray } = require("base64-js");
const { MAX_REVISION, parseSkylink, JsonData, getFullDomainUrlForPortal } = require("skynet-js");

const open = require("open");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.sendTo(console);
require("global-jsdom")();
global.document = new JSDOM(`...`, {
  url: "http://localhost/",
  referrer: "http://localhost/",
  contentType: "text/html",
  includeNodeLocations: true,
  storageQuota: 10000000,
  resources: "usable",
  pretendToBeVisual: true,
  runScripts: "dangerously",
  virtualConsole: virtualConsole,
}).window.document;
global.window = global.document.defaultView;
global.navigator = global.document.defaultView.navigator;
global.window.open = function (url) {
  open(url);
};

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

const DEFAULT_DOWNLOAD_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  endpointDownload: "/",
  download: false,
  path: undefined,
  range: undefined,
  responseType: undefined,
  subdomain: false,
};

const DEFAULT_DOWNLOAD_HNS_OPTIONS = {
  ...DEFAULT_DOWNLOAD_OPTIONS,
  endpointDownloadHns: "hns",
  hnsSubdomain: "hns",
  // Default to subdomain format for HNS URLs.
  subdomain: true,
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
 * Removes a prefix from the beginning of the string.
 *
 * @param str - The string to process.
 * @param prefix - The prefix to remove.
 * @param [limit] - Maximum amount of times to trim. No limit by default.
 * @returns - The processed string.
 */
const trimPrefix = function (str, prefix, limit) {
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
 * Regex for JSON revision value without quotes.
 */
const REGEX_REVISION_NO_QUOTES = /"revision":\s*([0-9]+)/;

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
 * The string length of the Skylink after it has been encoded using base32.
 */
const BASE32_ENCODED_SKYLINK_SIZE = 55;

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

/**
 * Returned when a string could not be decoded into a Skylink due to it having
 * an incorrect size.
 */
const ERR_SKYLINK_INCORRECT_SIZE = "skylink has incorrect size";

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

const JSONResponse = {
  data: JsonData | null,
  dataLink: "" | null,
};

/**
 * Returns an array of arrays of all possible permutations by picking one
 * element out of each of the input arrays.
 *
 * @param arrays - Array of arrays.
 * @returns - Array of arrays of all possible permutations.
 * @see {@link https://gist.github.com/ssippe/1f92625532eef28be6974f898efb23ef#gistcomment-3530882}
 */
const combineArrays = function (arrays) {
  return arrays.reduce(
    (accArrays, array) => accArrays.flatMap((accArray) => array.map((value) => [...accArray, value])),
    [[]]
  );
};

/**
 * Returns an array of strings of all possible permutations by picking one
 * string out of each of the input string arrays.
 *
 * @param arrays - Array of string arrays.
 * @returns - Array of strings of all possible permutations.
 */
const combineStrings = function (arrays) {
  return arrays.reduce((acc, array) => acc.flatMap((first) => array.map((second) => first.concat(second))));
};

/**
 * Returns a composed array with the given inputs and the expected output.
 *
 * @param inputs - The given inputs.
 * @param expected - The expected output for all the inputs.
 * @returns - The array of composed test cases.
 */
const composeTestCases = function (inputs, expected) {
  return inputs.map((input) => [input, expected]);
};

/**
 * Gets the URL for the current skapp on the preferred portal, if we're not on
 * the preferred portal already.
 *
 * @param skappDomain - The current page URL.
 * @param preferredPortalUrl - The preferred portal URL.
 * @returns - The URL for the current skapp on the preferred portal.
 */
const getRedirectUrlOnPreferredPortal = async function (skappDomain, preferredPortalUrl) {
  // Get the current skapp on the preferred portal.
  return getFullDomainUrlForPortal(preferredPortalUrl, skappDomain);
};

/**
 * Returns whether we should redirect from the current portal to the preferred
 * portal. The protocol prefixes are allowed to be different and there can be
 * other differences like a trailing slash.
 *
 * @param currentFullDomain - The current domain.
 * @param preferredPortalUrl - The preferred portal URL.
 * @returns - Whether the two URLs are equal for the purposes of redirecting.
 */
const shouldRedirectToPreferredPortalUrl = function (currentFullDomain, preferredPortalUrl) {
  // Strip protocol and trailing slash (case-insensitive).
  currentFullDomain = trimForwardSlash(currentFullDomain.replace(/https:\/\/|http:\/\//i, ""));
  preferredPortalUrl = trimForwardSlash(preferredPortalUrl.replace(/https:\/\/|http:\/\//i, ""));
  return !currentFullDomain.endsWith(preferredPortalUrl);
};

module.exports = {
  MAX_REVISION,
  DEFAULT_BASE_OPTIONS,
  DEFAULT_DOWNLOAD_OPTIONS,
  DEFAULT_DOWNLOAD_HNS_OPTIONS,
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  DEFAULT_SKYDB_OPTIONS,
  URI_SKYNET_PREFIX,
  JSON_RESPONSE_VERSION,
  buildSkynetJsonObject,
  REGEX_REVISION_NO_QUOTES,
  getPublicKeyFromPrivateKey,
  BASE64_ENCODED_SKYLINK_SIZE,
  RAW_SKYLINK_SIZE,
  decodeSkylinkBase64,
  formatSkylink,
  uploadJsonData,
  trimForwardSlash,
  extractNonSkylinkPath,
  checkCachedDataLink,
  toHexString,
  decodeSkylink,
  getSettledValues,
  JSONResponse,
  combineArrays,
  combineStrings,
  composeTestCases,
  getRedirectUrlOnPreferredPortal,
  shouldRedirectToPreferredPortalUrl,
};
