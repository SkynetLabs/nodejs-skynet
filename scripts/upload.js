/**
 * Example script that uploads all paths passed in as CLI arguments.
 */

const process = require("process");

const { SkynetClient } = require("..");

const client = new SkynetClient();

const promises = process.argv.slice(2).map((path) => client.uploadFile(path));
(async () => {
  const skylinks = await Promise.all(promises);
  skylinks.map((skylink) => console.log(skylink));
})();
