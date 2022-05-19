/**
 * Demo script for test all funktions from SkyDB V1.
 *
 * Example for SkyDB V1 usage: node scripts/skydb.js dataKey "Seed Test Key" ./testdata/data.json
 *
 * Example with default data: node scripts/skydb.js dataKey "Seed Test Key"
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

  // 1. use db.setJSON to add new data
  await client.db
    .setJSON(privateKey, dataKey, data)
    .then((res) => {
      console.log("\n1. use db.setJSON to add new data.");
      console.log(`db.setJSON:`);
      console.log(`Saved dataLink: ${res.dataLink}`);
      console.log(`Saved Data: ${JSON.stringify(res.data)}`);
    })
    .catch((err) => {
      console.log("Error: ", err);
    });

  // 2. use db.getJSON to get the data.
  await client.db
    .getJSON(publicKey, dataKey)
    .then((data) => {
      console.log("\n2. use db.getJSON to get the data.");
      console.log(`db.getJSON:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved Data: " + JSON.stringify(data["data"]) + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 3. use db.deleteJSON to delete the dataKey from skydb.
  await client.db
    .deleteJSON(privateKey, dataKey)
    .then(() => {
      console.log("\n3. use db.deleteJSON to delete the dataKey from skydb.");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 4. use db.getJSON to check dataKey and data after deleteJSON.
  await client.db
    .getJSON(publicKey, dataKey)
    .then((data) => {
      console.log("\n4. use db.getJSON to check dataKey and data after deleteJSON.");
      console.log(`db.getJSON:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved Data: " + JSON.stringify(data["data"]) + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 5. use db.setDataLink to set a new dataLink.
  await client.db
    .setDataLink(privateKey, dataKey, dataLink)
    .then(() => {
      console.log("\n5. use db.setDataLink to set a new dataLink.");
    })
    .catch((err) => {
      console.log("Error: ", err);
    });

  // 6. use db.getJSON to check dataKey and data after setDataLink.
  await client.db
    .getJSON(publicKey, dataKey)
    .then((data) => {
      console.log("\n6. use db.getJSON to check dataKey and data after setDataLink.");
      console.log(`db.getJSON:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved Data: " + JSON.stringify(data["data"]) + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 7. use db.setEntryData to set the EntryData.
  await client.db
    .setEntryData(privateKey, dataKey, rawEntryData)
    .then(() => {
      console.log("\n7. use db.setEntryData to set the EntryData.");
    })
    .catch((err) => {
      console.log("Get Error: ", err);
    });

  // 8. use db.getEntryData .
  await client.db
    .getEntryData(publicKey, dataKey)
    .then((data) => {
      console.log("\n8. use db.getEntryData to get the EntryData.");
      console.log(`db.getEntryData:`);
      console.log("Retrieved EntryData: " + data["data"] + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 9. use db.getRawBytes to get dataLink and data.
  await client.db
    .getRawBytes(publicKey, dataKey)
    .then((data) => {
      console.log("\n9. use db.getRawBytes to get dataLink and data.");
      console.log(`db.getRawBytes:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved data: " + data["data"] + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 10. use db.deleteEntryData to delete the EntryData from skydb.
  await client.db
    .deleteEntryData(privateKey, dataKey)
    .then(() => {
      console.log("\n10. use db.deleteEntryData to delete the EntryData from skydb.");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 11. use db.getEntryData to check data after db.deleteEntryData.
  await client.db
    .getEntryData(publicKey, dataKey)
    .then((data) => {
      console.log("\n11. use db.getEntryData to check data after db.deleteEntryData.");
      console.log(`db.getEntryData:`);
      console.log("Retrieved EntryData: " + JSON.stringify(data) + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });

  // 12. use db.getRawBytes to check dataKey and data after db.deleteEntryData.
  await client.db
    .getRawBytes(publicKey, dataKey)
    .then((data) => {
      console.log("\n12. use db.getRawBytes to check data after db.deleteEntryData.");
      console.log(`db.getRawBytes:`);
      console.log("Retrieved DataLink: " + data["dataLink"]);
      console.log("Retrieved data: " + data["data"] + "\n");
    })
    .catch((err) => {
      console.log("Get Error: ", JSON.stringify(err));
    });
})();
