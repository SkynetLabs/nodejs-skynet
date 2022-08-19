const axios = require("axios");
const { SkynetClient: BrowserSkynetClient } = require("skynet-js");

const { defaultPortalUrl, makeUrl } = require("./utils.js");

const { setJSONdbV1 } = require("./skydb.js");
const { setJSONdbV2 } = require("./skydb_v2.js");

class SkynetClient {
  /**
   * The Skynet Client which can be used to access Skynet.
   * @constructor
   * @param {string} [portalUrl="https://siasky.net"] - The portal URL to use to access Skynet, if specified. To use the default portal while passing custom options, use "".
   * @param {Object} [customOptions={}] - Configuration for the client.
   * @param {string} [customOptions.APIKey] - Authentication password to use.
   * @param {string} [customOptions.skynetApiKey] - Authentication API key to use for a Skynet portal (sets the "Skynet-Api-Key" header).
   * @param {string} [customCookie=""] - Custom cookie header to set.
   * @param {string} [customOptions.customUserAgent=""] - Custom user agent header to set.
   */
  constructor(portalUrl, customOptions = {}) {
    // Check if portal URL provided twice.

    if (portalUrl && customOptions.portalUrl) {
      throw new Error(
        "Both 'portalUrl' parameter provided and 'customOptions.portalUrl' provided. Please pass only one in order to avoid conflicts."
      );
    }

    // Add portal URL to options if given.

    this.customOptions = { ...customOptions };
    // If portal was not given, the default portal URL will be used.
    if (portalUrl) {
      // Set the portalUrl if given.
      this.customOptions.portalUrl = portalUrl;
    }

    // Re-export selected client methods from skynet-js.

    // Create the browser client. It requires an explicit portal URL to be passed in Node contexts. We also have to pass valid custom options, so we remove any unexpected ones.
    const browserClientOptions = { ...this.customOptions };
    delete browserClientOptions.portalUrl;
    const browserClient = new BrowserSkynetClient(portalUrl || defaultPortalUrl(), browserClientOptions);
    this.browserClient = browserClient;

    // Download
    this.getSkylinkUrl = browserClient.getSkylinkUrl.bind(browserClient);
    this.getHnsUrl = browserClient.getHnsUrl.bind(browserClient);
    this.getHnsresUrl = browserClient.getHnsresUrl.bind(browserClient);
    this.getMetadata = browserClient.getMetadata.bind(browserClient);
    this.getFileContent = browserClient.getFileContent.bind(browserClient);
    this.getFileContentBinary = browserClient.getFileContentBinary.bind(browserClient);
    this.getFileContentHns = browserClient.getFileContentHns.bind(browserClient);
    this.getFileContentBinaryHns = browserClient.getFileContentBinaryHns.bind(browserClient);
    this.resolveHns = browserClient.resolveHns.bind(browserClient);

    // Pin
    this.pinSkylink = browserClient.pinSkylink.bind(browserClient);

    // File API
    this.file = {
      getJSON: browserClient.file.getJSON.bind(browserClient),
      getEntryData: browserClient.file.getEntryData.bind(browserClient),
      getEntryLink: browserClient.file.getEntryLink.bind(browserClient),
      getJSONEncrypted: browserClient.file.getJSONEncrypted.bind(browserClient),
    };

    // SkyDB v1 (deprecated)
    this.db = {
      getJSON: browserClient.db.getJSON.bind(browserClient),
      // We define `setJSONdbV1` in this SDK, so bind it to the current client.
      setJSON: setJSONdbV1.bind(this),
      deleteJSON: browserClient.db.deleteJSON.bind(browserClient),
      setDataLink: browserClient.db.setDataLink.bind(browserClient),
      getEntryData: browserClient.db.getEntryData.bind(browserClient),
      setEntryData: browserClient.db.setEntryData.bind(browserClient),
      deleteEntryData: browserClient.db.deleteEntryData.bind(browserClient),
      getRawBytes: browserClient.db.getRawBytes.bind(browserClient),
    };

    // SkyDB v2
    this.dbV2 = {
      getJSON: browserClient.dbV2.getJSON.bind(browserClient),
      // We define `setJSONdbV1` in this SDK, so bind it to the current client.
      setJSON: setJSONdbV2.bind(this),
      deleteJSON: browserClient.dbV2.deleteJSON.bind(browserClient),
      setDataLink: browserClient.dbV2.setDataLink.bind(browserClient),
      getEntryData: browserClient.dbV2.getEntryData.bind(browserClient),
      setEntryData: browserClient.dbV2.setEntryData.bind(browserClient),
      deleteEntryData: browserClient.dbV2.deleteEntryData.bind(browserClient),
      getRawBytes: browserClient.dbV2.getRawBytes.bind(browserClient),

      // Holds the cached revision numbers, protected by mutexes to prevent
      // concurrent access.
      revisionNumberCache: browserClient.dbV2.revisionNumberCache,
    };

    // Registry
    this.registry = {
      getEntry: browserClient.registry.getEntry.bind(browserClient),
      getEntryUrl: browserClient.registry.getEntryUrl.bind(browserClient),
      // Don't bind the client since this method doesn't take the client.
      getEntryLink: browserClient.registry.getEntryLink,
      setEntry: browserClient.registry.setEntry.bind(browserClient),
      postSignedEntry: browserClient.registry.postSignedEntry.bind(browserClient),
    };
  }

  /**
   * Creates and executes a request.
   * @param {Object} config - Configuration for the request. See docs for constructor for the full list of options.
   */
  executeRequest(config) {
    let url = config.url;
    if (!url) {
      url = makeUrl(config.portalUrl, config.endpointPath, config.extraPath ? config.extraPath : "");
    }

    // Build headers.
    const headers = buildRequestHeaders(
      config.headers,
      config.customUserAgent,
      config.customCookie,
      config.skynetApiKey
    );

    return axios({
      url,
      method: config.method,
      data: config.data,
      params: config.params,
      headers,
      auth: config.APIKey && { username: "", password: config.APIKey },
      responseType: config.responseType,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }
}

/**
 * Helper function that builds the request headers.
 *
 * @param [baseHeaders] - Any base headers.
 * @param [customUserAgent] - A custom user agent to set.
 * @param [customCookie] - A custom cookie.
 * @param [skynetApiKey] - Authentication key to use for a Skynet portal.
 * @returns - The built headers.
 */
function buildRequestHeaders(baseHeaders, customUserAgent, customCookie, skynetApiKey) {
  const returnHeaders = { ...baseHeaders };
  // Set some headers from common options.
  if (customUserAgent) {
    returnHeaders["User-Agent"] = customUserAgent;
  }
  if (customCookie) {
    returnHeaders["Cookie"] = customCookie;
  }
  if (skynetApiKey) {
    returnHeaders["Skynet-Api-Key"] = skynetApiKey;
  }
  return returnHeaders;
}

// Export the client.

module.exports = { SkynetClient, buildRequestHeaders };

// Get the following files to run or the client's methods won't be defined.
require("./download.js");
require("./upload.js");
