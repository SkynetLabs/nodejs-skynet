"use strict";

const { SkynetClient } = require("./src/client");

const {
  defaultOptions,
  defaultSkynetPortalUrl,
  defaultPortalUrl,
  uriSkynetPrefix,
  formatSkylink,
} = require("./src/utils");

const {
  genKeyPairAndSeed,
  genKeyPairFromSeed,
  getEntryLink,
  stringToUint8ArrayUtf8,
  uint8ArrayToStringUtf8,
} = require("skynet-js");

module.exports = {
  SkynetClient,

  defaultOptions,
  defaultPortalUrl,
  defaultSkynetPortalUrl,
  uriSkynetPrefix,
  formatSkylink,

  // Re-export utilities from skynet-js.

  genKeyPairAndSeed,
  genKeyPairFromSeed,
  getEntryLink,
  stringToUint8ArrayUtf8,
  uint8ArrayToStringUtf8,
};
