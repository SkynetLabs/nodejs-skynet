const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const { SkynetClient } = require("../index");
const {
  stringToUint8ArrayUtf8,
  getSkylinkUrlForPortal,
  DEFAULT_SKYNET_PORTAL_URL,
  getEntryUrlForPortal,
  JsonData,
} = require("skynet-js");
const { getSettledValues, JSONResponse } = require("./defaults");
const { toHexString } = require("./utils");

// Generated with genKeyPairFromSeed("insecure test seed")
const [publicKey, privateKey] = [
  "658b900df55e983ce85f3f9fb2a088d568ab514e7bbda51cfbfb16ea945378d9",
  "7caffac49ac914a541b28723f11776d36ce81e7b9b0c96ccacd1302db429c79c658b900df55e983ce85f3f9fb2a088d568ab514e7bbda51cfbfb16ea945378d9",
];
const dataKey = "app";
const skylink = "CABAB_1Dt0FJsxqsu_J4TodNCbCGvtFf1Uys_3EgzOlTcg";
const merkleroot = "QAf9Q7dBSbMarLvyeE6HTQmwhr7RX9VMrP9xIMzpU3I";
const bitfield = 2048;

const portalUrl = DEFAULT_SKYNET_PORTAL_URL;
const uploadUrl = `${portalUrl}/skynet/skyfile`;
const skylinkUrl = getSkylinkUrlForPortal(portalUrl, skylink);
const registryPostUrl = `${portalUrl}/skynet/registry`;
const registryGetUrl = getEntryUrlForPortal(portalUrl, publicKey, dataKey);

// Hex-encoded skylink.
const data = "43414241425f31447430464a73787173755f4a34546f644e4362434776744666315579735f3345677a4f6c546367";

const newTimeout = 60000;
jest.setTimeout(newTimeout);
jest.useRealTimers();

const headers = {
  "skynet-portal-api": portalUrl,
  "skynet-skylink": skylink,
  "content-type": "application/json",
};

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
  const skylinkOldUrl = getSkylinkUrlForPortal(portalUrl, skylinkOld);
  const dataOld = toHexString(stringToUint8ArrayUtf8(skylinkOld)); // hex-encoded skylink
  const revisionOld = 0;
  const entryDataOld = {
    data: dataOld,
    revision: revisionOld,
    signature:
      "921d30e860d51f13d1065ea221b29fc8d11cfe7fa0e32b5d5b8e13bee6f91cfa86fe6b12ca4cef7a90ba52d2c50efb62b241f383e9d7bb264558280e564faa0f",
  };
  const headersOld = { ...headers, "skynet-skylink": skylinkOld };

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
  const skynetJsonOld = { _data: jsonOld, _v: 2 };
  const skynetJsonNew = { _data: jsonNew, _v: 2 };

  const concurrentAccessError = "Concurrent access prevented in SkyDB";
  //const higherRevisionError = "A higher revision number for this userID and path is already cached";

  it("should not get old data when getJSON and setJSON are called simultaneously on the same client and getJSON doesn't fail", async () => {
    // Create a new client with a fresh revision cache.
    const client = new SkynetClient(portalUrl);

    // Mock setJSON with the old skylink.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkOld, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);

    // Set the data.
    await client.dbV2.setJSON(privateKey, dataKey, jsonOld);

    // Mock getJSON with the new entry data and the new skylink.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataNew));
    mock.onGet(skylinkNewUrl).replyOnce(200, skynetJsonNew, headers);

    // Mock setJSON with the new skylink.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkNew, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);

    // Try to invoke the data race.
    // Get the data while also calling setJSON.
    //
    // Use Promise.allSettled to wait for all promises to finish, or some mocked
    // requests will hang around and interfere with the later tests.
    const settledResults = await Promise.allSettled([
      client.dbV2.getJSON(publicKey, dataKey),
      client.dbV2.setJSON(privateKey, dataKey, jsonNew),
    ]);

    let data = JsonData | null;
    try {
      //const values = getSettledValues<JSONResponse>(settledResults);
      const values = getSettledValues(settledResults);
      data = values[0].data;
    } catch (e) {
      // If any promises were rejected, check the error message.
      if (e.message.includes(concurrentAccessError)) {
        // The data race condition was avoided and we received the expected
        // error. Return from test early.
        return;
      }
      throw e;
    }

    // Data race did not occur, getJSON should have latest JSON.
    expect(data).toEqual(jsonNew);

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(2);
    expect(mock.history.post.length).toBe(4);
  });

  it("should not mess up cache when two setJSON calls are made simultaneously and one fails", async () => {
    // Create a new client with a fresh revision cache.
    const client = new SkynetClient(portalUrl);

    // Mock a successful setJSON.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkOld, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);

    // Use Promise.allSettled to wait for all promises to finish, or some mocked
    // requests will hang around and interfere with the later tests.
    const values = await Promise.allSettled([
      client.dbV2.setJSON(privateKey, dataKey, jsonOld),
      client.dbV2.setJSON(privateKey, dataKey, jsonOld),
    ]);

    try {
      getSettledValues < JSONResponse > values;
    } catch (e) {
      if (e.message.includes(concurrentAccessError)) {
        // The data race condition was avoided and we received the expected
        // error. Return from test early.
        return;
      }
      throw e;
    }

    const cachedRevisionEntry = await client.dbV2.revisionNumberCache.getRevisionAndMutexForEntry(publicKey, dataKey);
    expect(cachedRevisionEntry.revision.toString()).toEqual("0");

    // Make a getJSON call.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataOld));
    mock.onGet(skylinkOldUrl).replyOnce(200, skynetJsonOld, headersOld);
    const { data: receivedJson1 } = await client.dbV2.getJSON(publicKey, dataKey);

    expect(receivedJson1).toEqual(jsonOld);

    // Make another setJSON call - it should still work.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkNew, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);
    await client.dbV2.setJSON(privateKey, dataKey, jsonNew);

    expect(cachedRevisionEntry.revision.toString()).toEqual("1");

    // Make a getJSON call.
    mock.onGet(registryGetUrl).replyOnce(200, JSON.stringify(entryDataNew));
    mock.onGet(skylinkNewUrl).replyOnce(200, skynetJsonNew, headersNew);
    const { data: receivedJson2 } = await client.dbV2.getJSON(publicKey, dataKey);

    expect(receivedJson2).toEqual(jsonNew);

    expect(mock.history.get.length).toBe(4);
    expect(mock.history.post.length).toBe(4);
  });

  it("should not mess up cache when two setJSON calls are made simultaneously on different clients and one fails", async () => {
    // Create two new clients with a fresh revision cache.
    const client1 = new SkynetClient(portalUrl);
    const client2 = new SkynetClient(portalUrl);

    // Run two simultaneous setJSONs on two different clients - one should work,
    // one should fail due to bad revision number.

    // Mock a successful setJSON.
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkOld, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(204);
    // Mock a failed setJSON (bad revision number).
    mock.onPost(uploadUrl).replyOnce(200, { skylink: skylinkOld, merkleroot, bitfield });
    mock.onPost(registryPostUrl).replyOnce(400);

    // Use Promise.allSettled to wait for all promises to finish, or some mocked
    // requests will hang around and interfere with the later tests.
    const values = await Promise.allSettled([
      client1.dbV2.setJSON(privateKey, dataKey, jsonOld),
      client2.dbV2.setJSON(privateKey, dataKey, jsonOld),
    ]);

    let successClient;
    //let failClient;
    if (values[0].status === "rejected") {
      successClient = client2;
    } else {
      successClient = client1;
    }

    // Test that the client that succeeded has a consistent cache.

    const cachedRevisionEntrySuccess = await successClient.dbV2.revisionNumberCache.getRevisionAndMutexForEntry(
      publicKey,
      dataKey
    );
    expect(cachedRevisionEntrySuccess.revision.toString()).toEqual("0");
  });
});
