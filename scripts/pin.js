/**
 * Demo script for test funktion "pinSkylink".
 *
 * Example for "pinSkylink" usage: node scripts/pin.js "sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg"
 *
 * Example with default data: node scripts/pin.js
 *
 */

(async () => {
  const { SkynetClient, defaultSkynetPortalUrl } = require("..");

  const portalUrl = defaultSkynetPortalUrl;
  const client = new SkynetClient(`${portalUrl}`);
  const defaultSkylink = "sia://XABvi7JtJbQSMAcDwnUnmp2FKDPjg8_tTTFP4BwMSxVdEg";
  let usedSkylink;

  if (process.argv[2] === null || process.argv[2] === undefined) {
    usedSkylink = defaultSkylink;
    console.log("\n\nusedSkylink =  " + usedSkylink);
  } else {
    usedSkylink = process.argv[2];
    console.log("usedSkylink =  " + usedSkylink);
  }

  // 1. use pinSkylink to pin a skylink to a portal.
  async function pinSkylink(skylink) {
    await client
      .pinSkylink(skylink)
      .then((res) => {
        console.log("\n\n\n1. use pinSkylink to pin a skylink to a portal.");
        console.log("skylink: " + res.skylink);
      })
      .catch((err) => {
        console.log("\n1. Get Error: ", err);
      });
  }

  pinSkylink(usedSkylink);
})();
