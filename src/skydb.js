"use strict";

const { URI_SKYNET_PREFIX, MAX_REVISION } = require("skynet-js");

const {
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
  DEFAULT_GET_JSON_OPTIONS,
  DEFAULT_SET_JSON_OPTIONS,
  DEFAULT_UPLOAD_OPTIONS,
  RAW_SKYLINK_SIZE,
} = require("./defaults");

const { extractOptions, getPublicKeyFromPrivateKey, formatSkylink } = require("./utils");
const { trimPrefix } = require("./utils_string");
const { decodeSkylinkBase64 } = require("./encoding");
const { buildSkynetJsonObject } = require("./skydb_v2");

/**
 * Sets a JSON object at the registry entry corresponding to the privateKey and dataKey using SkyDB V1.
 *
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param json - The JSON data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the input keys are not valid strings.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `client.dbV2.setJSON` is recommended.
 */
const setJSONdbV1 = async function (privateKey, dataKey, json, customOptions = {}) {
  const opts = { ...DEFAULT_SET_JSON_OPTIONS, ...this.customOptions, ...customOptions };

  const publicKey = getPublicKeyFromPrivateKey(privateKey);
  const { entry, dataLink } = await getOrCreateRegistryEntry(this, publicKey, dataKey, json, opts);

  // Update the registry.
  const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
  await this.registry.setEntry(privateKey, entry, setEntryOpts);

  return { data: json, dataLink: formatSkylink(dataLink) };
};

/**
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
  const opts = { ...DEFAULT_GET_JSON_OPTIONS, ...client.customOptions, ...customOptions };

  // Set the hidden _data and _v fields.
  const skynetJson = await buildSkynetJsonObject(json);
  const fullData = JSON.stringify(skynetJson);

  // uploads in-memory data to skynet
  const uploadOpts = extractOptions(opts, DEFAULT_UPLOAD_OPTIONS);
  const skylink = await client.uploadData(fullData, dataKey, uploadOpts);

  // Fetch the current value to find out the revision.
  const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
  const signedEntry = await client.registry.getEntry(publicKey, dataKey, getEntryOpts);

  const revision = getNextRevisionFromEntry(signedEntry.entry);

  // Build the registry entry.
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
 * Gets the next revision from a returned entry (or 0 if the entry was not found).
 *
 * @param entry - The returned registry entry.
 * @returns - The revision.
 * @throws - Will throw if the next revision would be beyond the maximum allowed value.
 */
const getNextRevisionFromEntry = function (entry) {
  let revision;
  if (entry === null || entry === undefined) {
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

module.exports = { setJSONdbV1 };
