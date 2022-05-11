/**
 * Demo script that uploads data passed in as CLI arguments.
 *
 * Example usage: node scripts/skydb.js <dbVersion> <dataKey>
 *
 * Example for Skydb v1 usage: node scripts/skydb.js -v1 testKey
 *
 * Example for Skydb v2 usage: node scripts/skydb.js -v2 testKey
 *
 */

const process = require("process");

const { SkynetClient, genKeyPairFromSeed } = require("..");
const { publicKey, privateKey } = genKeyPairFromSeed("Super Save Test Secret");
const client = new SkynetClient("https://siasky.net");

(async () => {
  const dbVersion = process.argv[2];
  const dataKey = process.argv[3];
  const data = { example: "This is some example JSON data." };

  if (dbVersion === "-v1") {
    // First use db.setJSON to add new data
    await client.db
      .setJSON(privateKey, dataKey, data)
      .then((res) => {
        console.log("\nFirst use db.setJSON to add new data.");
        console.log(`db.setJSON:`);
        console.log(`Saved dataLink: ${res.dataLink}`);
        console.log(`Saved Data: ${JSON.stringify(res.data)}`);
      })
      .catch((err) => {
        console.log("Error: ", JSON.stringify(err));
      });

    // Secound use db.getJSON to get the data.
    await client.db
      .getJSON(publicKey, dataKey)
      .then((data) => {
        console.log("\nSecound use db.getJSON to get the data.");
        console.log(`db.getJSON:`);
        console.log("Retrieved DataLink: " + data["dataLink"]);
        console.log("Retrieved Data: " + JSON.stringify(data["data"]) + "\n");
      })
      .catch((err) => {
        console.log("Get Error: ", JSON.stringify(err));
      });
  } else {
    if (dbVersion === "-v2") {
      // Always call dbV2.getJSON first, because dbV2.setJSON does not make a network request to get the latest revision number.
      await client.dbV2
        .getJSON(publicKey, dataKey)
        .then((data) => {
          console.log(
            "\nAlways call dbV2.getJSON first, because dbV2.setJSON does not make a network request to get the latest revision number."
          );
          console.log(`dbV2.getJSON:`);
          console.log("Retrieved DataLink: " + data["dataLink"]);
          console.log("Retrieved Data: " + JSON.stringify(data["data"]) + "\n");
        })
        .catch((err) => {
          console.log("Get Error: ", JSON.stringify(err));
        });

      // Second, "dbV2.setJSON" can then to set new Data.
      await client.dbV2
        .setJSON(privateKey, dataKey, data)
        .then((res) => {
          console.log('\nSecond, "dbV2.setJSON" can then to set new Data.');
          console.log(`dbV2.setJSON:`);
          console.log(`Saved dataLink: ${res.dataLink}`);
          console.log(`Saved Data: ${JSON.stringify(res.data)}`);
        })
        .catch((err) => {
          console.log("Error: ", JSON.stringify(err));
        });

      // Third, you can check "dbV2.getJSON" called again for current data.
      await client.dbV2
        .getJSON(publicKey, dataKey)
        .then((data) => {
          console.log('\nThird, you can check "dbV2.getJSON" called again for current data.');
          console.log(`dbV2.getJSON:`);
          console.log("Retrieved DataLink: " + data["dataLink"]);
          console.log("Retrieved Data: " + JSON.stringify(data["data"]) + "\n");
        })
        .catch((err) => {
          console.log("Get Error: ", JSON.stringify(err));
        });
    } else {
      console.log("First parameter accept: -v1 od -v2 ");
    }
  }
})();
