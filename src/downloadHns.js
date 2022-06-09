"use strict";

const fs = require("fs");

const { DEFAULT_DOWNLOAD_OPTIONS } = require("./defaults");

const downloadFileHns = async function (path, domain, customOptions = {}) {
  const opts = { ...DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };

  const url = await this.getHnsUrl(domain, opts);

  new Promise((resolve, reject) => {
    this.executeRequest({
      ...opts,
      method: "get",
      url: url,
    })
      .then((response) => {
        fs.writeFile(path, response.data, (err) => {
          if (err) {
            if (err) throw err;
            console.log("created");
          }
        });
      })
      .catch((error) => {
        reject(error);
      });
  });

  return url;
};

module.exports = { downloadFileHns };
