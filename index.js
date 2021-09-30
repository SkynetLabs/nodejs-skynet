"use strict";

const { SkynetClient } = require("./src/client");
const { defaultOptions, defaultSkynetPortalUrl, defaultPortalUrl, uriSkynetPrefix } = require("./src/utils");

const { genKeyPairAndSeed, genKeyPairFromSeed, getEntryLink } = require("skynet-js");

module.exports = {
  SkynetClient,

  defaultOptions,
  defaultPortalUrl,
  defaultSkynetPortalUrl,
  uriSkynetPrefix,

  // Re-export utilities from skynet-js.

  genKeyPairAndSeed,
  genKeyPairFromSeed,
  getEntryLink,
};
