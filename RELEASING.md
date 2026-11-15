# Publishing and n8n verification

The source prepares **2.0.1**, using current n8n APIs and Node.js 24+. Version 2.0.0 is published with provenance and passed the full registry scanner. A merged PR is not an npm release or an n8n verification. Check the [published npm versions](https://www.npmjs.com/package/n8n-nodes-appstruct?activeTab=versions) before installing.

## Release gates

```sh
npm ci --ignore-scripts
npm run lint
npm test
npm run check:scanner
npm run check:package
```

The strict official n8n lint config is unchanged. Source and compiled-tarball checks use `@n8n/scan-community-package`. No runtime npm dependencies are shipped. The installed-n8n smoke procedure is in [TESTING.md](TESTING.md). Before publishing, record its results plus the real-account manual first-read check. Mocked HTTP establishes n8n integration behavior, not a successful production account login.

The final public-registry scanner checks the version actually published with provenance. Run it for every new release; local source and tarball checks do not replace this gate or establish a verified listing.

## One-time npm Trusted Publisher setup

The maintainer's npm account must have 2FA enabled. The owner completes passkey/security-key enrollment and keeps recovery codes privately. See [npm's prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/).

An npm maintainer configures this package's **Settings → Trusted Publishers**:

| Field | Value |
| --- | --- |
| Publisher | GitHub Actions |
| Owner | `AppStructAI` |
| Repository | `n8n-nodes-appstruct` |
| Workflow filename | `publish.yml` |
| Environment | Leave blank; the workflow does not use a GitHub environment |
| Allowed actions | Enable direct publishing with `npm publish`; managing dist-tags is not needed |

This grants that specific workflow permission to publish the package with short-lived OIDC credentials. A persistent npm token is not needed. See [npm's documentation](https://docs.npmjs.com/trusted-publishers/).

New trusted publishers default to staged publication. The prepared workflow uses `npm publish`, so explicitly allow that action when adding the publisher. Do not start the workflow until this package-level setup is complete.

## Deliberate release

1. Finish the documented package/runtime/live-account checks and merge the reviewed source into `main`.
2. Confirm `main` passes GitHub Actions. Review `package.json` and the target version.
3. An authorized maintainer runs **Publish to npm** manually on `main`, with the exact `package.json` version (`2.0.1` for this candidate). Pushes, tags and merges do not publish. The workflow stops on failed tests, source checks or tarball checks.
4. Verify the published version, package contents and npm provenance. Confirm the attestation identifies this repository, the expected source commit and `.github/workflows/publish.yml`. Record the Actions URL.
5. Run the full registry scanner on the released version:

```sh
npx @n8n/scan-community-package@0.43.0 n8n-nodes-appstruct@2.0.1
```

6. Update the release evidence with the published package integrity and registry scan result. A local tarball is for testing; publication must come from GitHub Actions to obtain provenance.

## Creator Portal

After all release checks pass, sign in to the [n8n Creator Portal](https://creators.n8n.io/nodes) and submit the package for verification. Include the exact npm version, public source repository, [setup guide](https://appstruct.ai/integrations/n8n) and manual project-list starter. Disclose account email/password authentication, the minimum n8n version and polling's baseline/limit behavior.

Creator Portal sends the package-ownership verification code to `author.email` from the published npm package. Confirm mailbox access before publishing this metadata. Enter the one-time code directly in the portal; keep it out of Git, logs and release artifacts. Changes to the author contact need a new npm release; confirm the displayed recipient when starting a new submission.

n8n's [submission procedure](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes/) requires GitHub Actions publication with provenance. Review can take up to four weeks. AppStruct must not be presented as an n8n-verified or Cloud-available node before acceptance.
