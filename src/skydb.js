"use strict";
const { sign } = require("tweetnacl");
const FormData = require("form-data");
const { toByteArray } = require("base64-js");
const { defaultOptions } = require("./utils");

const defaultSkydbOptions = {
  ...defaultOptions("/skynet/skyfile"),
  portalFileFieldname: "file",
};

const JSON_RESPONSE_VERSION = 2;
const buildSkynetJsonObject = async function (data) {
  return { _data: data, _v: JSON_RESPONSE_VERSION };
};

const MAX_REVISION = BigInt("18446744073709551615");

const incrementRevision = function (revision) {
  revision = revision + BigInt(1);
  // Throw if the revision is already the maximum value.
  if (revision > MAX_REVISION) {
    throw new Error("Current entry already has maximum allowed revision, could not update the entry");
  }
  return revision;
};

const getPublicKeyfromSecretKey = function (privateKey) {
  const publicKey = Buffer.from(
    sign.keyPair.fromSecretKey(Uint8Array.from(Buffer.from(privateKey, "hex"))).publicKey
  ).toString("hex");
  return publicKey;
};

const BASE64_ENCODED_SKYLINK_SIZE = 46;

const RAW_SKYLINK_SIZE = 34;

function decodeSkylinkBase64(skylink) {
  // Check if Skylink is 46 bytes long.
  if (skylink.length !== BASE64_ENCODED_SKYLINK_SIZE) {
    throw new Error("Skylink is not 46 bytes long.");
  }
  // Add padding.
  skylink = `${skylink}==`;
  // Convert from URL encoding.
  skylink = skylink.replace(/-/g, "+").replace(/_/g, "/");
  return toByteArray(skylink);
}

// Skydb v1 db.setJSON for node.js
/**
 * Sets a JSON object at the registry entry corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
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
  const skynetJson = await buildSkynetJsonObject(json);
  const fullData = JSON.stringify(skynetJson);

  const params = {};
  if (opts.dryRun) params.dryrun = true;

  const formData = new FormData();
  formData.append(opts.portalFileFieldname, fullData, dataKey);

  const response = await this.executeRequest({
    ...opts,
    method: "post",
    data: formData,
    headers: formData.getHeaders(),
    params,
  });
  const skylink = "sia://" + response.data.skylink;
  await this.db.setDataLink(privateKey, dataKey, skylink);

  return { data: json, dataLink: skylink };
};

// Skydb v2 dbV2.setJSON for node.js
/**
 * Sets a JSON object at the registry entry corresponding to the publicKey and
 * dataKey.
 *
 * This will use the entry revision number from the cache, so getJSON must
 * always be called first for existing entries.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param json - The JSON data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the input keys are not valid strings.
 */
const nodejs_dbV2_setJSON = async function (privateKey, dataKey, json, customOptions = {}) {
  const opts = { ...defaultSkydbOptions, ...this.customOptions, ...customOptions };
  const skynetJson = await buildSkynetJsonObject(json);
  const fullData = JSON.stringify(skynetJson);

  const publicKey = getPublicKeyfromSecretKey(privateKey);

  return await this.dbV2.revisionNumberCache.withCachedEntryLock(publicKey, dataKey, async (cachedRevisionEntry) => {
    // Get the cached revision number before doing anything else. Increment it.
    const newRevision = await incrementRevision(cachedRevisionEntry.revision);

    const params = {};
    if (opts.dryRun) params.dryrun = true;

    const formData = new FormData();
    formData.append(opts.portalFileFieldname, fullData, dataKey);

    const response = await this.executeRequest({
      ...opts,
      method: "post",
      data: formData,
      headers: formData.getHeaders(),
      params,
    });
    const short_skylink = response.data.skylink;
    const skylink = "sia://" + short_skylink;

    // Build the registry entry.
    const revision = newRevision;
    const rawDataLink = decodeSkylinkBase64(short_skylink);
    if (rawDataLink.length !== RAW_SKYLINK_SIZE) {
      throw new Error("RawDataLink is not 34 bytes long.");
    }

    const entry = {
      dataKey,
      data: rawDataLink,
      revision,
    };
    await this.registry.setEntry(privateKey, entry);

    // Update the cached revision number.
    cachedRevisionEntry.revision = newRevision;

    return { data: json, dataLink: skylink };
  });
};

module.exports = { nodejs_db_setJSON, nodejs_dbV2_setJSON };
