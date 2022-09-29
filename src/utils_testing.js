"use strict";

const parse = require("url-parse");
const { trimForwardSlash } = require("./utils_string");
const { throwValidationError } = require("./utils_validation");
const cliProgress = require("cli-progress");

let fileSizeCounter = 0;
let endProgressCounter = 0;

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

const splitSizeIntoChunkAlignedParts = function (totalSize, partCount, chunkSize) {
  if (partCount < 1) {
    throwValidationError("partCount", partCount, "parameter", "greater than or equal to 1");
  }
  if (chunkSize < 1) {
    throwValidationError("chunkSize", chunkSize, "parameter", "greater than or equal to 1");
  }
  // NOTE: Unexpected code flow. `uploadLargeFileRequest` should not enable
  // parallel uploads for this case.
  if (totalSize <= chunkSize) {
    throwValidationError("totalSize", totalSize, "parameter", `greater than the size of a chunk ('${chunkSize}')`);
  }

  const partSizes = new Array(partCount).fill(0);

  // Assign chunks to parts in order, looping back to the beginning if we get to
  // the end of the parts array.
  const numFullChunks = Math.floor(totalSize / chunkSize);
  for (let i = 0; i < numFullChunks; i++) {
    partSizes[i % partCount] += chunkSize;
  }

  // The leftover size that must go into the last part.
  const leftover = totalSize % chunkSize;
  // If there is non-chunk-aligned leftover, add it.
  if (leftover > 0) {
    // Assign the leftover to the part after the last part that was visited, or
    // the last part in the array if all parts were used.
    //
    // NOTE: We don't need to worry about empty parts, tus ignores those.
    const lastIndex = Math.min(numFullChunks, partCount - 1);
    partSizes[lastIndex] += leftover;
  }

  // Convert sizes into parts.
  const parts = [];
  let lastBoundary = 0;
  for (let i = 0; i < partCount; i++) {
    parts.push({
      start: lastBoundary,
      end: lastBoundary + partSizes[i],
    });
    lastBoundary = parts[i].end;
  }

  return parts;
};

// Set the custom upload progress tracker.
const onUploadProgress = (progress, { loaded, total }) => {
  let progressOutput = Math.floor((loaded * 100) / total);

  if (progressOutput === 0 && fileSizeCounter === 0) {
    process.stdout.write(" The uploading File size is " + total + " bytes.\n\n");
    process.stdout.moveCursor(0, -1);
    fileSizeCounter++;
  }

  // create new progress bar with custom token "speed"
  const bar = new cliProgress.Bar({
    format: "-> uploading [{bar}] " + progressOutput + "% {eta_formatted} ",
    fps: 1,
  });

  // initialize the bar - set payload token "speed" with the default value "N/A"
  bar.start(100, 0, {
    speed: "N/A",
  });
  bar.updateETA(Buffer);
  // update bar value. set custom token "speed" to 125
  bar.update(progressOutput, {
    speed: "122",
  });

  // stop the bar
  bar.stop();

  if (progressOutput === 100) {
    process.stdout.write(`\n`);
    process.stdout.moveCursor(0, -1);
    process.stdout.write(`\n`);
    endProgressCounter++;
    if (endProgressCounter === 2) {
      process.stdout.write(`\n\n`);
    }
  }
  process.stdout.moveCursor(0, -1);
};

module.exports = {
  extractNonSkylinkPath,
  getSettledValues,
  splitSizeIntoChunkAlignedParts,
  onUploadProgress,
};
