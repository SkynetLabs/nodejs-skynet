/**
 * Demo script for test all funktions from "download area".
 *
 * Example for all funktions from "download area" usage: node scripts/download.js "sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg" "sky-os"
 *
 * Example with default data: node scripts/download.js
 *
 */

const fs = require("fs");
var dir = "./tmp/download/";

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

(async () => {
  const { SkynetClient, defaultSkynetPortalUrl } = require("..");
  const portalUrl = defaultSkynetPortalUrl;
  const client = new SkynetClient(`${portalUrl}`);
  const defaultSkylink = "sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
  const defaultHnsLink = "sky-os";
  const defaultDownloadPath = "./tmp/download/";
  let usedSkylink;
  let usedHnsLink;

  if (process.argv[2] === null || process.argv[2] === undefined) {
    usedSkylink = defaultSkylink;
    console.log("\n\n\nusedSkylink =  " + usedSkylink);
    usedHnsLink = defaultHnsLink;
    console.log("usedHnsLink =  " + usedHnsLink);
  } else {
    usedSkylink = process.argv[2];
    console.log("\n\n\nusedSkylink =  " + usedSkylink);
    usedHnsLink = process.argv[3];
    console.log("usedHnsLink =  " + usedHnsLink);
  }

  //1. use downloadFile to get a file from skynet.
  async function downloadFile(path, skylink) {
    await client
      .downloadFile(path, skylink)
      .then(() => {
        console.log("\n\n\n1. use downloadFile to get a file from skynet.");
      })
      .catch((err) => {
        console.log("\n1. Get Error: ", err);
      });
  }

  //2. use downloadFileHns to get a hns file from skynet.
  async function downloadFileHns(path, hnsLink) {
    await client
      .downloadFileHns(path, hnsLink)
      .then((res) => {
        console.log("\n\n2. use downloadFileHns to get a hns file from skynet.");
        console.log("hnsLink: " + res);
      })
      .catch((err) => {
        console.log("\n2. Get Error: ", err);
      });
  }

  //3. use getSkylinkUrl to get the url from a skylink.
  async function getSkylinkUrl(skylink) {
    await client
      .getSkylinkUrl(skylink)
      .then((res) => {
        console.log("\n\n3. use getSkylinkUrl to get the url from a skylink.");
        console.log("skylinkUrl: " + res);
      })
      .catch((err) => {
        console.log("\n3. Get Error: ", err);
      });
  }

  //4. use getHnsUrl to get the hnsUrl from a hnsLink.
  async function getHnsUrl(hnsLink) {
    await client
      .getHnsUrl(hnsLink)
      .then((res) => {
        console.log("\n\n4. use getHnsUrl to get the hnsUrl from a hnsLink.");
        console.log("hnsUrl: " + res);
      })
      .catch((err) => {
        console.log("\n4. Get Error: ", err);
      });
  }

  //5. use getHnsresUrl to get the hnsresUrl from a hnsLink.
  async function getHnsresUrl(hnsLink) {
    await client
      .getHnsresUrl(hnsLink)
      .then((res) => {
        console.log("\n\n5. use getHnsresUrl to get the hnsresUrl from a hnsLink.");
        console.log("hnsresUrl: " + res);
      })
      .catch((err) => {
        console.log("\n5. Get Error: ", err);
      });
  }

  //6. use getMetadata to get the metadata from a skylink.
  async function getMetadata(skylink) {
    await client
      .getMetadata(skylink)
      .then((res) => {
        console.log("\n\n6. use getMetadata to get the metadata from a skylink.");
        console.log("Metadata: " + JSON.stringify(res));
      })
      .catch((err) => {
        console.log("\n6. Get Error: ", err);
      });
  }

  //7. use getFileContent to get the fileContent from a skylink.
  async function getFileContent(entryLink) {
    await client
      .getFileContent(entryLink)
      .then((res) => {
        console.log("\n\n7. use getFileContent to get the fileContent from a skylink.");
        console.log("contentType: " + res.contentType);
        console.log("portalUrl: " + res.portalUrl);
        console.log("skylink: " + res.skylink);
      })
      .catch((err) => {
        console.log("\n7. Get Error: ", err);
      });
  }

  //8. use getFileContentBinary to get the fileContentBinary from a skylink.
  async function getFileContentBinary(skylink) {
    await client
      .getFileContentBinary(skylink)
      .then((res) => {
        console.log("\n\n8. use getFileContentBinary to get the fileContentBinary from a skylink.");
        console.log("contentType: " + res.contentType);
        console.log("portalUrl: " + res.portalUrl);
        console.log("skylink: " + res.skylink);
      })
      .catch((err) => {
        console.log("\n8. Get Error: ", err);
      });
  }

  //9. use getFileContentHns to get the hnsFileContent from a hnsLink.
  async function getFileContentHns(hnsLink) {
    await client
      .getFileContentHns(hnsLink)
      .then((res) => {
        console.log("\n\n9. use getFileContentHns to get the hns fileContent from a hnsLink.");
        console.log("contentType: " + res.contentType);
        console.log("portalUrl: " + res.portalUrl);
        console.log("skylink: " + res.skylink);
      })
      .catch((err) => {
        console.log("\n9. Get Error: ", err);
      });
  }

  //10. use getFileContentBinaryHns to get the hnsFileContentBinary from a hnsLink.
  async function getFileContentBinaryHns(hnsLink) {
    await client
      .getFileContentBinaryHns(hnsLink)
      .then((res) => {
        console.log("\n\n10. use getFileContentBinaryHns to get the hnsFileContentBinary from a hnsLink.");
        console.log("contentType: " + res.contentType);
        console.log("portalUrl: " + res.portalUrl);
        console.log("skylink: " + res.skylink);
      })
      .catch((err) => {
        console.log("\n10. Get Error: ", err);
      });
  }

  //11. use resolveHns to get from a hnsLink the data.
  async function resolveHns(hnsLink) {
    await client
      .resolveHns(hnsLink)
      .then((res) => {
        console.log("\n\n11. use resolveHns to get from a hnsLink the data.");
        console.log("data: " + JSON.stringify(res.data));
        console.log("skylink: " + res.skylink);
      })
      .catch((err) => {
        console.log("\n11. Get Error: ", err);
      });
  }

  async function main() {
    await downloadFile(defaultDownloadPath + "sia.pdf", usedSkylink);
    await downloadFileHns(defaultDownloadPath + usedHnsLink + ".html", usedHnsLink);
    await getSkylinkUrl(usedSkylink);
    await getHnsUrl(usedHnsLink);
    await getHnsresUrl(usedHnsLink);
    await getMetadata(usedSkylink);
    await getFileContent(usedSkylink);
    await getFileContentBinary(usedSkylink);
    await getFileContentHns(usedHnsLink);
    await getFileContentBinaryHns(usedHnsLink);
    await resolveHns(usedHnsLink);
  }
  main();
})();
