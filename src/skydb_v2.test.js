const axios = require("axios");

const { SkynetClient, genKeyPairFromSeed } = require("../index");

jest.mock("axios");

const dataKey = "testdatakey";
const data = { example: "This is some example JSON data for SkyDB V2." };
const { publicKey, privateKey } = genKeyPairFromSeed("Super Save Test Secret two");

const skylink = "AAB1QJWQV0y2ynDXnJvOt0uh-THq-pJj2_layW5fjPXhTQ";
const client = new SkynetClient("https://siasky.net");
const dataLink = "sia://AAChv5I6FTTqd8_6mtIOgwd5AhxurcYY9OSc-FacWlurEw";
const dataLink_dbV2 = "sia://AAA_uTgxYiKcqpGMLNe2V52fLc3FivZBZStLVqMSeHnGtQ";
const rawEntryData = Uint8Array.from([
  0, 0, 161, 191, 146, 58, 21, 52, 234, 119, 207, 250, 154, 210, 14, 131, 7, 121, 2, 28, 110, 173, 198, 24, 244, 228,
  156, 248, 86, 156, 90, 91, 171, 19,
]);
const RawBytesData =
  "[123,34,95,100,97,116,97,34,58,123,34,101,120,97,109,112,108,101,34,58,34,84,104,105,115,32,105,115,32,115,111,109,101,32,101,120,97,109,112,108,101,32,74,83,79,78,32,100,97,116,97,32,50,46,34,125,44,34,95,118,34,58,50,125]";

jest.setTimeout(60000); // 60 second timeout
jest.useRealTimers();

beforeEach(() => {
  axios.mockResolvedValue({ data: { skylink } });
});

describe("SkyDB V2", () => {
  describe("dbV2.getJSON", () => {
    it("should send post request to default portal", async () => {
      const receivedData = await client.dbV2.getJSON(publicKey, dataKey);

      await expect(receivedData.data).toEqual(null);
    });
  });

  describe("dbV2.setJSON", () => {
    it("should send post request to default portal", async () => {
      const receivedData = await client.dbV2.setJSON(privateKey, dataKey, data);

      await expect(receivedData.dataLink).toEqual(`sia://${skylink}`);
    });
  });

  describe("dbV2.getJSON", () => {
    it("should send post request to default portal", async () => {
      const receivedData = await client.dbV2.getJSON(publicKey, dataKey);

      await expect(receivedData.data).toEqual(data);
    });
  });

  describe("dbV2.setDataLink", () => {
    it("should be a DataLink set", async () => {
      await client.dbV2.setDataLink(privateKey, dataKey, dataLink);
    });
  });

  describe("dbV2.setEntryData", () => {
    it("should set EntryData", async () => {
      const receivedData = await client.dbV2.setEntryData(privateKey, dataKey, rawEntryData);

      await expect(receivedData["data"]).toEqual(rawEntryData);
    });
  });

  describe("dbV2.getEntryData", () => {
    it("should get EntryData", async () => {
      const receivedData = await client.dbV2.getEntryData(publicKey, dataKey);

      await expect(receivedData["data"]).toEqual(rawEntryData);
    });
  });

  describe("dbV2.getRawBytes", () => {
    it("should get RawBytes", async () => {
      const receivedData = await client.dbV2.getRawBytes(publicKey, dataKey);

      await expect(receivedData["dataLink"]).toEqual(dataLink || dataLink_dbV2);
      await expect("[" + receivedData["data"] + "]").toEqual(RawBytesData);
    });
  });

  describe("dbV2.deleteJSON", () => {
    it("should delete jsonData on skydb", async () => {
      await client.dbV2.deleteJSON(privateKey, dataKey);
      const receivedData = await client.dbV2.getJSON(publicKey, dataKey);

      await expect(receivedData.data).toEqual(null);
      await expect(receivedData.dataLink).toEqual(null);
    });
  });
});
