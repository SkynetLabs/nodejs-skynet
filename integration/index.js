const axios = require("axios");
const axiosRetry = require("axios-retry");
const { SkynetClient, DEFAULT_SKYNET_PORTAL_URL } = require("../index");

// retry if we're getting rate limited
axiosRetry(axios, {
  retries: 10,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (e) => axiosRetry.isNetworkOrIdempotentRequestError(e) || e.response?.status === 429,
});

// To test a specific server.
//
// Example:
//
// SKYNET_JS_INTEGRATION_TEST_SERVER=https://eu-fin-1.siasky.net yarn run jest integration
const portal = process.env.SKYNET_JS_INTEGRATION_TEST_SERVER || DEFAULT_SKYNET_PORTAL_URL;
// Allow setting a custom API key for e.g. authentication for running tests on paid portals.
//
// Example:
//
// SKYNET_JS_INTEGRATION_TEST_SKYNET_API_KEY=foo yarn run jest integration
const skynetApiKey = process.env.SKYNET_JS_INTEGRATION_TEST_SKYNET_API_KEY;

const customOptions = { skynetApiKey };
const client = new SkynetClient(portal, customOptions);

module.exports = {
  client,
  portal,
};
