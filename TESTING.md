# Testing the AppStruct n8n package

Use Node.js 24 and npm. All committed fixtures use invented `.invalid` accounts and fictional projects; never replace them with real credentials.

## Reproducible package checks

```sh
npm ci --ignore-scripts
npm run lint
npm test
npm run check:scanner
npm run check:package
```

The official `n8n-node` CLI builds and lints the package. The source check uses the current scanner's source patterns. The package check creates and extracts the actual npm tarball, verifies entry points/assets/starter JSON and applies the official scanner to its compiled JavaScript. These local checks do not establish npm provenance or n8n verification. The final registry scan runs after GitHub Actions publishes the package.

Unit tests cover malformed/failed login, safe errors, bounded token renewal, permission errors, partial mutation responses, project read output and polling additions/updates/deduplication/limits.

## Installed n8n workflow smoke test

Prepare a separate runtime outside this repository:

```sh
npm install --prefix /path/to/n8n-runtime n8n@2.47.7 nock@14
N8N_RUNTIME_DIR=/path/to/n8n-runtime npm run test:runtime
```

Run this with Node.js 24. The script packs and installs the candidate in a fresh temporary n8n home. It imports fictional credentials and the repository's manual starter, executes six workflows with the real n8n CLI and inspects execution results and request order. It then starts the real n8n HTTP server on loopback, creates a fictional local owner and calls its credential-test service for six more cases, including wrong passwords with cached tokens and malformed login responses. HTTP is intercepted at the original AppStruct hostname, with outbound connections disabled. It covers valid credentials, migration of a credential without a cached token, GraphQL HTTP-200 expiry, HTTP-401 expiry, a wrong password and a forbidden read.

The script writes fixture-only execution logs and a `result.json` under the printed temporary directory. It does not use the user's normal n8n configuration, read real account credentials or create AppStruct records. Temporary homes remain available for inspecting failures; remove only the explicitly printed test directory when finished.

## Final live-account check before publication

On an isolated, trusted self-hosted n8n 2.47.7+ instance, install the built tarball and import the manual starter. Enter an AppStruct account credential through n8n's credential UI. Test the credential, execute Project / Get Many and compare the actual returned IDs/names with that account's Apps library. An empty account can correctly return no projects.

Also test an intentionally incorrect password. A saved valid access token must not make an edited incorrect password appear connected. Keep real passwords and execution data out of Git, release artifacts, support tickets and public reports. This check validates the live account path; mocked HTTP and schema validation do not replace it.
