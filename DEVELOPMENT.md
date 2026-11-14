# Development

Use Node.js 24+, npm and a current self-hosted n8n test environment. The repository uses the official `@n8n/node-cli`, its unchanged strict ESLint configuration, and a single npm lockfile.

```sh
npm ci --ignore-scripts
npm run build
npm run lint
npm test
```

`npm run dev` starts the official n8n development flow. See the [n8n-node documentation](https://docs.n8n.io/connect/create-nodes/build-your-node/using-the-n8n-node-tool/) for Docker/Podman or external-instance options. Do not link the development package into an unrelated live n8n installation.

Runtime code lives under `nodes/`. Shared authenticated requests use n8n's `httpRequestWithAuthentication`; login belongs to the credential's `preAuthentication` method. AppStruct GraphQL may return authentication failures with HTTP 200, so the helper refreshes and retries a complete pre-execution `UNAUTHENTICATED` failure once. It does not replay partial mutation data or permission failures.

The current AppStruct JSON-client login contract uses `Content-Type: application/json` and `Apollo-Require-Preflight: true`, without Origin or cookie headers. Do not use browser-session cookies or change the server's browser authentication guards for this integration.

See [TESTING.md](TESTING.md) for package and runtime checks, and [RELEASING.md](RELEASING.md) for the manual OIDC/provenance release process. Keep package.json and package-lock.json synchronized. There are no runtime npm dependencies.
