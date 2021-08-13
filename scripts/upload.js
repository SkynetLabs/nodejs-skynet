/**
 * Demo script that uploads all paths passed in as CLI arguments.
 *
 * Example usage: node scripts/upload.js <file-to-upload>
 */

const process = require("process");

const { SkynetClient } = require("..");

const client = new SkynetClient();

const promises = process.argv.slice(2).map((path) => client.uploadFile(path));
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
