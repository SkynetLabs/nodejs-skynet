"use strict";

const { parseSkylink } = require("skynet-js");

/**
 * Returns an error for the given value
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param expected - The expected aspect of the value that could not be validated (e.g. "type 'string'" or "non-null").
 * @returns - The validation error.
 */
const validationError = function (name, value, valueKind, expected) {
  let actualValue;
  if (value === undefined) {
    actualValue = "type 'undefined'";
  } else if (value === null) {
    actualValue = "type 'null'";
  } else {
    actualValue = `type '${typeof value}', value '${value}'`;
  }
  return new Error(`Expected ${valueKind} '${name}' to be ${expected}, was ${actualValue}`);
};

/**
 * Throws an error for the given value
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param expected - The expected aspect of the value that could not be validated (e.g. "type 'string'" or "non-null").
 * @throws - Will always throw.
 */
const throwValidationError = function (name, value, valueKind, expected) {
  throw validationError(name, value, valueKind, expected);
};

/**
 * Validates the given value as a string.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid string.
 */
const validateString = function (name, value, valueKind) {
  if (typeof value !== "string") {
    throwValidationError(name, value, valueKind, "type 'string'");
  }
};

/**
 * Validates the given value as a string of the given length.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param len - The length to check.
 * @throws - Will throw if not a valid string of the given length.
 */
const validateStringLen = function (name, value, valueKind, len) {
  validateString(name, value, valueKind);
  const actualLen = value.length;
  if (actualLen !== len) {
    throwValidationError(name, value, valueKind, `type 'string' of length ${len}, was length ${actualLen}`);
  }
};

/**
 * Validates the given value as a skylink string.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @returns - The validated and parsed skylink.
 * @throws - Will throw if not a valid skylink string.
 */
const validateSkylinkString = function (name, value, valueKind) {
  validateString(name, value, valueKind);

  const parsedSkylink = parseSkylink(value);
  if (parsedSkylink === null) {
    throw validationError(name, value, valueKind, `valid skylink of type 'string'`);
  }

  return parsedSkylink;
};

module.exports = {
  validationError,
  throwValidationError,
  validateString,
  validateStringLen,
  validateSkylinkString,
};
