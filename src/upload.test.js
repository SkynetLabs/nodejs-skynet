const axios = require("axios");
const fs = require("fs");
const tmp = require("tmp");

const { SkynetClient, defaultPortalUrl, uriSkynetPrefix } = require("../index");

jest.mock("axios");

const portalUrl = defaultPortalUrl();
const skylink = "XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
const sialink = `${uriSkynetPrefix}${skylink}`;
const client = new SkynetClient();

describe("uploadFile", () => {
  const filename = "testdata/file1.txt";

  beforeEach(() => {
    axios.mockResolvedValue({ data: { skylink } });
  });

  it("should send post request to default portal", async () => {
    await client.uploadFile(filename);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/skyfile`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([
            expect.stringContaining(
              'Content-Disposition: form-data; name="file"; filename="file1.txt"\r\nContent-Type: text/plain'
            ),
          ]),
        }),
        headers: expect.objectContaining({ "content-type": expect.stringContaining("multipart/form-data") }),
        params: expect.anything(),
      })
    );
  });

  it("should send post request to client portal", async () => {
    const newPortalUrl = "https://siasky.net";
    const client = new SkynetClient(newPortalUrl);

    await client.uploadFile(filename);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${newPortalUrl}/skynet/skyfile`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([
            expect.stringContaining(
              'Content-Disposition: form-data; name="file"; filename="file1.txt"\r\nContent-Type: text/plain'
            ),
          ]),
        }),
        headers: expect.objectContaining({ "content-type": expect.stringContaining("multipart/form-data") }),
        params: expect.anything(),
      })
    );
  });

  it("should use custom upload options if defined", async () => {
    await client.uploadFile(filename, {
      portalUrl: "https://localhost",
      endpointPath: "/skynet/file",
      portalFileFieldname: "filetest",
      customFilename: "test.jpg",
      dryRun: true,
    });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `https://localhost/skynet/file`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([
            expect.stringContaining('Content-Disposition: form-data; name="filetest"; filename="test.jpg"'),
          ]),
        }),
        headers: expect.anything(),
        params: { dryrun: true },
      })
    );
  });

  it("should use custom connection options if defined on the client", async () => {
    const client = new SkynetClient("", {
      APIKey: "foobar",
      skynetApiKey: "api-key",
      customUserAgent: "Sia-Agent",
      customCookie: "skynet-jwt=foo",
    });

    await client.uploadFile(filename);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/skyfile`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([
            expect.stringContaining(`Content-Disposition: form-data; name="file"; filename="file1.txt"`),
          ]),
        }),
        auth: { username: "", password: "foobar" },
        headers: expect.objectContaining({
          "User-Agent": "Sia-Agent",
          Cookie: "skynet-jwt=foo",
          "Skynet-Api-Key": "api-key",
        }),
        params: expect.anything(),
      })
    );
  });

  it("should use custom connection options if defined on the API call", async () => {
    const client = new SkynetClient("", {
      APIKey: "foobar",
      customUserAgent: "Sia-Agent",
      customCookie: "skynet-jwt=foo",
    });

    await client.uploadFile(filename, {
      APIKey: "barfoo",
      customUserAgent: "Sia-Agent-2",
      customCookie: "skynet-jwt=bar",
    });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/skyfile`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([
            expect.stringContaining(`Content-Disposition: form-data; name="file"; filename="file1.txt"`),
          ]),
        }),
        auth: { username: "", password: "barfoo" },
        headers: expect.objectContaining({ "User-Agent": "Sia-Agent-2", Cookie: "skynet-jwt=bar" }),
        params: expect.anything(),
      })
    );
  });

  it("should upload tmp files", async () => {
    const file = tmp.fileSync({ postfix: ".json" });
    fs.writeFileSync(file.fd, JSON.stringify("testing"));

    const data = await client.uploadFile(file.name);

    expect(data).toEqual(sialink);
  });

  it("should return skylink on success", async () => {
    const data = await client.uploadFile(filename);

    expect(data).toEqual(sialink);
  });

  it("should return skylink on success with dryRun", async () => {
    const data = await client.uploadFile(filename, { dryRun: true });

    expect(data).toEqual(sialink);
  });
});

describe("uploadDirectory", () => {
  const dirname = "testdata";
  const directory = ["file1.txt", "file2.txt", "dir1/file3.txt"];

  beforeEach(() => {
    axios.mockResolvedValue({ data: { skylink } });
  });

  it("should send post request to default portal", async () => {
    await client.uploadDirectory(dirname);

    for (const file of directory) {
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${portalUrl}/skynet/skyfile`,
          data: expect.objectContaining({
            _streams: expect.arrayContaining([
              expect.stringContaining(`Content-Disposition: form-data; name="files[]"; filename="${file}"`),
            ]),
          }),
          headers: expect.anything(),
          params: { filename: dirname },
        })
      );
    }
  });

  // Test that . and .. get resolved as these are not allowed in Sia paths.
  it("should resolve paths containing . and ..", async () => {
    await client.uploadDirectory(`${dirname}/./../${dirname}/.`);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { filename: dirname },
      })
    );
  });

  it("should send post request to client portal", async () => {
    const newPortalUrl = "https://siasky.xyz";
    const client = new SkynetClient(newPortalUrl);

    await client.uploadDirectory(dirname);

    for (const file of directory) {
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${newPortalUrl}/skynet/skyfile`,
          data: expect.objectContaining({
            _streams: expect.arrayContaining([
              expect.stringContaining(`Content-Disposition: form-data; name="files[]"; filename="${file}"`),
            ]),
          }),
          headers: expect.anything(),
          params: { filename: dirname },
        })
      );
    }
  });

  it("should use custom options if defined", async () => {
    await client.uploadDirectory(dirname, {
      portalUrl: "http://localhost",
      endpointPath: "/skynet/file",
      portalDirectoryFileFieldname: "filetest",
      customDirname: "/testpath",
      disableDefaultPath: true,
      dryRun: true,
    });

    for (const file of directory) {
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `http://localhost/skynet/file`,
          data: expect.objectContaining({
            _streams: expect.arrayContaining([
              expect.stringContaining(`Content-Disposition: form-data; name="filetest"; filename="${file}"`),
            ]),
          }),
          headers: expect.anything(),
          params: {
            filename: "testpath",
            disableDefaultPath: true,
            dryrun: true,
          },
        })
      );
    }
  });

  it("should set errorpages if defined", async () => {
    const errorPages = { 404: "404.html", 500: "500.html" };

    await client.uploadDirectory(dirname, { errorPages });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          errorpages: JSON.stringify(errorPages),
        }),
      })
    );
  });

  it("should set tryfiles if defined", async () => {
    const tryFiles = ["foo", "bar"];

    await client.uploadDirectory(dirname, { tryFiles });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          tryfiles: JSON.stringify(tryFiles),
        }),
      })
    );
  });

  it("should return single skylink on success", async () => {
    const data = await client.uploadDirectory(dirname);

    expect(data).toEqual(sialink);
  });

  it("should return single skylink on success with dryRun", async () => {
    const data = await client.uploadDirectory(dirname, { dryRun: true });

    expect(data).toEqual(sialink);
  });
});

describe("uploadData", () => {
  const filename = "testdata/file1.txt";
  const data = "asdf";

  beforeEach(() => {
    axios.mockResolvedValue({ data: { skylink } });
  });

  it("should send post request to default portal", async () => {
    const receivedSkylink = await client.uploadData(data, filename);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${portalUrl}/skynet/skyfile`,
        data: expect.objectContaining({
          _streams: expect.arrayContaining([
            expect.stringContaining(
              'Content-Disposition: form-data; name="file"; filename="file1.txt"\r\nContent-Type: text/plain'
            ),
          ]),
        }),
        headers: expect.objectContaining({ "content-type": expect.stringContaining("multipart/form-data") }),
        params: expect.anything(),
      })
    );

    expect(receivedSkylink).toEqual(`sia://${skylink}`);
  });
});
