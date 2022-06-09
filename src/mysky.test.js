const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const { SkynetClient } = require("../index");
const { DEFAULT_SKYNET_PORTAL_URL } = require("skynet-js");
const portalUrl = DEFAULT_SKYNET_PORTAL_URL;
const client = new SkynetClient(portalUrl);

const newTimeout = 60000;
jest.setTimeout(newTimeout);
jest.useRealTimers();

describe("extractDomain", () => {
  let mock = MockAdapter;

  const portalDomain = "siasky.net";
  const serverPortalDomain = `us-va-1.${portalDomain}`;
  const serverPortalUrl = `https://${serverPortalDomain}`;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    // Responses for regular portal.
    mock
      .onHead(portalUrl)
      .replyOnce(200, {}, { "skynet-server-api": serverPortalUrl })
      .onHead(portalUrl)
      .replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const cases = "https://sky-os.hns.siasky.net/";

  it(`should extract from full URL '%s' the app domain '%s' using portal '${portalUrl}'`, async () => {
    const domain = await client.extractDomain(cases);

    expect(domain).toEqual("sky-os.hns");
  });
});

describe("getFullDomainUrl", () => {
  let mock = MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.onHead(portalUrl).replyOnce(200, {}, { "skynet-portal-api": portalUrl });
  });

  const domains = ["sky-os.hns"];
  const expectedUrl = "https://sky-os.hns.siasky.net";

  it.each(domains)("Should turn domain %s into full URL %s", async (domain) => {
    const fullUrl = await client.getFullDomainUrl(domain);

    expect(fullUrl).toEqual(expectedUrl);
  });
});
