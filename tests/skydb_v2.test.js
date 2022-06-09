const { client, portal } = require(".");
const { genKeyPairAndSeed, formatSkylink } = require("../index");

const dataKey = "testdatakey";
const data = { example: "This is some example JSON data for SkyDB V2." };
const { publicKey, privateKey } = genKeyPairAndSeed();

const skylink = "AAB1QJWQV0y2ynDXnJvOt0uh-THq-pJj2_layW5fjPXhTQ";
const dataLink = "sia://AAChv5I6FTTqd8_6mtIOgwd5AhxurcYY9OSc-FacWlurEw";
const rawEntryData = Uint8Array.from([
  0, 0, 161, 191, 146, 58, 21, 52, 234, 119, 207, 250, 154, 210, 14, 131, 7, 121, 2, 28, 110, 173, 198, 24, 244, 228,
  156, 248, 86, 156, 90, 91, 171, 19,
]);
const rawBytesData =
  "[123,34,95,100,97,116,97,34,58,123,34,101,120,97,109,112,108,101,34,58,34,84,104,105,115,32,105,115,32,115,111,109,101,32,101,120,97,109,112,108,101,32,74,83,79,78,32,100,97,116,97,32,50,46,34,125,44,34,95,118,34,58,50,125]";

describe(`SkyDB V2 end to end integration tests for portal ${portal}`, () => {
  describe("dbV2.getJSON", () => {
    it("should get jsonData from skydb", async () => {
      const receivedData = await client.dbV2.getJSON(publicKey, dataKey);

      await expect(receivedData.data).toEqual(null);
    });
  });

  describe("dbV2.setJSON", () => {
    it("should set jsonData to skydb", async () => {
      const receivedData = await client.dbV2.setJSON(privateKey, dataKey, data);

      await expect(formatSkylink(receivedData["dataLink"])).toEqual(`sia://${skylink}`);
    });
  });

  describe("dbV2.getJSON", () => {
    it("should get jsonData from skydb", async () => {
      const receivedData = await client.dbV2.getJSON(publicKey, dataKey);

      await expect(receivedData.data).toEqual(data);
    });
  });

  describe("dbV2.setDataLink", () => {
    it("should be a dataLink set", async () => {
      await client.dbV2.setDataLink(privateKey, dataKey, dataLink);
    });
  });

  describe("dbV2.setEntryData", () => {
    it("should set entryData", async () => {
      const receivedData = await client.dbV2.setEntryData(privateKey, dataKey, rawEntryData);

      await expect(receivedData["data"]).toEqual(rawEntryData);
    });
  });

  describe("dbV2.getEntryData", () => {
    it("should get entryData", async () => {
      const receivedData = await client.dbV2.getEntryData(publicKey, dataKey);

      await expect(receivedData["data"]).toEqual(rawEntryData);
    });
  });

  describe("dbV2.getRawBytes", () => {
    it("should get rawBytes", async () => {
      const receivedData = await client.dbV2.getRawBytes(publicKey, dataKey);

      await expect(formatSkylink(receivedData["dataLink"])).toEqual(dataLink);
      await expect("[" + receivedData["data"] + "]").toEqual(rawBytesData);
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
