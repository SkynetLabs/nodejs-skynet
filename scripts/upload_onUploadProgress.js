/**
 * Demo script that uploads all paths passed in as CLI arguments and with onUploadProgress.
 *
 * Example usage: node scripts/upload_onUploadProgress.js <path-to-file-to-upload>
 */

const fs = require("fs");
const process = require("process");

const { SkynetClient, onUploadProgress } = require("..");

const client = new SkynetClient("", { onUploadProgress });

const promises = process.argv
  // Ignore the first two arguments.
  .slice(2)
  // Use appropriate function for dir or for file. Note that this throws if the
  // path doesn't exist; we print an error later.
  .map((path) =>
    fs.promises
      .lstat(path)
      .then((stat) => (stat.isDirectory() ? client.uploadDirectory(path) : client.uploadFile(path)))
  );

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
