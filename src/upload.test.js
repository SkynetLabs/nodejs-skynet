const axios = require("axios");
const fs = require("fs");
const tmp = require("tmp");

const { SkynetClient, defaultPortalUrl, uriSkynetPrefix } = require("../index");
const { TUS_CHUNK_SIZE } = require("./defaults");
const { splitSizeIntoChunkAlignedParts } = require("./utils_testing");

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

describe("uploadLargeFile", () => {
  const file = tmp.fileSync({ postfix: ".txt" });
  fs.writeFileSync(file.fd, Buffer.alloc(1024 * 1024 * 44).fill(0));
  const filename = file.name;

  it("should throw if the chunk size multiplier is less than 1", async () => {
    // @ts-expect-error Using protected method.
    await expect(client.uploadFile(filename, { chunkSizeMultiplier: 0 })).rejects.toThrowError(
      "Expected option 'opts.chunkSizeMultiplier' to be greater than or equal to 1, was type 'number', value '0'"
    );
  });

  it("should throw if the chunk size multiplier is not an integer", async () => {
    // @ts-expect-error Using protected method.
    await expect(client.uploadFile(filename, { chunkSizeMultiplier: 1.5 })).rejects.toThrowError(
      "Expected option 'opts.chunkSizeMultiplier' to be an integer value, was type 'number', value '1.5'"
    );
  });

  it("should throw if the number of parallel uploads is less than 1", async () => {
    // @ts-expect-error Using protected method.
    await expect(client.uploadFile(filename, { numParallelUploads: 0.5 })).rejects.toThrowError(
      "Expected option 'opts.numParallelUploads' to be greater than or equal to 1, was type 'number', value '0.5'"
    );
  });

  it("should throw if the number of parallel uploads is not an integer", async () => {
    // @ts-expect-error Using protected method.
    await expect(client.uploadFile(filename, { numParallelUploads: 1.5 })).rejects.toThrowError(
      "Expected option 'opts.numParallelUploads' to be an integer value, was type 'number', value '1.5'"
    );
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

describe("splitSizeIntoChunkAlignedParts", () => {
  const mib = 1 << 20;
  const chunk = TUS_CHUNK_SIZE;
  const cases = [
    [
      41 * mib,
      2,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 41 * mib },
      ],
    ],
    [
      80 * mib,
      2,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 80 * mib },
      ],
    ],
    [
      50 * mib,
      2,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 50 * mib },
      ],
    ],
    [
      100 * mib,
      2,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 100 * mib },
      ],
    ],
    [
      50 * mib,
      3,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 50 * mib },
        { start: 50 * mib, end: 50 * mib },
      ],
    ],
    [
      100 * mib,
      3,
      chunk,
      [
        { start: 0, end: 40 * mib },
        { start: 40 * mib, end: 80 * mib },
        { start: 80 * mib, end: 100 * mib },
      ],
    ],
    [
      500 * mib,
      6,
      chunk,
      [
        { start: 0 * mib, end: 80 * mib },
        { start: 80 * mib, end: 160 * mib },
        { start: 160 * mib, end: 240 * mib },
        { start: 240 * mib, end: 320 * mib },
        { start: 320 * mib, end: 400 * mib },
        { start: 400 * mib, end: 500 * mib },
      ],
    ],

    // Use larger chunk size.
    [
      81 * mib,
      2,
      chunk * 2,
      [
        { start: 0, end: 80 * mib },
        { start: 80 * mib, end: 81 * mib },
      ],
    ],
    [
      121 * mib,
      2,
      chunk * 3,
      [
        { start: 0, end: 120 * mib },
        { start: 120 * mib, end: 121 * mib },
      ],
    ],
    [
      121 * mib,
      3,
      chunk * 3,
      [
        { start: 0, end: 120 * mib },
        { start: 120 * mib, end: 121 * mib },
        { start: 121 * mib, end: 121 * mib },
      ],
    ],
  ];

  it.each(cases)(
    "(totalSize: '%s', partCount: '%s', chunkSize: '%s') should result in '%s'",
    (totalSize, partCount, chunkSize, expectedParts) => {
      const parts = splitSizeIntoChunkAlignedParts(totalSize, partCount, chunkSize);
      expect(parts).toEqual(expectedParts);
    }
  );

  const sizeTooSmallCases = [
    [40 * mib, 2, chunk * 2],
    [41 * mib, 2, chunk * 2],
    [40 * mib, 3, chunk * 3],
    [80 * mib, 2, chunk * 2],
    [40 * mib, 2, chunk],
    [40 * mib, 3, chunk],
    [0, 2, chunk],
  ];

  it.each(sizeTooSmallCases)(
    "(totalSize: '%s', partCount: '%s', chunkSize: '%s') should throw",
    (totalSize, partCount, chunkSize) => {
      expect(() => splitSizeIntoChunkAlignedParts(totalSize, partCount, chunkSize)).toThrowError(
        `Expected parameter 'totalSize' to be greater than the size of a chunk ('${chunkSize}'), was type 'number', value '${totalSize}'`
      );
    }
  );

  it("should throw if the partCount is 0", () => {
    expect(() => splitSizeIntoChunkAlignedParts(1, 0, 1)).toThrowError(
      "Expected parameter 'partCount' to be greater than or equal to 1, was type 'number', value '0'"
    );
  });

  it("should throw if the chunkSize is 0", () => {
    expect(() => splitSizeIntoChunkAlignedParts(1, 1, 0)).toThrowError(
      "Expected parameter 'chunkSize' to be greater than or equal to 1, was type 'number', value '0'"
    );
  });
});
