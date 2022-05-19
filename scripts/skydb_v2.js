/**
 * Demo script for test all funktions from SkyDB V2.
 *
 * Example for SkyDB V2 usage: node scripts/skydb_v2.js dataKey "Seed Test Key" ./testdata/data.json
 *
 * Example with default data: node scripts/skydb_v2.js dataKey  "Seed Test Key"
 *
 */

const fs = require("fs");
const process = require("process");

(async () => {
  const { SkynetClient, genKeyPairFromSeed } = require("..");
  const client = new SkynetClient("https://siasky.net");

  const dataKey = process.argv[2];
  console.log("\n\ndataKey =  " + dataKey);
  const SeedKey = process.argv[3];
  console.log("SeedKey =  " + SeedKey);

  let data;
  const path_dataJson = process.argv[4];
  if (process.argv[4] === undefined) {
    console.log("Default dataJson used.");
    data = { example: "This is some example JSON data" };
  } else {
    console.log("path_dataJson from command line argument");
    const rawJSONdata = fs.readFileSync(path_dataJson);
    data = JSON.parse(rawJSONdata);
  }
  console.log("data: " + JSON.stringify(data));

  const { publicKey, privateKey } = genKeyPairFromSeed(SeedKey);
  console.log("\n\npublicKey: " + publicKey);
  console.log("privateKey: " + privateKey + "\n");

  const rawEntryData = Uint8Array.from([
    0, 0, 161, 191, 146, 58, 21, 52, 234, 119, 207, 250, 154, 210, 14, 131, 7, 121, 2, 28, 110, 173, 198, 24, 244, 228,
    156, 248, 86, 156, 90, 91, 171, 19,
  ]);
  const dataLink = "sia://AAChv5I6FTTqd8_6mtIOgwd5AhxurcYY9OSc-FacWlurEw";

  // 1. Always call dbV2.getJSON first, because dbV2.setJSON does not make a network request to get the latest revision number.
  await client.dbV2
    .getJSON(publicKey, dataKey)
    .then((data) => {
      console.log(
        "\n1. Always call dbV2.getJSON first, because dbV2.setJSON does not make a network request to get the latest revision number."
      );
      console.log(`dbV2.getJSON:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved Data: " + JSON.stringify(data["data"]) + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 2. "dbV2.setJSON" can then to set new Data.
  await client.dbV2
    .setJSON(privateKey, dataKey, data)
    .then((res) => {
      console.log('\n2. "dbV2.setJSON" can then to set new Data.');
      console.log(`dbV2.setJSON:`);
      console.log(`Saved dataLink: ${res.dataLink}`);
      console.log(`Saved Data: ${JSON.stringify(res.data)}`);
    })
    .catch((err) => {
      console.log("Error: ", err);
    });

  // 3. "dbV2.getJSON" called again for current data.
  await client.dbV2
    .getJSON(publicKey, dataKey)
    .then((data) => {
      console.log('\n3. "dbV2.getJSON" called again for current data.');
      console.log(`dbV2.getJSON:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved Data: " + JSON.stringify(data["data"]) + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 4. use dbV2.deleteJSON to delete the dataKey from skydb.
  await client.dbV2
    .deleteJSON(privateKey, dataKey)
    .then(() => {
      console.log("\n4. use dbV2.deleteJSON to delete the dataKey from skydb.");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 5. use dbV2.getJSON to check dataKey and data after deleteJSON.
  await client.dbV2
    .getJSON(publicKey, dataKey)
    .then((data) => {
      console.log("\n5. use dbV2.getJSON to check dataKey and data after deleteJSON.");
      console.log(`dbV2.getJSON:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved Data: " + JSON.stringify(data["data"]) + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 6. use dbV2.setDataLink to set a new dataLink.
  await client.dbV2
    .setDataLink(privateKey, dataKey, dataLink)
    .then(() => {
      console.log("\n6. use dbV2.setDataLink to set a new dataLink.");
    })
    .catch((err) => {
      console.log("Error: ", err);
    });

  // 7. use dbV2.getJSON to check dataKey and data after setDataLink.
  await client.dbV2
    .getJSON(publicKey, dataKey)
    .then((data) => {
      console.log("\n7. use dbV2.getJSON to check dataKey and data after setDataLink.");
      console.log(`dbV2.getJSON:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved Data: " + JSON.stringify(data["data"]) + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 8. use dbV2.setEntryData to set the EntryData.
  await client.dbV2
    .setEntryData(privateKey, dataKey, rawEntryData)
    .then(() => {
      console.log("\n8. use dbV2.setEntryData to set the EntryData.");
    })
    .catch((err) => {
      console.log("Get Error: ", err);
    });

  // 9. use dbV2.getEntryData .
  await client.dbV2
    .getEntryData(publicKey, dataKey)
    .then((data) => {
      console.log("\n9. use dbV2.getEntryData to get the EntryData.");
      console.log(`dbV2.getEntryData:`);
      console.log("Retrieved EntryData: " + data["data"] + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 10. use dbV2.getRawBytes to get dataLink and data.
  await client.dbV2
    .getRawBytes(publicKey, dataKey)
    .then((data) => {
      console.log("\n10. use dbV2.getRawBytes to get dataLink and data.");
      console.log(`dbV2.getRawBytes:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved data: " + data["data"] + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 11. use dbV2.deleteEntryData to delete the EntryData from skydbV2.
  await client.dbV2
    .deleteEntryData(privateKey, dataKey)
    .then(() => {
      console.log("\n11. use dbV2.deleteEntryData to delete the EntryData from skydbV2.");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 12. use dbV2.getEntryData to check data after dbV2.deleteEntryData.
  await client.dbV2
    .getEntryData(publicKey, dataKey)
    .then((data) => {
      console.log("\n12. use dbV2.getEntryData to check data after dbV2.deleteEntryData.");
      console.log(`dbV2.getEntryData:`);
      console.log("Retrieved EntryData: " + JSON.stringify(data) + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 13. use dbV2.getRawBytes to check dataKey and data after dbV2.deleteEntryData.
  await client.dbV2
    .getRawBytes(publicKey, dataKey)
    .then((data) => {
      console.log("\n13. use dbV2.getRawBytes to check data after dbV2.deleteEntryData.");
      console.log(`dbV2.getRawBytes:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved data: " + data["data"] + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });
})();
