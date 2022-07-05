/**
 * Demo script that gets metadata for all skylinks passed in as CLI arguments.
 *
 * Example usage: node scripts/get_metadata.js <skylink>
 */

const process = require("process");

const { SkynetClient } = require("..");

const client = new SkynetClient();

const promises = process.argv
  // Ignore the first two arguments.
  .slice(2)
  .map(async (skylink) => await client.getMetadata(skylink));

(async () => {
  const results = await Promise.allSettled(promises);
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      console.log(result.value);
    } else {
      console.log(result.reason);
    }
  });
})();
