# Changelog

All notable changes to tree-element are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/).

## Unreleased

## 0.1.1 - 2026-09-06

### Changed

- `tree.load_failed` is also dispatched when a request fails with a network error.

## 0.1.0 - 2026-09-04

First release.

### Added

- Tree widget in plain javascript, with no runtime dependencies
- Load data from a javascript array or from a url, with load on demand per node
- Drag and drop, with autoscroll and hooks to allow or veto a move
- Keyboard navigation
- Save the open and selected nodes to local storage
- Right-to-left support
- Typed events and options, with type declarations in the package
