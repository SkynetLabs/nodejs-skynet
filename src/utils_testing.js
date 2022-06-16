"use strict";

const parse = require("url-parse");
const { trimForwardSlash } = require("./utils_string");

/**
 * Extracts the non-skylink part of the path from the url.
 *
 * @param url - The input URL.
 * @param skylink - The skylink to remove, if it is present.
 * @returns - The non-skylink part of the path.
 */
const extractNonSkylinkPath = function (url, skylink) {
  const parsed = parse(url, {});
  let path = parsed.pathname.replace(skylink, ""); // Remove skylink to get the path.
  // Ensure there are no leading or trailing slashes.
  path = trimForwardSlash(path);
  // Add back the slash, unless there is no path.
  if (path !== "") {
    path = `/${path}`;
  }
  return path;
};

/**
 * Gets the settled values from `Promise.allSettled`. Throws if an error is
 * found. Returns all settled values if no errors were found.
 *
 * @param values - The settled values.
 * @returns - The settled value if no errors were found.
 * @throws - Will throw if an unexpected error occurred.
 */
const getSettledValues = function (values) {
  const receivedValues = [];

  for (const value of values) {
    if (value.status === "rejected") {
      throw value.reason;
    } else if (value.value) {
      receivedValues.push(value.value);
    }
  }

  return receivedValues;
};

module.exports = {
  extractNonSkylinkPath,
  getSettledValues,
};
