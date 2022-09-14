"use strict";

const { defaultOptions } = require("./utils");

/**
 * The tus chunk size is (4MiB - encryptionOverhead) * dataPieces, set in skyd.
 */
const TUS_CHUNK_SIZE = (1 << 22) * 10;

/**
 * Indicates what the default chunk size multiplier is.
 */
const DEFAULT_TUS_CHUNK_SIZE_MULTIPLIER = 1;

/**
 * Indicates how many parts should be uploaded in parallel, by default.
 */
const DEFAULT_TUS_PARALLEL_UPLOADS = 1;

/**
 * The retry delays, in ms. Data is stored in skyd for up to 20 minutes, so the
 * total delays should not exceed that length of time.
 */
const DEFAULT_TUS_RETRY_DELAYS = [0, 5000, 15000, 60000, 300000, 600000];

/**
 * Indicates the default stagger percent between chunk uploads.
 */
const DEFAULT_TUS_STAGGER_PERCENT = 50;

/**
 * The portal file field name.
 */
const PORTAL_FILE_FIELD_NAME = "file";
/**
 * The portal directory file field name.
 */
const PORTAL_DIRECTORY_FILE_FIELD_NAME = "files[]";

const DEFAULT_BASE_OPTIONS = {
  APIKey: "",
  skynetApiKey: "",
  customUserAgent: "",
  customCookie: "",
  loginFn: undefined,
};

const DEFAULT_DOWNLOAD_OPTIONS = {
  ...defaultOptions("/"),
  format: "",
};

const DEFAULT_DOWNLOAD_HNS_OPTIONS = {
  ...DEFAULT_DOWNLOAD_OPTIONS,
  endpointDownloadHns: "hns",
  hnsSubdomain: "hns",
};

const DEFAULT_GET_METADATA_OPTIONS = {
  ...defaultOptions("/"),
};

const DEFAULT_UPLOAD_OPTIONS = {
  ...defaultOptions("/skynet/skyfile"),
  endpointLargeUpload: "/skynet/tus",

  portalFileFieldname: PORTAL_FILE_FIELD_NAME,
  portalDirectoryFileFieldname: PORTAL_DIRECTORY_FILE_FIELD_NAME,
  customFilename: "",
  customDirname: "",
  disableDefaultPath: false,
  dryRun: false,
  errorPages: undefined,
  tryFiles: undefined,

  // Large files.
  chunkSizeMultiplier: DEFAULT_TUS_CHUNK_SIZE_MULTIPLIER,
  largeFileSize: TUS_CHUNK_SIZE,
  numParallelUploads: DEFAULT_TUS_PARALLEL_UPLOADS,
  staggerPercent: DEFAULT_TUS_STAGGER_PERCENT,
  retryDelays: DEFAULT_TUS_RETRY_DELAYS,
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
};
