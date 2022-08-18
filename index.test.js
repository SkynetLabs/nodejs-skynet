const { SkynetClient } = require("./index");

describe("SkynetClient", () => {
  it("should contain all api methods", () => {
    const client = new SkynetClient();

    // Download
    expect(client).toHaveProperty("downloadData");
    expect(client).toHaveProperty("downloadFile");
    expect(client).toHaveProperty("downloadFileHns");
    expect(client).toHaveProperty("getMetadata");

    // Upload
    expect(client).toHaveProperty("uploadData");
    expect(client).toHaveProperty("uploadFile");
    expect(client).toHaveProperty("uploadDirectory");
  });
});
