# Release and n8n verification

Current status: npm 1.0.5 is the published community package. The 1.0.6 source
changes are not a published release. AppStruct is not claimed as an n8n-verified
or n8n Cloud node.

**Verification remains blocked.** The current official scanner rejects npm 1.0.5
for missing provenance. A separate local source-only check also reports legacy
node metadata, manual-auth requests and a deprecated credential-test request
helper. This PR fixes the false-success credential test and prepares the release
path; it does not resolve every verification finding. The publish workflow checks
the current source rules and will stop before publishing while these findings
remain. `ICredentialTestFunctions` in the locked n8n-workflow 1.82.0 still exposes
the legacy `helpers.request` API; migrating this needs n8n compatibility review,
not a cast to an unavailable helper or a disabled scanner rule.

## What the credential tests establish

Run `npm ci --ignore-scripts` and `npm run test:credentials` with Node.js 22.
The tests use fictional inputs and mocked responses; they do not contact AppStruct,
create an account, or establish live compatibility with a particular n8n instance.
They cover HTTP-success GraphQL failures that the previous declarative credential
test accepted, missing tokens, successful login and both node types' test wiring.
The existing workflow operations and account email/password login contract remain
the same. A test login obtains an access token but does not create a project or row.

Before release, test credentials and the manual first-read workflow in a private
self-hosted n8n practice instance. Check valid and invalid credentials, then inspect
project IDs. Do not put secrets, account responses or execution data in this repo.

## One-time npm setup

An npm maintainer must configure the package's **Settings → Trusted Publishers**:

| Field | Value |
| --- | --- |
| Publisher | GitHub Actions |
| Owner | `AppStructAI` |
| Repository | `n8n-nodes-appstruct` |
| Workflow filename | `publish.yml` |
| Environment | Leave blank; this workflow does not use a GitHub environment |

This grants that specific workflow permission to publish this npm package via
short-lived OIDC credentials. It does not require a long-lived npm token. See the
[npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

## Deliberate release

1. Resolve the remaining current-scanner findings, complete live practice-instance
   testing and review the pull request.
2. Merge the reviewed source and workflows into `main`. The CI job must pass.
3. An authorized maintainer runs **Publish to npm** manually on `main`, with the
   exact version from `package.json`. A push, tag or merge does not publish.
4. Confirm the published version, package contents and npm provenance, including
   the expected source repository, commit and workflow. Record the Actions URL.
5. Run the current official scanner on the published version:
   `npx @n8n/scan-community-package n8n-nodes-appstruct@1.0.6`.
   A successful local build or an empty command log is not a passing scanner result.

## Submit for verification after release

Use the [n8n Creator Portal](https://creators.n8n.io/nodes) only after publication,
the scanner and live checks pass. Supply the public package and source repository,
the setup guide at https://appstruct.ai/integrations/n8n and the manual read-only
starter. Disclose the account email/password credential and polling behavior.
Do not claim Cloud support or a security endorsement before n8n accepts it.

As checked on November 14, 2026, n8n requires GitHub Actions publication with
provenance for verification and says review can take up to four weeks:
[submission instructions](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes/),
[verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines/).
