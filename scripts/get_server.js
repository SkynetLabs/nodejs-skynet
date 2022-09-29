/**
 * Demo script that gets a serverList with akitven Portals.
 *
 * Example usage with all aktiven Portals with defaults: node scripts/get_server.js
 *
 * Example usage with all aktiven Portals form json File or Url: node scripts/get_server.js --jsonpath=<path> or --jsonurl=<url>
 *
 * Example usage with filter dev: node scripts/get_server.js --dev
 *
 * filter options: --jsonpath=<path>
 *                 --jsonurl=<url>
 *                 --dev
 *                 --free
 *                 --pro
 *                 --custom=<string>
 *
 * other ServerList for --jsonurl=https://siasky.net/KAB_CuHxwrnq6-sbWoApgQF_bpajtZ0U36Ch0nr-fvI7iA
 *
 */

const axios = require("axios");
const fs = require("fs");
const process = require("process");
const minimist = require("minimist");

const portal = "siasky.net";
const serverListEndpoint = `https://server-list.hns.${portal}/`;
const timeout = 60000;

/**
 * Filter array asynchronously.
 *
 * @param arr - The array.
 * @param fn - The filter function.
 * @returns - The filtered array.
 */
const filter = async function (arr, fn) {
  const fail = Symbol();
  return (await Promise.all(arr.map(async (item) => ((await fn(item)) ? item : fail)))).filter((i) => i !== fail);
};

let healthyServers = [];
let usedServerList;
let resp;
let servers;

(async () => {
  // Get command line arguments.
  const argv = minimist(process.argv.slice(2));

  // filter options
  // Are we getting dev servers?
  const devFlag = argv["dev"];
  // Are we getting skynetfree.net servers?
  const freeFlag = argv["free"];
  // Are we getting skynetpro.net servers?
  const proFlag = argv["pro"];
  // Are we getting custom servers?
  const customFlag = argv["custom"];

  // ServerList
  // Serverlist from json File
  const jsonpathFlag = argv["jsonpath"];
  // Serverlist from json Url
  const jsonurlFlag = argv["jsonurl"];

  if (jsonpathFlag !== undefined || jsonurlFlag !== undefined) {
    if (jsonpathFlag !== undefined && jsonurlFlag === undefined) {
      const rawJSONdata = fs.readFileSync(jsonpathFlag);
      const serverListData = JSON.parse(rawJSONdata);
      usedServerList = serverListData;
      servers = usedServerList;
    }

    if (jsonpathFlag === undefined && jsonurlFlag !== undefined) {
      usedServerList = jsonurlFlag;
      resp = await axios.get(usedServerList);
      servers = resp.data;
    }
  } else {
    usedServerList = serverListEndpoint;
    resp = await axios.get(usedServerList);
    servers = resp.data;
  }

  console.log("\n");
  console.log("The serversList have " + servers.length + " server.");
  const serverNames = servers
    .filter((server) => {
      if (devFlag === true) {
        const isDevServer = server.name.includes("dev");

        // Only include dev servers if devflag was passed in.
        if (isDevServer) {
          return devFlag;
        } else {
          // return !devFlag;
        }
      }

      if (freeFlag === true) {
        const isFreeServer = server.name.includes("skynetfree.net");

        // Only include skynetfree.net servers if freeflag was passed in.
        if (isFreeServer) {
          return freeFlag;
        } else {
          //  return !freeFlag;
        }
      }

      if (proFlag === true) {
        const isProServer = server.name.includes("skynetpro.net");

        // Only include skynetpro.net servers if proflag was passed in.
        if (isProServer) {
          return proFlag;
        } else {
          //  return !proFlag;
        }
      }

      if (customFlag !== undefined) {
        const isCustomServer = server.name.includes(customFlag);

        // Only include custom servers if customflag was passed in.
        if (isCustomServer) {
          return true;
        } else {
          //  return !customFlag;
        }
      }

      if (devFlag === true) {
        return !devFlag;
      }

      if (freeFlag === true) {
        return !freeFlag;
      }

      if (proFlag === true) {
        return !proFlag;
      }
      return !customFlag;
    })
    .map((server) => `https://${server.name}`);

  console.log("Check " + serverNames.length + " serverNames filtert.");
  console.log("serverNames:  " + JSON.stringify(serverNames));
  console.log("\n");
  console.log("wait for healthy check...");
  console.log("\n");

  // Server is healthy if the server is operational, which means:
  // 1. it's up
  // 2. it's not disabled
  // 3. it's healthy (all of its checks show "up: true")
  healthyServers = await filter(serverNames, async (server) => {
    const url = `${server}/health-check?nocache=true`;
    try {
      const response = await axios.get(url, { timeout });

      if (response.data.disabled) {
        // Server disabled.
        return false;
      }

      for (const check of response.data.entry.checks) {
        if (!check.up) {
          // Not healthy; not all checks are up.
          return false;
        }
      }
    } catch (e) {
      // Server not up.
      return false;
    }
    // Server healthy.
    return true;
  });

  console.log("Are " + healthyServers.length + " Portals online.");
  process.stdout.write(JSON.stringify(healthyServers));
  console.log("\n");
})().catch((e) => {
  console.log(e);

  // Couldn't get list of healthy servers. Write empty list of servers.
  process.stdout.write("[]");
});
