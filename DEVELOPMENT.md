# Development Guide

This guide will help you set up the development environment for the AppStruct n8n node.

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- n8n installed (for testing)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd appstruct-n8n-node
```

2. Install dependencies:
```bash
npm install
```

3. Build the node:
```bash
npm run build
```

## Development Workflow

### Building

To build the TypeScript files:
```bash
npm run build
```

To watch for changes during development:
```bash
npm run dev
```

### Linting

To check for linting errors:
```bash
npm run lint
```

To automatically fix linting errors:
```bash
npm run lintfix
```

### Formatting

To format the code:
```bash
npm run format
```

## Testing with n8n

### Option 1: Link the package locally

1. In the node package directory, link it:
```bash
npm link
```

2. In your n8n installation directory, link the node:
```bash
npm link n8n-nodes-appstruct
```

3. Restart n8n:
```bash
n8n start
```

### Option 2: Install from local directory

1. In your n8n installation directory:
```bash
npm install /path/to/appstruct-n8n-node
```

2. Restart n8n

## Node Structure

```
nodes/
├── AppStruct/
│   ├── AppStruct.node.ts          # Main node implementation
│   ├── AppStructTrigger.node.ts   # Trigger node implementation
│   └── appstruct.svg              # Node icon
└── credentials/
    └── AppStructApi.credentials.ts # Authentication credentials
```

## Key Files

- **AppStruct.node.ts**: Main node with CRUD operations
- **AppStructTrigger.node.ts**: Trigger node for polling-based events
- **AppStructApi.credentials.ts**: Handles authentication with AppStruct API
- **package.json**: Node metadata and n8n configuration
- **tsconfig.json**: TypeScript configuration

## Adding New Operations

1. Add the operation to the appropriate `options` array in the node description
2. Add any required input fields with appropriate `displayOptions`
3. Implement the operation logic in the `execute` method
4. Update the README with documentation for the new operation

## GraphQL Queries

The node uses GraphQL to communicate with the AppStruct API. Common queries and mutations are defined as string templates within the node methods.

### Authentication Flow

1. User provides email/password credentials
2. Node exchanges credentials for JWT access token via login mutation
3. Access token is used for subsequent API requests
4. Token is cached during node execution

## Error Handling

- Use `NodeApiError` for API-related errors
- Use `NodeOperationError` for operation-specific errors
- Include helpful error messages and context

## Testing Checklist

Before submitting changes, test:

- [ ] All CRUD operations work correctly
- [ ] Triggers poll and return data appropriately
- [ ] Authentication works with valid/invalid credentials
- [ ] Dynamic dropdowns load projects and tables
- [ ] Error handling works for common failure scenarios
- [ ] Node builds without TypeScript errors
- [ ] Linting passes without errors

## Publishing

1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Build and test the node
4. Publish to npm:
```bash
npm publish
```

## Resources

- [n8n Node Development Documentation](https://docs.n8n.io/integrations/creating-nodes/)
- [AppStruct API Documentation](https://docs.appstruct.cloud)
- [GraphQL Documentation](https://graphql.org/)
