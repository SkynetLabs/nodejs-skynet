"use strict";

const { defaultOptions } = require("./utils");

const open = require("open");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
global.document = new JSDOM(`...`).window.document;
global.window = global.document.defaultView;
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
 * The raw size in bytes of the data that gets put into a link.
 */
const RAW_SKYLINK_SIZE = 34;

const BASE32_ENCODING_VARIANT = "RFC4648-HEX";

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

/**
 * Regex for JSON revision value without quotes.
 */
const REGEX_REVISION_NO_QUOTES = /"revision":\s*([0-9]+)/;

module.exports = {
  TUS_CHUNK_SIZE,
  DEFAULT_BASE_OPTIONS,
  DEFAULT_DOWNLOAD_OPTIONS,
  DEFAULT_DOWNLOAD_HNS_OPTIONS,
  DEFAULT_GET_METADATA_OPTIONS,
  DEFAULT_UPLOAD_OPTIONS,
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  DEFAULT_GET_JSON_OPTIONS,
  DEFAULT_SET_JSON_OPTIONS,
  RAW_SKYLINK_SIZE,
  BASE32_ENCODING_VARIANT,
  BASE32_ENCODED_SKYLINK_SIZE,
  BASE64_ENCODED_SKYLINK_SIZE,
  ERR_SKYLINK_INCORRECT_SIZE,
  REGEX_REVISION_NO_QUOTES,
};
