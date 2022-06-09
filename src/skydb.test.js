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
} = require("skynet-js");
const { REGEX_REVISION_NO_QUOTES, checkCachedDataLink } = require("./defaults");

// Generated with genKeyPairFromSeed("insecure test seed")
const [publicKey, privateKey] = [
  "658b900df55e983ce85f3f9fb2a088d568ab514e7bbda51cfbfb16ea945378d9",
  "7caffac49ac914a541b28723f11776d36ce81e7b9b0c96ccacd1302db429c79c658b900df55e983ce85f3f9fb2a088d568ab514e7bbda51cfbfb16ea945378d9",
];
//const dataKey = "testdatakey";
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
const registryUrl = `${portalUrl}/skynet/registry`;
const registryLookupUrl = getEntryUrlForPortal(portalUrl, publicKey, dataKey);
const uploadUrl = `${portalUrl}/skynet/skyfile`;
const skylinkUrl = getSkylinkUrlForPortal(portalUrl, skylink);

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

describe("getJSON", () => {
  let mock = MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
    mock.resetHistory();
  });

  const headers = {
    "skynet-portal-api": portalUrl,
    "skynet-skylink": skylink,
    "content-type": "application/json",
  };

  it("should perform a lookup and skylink GET", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, headers);

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey);
    expect(data).toEqual(jsonData);
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(2);
  });

  it("should perform a lookup but not a skylink GET if the cachedDataLink is a hit", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey, { cachedDataLink: skylink });
    expect(data).toBeNull();
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(1);
  });

  it("should perform a lookup and a skylink GET if the cachedDataLink is not a hit", async () => {
    const skylinkNoHit = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";

    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, headers);

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey, { cachedDataLink: skylinkNoHit });
    expect(data).toEqual(jsonData);
    expect(dataLink).toEqual(sialink);
    expect(mock.history.get.length).toBe(2);
  });

  it("should throw if the cachedDataLink is not a valid skylink", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, fullJsonData, {});

    await expect(client.db.getJSON(publicKey, dataKey, { cachedDataLink: "asdf" })).rejects.toThrowError(
      "Expected optional parameter 'cachedDataLink' to be valid skylink of type 'string', was type 'string', value 'asdf'"
    );
  });

  it("should perform a lookup and skylink GET on legacy pre-v4 data", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).replyOnce(200, legacyJsonData, headers);

    const jsonReturned = await client.db.getJSON(publicKey, dataKey);
    expect(jsonReturned.data).toEqual(jsonData);
    expect(mock.history.get.length).toBe(2);
  });

  it("should return null if no entry is found", async () => {
    mock.onGet(registryLookupUrl).reply(404);

    const { data, dataLink } = await client.db.getJSON(publicKey, dataKey);
    expect(data).toBeNull();
    expect(dataLink).toBeNull();
  });

  it("should throw if the returned file data is not JSON", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).reply(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).reply(200, "thisistext", { ...headers, "content-type": "text/plain" });

    await expect(client.db.getJSON(publicKey, dataKey)).rejects.toThrowError(
      `File data for the entry at data key '${dataKey}' is not JSON.`
    );
  });

  it("should throw if the returned _data field in the file data is not JSON", async () => {
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).reply(200, JSON.stringify(entryData));
    mock.onGet(skylinkUrl).reply(200, { _data: "thisistext", _v: 1 }, headers);

    await expect(client.db.getJSON(publicKey, dataKey)).rejects.toThrowError(
      "File data '_data' for the entry at data key 'app' is not JSON."
    );
  });

  it("should throw if invalid entry data is returned", async () => {
    const client = new SkynetClient(portalUrl);
    const mockedFn = jest.fn();
    mockedFn.mockReturnValueOnce({ entry: { data: new Uint8Array() } });
    client.registry.getEntry = mockedFn;
    await expect(await client.db.getJSON(publicKey, dataKey)).toEqual({ data: null, dataLink: null });
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
    // mock a successful registry lookup
    mock.onGet(registryLookupUrl).replyOnce(200, JSON.stringify(entryData));

    // mock a successful registry update
    mock.onPost(registryUrl).replyOnce(204);

    // set data
    const { data: returnedData, dataLink: returnedSkylink } = await client.db.setJSON(privateKey, dataKey, jsonData);
    expect(returnedData).toEqual(jsonData);
    expect(returnedSkylink).toEqual(sialink);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    // change "revision + 1" to "12"
    expect(data.revision).toEqual(12);
  });

  it("should use a revision number of 0 if the lookup failed", async () => {
    mock.onGet(registryLookupUrl).reply(404);

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // call `setJSON` on the client
    await client.db.setJSON(privateKey, dataKey, jsonData);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);

    const data = JSON.parse(mock.history.post[1].data);
    expect(data).toBeDefined();
    expect(data.revision).toEqual(0);
  });

  it("should fail if the entry has the maximum allowed revision", async () => {
    // mock a successful registry lookup
    const entryData = {
      data,
      // String the bigint since JS doesn't support 64-bit numbers.
      revision: MAX_REVISION.toString(),
      signature:
        "18c76e88141c7cc76d8a77abcd91b5d64d8fc3833eae407ab8a5339e5fcf7940e3fa5830a8ad9439a0c0cc72236ed7b096ae05772f81eee120cbd173bfd6600e",
    };
    // Replace the quotes around the stringed bigint.
    const json = JSON.stringify(entryData).replace(REGEX_REVISION_NO_QUOTES, '"revision":"$1"');
    mock.onGet(registryLookupUrl).reply(200, json);

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // Try to set data, should fail.
    await expect(client.db.setJSON(privateKey, dataKey, entryData)).rejects.toThrowError(
      "Current entry already has maximum allowed revision, could not update the entry"
    );
  });

  it("Should throw an error if the private key is not hex-encoded", async () => {
    await expect(client.db.setJSON("foo", dataKey, {})).rejects.toThrowError(
      // change the message
      "bad secret key size"
    );
  });

  it("Should throw an error if the data key is not provided", async () => {
    // @ts-expect-error We do not pass the data key on purpose.
    await expect(client.db.setJSON(privateKey)).rejects.toThrowError(
      "Expected parameter 'dataKey' to be type 'string', was type 'undefined'"
    );
  });

  it("Should throw an error if the json is not provided", async () => {
    // @ts-expect-error We do not pass the json on purpose.
    await expect(client.db.setJSON(privateKey, dataKey)).rejects.toThrowError(
      // change the message
      "Request failed with status code 404"
    );
  });
});

describe("setEntryData", () => {
  it("should throw if trying to set entry data > 70 bytes", async () => {
    await expect(
      client.db.setEntryData(privateKey, dataKey, new Uint8Array(MAX_ENTRY_LENGTH + 1))
    ).rejects.toThrowError(
      "Expected parameter 'data' to be 'Uint8Array' of length <= 70, was length 71, was type 'object', value '0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0'"
    );
  });

  it("should throw if trying to set the deletion entry data", async () => {
    await expect(client.db.setEntryData(privateKey, dataKey, DELETION_ENTRY_DATA)).rejects.toThrowError(
      "Tried to set 'Uint8Array' entry data that is the deletion sentinel ('Uint8Array(RAW_SKYLINK_SIZE)'), please use the 'deleteEntryData' method instead`"
    );
  });
});

describe("checkCachedDataLink", () => {
  const differentSkylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
  // change
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
