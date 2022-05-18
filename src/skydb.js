"use strict";

const FormData = require("form-data");
const {
  MAX_REVISION,
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  defaultSkydbOptions,
  buildSkynetJsonObject,
  getPublicKeyfromPrivateKey,
  RAW_SKYLINK_SIZE,
  decodeSkylinkBase64,
} = require("./defaults");

const { uriSkynetPrefix } = require("./utils");

/**
 *
 * Section for Skydb v1 for node.js.
 *
 */

/**
 * Skydb v1
 * Sets a JSON object at the registry entry corresponding to the publicKey and dataKey.
 *
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param json - The JSON data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the input keys are not valid strings.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `client.dbV2.setJSON` is recommended.
 */
const nodejs_db_setJSON = async function (privateKey, dataKey, json, customOptions = {}) {
  const opts = { ...defaultSkydbOptions, ...this.customOptions, ...customOptions };

  const publicKey = getPublicKeyfromPrivateKey(privateKey);
  const { entry, dataLink } = await getOrCreateRegistryEntry(this, publicKey, dataKey, json, opts);

  // Update the registry.
  await this.registry.setEntry(privateKey, entry, DEFAULT_SET_ENTRY_OPTIONS);

  return { data: json, dataLink: dataLink };
};

/**
 * Skydb v1
 * Gets the registry entry and data link or creates the entry if it doesn't exist.
 *
 * @param client - The Skynet client.
 * @param publicKey - The user public key.
 * @param dataKey - The dat akey.
 * @param json - The JSON to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
const getOrCreateRegistryEntry = async function (client, publicKey, dataKey, json, customOptions = {}) {
  const opts = { ...defaultSkydbOptions, ...client.customOptions, ...customOptions };

  // Set the hidden _data and _v fields.
  const skynetJson = await buildSkynetJsonObject(json);
  const fullData = JSON.stringify(skynetJson);

  // uploads in-memory data to skynet
  const { skylink, shortskylink } = await uploadJSONdata(client, fullData, dataKey, opts);

  // Fetch the current value to find out the revision.
  const signedEntry = await client.registry.getEntry(publicKey, dataKey, DEFAULT_GET_ENTRY_OPTIONS);

  const revision = getNextRevisionFromEntry(signedEntry.entry);

  // Build the registry entry.
  const rawDataLink = decodeSkylinkBase64(shortskylink);
  if (rawDataLink.length !== RAW_SKYLINK_SIZE) {
    throw new Error("RawDataLink is not 34 bytes long.");
  }

  const entry = {
    dataKey,
    data: rawDataLink,
    revision,
  };

  return { entry: entry, dataLink: skylink };
};

/**
 * Skydb v1
 * Gets the next revision from a returned entry (or 0 if the entry was not found).
 *
 * @param entry - The returned registry entry.
 * @returns - The revision.
 * @throws - Will throw if the next revision would be beyond the maximum allowed value.
 */
const getNextRevisionFromEntry = function (entry) {
  let revision;
  if (entry === null) {
    revision = BigInt(0);
  } else {
    revision = entry.revision + BigInt(1);
  }
  // Throw if the revision is already the maximum value.
  if (revision > MAX_REVISION) {
    throw new Error("Current entry already has maximum allowed revision, could not update the entry");
  }
  return revision;
};

/**
 *
 * Seection for Skydb v2 for node.js.
 *
 */

/**
 * Skydb v2
 * Sets a JSON object at the registry entry corresponding to the publicKey and
 * dataKey.
 *
 * This will use the entry revision number from the cache, so getJSON must
 * always be called first for existing entries.
 *
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param json - The JSON data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the input keys are not valid strings.
 */
const nodejs_dbV2_setJSON = async function (privateKey, dataKey, json, customOptions = {}) {
  const opts = { ...defaultSkydbOptions, ...this.customOptions, ...customOptions };

  const publicKey = getPublicKeyfromPrivateKey(privateKey);

  // Immediately fail if the mutex is not available.
  return await this.dbV2.revisionNumberCache.withCachedEntryLock(publicKey, dataKey, async (cachedRevisionEntry) => {
    // Get the cached revision number before doing anything else. Increment it.
    const newRevision = await incrementRevision(cachedRevisionEntry.revision);

    const { entry, dataLink } = await getOrCreateSkyDBRegistryEntry(this, dataKey, json, newRevision, opts);

    // Update the registry.
    await this.registry.setEntry(privateKey, entry, DEFAULT_SET_ENTRY_OPTIONS);

    // Update the cached revision number.
    cachedRevisionEntry.revision = newRevision;

    return { data: json, dataLink: dataLink };
  });
};

/**
 * Skydb v2
 * Gets the registry entry and data link or creates the entry if it doesn't
 * exist. Uses the cached revision number for the entry, or 0 if the entry has
 * not been cached.
 *
 * @param client - The Skynet client.
 * @param dataKey - The data key.
 * @param data - The JSON or raw byte data to set.
 * @param revision - The revision number to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
const getOrCreateSkyDBRegistryEntry = async function (client, dataKey, json, newRevision, customOptions = {}) {
  const opts = { ...defaultSkydbOptions, ...client.customOptions, ...customOptions };

  // Set the hidden _data and _v fields.
  const skynetJson = await buildSkynetJsonObject(json);
  const fullData = JSON.stringify(skynetJson);

  // uploads in-memory data to skynet
  const { skylink, shortskylink } = await uploadJSONdata(client, fullData, dataKey, opts);

  // Build the registry entry.
  const revision = newRevision;
  const rawDataLink = decodeSkylinkBase64(shortskylink);
  if (rawDataLink.length !== RAW_SKYLINK_SIZE) {
    throw new Error("RawDataLink is not 34 bytes long.");
  }

  const entry = {
    dataKey,
    data: rawDataLink,
    revision,
  };

  return { entry: entry, dataLink: skylink };
};

/**
 * Skydb v2
 * Increments the given revision number and checks to make sure it is not
 * greater than the maximum revision.
 *
 * @param revision - The given revision number.
 * @returns - The incremented revision number.
 * @throws - Will throw if the incremented revision number is greater than the maximum revision.
 */
const incrementRevision = function (revision) {
  revision = revision + BigInt(1);
  // Throw if the revision is already the maximum value.
  if (revision > MAX_REVISION) {
    throw new Error("Current entry already has maximum allowed revision, could not update the entry");
  }
  return revision;
};

/**
 * Uploads only jsonData from in-memory to Skynet for Skydb v1 and v2.
 *
 * @param {string|Buffer} data - The data to upload, either a string or raw bytes.
 * @param {string} filename - The filename to use on Skynet.
 * @param {Object} [customOptions={}] - Configuration options.
 * @returns - The skylink and shortskylink is a trimUriPrefix from skylink
 */
const uploadJSONdata = async function (client, fullData, dataKey, customOptions = {}) {
  const opts = { ...defaultSkydbOptions, ...client.customOptions, ...customOptions };

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

  // short_skylink is a trimUriPrefix from skylink
  const short_skylink = response.data.skylink;
  const skylink = uriSkynetPrefix + short_skylink;

  return { skylink: skylink, shortskylink: short_skylink };
};

module.exports = { nodejs_db_setJSON, nodejs_dbV2_setJSON };
