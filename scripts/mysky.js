/**
 * Demo script for test the funktion from MySky from Skynet.
 *
 * Example for MySky usage: node scripts/mysky.js "riftapp.hns" "https://riftapp.hns.siasky.net"
 *
 * Example with default data: node scripts/mysky.js
 *
 */

(async () => {
  const { SkynetClient, defaultSkynetPortalUrl } = require("..");
  const portalUrl = defaultSkynetPortalUrl;
  const client = new SkynetClient(`${portalUrl}`);
  const defaultHnsDomain = "riftapp.hns";
  const defaultFullHnsUrl = "https://riftapp.hns.siasky.net";
  const defaultHostApp = "localhost";
  let usedHnsDomain;
  let usedFullHnsUrl;
  let usedHostApp;

  if ((process.argv[2] === null) | (process.argv[2] === undefined)) {
    usedHnsDomain = defaultHnsDomain;
    console.log("\n\nusedHnsDomain =  " + usedHnsDomain);
    usedFullHnsUrl = defaultFullHnsUrl;
    console.log("usedFullHnsUrl =  " + usedFullHnsUrl);
    usedHostApp = defaultHostApp;
    console.log("usedHostApp =  " + usedHostApp);
  } else {
    usedHnsDomain = process.argv[2];
    console.log("usedHnsDomain =  " + usedHnsDomain);
    usedFullHnsUrl = process.argv[3];
    console.log("usedFullHnsUrl =  " + usedFullHnsUrl);
    usedHostApp = usedHnsDomain;
    console.log("usedHostApp =  " + usedHostApp);
  }

  // 1. use extractDomain to extract hns-domain from hns-url.
  async function extractDomain(hnsUrl) {
    await client
      .extractDomain(hnsUrl)
      .then((hnsdomain) => {
        console.log("\n\n\n1. use extractDomain to extract hns-domain from hns-url.");
        console.log("hnsDomain: " + JSON.stringify(hnsdomain));
      })
      .catch((err) => {
        console.log("\n\n1. Get Error: ", err);
      });
  }

  // 2. use getFullDomainUrl to get url from hns-domain.
  async function getFullDomainUrl(hnsDomain) {
    await client
      .getFullDomainUrl(hnsDomain)
      .then((hnsurl) => {
        console.log("\n\n2. use getFullDomainUrl to get url from hns-domain.");
        console.log("hnsUrl: " + JSON.stringify(hnsurl) + "\n");
      })
      .catch((err) => {
        console.log("\n\n2. Get Error: ", err);
      });
  }

  // 3. use loadMySky to init MySky from Skynet.
  async function loadMySky(hostApp) {
    await client
      .loadMySky(hostApp, { debug: true, dev: false, alpha: false })
      .then(() => {
        console.log("\n\n3. use loadMySky to init MySky from Skynet.");
      })
      .catch((err) => {
        //console.log("\n\n3. Error in loadMySky.");
        console.log("\n\n3. Get Error: ", err);
      });
  }

  async function main() {
    await extractDomain(usedFullHnsUrl);
    await getFullDomainUrl(usedHnsDomain);
    await loadMySky(usedHostApp);
  }
  main();
})();
