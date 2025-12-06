# Changelog

All notable changes to Panoptes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release features
- Real-time blockchain sync with Argus.Sync
- Webhook notification system
- Rate limiting (60/min, 1000/hour configurable)
- React dashboard with Tailwind CSS
- Proper Bech32 address encoding
- Enhanced transaction payload with metadata
- Automatic retry with exponential backoff
- Delivery log tracking
- Zero-value output detection and diagnostics
- Security improvements (API key protection)
- Comprehensive documentation

### Security
- API keys properly gitignored
- Added security policy and best practices
- Removed hardcoded secrets from repository

## [1.0.0] - 2025-12-06

### Added
- Initial public release for SAIB Competition
- Core webhook functionality
- Dashboard UI
- Basic documentation

---

## Release Types

### Major Version (X.0.0)
- Breaking changes
- Major architecture changes
- API incompatibilities

### Minor Version (0.X.0)
- New features (backwards compatible)
- Significant enhancements
- Deprecations

### Patch Version (0.0.X)
- Bug fixes
- Security patches
- Documentation updates

---

## Change Categories

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security vulnerability fixes

---

## Links

- [Unreleased Changes](https://github.com/gauciv/panoptes/compare/v1.0.0...HEAD)
- [1.0.0 Release](https://github.com/gauciv/panoptes/releases/tag/v1.0.0)
