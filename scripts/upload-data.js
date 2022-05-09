/**
 * Demo script that uploads data passed in as CLI arguments.
 *
 * Example usage: node scripts/upload-data.js <filename> <data-string>
 */

const process = require("process");

const { SkynetClient } = require("..");

const client = new SkynetClient();

(async () => {
  const filename = process.argv[2];
  const data = process.argv[3];

  const skylink = await client.uploadData(data, filename);

  console.log(skylink);
})();
