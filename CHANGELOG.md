# Changelog

## [2.3.0]

### Added

- Added `client.getSkylinkUrl`.
- Added `client.file.getEntryData` and `client.file.getEntryLink`.
- Added `client.db.setDataLink`.
- Added `client.registry.getEntry`, `client.registry.getEntryUrl`, `client.registry.getEntryLink`, `client.registry.setEntry`, and ``client.registry.postSignedEntry`.
- Added `genKeyPairAndSeed`, `genKeyPairFromSeed`, `getEntryLink` function exports.

## [2.2.0]

### Added

- Added `errorPages` and `tryFiles` options when uploading directories

### Changed

- Fixed custom client portal URL being ignored

## [2.1.0]

### Added

- Added tus protocol to `uploadFile` for large, resumable file uploads.
- Added ability to set custom cookies.

## [2.0.1]

### Changed

- Remove leading slash in directory path before uploading an absolute path.
- Fixed length limits for request bodies.
- Fixed upload errors due to missing headers.

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

### Changed

- Some upload bugs were fixed.

## [1.0.0]

### Added

- Upload and download functionality.
