const axios = require("axios");
const tmp = require("tmp");

const { SkynetClient, defaultPortalUrl } = require("../index");

jest.mock("axios");

const portalUrl = defaultPortalUrl();
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const client = new SkynetClient();

describe("downloadFile", () => {
  const body = "asdf";

  beforeEach(() => {
    axios.mockResolvedValue({ data: { body, pipe: function () {} } });
  });

  it("should send get request to default portal", () => {
    const tmpFile = tmp.fileSync();

    client.downloadFile(tmpFile.name, skylink);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/${skylink}`,
        method: "get",
        responseType: "stream",
      })
    );

    tmpFile.removeCallback();
  });

  it("should use custom options if defined on the API call", () => {
    const tmpFile = tmp.fileSync();

    client.downloadFile(tmpFile.name, skylink, {
      portalUrl: "http://localhost",
      customCookie: "skynet-jwt=foo",
    });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `http://localhost/${skylink}`,
        method: "get",
        responseType: "stream",
        headers: expect.objectContaining({ Cookie: "skynet-jwt=foo" }),
      })
    );

    tmpFile.removeCallback();
  });

  it("should use custom connection options if defined on the client", () => {
    const tmpFile = tmp.fileSync();
    const client = new SkynetClient("", {
      APIKey: "foobar",
      skynetApiKey: "api-key-1",
      customUserAgent: "Sia-Agent",
      customCookie: "skynet-jwt=foo",
    });

    client.downloadFile(tmpFile.name, skylink, {
      APIKey: "barfoo",
      skynetApiKey: "api-key-2",
      customUserAgent: "Sia-Agent-2",
      customCookie: "skynet-jwt=bar",
    });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/${skylink}`,
        auth: { username: "", password: "barfoo" },
        headers: expect.objectContaining({
          "User-Agent": "Sia-Agent-2",
          Cookie: "skynet-jwt=bar",
          "Skynet-Api-Key": "api-key-2",
        }),
      })
    );

    tmpFile.removeCallback();
  });
});

describe("downloadData", () => {
  const body = "asdf";

  beforeEach(() => {
    axios.mockResolvedValue({ data: body });
  });

  it("should send get request to default portal", async () => {
    const data = await client.downloadData(skylink);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/${skylink}`,
        method: "get",
        responseType: "arraybuffer",
      })
    );

    expect(data).toEqual(body);
  });
});
