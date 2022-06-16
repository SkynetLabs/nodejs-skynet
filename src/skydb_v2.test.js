const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const { SkynetClient } = require("../index");

const {
  getSkylinkUrlForPortal,
  MAX_REVISION,
  DEFAULT_SKYNET_PORTAL_URL,
  URI_SKYNET_PREFIX,
  getEntryUrlForPortal,
  DELETION_ENTRY_DATA,
  MAX_ENTRY_LENGTH,
  JsonData,
} = require("skynet-js");

const { getSettledValues } = require("./utils_testing");
const { toHexString } = require("./utils_string");
const { decodeSkylink } = require("./encoding");
const { checkCachedDataLink } = require("./skydb_v2");

// Generated with genKeyPairFromSeed("insecure test seed")
const [publicKey, privateKey] = [
  "658b900df55e983ce85f3f9fb2a088d568ab514e7bbda51cfbfb16ea945378d9",
  "7caffac49ac914a541b28723f11776d36ce81e7b9b0c96ccacd1302db429c79c658b900df55e983ce85f3f9fb2a088d568ab514e7bbda51cfbfb16ea945378d9",
];

const dataKey = "app";
const skylink = "CABAB_1Dt0FJsxqsu_J4TodNCbCGvtFf1Uys_3EgzOlTcg";
const sialink = `${URI_SKYNET_PREFIX}${skylink}`;
const jsonData = { data: "thisistext" };
const fullJsonData = { _data: jsonData, _v: 2 };
const legacyJsonData = jsonData;
const merkleroot = "QAf9Q7dBSbMarLvyeE6HTQmwhr7RX9VMrP9xIMzpU3I";
const bitfield = 2048;

const portalUrl = DEFAULT_SKYNET_PORTAL_URL;
const client = new SkynetClient(portalUrl);
const uploadUrl = `${portalUrl}/skynet/skyfile`;
const skylinkUrl = getSkylinkUrlForPortal(portalUrl, skylink);
const registryPostUrl = `${portalUrl}/skynet/registry`;
const registryGetUrl = getEntryUrlForPortal(portalUrl, publicKey, dataKey);

// Hex-encoded skylink.
const data = "43414241425f31447430464a73787173755f4a34546f644e4362434776744666315579735f3345677a4f6c546367";
const revision = "11";
const entryData = {
  data: data,
  revision: revision,
  signature:
    "33d14d2889cb292142614da0e0ff13a205c4867961276001471d13b779fc9032568ddd292d9e0dff69d7b1f28be07972cc9d86da3cecf3adecb6f9b7311af809",
};

const newTimeout = 60000;
jest.setTimeout(newTimeout);
jest.useRealTimers();

const headers = {
  "skynet-portal-api": portalUrl,
  "skynet-skylink": skylink,
  "content-type": "application/json",
};

describe("getJSON", () => {
  let mock = MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
    mock.resetHistory();
  });

  it("should perform a lookup and skylink GET", async () => {
    // Mock a successful registry lookup.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    // Mock a successful data download.
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, headers);

    const { data, dataLink } = await client.dbV2.getJSON(publicKey, dataKey);
    expect(data).toEqual(jsonData);
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(2);
  });

  it("should fail properly with a too low error", async () => {
    // Use a custom data key for this test to get a fresh cache.
    const dataKey = "testTooLowError";
    const registryGetUrl = getEntryUrlForPortal(portalUrl, publicKey, dataKey);
    const skylinkData = toHexString(decodeSkylink(skylink));
    const entryData = {
      data: skylinkData,
      revision: 1,
      signature:
        "18d2b5f64042db39c4c591c21bd93015f7839eefab487ef8e27086cdb95b190732211b9a23d38c33f4f9a4e5219de55a80f75ff7e437713732ecdb4ccddb0804",
    };
    const entryDataTooLow = {
      data: skylinkData,
      revision: 0,
      signature:
        "4d7b26923f4211794eaf5c13230e62618ea3bebcb3fa6511ec8772b1f1e1a675b5244e7c33f89daf31999aeabe46c3a1e324a04d2f35c6ba902c75d35ceba00d",
    };

    // Cache the revision.

    // Mock a successful registry lookup.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    // Mock a successful data download.
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, headers);

    const { data } = await client.dbV2.getJSON(publicKey, dataKey);
    expect(data).toEqual(jsonData);

    // The cache should contain revision 1.
    const cachedRevisionEntry = await client.dbV2.revisionNumberCache.getRevisionAndMutexForEntry(publicKey, dataKey);
    expect(cachedRevisionEntry.revision.toString()).toEqual("1");

    // Return a revision that's too low.

    // Mock a successful registry lookup.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataTooLow));
    // Mock a successful data download.
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, headers);

    await expect(client.dbV2.getJSON(publicKey, dataKey)).rejects.toThrowError(
      "Returned revision number too low. A higher revision number for this userID and path is already cached"
    );

    // The cache should still contain revision 1.
    expect(cachedRevisionEntry.revision.toString()).toEqual("1");
  });

  it("should perform a lookup but not a skylink GET if the cachedDataLink is a hit", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));

    const { data, dataLink } = await client.dbV2.getJSON(publicKey, dataKey, { cachedDataLink: skylink });
    expect(data).toBeNull();
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(1);
  });

  it("should perform a lookup and a skylink GET if the cachedDataLink is not a hit", async () => {
    const skylinkNoHit = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";

    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, headers);

    const { data, dataLink } = await client.dbV2.getJSON(publicKey, dataKey, { cachedDataLink: skylinkNoHit });
    expect(data).toEqual(jsonData);
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(2);
  });

  it("should throw if the cachedDataLink is not a valid skylink", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, {});

    await expect(client.dbV2.getJSON(publicKey, dataKey, { cachedDataLink: "asdf" })).rejects.toThrowError(
      "Expected optional parameter 'cachedDataLink' to be valid skylink of type 'string', was type 'string', value 'asdf'"
    );
  });

  it("should perform a lookup and skylink GET on legacy pre-v4 data", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, legacyJsonData, headers);

    const jsonReturned = await client.dbV2.getJSON(publicKey, dataKey);
    expect(jsonReturned.data).toEqual(jsonData);
    expect(mock.history.get.length).toBe(2);
  });

  it("should return null if no entry is found", async () => {
    mock.onGet(registryGetUrl).replyOnce(404);

    const { data, dataLink } = await client.dbV2.getJSON(publicKey, dataKey);
    expect(data).toBeNull();
    expect(dataLink).toBeNull();
  });

  it("should throw if the returned file data is not JSON", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, "thisistext", { ...headers, "content-type": "text/plain" });

    await expect(client.dbV2.getJSON(publicKey, dataKey)).rejects.toThrowError(
      `File data for the entry at data key '${dataKey}' is not JSON.`
    );
  });

  it("should throw if the returned _data field in the file data is not JSON", async () => {
    // mock a successful registry lookup
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, { _data: "thisistext", _v: 1 }, headers);

    await expect(client.dbV2.getJSON(publicKey, dataKey)).rejects.toThrowError(
      "File data '_data' for the entry at data key 'app' is not JSON."
    );
  });

  it("should throw if invalid entry data is returned", async () => {
    const client = new SkynetClient(portalUrl);
    const mockedFn = jest.fn();
    mockedFn.mockReturnValueOnce({ entry: { data: new Uint8Array() } });
    client.registry.getEntry = mockedFn;
    await expect(await client.dbV2.getJSON(publicKey, dataKey)).toEqual({ data: null, dataLink: null });
  });
});

describe("setJSON", () => {
  let mock = MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
    mock.resetHistory();
    // mock a successful upload
    mock.onPost(uploadUrl).reply(200, { skylink, merkleroot, bitfield });
  });

  it("should perform an upload, lookup and registry update", async () => {
    // mock a successful registry update
    mock.onPost(registryPostUrl).replyOnce(204);

    // set data
    const { data: returnedData, dataLink: returnedSkylink } = await client.dbV2.setJSON(privateKey, dataKey, jsonData);
    expect(returnedData).toEqual(jsonData);
    expect(returnedSkylink).toEqual(sialink);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(0);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toBeGreaterThanOrEqual(12);
  });

  it("should use a revision number of 0 if the entry is not cached", async () => {
    // mock a successful registry update
    mock.onPost(registryPostUrl).replyOnce(204);

    // call `setJSON` on the client
    await client.dbV2.setJSON(privateKey, "inexistent entry", jsonData);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(0);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toEqual(0);
  });

  it("should fail if the entry has the maximum allowed revision", async () => {
    const dataKey = "maximum revision";
    const cachedRevisionEntry = await client.dbV2.revisionNumberCache.getRevisionAndMutexForEntry(publicKey, dataKey);
    cachedRevisionEntry.revision = MAX_REVISION;

    // mock a successful registry update
    mock.onPost(registryPostUrl).replyOnce(204);

    // Try to set data, should fail.
    await expect(client.dbV2.setJSON(privateKey, dataKey, entryData)).rejects.toThrowError(
      "Current entry already has maximum allowed revision, could not update the entry"
    );
  });

  it("Should throw an error if the private key is not hex-encoded", async () => {
    await expect(client.dbV2.setJSON("foo", dataKey, {})).rejects.toThrowError("bad secret key size");
  });

  it("Should throw an error if the data key is not provided", async () => {
    // @ts-expect-error We do not pass the data key on purpose.
    await expect(client.dbV2.setJSON(privateKey)).rejects.toThrowError(
      "Expected parameter field 'entry.dataKey' to be type 'string', was type 'undefined'"
    );
  });

  it("Should throw an error if the json is not provided", async () => {
    // @ts-expect-error We do not pass the json on purpose.
    await expect(client.dbV2.setJSON(privateKey, dataKey)).rejects.toThrowError("Request failed with status code 404");
  });

  it("Should not update the cached revision if the registry update fails.", async () => {
    const dataKey = "registry failure";
    const json = { foo: "bar" };

    // mock a successful registry update
    mock.onPost(registryPostUrl).replyOnce(204);

    await client.dbV2.setJSON(privateKey, dataKey, json);

    const cachedRevisionEntry = await client.dbV2.revisionNumberCache.getRevisionAndMutexForEntry(publicKey, dataKey);
    const revision1 = cachedRevisionEntry.revision;

    // mock a failed registry update
    mock.onPost(registryPostUrl).replyOnce(400, JSON.stringify({ message: "foo" }));

    await expect(client.dbV2.setJSON(privateKey, dataKey, json)).rejects.toEqual(
      new Error("Request failed with status code 400: foo")
    );

    const revision2 = cachedRevisionEntry.revision;

    expect(revision1.toString()).toEqual(revision2.toString());
  });
});

describe("setEntryData", () => {
  it("should throw if trying to set entry data > 70 bytes", async () => {
    await expect(
      client.dbV2.setEntryData(privateKey, dataKey, new Uint8Array(MAX_ENTRY_LENGTH + 1))
    ).rejects.toThrowError(
      "Expected parameter 'data' to be 'Uint8Array' of length <= 70, was length 71, was type 'object', value '0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0'"
    );
  });

  it("should throw if trying to set the deletion entry data", async () => {
    await expect(client.dbV2.setEntryData(privateKey, dataKey, DELETION_ENTRY_DATA)).rejects.toThrowError(
      "Tried to set 'Uint8Array' entry data that is the deletion sentinel ('Uint8Array(RAW_SKYLINK_SIZE)'), please use the 'deleteEntryData' method instead`"
    );
  });
});

describe("checkCachedDataLink", () => {
  const differentSkylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
  const inputs = [
    [skylink, undefined, false],
    [skylink, skylink, true],
    [skylink, differentSkylink, false],
    [differentSkylink, skylink, false],
  ];

  it.each(inputs)("checkCachedDataLink(%s, %s) should return %s", (rawDataLink, cachedDataLink, output) => {
    expect(checkCachedDataLink(rawDataLink, cachedDataLink)).toEqual(output);
  });

  it("Should throw on invalid cachedDataLink", () => {
    expect(() => checkCachedDataLink(skylink, "asdf")).toThrowError(
      "Expected optional parameter 'cachedDataLink' to be valid skylink of type 'string', was type 'string', value 'asdf'"
    );
  });
});

// REGRESSION TESTS: By creating a gap between setJSON and getJSON, a user
// could call getJSON, get outdated data, then call setJSON, and overwrite
// more up to date data with outdated data, but still use a high enough
// revision number.
//
// The fix is that you cannot retrieve the revision number while calling
// setJSON. You have to use the same revision number that you had when you
// called getJSON.
describe("getJSON/setJSON data race regression unit tests", () => {
  let mock = MockAdapter;

  beforeEach(() => {
    // Add a delay to responses to simulate actual calls that use the network.
    mock = new MockAdapter(axios, { delayResponse: 100 });
    mock.reset();
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const skylinkOld = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
  const skylinkNew = skylink;
  const skylinkNewUrl = skylinkUrl;
  const dataNew = data; // hex-encoded skylink
  const revisionNew = 1;
  const entryDataNew = {
    data: dataNew,
    revision: revisionNew,
    signature:
      "2a9889915f06d414e8cde51eb17db565410d20b2b50214e8297f7f4a0cb5c77e0edc62a319607dfaa042e0cc16ed0d7e549cca2abd11c2f86a335009936f150d",
  };
  const headersNew = { ...headers, "skynet-skylink": skylinkNew };

  const jsonOld = { message: 1 };
  const jsonNew = { message: 2 };
  const skynetJsonNew = { _data: jsonNew, _v: 2 };

  const higherRevisionError = "A higher revision number for this userID and path is already cached";

  it("should not get old data when getJSON and setJSON are called simultaneously on different clients and getJSON doesn't fail", async () => {
    // Create two new clients with a fresh revision cache.
    const client1 = new SkynetClient(portalUrl);
    const client2 = new SkynetClient(portalUrl);

    // Mock setJSON with the old skylink.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkOld, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);

    // Set the data.
    await client1.dbV2.setJSON(privateKey, dataKey, jsonOld);

    // Mock getJSON with the new entry data and the new skylink.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataNew));
    mock.onGet(skylinkNewUrl).replyOnce(200, skynetJsonNew, headersNew);

    // Mock setJSON with the new skylink.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkNew, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);

    // Try to invoke the data race.
    // Get the data while also calling setJSON.
    //
    // Use Promise.allSettled to wait for all promises to finish, or some mocked requests will hang around and interfere with the later tests.
    const settledResults = await Promise.allSettled([
      client1.dbV2.getJSON(publicKey, dataKey),
      client2.dbV2.setJSON(privateKey, dataKey, jsonNew),
    ]);

    let data = JsonData | null;
    try {
      const values = getSettledValues(settledResults);
      data = values[0].data;
    } catch (e) {
      // If any promises were rejected, check the error message.
      if (e.message.includes(higherRevisionError)) {
        // The data race condition was avoided and we received the expected
        // error. Return from test early.
        return;
      }

      throw e;
    }

    // Data race did not occur, getJSON should have latest JSON.
    expect(data).toEqual(jsonNew);

    // assert our request history contains the expected amount of requests.
    expect(mock.history.get.length).toBe(2);
    expect(mock.history.post.length).toBe(4);
  });
});
