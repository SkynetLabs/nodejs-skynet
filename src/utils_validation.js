"use strict";

const { parseSkylink } = require("skynet-js");

/**
 * Returns true if the input is a valid hex-encoded string.
 *
 * @param str - The input string.
 * @returns - True if the input is hex-encoded.
 * @throws - Will throw if the input is not a string.
 */
const isHexString = function (str) {
  validateString("str", str, "parameter");

  return /^[0-9A-Fa-f]*$/g.test(str);
};

/**
 * Validates the given value as a bigint.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid bigint.
 */
const validateBigint = function (name, value, valueKind) {
  if (typeof value !== "bigint") {
    throwValidationError(name, value, valueKind, "type 'bigint'");
  }
};

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
 * Validates the given value as a hex-encoded string.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid hex-encoded string.
 */
const validateHexString = function (name, value, valueKind) {
  validateString(name, value, valueKind);
  if (!isHexString(value)) {
    throwValidationError(name, value, valueKind, "a hex-encoded string");
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

/**
 * Validates the given value as a number.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid number.
 */
const validateNumber = function (name, value, valueKind) {
  if (typeof value !== "number") {
    throwValidationError(name, value, valueKind, "type 'number'");
  }
};

/**
 * Validates the given value as a integer.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid integer.
 */
const validateInteger = function (name, value, valueKind) {
  validateNumber(name, value, valueKind);
  if (!Number.isInteger(value)) {
    throwValidationError(name, value, valueKind, "an integer value");
  }
};

/**
 * Validates the given value as an object.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid object.
 */
const validateObject = function (name, value, valueKind) {
  if (typeof value !== "object") {
    throwValidationError(name, value, valueKind, "type 'object'");
  }
  if (value === null) {
    throwValidationError(name, value, valueKind, "non-null");
  }
};

/**
 * Validates the given value as an optional object.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param model - A model object that contains all possible fields. 'value' does not need to have all fields, but it may not have any fields not contained in 'model'.
 * @throws - Will throw if not a valid optional object.
 */
const validateOptionalObject = function validateOptionalObject(name, value, valueKind, model) {
  if (!value) {
    // This is okay, the object is optional.
    return;
  }
  validateObject(name, value, valueKind);

  // Check if all given properties of value also exist in the model.
  for (const property in value) {
    if (!(property in model)) {
      throw new Error(`Object ${valueKind} '${name}' contains unexpected property '${property}'`);
    }
  }
};

module.exports = {
  isHexString,
  validateBigint,
  validationError,
  throwValidationError,
  validateString,
  validateStringLen,
  validateHexString,
  validateSkylinkString,
  validateNumber,
  validateInteger,
  validateObject,
  validateOptionalObject,
};
