/**
 * Demo script to convert strings to Uint8Arrays. Useful for testing or for constructing registry entries.
 *
 * Example usage: node scripts/string_to_uint8_array.js "bar"
 */

const { stringToUint8ArrayUtf8 } = require("..");

process.argv
  // Ignore the first two arguments.
  .slice(2)
  .map((str) => console.log(stringToUint8ArrayUtf8(str)));
