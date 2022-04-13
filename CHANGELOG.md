# Changelog

## Unreleased

### Breaking Change

- The `AbstractProvider` constructor needs two arguments, ie `ckbRpc` and `indexerUrl`.
- The `getCellDep` method in `AbstractProvider` has changed to asynchronous method.

### Changed

- `Provider` can provide latest celldeps on chain.
