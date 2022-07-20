# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Types of changes:

- `Added` for new features.
- `Changed` for changes in existing functionality.
- `Removed` for now removed features.
- `Deprecated` for soon-to-be removed features.
- `Fixed` for any bug fixes.
- `Security` in case of vulnerabilities.

## Unreleased

## [2.7.0]

### Added

- `stringToUint8ArrayUtf8` and `uint8ArrayToStringUtf8` conversion utilities
  (for working with registry entries).
- Export more methods from `skynet-js`:
  - `downloadFileHns`
  - `getHnsUrl`, `getHnsresUrl`
  - `getFileContent`, `getFileContentBinary`, `getFileContentHns`, `getFileContentBinaryHns`
  - `resolveHns`,
  - `pinSkylink`
  - `file.getJSON`

## [2.6.0]

### Added

- Add `uploadData` and `downloadData`.
- Add SkyDB and SkyDB V2 (accessed with `client.db` and `client.dbV2`). By
  @parajbs in https://github.com/SkynetLabs/nodejs-skynet/pull/140

## [2.5.1]

### Fixed

- Fix `skynetApiKey` not being passed for certain methods.

## [2.5.0]

### Added

- Add `skynetApiKey` option for portal API keys.

## [2.4.1]

### Fixed

- Fix Options not being marshaled from the `nodejs` client to the `skynet-js` client.
- Fix an issue with `client.getEntryLink`.
- Fix `skynet-js` client initialization in Node context (portal URL undefined).

## [2.4.0]

### Added

- Added `client.getMetadata`.

## [2.3.1]

### Fixed

- Fixed bug with paths containing `.` and `..` as inputs to `uploadDirectory`.

## [2.3.0]

### Added

- Added `client.getSkylinkUrl`.
- Added `client.file.getEntryData` and `client.file.getEntryLink`.
- Added `client.db.setDataLink`.
- Added `client.registry.getEntry`, `client.registry.getEntryUrl`,
  `client.registry.getEntryLink`, `client.registry.setEntry`, and
  `client.registry.postSignedEntry`.
- Added `genKeyPairAndSeed`, `genKeyPairFromSeed`, `getEntryLink` function exports.

## [2.2.0]

### Added

- Added `errorPages` and `tryFiles` options when uploading directories

### Fixed

- Fixed custom client portal URL being ignored

## [2.1.0]

### Added

- Added tus protocol to `uploadFile` for large, resumable file uploads.
- Added ability to set custom cookies.

## [2.0.1]

## Fixed

- Fixed length limits for request bodies.
- Fixed upload errors due to missing headers.

### Changed

- Remove leading slash in directory path before uploading an absolute path.

## [2.0.0]

### Added

- `customDirname` upload option

### Changed

- This SDK has been updated to match Browser JS and require a client. You will
  first need to create a client and then make all API calls from this client.
- Connection options can now be passed to the client, in addition to individual
  API calls, to be applied to all API calls.
- The `defaultPortalUrl` string has been renamed to `defaultSkynetPortalUrl` and
  `defaultPortalUrl` is now a function.

## [1.1.0]

### Added

- Common Options object
- API authentication
- `dryRun` option

### Fixed

- Some upload bugs were fixed.

## [1.0.0]

### Added

- Upload and download functionality.
