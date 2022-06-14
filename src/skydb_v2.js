"use strict";

const {
  MAX_REVISION,
  DEFAULT_SET_ENTRY_OPTIONS,
  DEFAULT_GET_JSON_OPTIONS,
  DEFAULT_SET_JSON_OPTIONS,
  DEFAULT_UPLOAD_OPTIONS,
  buildSkynetJsonObject,
  RAW_SKYLINK_SIZE,
  decodeSkylinkBase64,
  formatSkylink,
  URI_SKYNET_PREFIX,
} = require("./defaults");
const { extractOptions, trimPrefix, getPublicKeyFromPrivateKey } = require("./utils");

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
const setJSONdbV2 = async function (privateKey, dataKey, json, customOptions = {}) {
  const opts = { ...DEFAULT_SET_JSON_OPTIONS, ...this.customOptions, ...customOptions };

  const publicKey = getPublicKeyFromPrivateKey(privateKey);

  // Immediately fail if the mutex is not available.
  return await this.dbV2.revisionNumberCache.withCachedEntryLock(publicKey, dataKey, async (cachedRevisionEntry) => {
    // Get the cached revision number before doing anything else. Increment it.
    const newRevision = await incrementRevision(cachedRevisionEntry.revision);

    const { entry, dataLink } = await getOrCreateSkyDBRegistryEntry(this, dataKey, json, newRevision, opts);

    // Update the registry.
    const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
    await this.registry.setEntry(privateKey, entry, setEntryOpts);

    // Update the cached revision number.
    cachedRevisionEntry.revision = newRevision;

    return { data: json, dataLink: formatSkylink(dataLink) };
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
  const opts = { ...DEFAULT_GET_JSON_OPTIONS, ...client.customOptions, ...customOptions };

  // Set the hidden _data and _v fields.
  const skynetJson = await buildSkynetJsonObject(json);
  const fullData = JSON.stringify(skynetJson);

  // uploads in-memory data to skynet
  const uploadOpts = extractOptions(opts, DEFAULT_UPLOAD_OPTIONS);
  const skylink = await client.uploadData(fullData, dataKey, uploadOpts);

  // Build the registry entry.
  const revision = newRevision;
  const dataLink = trimPrefix(skylink, URI_SKYNET_PREFIX);
  const rawDataLink = decodeSkylinkBase64(dataLink);
  if (rawDataLink.length !== RAW_SKYLINK_SIZE) {
    throw new Error("rawDataLink is not 34 bytes long.");
  }

  const entry = {
    dataKey,
    data: rawDataLink,
    revision,
  };

  return { entry: entry, dataLink: formatSkylink(skylink) };
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

module.exports = { setJSONdbV2 };
