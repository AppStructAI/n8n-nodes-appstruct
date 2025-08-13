# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
