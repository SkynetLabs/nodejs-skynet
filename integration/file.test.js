const { SkynetClient, defaultPortalUrl, uriSkynetPrefix } = require("../index");
const portalUrl = defaultPortalUrl();
const client = new SkynetClient(portalUrl);

const newTimeout = 60000;
jest.setTimeout(newTimeout);
jest.useRealTimers();

describe(`File API integration tests for portal '${portalUrl}'`, () => {
  const userID = "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35";
  const path = "snew.hns/asdf";

  it("Should get existing File API JSON data", async () => {
    const expected = { name: "testnames" };

    const { data: received } = await client.file.getJSON(userID, path);
    expect(received).toEqual(expect.objectContaining(expected));
  });

  it("Should get existing File API entry data", async () => {
    const expected = new Uint8Array([
      65, 65, 67, 116, 77, 77, 114, 101, 122, 76, 56, 82, 71, 102, 105, 98, 104, 67, 53, 79, 98, 120, 48, 83, 102, 69,
      106, 48, 77, 87, 108, 106, 95, 112, 55, 97, 95, 77, 107, 90, 85, 81, 45, 77, 57, 65,
    ]);

    const { data: received } = await client.file.getEntryData(userID, path);
    expect(received).toEqual(expected);
  });

  it("Should get an existing entry link for a user ID and path", async () => {
    const expected = `${uriSkynetPrefix}AQAKDRJbfAOOp3Vk8L-cjuY2d34E8OrEOy_PTsD0xCkYOQ`;

    const entryLink = await client.file.getEntryLink(userID, path);
    expect(entryLink).toEqual(expected);
  });
});
