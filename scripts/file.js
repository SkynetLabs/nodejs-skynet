/**
 * Demo script for test the funktion "file.getJSON" and "file.getJSONEncrypted".
 *
 * Doc for "file.getJSON" and "file.getJSONEncrypted" usage: node scripts/file.js userId pathSeed myskyJsonPath
 *
 * Example: node scripts/file.js "4dfb9ce035e4e44711c1bb0a0901ce3adc2a928b122ee7b45df6ac47548646b0" "fe2c5148646532a442dd117efab3ff2a190336da506e363f80fb949513dab811" "test.hns/encrypted"
 *
 * Example with default data: node scripts/file.js
 *
 */

(async () => {
  // Fill in default variables here:
  const defaultUserId = "4dfb9ce035e4e44711c1bb0a0901ce3adc2a928b122ee7b45df6ac47548646b0";
  const defaultPathSeed = "fe2c5148646532a442dd117efab3ff2a190336da506e363f80fb949513dab811";
  const defaultMyskyJsonPath = "test.hns/encrypted";
  // end default variables

  const { SkynetClient, defaultSkynetPortalUrl } = require("..");
  const portalUrl = defaultSkynetPortalUrl;
  const client = new SkynetClient(`${portalUrl}`);
  let usedUserId;
  let usedPathSeed;
  let usedMyskyJsonPath;

  if (process.argv[2] === null || process.argv[2] === undefined) {
    usedUserId = defaultUserId;
    console.log("\n\n\nusedUserId =  " + usedUserId);
    usedPathSeed = defaultPathSeed;
    console.log("usedPathSeed =  " + usedPathSeed);
    usedMyskyJsonPath = defaultMyskyJsonPath;
    console.log("usedMyskyJsonPath =  " + usedMyskyJsonPath);
  } else {
    usedUserId = process.argv[2];
    console.log("\n\n\nusedUserId =  " + usedUserId);
    usedPathSeed = process.argv[3];
    console.log("usedPathSeed =  " + usedPathSeed);
    usedMyskyJsonPath = process.argv[4];
    console.log("usedMyskyJsonPath =  " + usedMyskyJsonPath);
  }

  // 1. use file.getJSON to get the data.
  async function filegetJSON(userId, path) {
    await client.file
      .getJSON(userId, path)
      .then((res) => {
        console.log("\n\n1. use file.getJSON to get the data.");
        console.log("data: " + JSON.stringify(res.data));
        console.log("dataLink: " + res.dataLink);
      })
      .catch((err) => {
        console.log("\n1. Get Error: ", err);
      });
  }

  // 2. use file.getJSONEncrypted to get the encrypted data.
  async function getJSONEncrypted(userId, path) {
    await client.file
      .getJSONEncrypted(userId, path)
      .then((res) => {
        console.log("\n\n2. use file.getJSONEncrypted to get the encrypted data.");
        console.log("data: " + JSON.stringify(res.data));
      })
      .catch((err) => {
        console.log("\n2. Get Error: ", err);
      });
  }

  async function main() {
    await filegetJSON(usedUserId, usedMyskyJsonPath);
    await getJSONEncrypted(usedUserId, usedPathSeed);
  }
  main();
})();
