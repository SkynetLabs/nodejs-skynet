"use strict";

const {
  MAX_REVISION,
  DEFAULT_SET_ENTRY_OPTIONS,
  defaultSkydbOptions,
  buildSkynetJsonObject,
  getPublicKeyfromPrivateKey,
  RAW_SKYLINK_SIZE,
  decodeSkylinkBase64,
  uploadJSONdata,
} = require("./defaults");

/**
 * Sets a JSON object at the registry entry corresponding to the privateKey and dataKey using SkyDB V2.
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

module.exports = { nodejs_dbV2_setJSON };
