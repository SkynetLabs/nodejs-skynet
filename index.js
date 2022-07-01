"use strict";

const { SkynetClient } = require("./src/client");

const {
  defaultOptions,
  defaultSkynetPortalUrl,
  defaultPortalUrl,
  uriSkynetPrefix,
  formatSkylink,
} = require("./src/utils");

const { genKeyPairAndSeed, genKeyPairFromSeed, getEntryLink } = require("skynet-js");

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
};
