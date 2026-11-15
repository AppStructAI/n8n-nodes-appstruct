# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - Unreleased

### Changed
- Align the package author email with the existing public npm maintainer contact for Creator Portal ownership verification.
- Document account-level 2FA and access to the package author mailbox as release prerequisites.

## [2.0.0] - 2026-11-15

### Changed
- Target n8n 2.47.7+ and Node.js 24+, using current official n8n build/lint APIs.
- Move account login into credential preAuthentication and use n8n-managed authenticated requests in both nodes.
- Use AppStruct's supported JSON-client authentication protocol without browser cookies.
- Adopt strict official linting, one npm lockfile, source/tarball scanning and a manual provenance release gate.

### Fixed
- Reject malformed or failed login responses rather than reporting a false successful connection.
- Renew expired tokens once for GraphQL HTTP-200 authentication errors; never replay partial mutation results or permission failures.
- Implement Updated Row polling and avoid repeating unchanged rows, tables or columns.
- Use a first-run automatic baseline, preserve it on failures/manual previews and stop visibly when the record polling limit is reached.
- Add complete icons, trigger subtitle and tool metadata.

### Validation
- Offline regression tests, real n8n workflow smoke tests with mocked HTTP, and live API schema validation.
- Publication and final registry provenance verification remain separate release steps.

## [1.0.6] - Unpublished preparation (superseded by 2.0.0)

### Fixed
- Require an access token without GraphQL errors when testing account credentials.
- Use the same credential test for the action and polling nodes.
- Return a safe error message without echoing authentication responses or exceptions.

### Added
- Offline regression tests for successful login, GraphQL failures, malformed responses and credential-test wiring.
- Pull-request checks and a manual GitHub Actions publish workflow using npm trusted publishing and provenance.

This version is prepared in source, not yet published to npm or verified by n8n.

## [1.0.0] - 2024-01-XX

### Added
- Initial release of AppStruct n8n integration
- AppStruct node with support for:
  - Project operations (Get Many)
  - Table operations (Create, Get Many, Get Schema, Delete)
  - Record operations (Create, Update, Delete, Get Many)
  - Column operations (Add, Delete)
- AppStruct Trigger node with polling support for:
  - New Row events
  - New Table events
  - New Column events
  - Updated Row events (basic implementation)
- Authentication via AppStruct API credentials
- Dynamic dropdowns for projects and tables
- Comprehensive error handling
- TypeScript support
- ESLint and Prettier configuration
- Complete documentation and examples

### Features
- **GraphQL API Integration**: Full integration with AppStruct's GraphQL API
- **Dynamic Resource Loading**: Dropdowns automatically populate with user's projects and tables
- **Flexible Data Types**: Support for text, number, boolean, date, and datetime column types
- **Polling Triggers**: Configurable polling intervals for real-time data monitoring
- **Comprehensive CRUD**: Complete Create, Read, Update, Delete operations for all resources
- **Error Handling**: Detailed error messages and proper error propagation
- **TypeScript**: Full TypeScript support for better development experience

### Technical Details
- Built with n8n-workflow API version 1
- Requires n8n 0.198.0 or higher
- Uses JWT authentication with automatic token management
- Supports both polling and webhook-style triggers (polling implementation)
- Includes comprehensive input validation and sanitization

### Documentation
- Complete README with installation and usage instructions
- Development guide for contributors
- Example workflows demonstrating common use cases
- API reference documentation
- Changelog for version tracking
