/**
 * Demo script to test download with onDownloadProgress functions.
 *
 * Example usage: node scripts/download_onDownloadProgress.js "sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg" "sky-os"
 *
 * Example with default data: node scripts/download_onDownloadProgress.js
 */

const fs = require("fs");
var dir = "./tmp/download/";

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

(async () => {
  const { SkynetClient, defaultSkynetPortalUrl, onDownloadProgress } = require("..");
  const portalUrl = defaultSkynetPortalUrl;
  const client = new SkynetClient(`${portalUrl}`, { onDownloadProgress });
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

  async function main() {
    await downloadFile(defaultDownloadPath + "sia.pdf", usedSkylink);
    await downloadFileHns(defaultDownloadPath + usedHnsLink + ".html", usedHnsLink);
  }
  main();
})();
