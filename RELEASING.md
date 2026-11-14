# Publishing and n8n verification

The source targets **2.0.0**, using current n8n APIs and Node.js 24+. A merged PR is not an npm release or an n8n verification. Check the [published npm versions](https://www.npmjs.com/package/n8n-nodes-appstruct?activeTab=versions) before installing.

## Release gates

```sh
npm ci --ignore-scripts
npm run lint
npm test
npm run check:scanner
npm run check:package
```

The strict official n8n lint config is unchanged. Source and compiled-tarball checks use `@n8n/scan-community-package`. No runtime npm dependencies are shipped. The installed-n8n smoke procedure is in [TESTING.md](TESTING.md). Before publishing, record its results plus the real-account manual first-read check. Mocked HTTP establishes n8n integration behavior, not a successful production account login.

The final public-registry scanner cannot pass before a new package is published with provenance. The old npm release lacks it; do not treat that as a remaining source-code finding or claim a verified listing from local checks alone.

## One-time npm Trusted Publisher setup

An npm maintainer configures this package's **Settings → Trusted Publishers**:

| Field | Value |
| --- | --- |
| Publisher | GitHub Actions |
| Owner | `AppStructAI` |
| Repository | `n8n-nodes-appstruct` |
| Workflow filename | `publish.yml` |
| Environment | Leave blank; the workflow does not use a GitHub environment |

This grants that specific workflow permission to publish the package with short-lived OIDC credentials. A persistent npm token is not needed. See [npm's documentation](https://docs.npmjs.com/trusted-publishers/).

## Deliberate release

1. Finish the documented package/runtime/live-account checks and merge the reviewed source into `main`.
2. Confirm `main` passes GitHub Actions. Review `package.json` and the target version.
3. An authorized maintainer runs **Publish to npm** manually on `main`, with version `2.0.0`. Pushes, tags and merges do not publish. The workflow stops on failed tests, source checks or tarball checks.
4. Verify the published version, package contents and npm provenance. Confirm the attestation identifies this repository, the expected source commit and `.github/workflows/publish.yml`. Record the Actions URL.
5. Run the full registry scanner on the released version:

```sh
npx @n8n/scan-community-package@0.43.0 n8n-nodes-appstruct@2.0.0
```

6. Update the release evidence with the published package integrity and registry scan result. A local tarball is for testing; publication must come from GitHub Actions to obtain provenance.

## Creator Portal

After all release checks pass, sign in to the [n8n Creator Portal](https://creators.n8n.io/nodes) and submit the package for verification. Include the exact npm version, public source repository, [setup guide](https://appstruct.ai/integrations/n8n) and manual project-list starter. Disclose account email/password authentication, the minimum n8n version and polling's baseline/limit behavior.

n8n's [submission procedure](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes/) requires GitHub Actions publication with provenance. Review can take up to four weeks. AppStruct must not be presented as an n8n-verified or Cloud-available node before acceptance.
