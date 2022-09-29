const { misc, codec } = require("sjcl");

const { blake2bFinal, blake2bInit, blake2bUpdate } = require("blakejs");
const randomBytes = require("randombytes");
const { hash, sign } = require("tweetnacl");

const { stringToUint8ArrayUtf8 } = require("skynet-js");
const { hexToUint8Array, toHexString } = require("./utils_string");
const { validateNumber, validateString } = require("./utils_validation");
const { encodeBigintAsUint64, encodePrefixedBytes, encodeUtf8String } = require("./utils_encoding");

const HASH_LENGTH = 32;

const PUBLIC_KEY_LENGTH = sign.publicKeyLength * 2;

const PRIVATE_KEY_LENGTH = sign.secretKeyLength * 2;

const SIGNATURE_LENGTH = sign.signatureLength;

/**
 * Returns a blake2b 256bit hasher. See `NewHash` in Sia.
 *
 * @returns - blake2b 256bit hasher.
 */
const newHash = function () {
  return blake2bInit(HASH_LENGTH);
};

/**
 * Derives a child seed from the given master seed and sub seed.
 *
 * @param masterSeed - The master seed to derive from.
 * @param seed - The sub seed for the derivation.
 * @returns - The child seed derived from `masterSeed` using `seed`.
 * @throws - Will throw if the inputs are not strings.
 */
const deriveChildSeed = function (masterSeed, seed) {
  validateString("masterSeed", masterSeed, "parameter");
  validateString("seed", seed, "parameter");

  return toHexString(hashAll(encodeUtf8String(masterSeed), encodeUtf8String(seed)));
};

/**
 * Generates a master key pair and seed.
 *
 * @param [length=64] - The number of random bytes for the seed. Note that the string seed will be converted to hex representation, making it twice this length.
 * @returns - The generated key pair and seed.
 */
const genKeyPairAndSeed = function (length = 64) {
  validateNumber("length", length, "parameter");

  const seed = makeSeed(length);
  return { ...genKeyPairFromSeed(seed), seed };
};

/**
 * Generates a public and private key from a provided, secure seed.
 *
 * @param seed - A secure seed.
 * @returns - The generated key pair.
 * @throws - Will throw if the input is not a string.
 */
const genKeyPairFromSeed = function (seed) {
  validateString("seed", seed, "parameter");

  // Get a 32-byte key.
  const derivedKey = misc.pbkdf2(seed, "", 1000, 32 * 8);
  const derivedKeyHex = codec.hex.fromBits(derivedKey);
  const { publicKey, secretKey } = sign.keyPair.fromSeed(hexToUint8Array(derivedKeyHex));

  return { publicKey: toHexString(publicKey), privateKey: toHexString(secretKey) };
};

/**
 * Takes all given arguments and hashes them.
 *
 * @param args - Byte arrays to hash.
 * @returns - The final hash as a byte array.
 */
const hashAll = function (...args) {
  const hasher = newHash();
  args.forEach((arg) => blake2bUpdate(hasher, arg));
  return blake2bFinal(hasher);
};

// TODO: Is this the same as hashString?
/**
 * Hash the given data key.
 *
 * @param dataKey - Data key to hash.
 * @returns - Hash of the data key.
 */
const hashDataKey = function (dataKey) {
  return hashAll(encodeUtf8String(dataKey));
};

/**
 * Hashes the given registry entry.
 *
 * @param registryEntry - Registry entry to hash.
 * @param hashedDataKeyHex - Whether the data key is already hashed and in hex format. If not, we hash the data key.
 * @returns - Hash of the registry entry.
 */
const hashRegistryEntry = function (registryEntry, hashedDataKeyHex) {
  let dataKeyBytes;
  if (hashedDataKeyHex) {
    dataKeyBytes = hexToUint8Array(registryEntry.dataKey);
  } else {
    dataKeyBytes = hashDataKey(registryEntry.dataKey);
  }

  const dataBytes = encodePrefixedBytes(registryEntry.data);

  return hashAll(dataKeyBytes, dataBytes, encodeBigintAsUint64(registryEntry.revision));
};

/**
 * Hashes the given string or byte array using sha512.
 *
 * @param message - The string or byte array to hash.
 * @returns - The resulting hash.
 */
const sha512 = function (message) {
  if (typeof message === "string") {
    return hash(stringToUint8ArrayUtf8(message));
  } else {
    return hash(message);
  }
};

/**
 * Generates a random seed of the given length in bytes.
 *
 * @param length - Length of the seed in bytes.
 * @returns - The generated seed.
 */
const makeSeed = function (length) {
  // Cryptographically-secure random number generator. It should use the
  // built-in crypto.getRandomValues in the browser.
  const array = randomBytes(length);
  return toHexString(array);
};

module.exports = {
  HASH_LENGTH,
  PUBLIC_KEY_LENGTH,
  PRIVATE_KEY_LENGTH,
  SIGNATURE_LENGTH,
  newHash,
  deriveChildSeed,
  genKeyPairAndSeed,
  genKeyPairFromSeed,
  hashAll,
  hashDataKey,
  hashRegistryEntry,
  sha512,
  makeSeed,
};
