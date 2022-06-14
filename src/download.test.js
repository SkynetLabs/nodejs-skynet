const axios = require("axios");
const tmp = require("tmp");

const { SkynetClient, defaultPortalUrl } = require("../index");
const { extractNonSkylinkPath, trimForwardSlash } = require("./utils");

jest.mock("axios");

const attachment = "?attachment=true";
const portalUrl = defaultPortalUrl();
const hnsLink = "sky-os";
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const skylinkBase32 = "bg06v2tidkir84hg0s1s4t97jaeoaa1jse1svrad657u070c9calq4g";
const client = new SkynetClient();
const expectedUrl = `${portalUrl}/${skylink}`;
const expectedHnsUrl = `https://${hnsLink}.hns.siasky.net/`;
const expectedHnsUrlNoSubdomain = `${portalUrl}/hns/${hnsLink}`;
const expectedHnsresUrl = `${portalUrl}/hnsres/${hnsLink}`;
//const fullSkylink = expectedUrl;
const sialink = `sia://${skylink}`;
const entryLink = "AQDwh1jnoZas9LaLHC_D4-2yP9XYDdZzNtz62H4Dww1jDA";

const newTimeout = 60000;
jest.setTimeout(newTimeout);
jest.useRealTimers();

//const validHnsLink = ["doesn", "sky-os"];
const validHnsLinkUrl = [`https://${hnsLink}.hns.siasky.net/`, `https://sky-os.hns.siasky.net/`];
const validSkylinkVariations = [`sia://${skylink}`, `https://siasky.net/${skylink}`, skylink];
const validHnsLinkVariations = [hnsLink, `hns:${hnsLink}`, `hns://${hnsLink}`];

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

describe("downloadFileHns", () => {
  const tmpFile = tmp.fileSync();
  it.each(validHnsLinkVariations)("should download with the correct link using hns link %s", async (input) => {
    const url = await client.downloadFileHns(tmpFile.name, input, { download: true, subdomain: true });

    expect(url).toEqual(`${expectedHnsUrl}`);
    await tmpFile.removeCallback();
  });
});

describe("getSkylinkUrl", () => {
  const expectedUrl = `${portalUrl}/${skylink}`;

  it.each(validSkylinkVariations)(
    "should return correctly formed skylink URL using skylink %s",
    async (fullSkylink) => {
      const path = extractNonSkylinkPath(fullSkylink, skylink);
      let expectedPathUrl = expectedUrl;
      if (path !== "") {
        expectedPathUrl = `${expectedUrl}${path}`;
      }
      expect(await client.getSkylinkUrl(fullSkylink)).toEqual(expectedPathUrl);
    }
  );

  it("should return correctly formed URLs when path is given", async () => {
    expect(await client.getSkylinkUrl(skylink, { path: "foo/bar" })).toEqual(`${expectedUrl}/foo/bar`);
    expect(await client.getSkylinkUrl(skylink, { path: "foo?bar" })).toEqual(`${expectedUrl}/foo%3Fbar`);
  });

  it("should return correctly formed URL with forced download", async () => {
    const url = await client.getSkylinkUrl(skylink, { download: true, endpointDownload: "skynet/skylink" });

    expect(url).toEqual(`${portalUrl}/skynet/skylink/${skylink}${attachment}`);
  });

  it("should return correctly formed URLs with forced download and path", async () => {
    const url = await client.getSkylinkUrl(skylink, { download: true, path: "foo?bar" });

    expect(url).toEqual(`${expectedUrl}/foo%3Fbar${attachment}`);
  });

  const expectedBase32 = `https://${skylinkBase32}.siasky.net/`;

  it.each(validSkylinkVariations)("should convert base64 skylink to base32 using skylink %s", async (fullSkylink) => {
    let path = extractNonSkylinkPath(fullSkylink, skylink);
    path = trimForwardSlash(path);
    const url = await client.getSkylinkUrl(fullSkylink, { subdomain: true });

    expect(url).toEqual(`${expectedBase32}${path}`);
  });

  it("should throw if passing a non-string path", async () => {
    // @ts-expect-error we only check this use case in case someone ignores typescript typing
    await expect(client.getSkylinkUrl(skylink, { path: true })).rejects.toThrowError(
      "opts.path has to be a string, boolean provided"
    );
  });

  const invalidCases = ["123", `${skylink}xxx`, `${skylink}xxx/foo`, `${skylink}xxx?foo`];

  it.each(invalidCases)("should throw on invalid skylink %s", async (invalidSkylink) => {
    await expect(client.getSkylinkUrl(invalidSkylink)).rejects.toThrow();
    await expect(client.getSkylinkUrl(invalidSkylink, { subdomain: true })).rejects.toThrow();
  });
});

describe("getHnsUrl", () => {
  it.each(validHnsLinkVariations)(
    "should return correctly formed non-subdomain hns URL using hns link %s",
    async (input) => {
      expect(await client.getHnsUrl(input)).toEqual(expectedHnsUrl);
      expect(await client.getHnsUrl(input, { subdomain: false })).toEqual(expectedHnsUrlNoSubdomain);
    }
  );

  it("should return correctly formed hns URL with forced download", async () => {
    const url = await client.getHnsUrl(hnsLink, { download: true });

    expect(url).toEqual(`${expectedHnsUrl}${attachment}`);
  });
});

describe("getHnsresUrl", () => {
  it.each(validHnsLinkVariations)("should return correctly formed hnsres URL using hnsres link %s", async (input) => {
    expect(await client.getHnsresUrl(input)).toEqual(expectedHnsresUrl);
  });
});

describe("getMetadata", () => {
  const headers = {
    "skynet-portal-api": portalUrl,
    "skynet-skylink": skylink,
  };

  const skynetFileMetadata = { filename: "sia.pdf" };

  it("should successfully fetch skynet file metadata from skylink", async () => {
    axios.mockResolvedValue({ status: 200, data: skynetFileMetadata, headers: headers });
    const { metadata } = await client.getMetadata(skylink);

    expect(metadata).toEqual(skynetFileMetadata);
  });

  it("should throw if a path is supplied", async () => {
    axios.mockResolvedValue({ status: 200, data: skynetFileMetadata });

    await expect(client.getMetadata(`${skylink}/path/file`)).rejects.toThrowError(
      "Skylink string should not contain a path"
    );
  });

  it("should throw if no data was returned to getMetadata", async () => {
    axios.mockResolvedValue({ status: 200, headers: headers });

    await expect(client.getMetadata(skylink)).rejects.toThrowError(
      "Metadata response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'response.data' field missing"
    );
  });

  it("should throw if no headers were returned", async () => {
    axios.mockResolvedValue({ status: 200, data: {} });

    await expect(client.getMetadata(skylink)).rejects.toThrowError(
      "Metadata response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'response.headers' field missing"
    );
  });

  it("should throw if skynet-portal-api header is missing", async () => {
    const incompleteHeaders = {
      "skynet-portal-api": undefined,
      "skynet-skylink": skylink,
    };
    axios.mockResolvedValue({ status: 200, data: {}, headers: incompleteHeaders });

    await expect(client.getMetadata(skylink)).rejects.toThrowError(
      "Metadata response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'skynet-portal-api' header missing"
    );
  });

  it("should throw if skynet-skylink header is missing", async () => {
    const incompleteHeaders = {
      "skynet-portal-api": portalUrl,
      "skynet-skylink": undefined,
    };
    axios.mockResolvedValue({ status: 200, data: {}, headers: incompleteHeaders });

    await expect(client.getMetadata(skylink)).rejects.toThrowError(
      "Metadata response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'skynet-skylink' header missing"
    );
  });
});

describe("getFileContent", () => {
  const skynetFileContents = { arbitrary: "json string" };

  it.each(validSkylinkVariations)("should successfully fetch skynet file content for %s", async (input) => {
    const headers = {
      "skynet-portal-api": portalUrl,
      "skynet-skylink": skylink,
      "content-type": "application/json",
    };
    axios.mockResolvedValue({ status: 200, data: skynetFileContents, headers: headers });

    const { data, contentType, skylink: skylink2 } = await client.getFileContent(input);

    expect(data).toEqual(skynetFileContents);
    expect(contentType).toEqual("application/json");
    expect(skylink2).toEqual(sialink);
  });

  it("should throw if data is not returned", async () => {
    const headers = {
      "skynet-portal-api": portalUrl,
      "skynet-skylink": skylink,
      "content-type": "application/json",
    };
    axios.mockResolvedValue({ status: 200, headers: headers });

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'response.data' field missing"
    );
  });

  it("should throw if no headers are returned", async () => {
    axios.mockResolvedValue({ status: 200, data: {} });

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'response.headers' field missing"
    );
  });

  it("should throw if content-type header is missing", async () => {
    const incompleteHeaders = {
      "skynet-portal-api": portalUrl,
      "skynet-skylink": skylink,
      "content-type": undefined,
    };
    axios.mockResolvedValue({ status: 200, data: {}, headers: incompleteHeaders });

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'content-type' header missing"
    );
  });

  it("should throw if skynet-portal-api header is missing", async () => {
    const incompleteHeaders = {
      "skynet-portal-api": undefined,
      "skynet-skylink": skylink,
      "content-type": "application/json",
    };
    axios.mockResolvedValue({ status: 200, data: {}, headers: incompleteHeaders });

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'skynet-portal-api' header missing"
    );
  });

  it("should throw if skynet-skylink header is missing", async () => {
    const incompleteHeaders = {
      "skynet-portal-api": portalUrl,
      "skynet-skylink": undefined,
      "content-type": "application/json",
    };
    axios.mockResolvedValue({ status: 200, data: {}, headers: incompleteHeaders });

    await expect(client.getFileContent(skylink)).rejects.toThrowError(
      "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'skynet-skylink' header missing"
    );
  });

  it("should set range header if range option is set", async () => {
    const headers = {
      "skynet-portal-api": portalUrl,
      "skynet-skylink": skylink,
      "content-type": "application/json",
    };
    const skynetFileContents = { arbitrary: "json string", headers: { range: "4000-5000" } };
    axios.mockResolvedValue({ status: 200, data: skynetFileContents, headers: headers });
    const range = "4000-5000";
    const request = await client.getFileContent(skylink, { range });

    expect(request.data.headers["range"]).toEqual(range);
  });

  it("should register onDownloadProgress callback if defined", async () => {
    const skynetFileContents2 = { arbitrary: "json string", onDownloadProgress: jest.fn() };
    const headers = {
      "skynet-portal-api": portalUrl,
      "skynet-skylink": skylink,
      "content-type": "application/json",
    };
    axios.mockResolvedValue({ status: 200, data: skynetFileContents, headers: headers });
    // Assert `onDownloadProgress` is not defined if not set.
    const request1 = await client.getFileContent(skylink);

    expect(request1.onDownloadProgress).not.toBeDefined();

    axios.mockResolvedValue({ status: 200, data: skynetFileContents2, headers: headers });
    // Assert `onDownloadProgress` is defined when passed as an option.
    const request2 = await client.getFileContent(skylink, { onDownloadProgress: jest.fn() });

    expect(request2.data.onDownloadProgress).toBeDefined();
  });

  describe("proof validation", () => {
    const headers = {
      "skynet-portal-api": portalUrl,
      "skynet-skylink": skylink,
      "content-type": "application/json",
    };

    it("should throw if skynet-proof header is not valid JSON", async () => {
      const headersWithProof = { ...headers };
      headersWithProof["skynet-proof"] = "foo";
      axios.mockResolvedValue({ status: 200, data: {}, headers: headersWithProof });

      await expect(client.getFileContent(skylink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Could not parse 'skynet-proof' header as JSON: SyntaxError: Unexpected token o in JSON at position 1"
      );
    });

    it("should throw if skynet-proof header is null", async () => {
      const headersWithProof = { ...headers };
      headersWithProof["skynet-proof"] = "null";
      axios.mockResolvedValue({ status: 200, data: {}, headers: headersWithProof });

      await expect(client.getFileContent(skylink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Could not parse 'skynet-proof' header as JSON: Error: Could not parse 'skynet-proof' header as JSON"
      );
    });

    it("should throw if skynet-skylink does not match input data link", async () => {
      const headersWithProof = { ...headers };
      headersWithProof["skynet-proof"] = "[]";
      headersWithProof["skynet-skylink"] = entryLink;
      axios.mockResolvedValue({ status: 200, data: {}, headers: headersWithProof });
      await expect(client.getFileContent(skylink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected returned skylink ('AQDwh1jnoZas9LaLHC_D4-2yP9XYDdZzNtz62H4Dww1jDA') to be the same as input data link ('XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg')"
      );
    });

    it("should throw if proof is present for data link", async () => {
      const headersWithProof = { ...headers };
      headersWithProof["skynet-proof"] = "[1, 2]";
      axios.mockResolvedValue({ status: 200, data: {}, headers: headersWithProof });

      await expect(client.getFileContent(skylink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected 'skynet-proof' header to be empty for data link"
      );
    });

    it("should throw if skynet-skylink matches input entry link", async () => {
      const headersWithProof = { ...headers };
      headersWithProof["skynet-proof"] = "[]";
      headersWithProof["skynet-skylink"] = entryLink;
      axios.mockResolvedValue({ status: 200, data: {}, headers: headersWithProof });
      await expect(client.getFileContent(entryLink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected returned skylink ('AQDwh1jnoZas9LaLHC_D4-2yP9XYDdZzNtz62H4Dww1jDA') to be different from input entry link"
      );
    });

    it("should throw if proof is empty for entry link", async () => {
      const headersWithProof = { ...headers };
      headersWithProof["skynet-proof"] = "[]";
      axios.mockResolvedValue({ status: 200, data: {}, headers: headersWithProof });

      await expect(client.getFileContent(entryLink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected registry proof not to be empty"
      );
    });

    it("should throw if proof contains unsupported registry type", async () => {
      const headersWithProof = { ...headers };
      // Corrupt the type.
      headersWithProof[
        "skynet-proof"
      ] = `[{"data":"5c006f8bb26d25b412300703c275279a9d852833e383cfed4d314fe01c0c4b155d12","revision":0,"datakey":"43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292","publickey":{"algorithm":"ed25519","key":"y/l99FyfFm6JPhZL5xSkruhA06Qh9m5S9rnipQCc+rw="},"signature":"5a1437508eedb6f5352d7f744693908a91bb05c01370ce4743de9c25f761b4e87760b8172448c073a4ddd9d58d1a2bf978b3227e57e4fa8cbe830a2353be2207","type":0}]`;
      axios.mockResolvedValue({ status: 200, data: {}, headers: headersWithProof });

      await expect(client.getFileContent(entryLink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Unsupported registry type in proof: '0'"
      );
    });

    it("should throw if proof chain is invalid", async () => {
      // Corrupt the input skylink.
      const newSkylink = entryLink.replace("-", "_");

      const headersWithProof = { ...headers };
      headersWithProof[
        "skynet-proof"
      ] = `[{"data":"5c006f8bb26d25b412300703c275279a9d852833e383cfed4d314fe01c0c4b155d12","revision":0,"datakey":"43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292","publickey":{"algorithm":"ed25519","key":"y/l99FyfFm6JPhZL5xSkruhA06Qh9m5S9rnipQCc+rw="},"signature":"5a1437508eedb6f5352d7f744693908a91bb05c01370ce4743de9c25f761b4e87760b8172448c073a4ddd9d58d1a2bf978b3227e57e4fa8cbe830a2353be2207","type":1}]`;
      axios.mockResolvedValue({ status: 200, data: {}, headers: headersWithProof });

      await expect(client.getFileContent(newSkylink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Could not verify registry proof chain"
      );
    });

    it("should throw if signature is invalid", async () => {
      const headersWithProof = { ...headers };
      // Use a corrupted signature.
      headersWithProof[
        "skynet-proof"
      ] = `[{"data":"5c006f8bb26d25b412300703c275279a9d852833e383cfed4d314fe01c0c4b155d12","revision":0,"datakey":"43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292","publickey":{"algorithm":"ed25519","key":"y/l99FyfFm6JPhZL5xSkruhA06Qh9m5S9rnipQCc+rw="},"signature":"4a1437508eedb6f5352d7f744693908a91bb05c01370ce4743de9c25f761b4e87760b8172448c073a4ddd9d58d1a2bf978b3227e57e4fa8cbe830a2353be2207","type":1}]`;
      axios.mockResolvedValue({ status: 200, data: {}, headers: headersWithProof });

      await expect(client.getFileContent(entryLink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Could not verify signature from retrieved, signed registry entry in registry proof"
      );
    });

    it("should throw if proof chain results in different data link", async () => {
      const dataLink = "EAAFgq17B-MKsi0ARYKUMmf9vxbZlDpZkA6EaVBCG4YBAQ";

      const headersWithProof = { ...headers };
      headersWithProof[
        "skynet-proof"
      ] = `[{"data":"5c006f8bb26d25b412300703c275279a9d852833e383cfed4d314fe01c0c4b155d12","revision":0,"datakey":"43c8a9b01609544ab152dad397afc3b56c1518eb546750dbc6cad5944fec0292","publickey":{"algorithm":"ed25519","key":"y/l99FyfFm6JPhZL5xSkruhA06Qh9m5S9rnipQCc+rw="},"signature":"5a1437508eedb6f5352d7f744693908a91bb05c01370ce4743de9c25f761b4e87760b8172448c073a4ddd9d58d1a2bf978b3227e57e4fa8cbe830a2353be2207","type":1}]`;
      headersWithProof["skynet-skylink"] = dataLink;
      axios.mockResolvedValue({ status: 200, data: {}, headers: headersWithProof });

      await expect(client.getFileContent(entryLink)).rejects.toThrowError(
        "File content response invalid despite a successful request. Please try again and report this issue to the devs if it persists. Error: Could not verify registry proof chain"
      );
    });
  });
});

describe("getFileContentBinary", () => {
  const headers = {
    "skynet-portal-api": portalUrl,
    "skynet-skylink": skylink,
    "content-type": "application/json",
  };

  it('should throw if responseType option is not "arraybuffer"', async () => {
    // This should throw.
    await expect(client.getFileContentBinary(skylink, { responseType: "json" })).rejects.toThrowError(
      "Unexpected 'responseType' option found for 'getFileContentBinary': 'json'"
    );
  });

  it('should not throw if responseType option is "arraybuffer"', async () => {
    const binaryData = [0, 1, 2, 3];
    axios.mockResolvedValue({ status: 200, data: binaryData, headers: headers });

    // Should not throw if "arraybuffer" is passed.
    const {
      data,
      contentType,
      skylink: skylink2,
    } = await client.getFileContentBinary(skylink, { responseType: "arraybuffer" });

    expect(data).toEqual(new Uint8Array(binaryData));
    expect(contentType).toEqual("application/json");
    expect(skylink2).toEqual(sialink);
  });
});

describe("getFileContentHns", () => {
  const skynetFileContents = { arbitrary: "json string" };
  const headers = {
    "skynet-portal-api": portalUrl,
    "skynet-skylink": skylink,
    "content-type": "application/json",
  };

  it.each(validHnsLinkVariations)("should successfully fetch skynet file content for domain '%s'", async (domain) => {
    axios.mockResolvedValueOnce({ status: 200, data: skynetFileContents, headers: headers });
    axios.mockResolvedValueOnce({ status: 200, data: { skylink }, headers: headers });

    const { data } = await client.getFileContentHns(domain);

    expect(data).toEqual(skynetFileContents);
  });
});

describe("getFileContentBinaryHns", () => {
  const headers = {
    "skynet-portal-api": portalUrl,
    "skynet-skylink": skylink,
    "content-type": "application/json",
  };

  it('should throw if responseType option is not "arraybuffer"', async () => {
    // This should throw.
    await expect(client.getFileContentBinaryHns(skylink, { responseType: "json" })).rejects.toThrowError(
      "Unexpected 'responseType' option found for 'getFileContentBinary': 'json'"
    );
  });

  it("should succeed with given domain", async () => {
    const binaryData = [0, 1, 2, 3];
    axios.mockResolvedValueOnce({ status: 200, data: binaryData, headers: headers });
    axios.mockResolvedValueOnce({ status: 200, data: { skylink }, headers: headers });

    // Should not throw if "arraybuffer" is passed.
    const { data } = await client.getFileContentBinaryHns(hnsLink);

    expect(data).toEqual(new Uint8Array(binaryData));
  });
});

describe("openFile", () => {
  const windowOpen = jest.spyOn(global.window, "open").mockImplementation();
  it.each(validSkylinkVariations)(
    "should call window.openFile when calling openFile with skylink %s",
    async (fullSkylink) => {
      windowOpen.mockReset();

      const path = extractNonSkylinkPath(fullSkylink, skylink);
      await client.openFile(fullSkylink);

      const expectedPathUrl = `${expectedUrl}${path}`;
      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(expectedPathUrl, "_blank");
    }
  );
});

describe("openFileHns", () => {
  it("should set domain with the portal and hns link and then call window.openFile", async () => {
    const windowOpen = jest.spyOn(global.window, "open").mockImplementation();

    for (const input of validHnsLinkVariations) {
      windowOpen.mockReset();
      await client.openFileHns(input);

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(validHnsLinkUrl[1], "_blank");
    }
  });
});

describe("resolveHns", () => {
  it.each(validHnsLinkVariations)(
    "should call axios.get with the portal and hnsres link for %s and return the json body",
    async (hnsLink) => {
      axios.mockResolvedValueOnce({ status: 200, data: { skylink } });
      const data = await client.resolveHns(hnsLink);

      expect(data.skylink).toEqual(skylink);
    }
  );

  it("should throw if no data was returned to resolveHns", async () => {
    axios.mockResolvedValueOnce({ status: 200 });

    await expect(client.resolveHns(hnsLink)).rejects.toThrowError(
      "Did not get a complete resolve HNS response despite a successful request. Please try again and report this issue to the devs if it persists. Error: 'response.data' field missing"
    );
  });

  it("should throw if unexpected data was returned to resolveHns", async () => {
    axios.mockResolvedValueOnce({ status: 200, data: { foo: "foo" } });

    await expect(client.resolveHns(hnsLink)).rejects.toThrowError(
      "Did not get a complete resolve HNS response despite a successful request. Please try again and report this issue to the devs if it persists. Error: Expected response data object 'response.data' to be object containing skylink or registry field, was type 'object', value '[object Object]'"
    );
  });
});
