# AppStruct nodes for n8n

![AppStruct Logo](https://raw.githubusercontent.com/AppStructAI/n8n-nodes-appstruct/main/Logo.svg)

Connect [AppStruct App Builder](https://appstruct.ai/app-builder?utm_source=github&utm_medium=referral&utm_campaign=n8n_quickstart_20261113&utm_content=readme_product) projects, tables and records to an n8n workflow. AppStruct combines visual app building with a separate collaborative workspace for documents, spreadsheets and presentations.

This community package works with **App Builder projects and tables**. Docs, Sheets and Slides use separate [MCP integrations](https://appstruct.ai/integrations/mcp?utm_source=github&utm_medium=referral&utm_campaign=n8n_quickstart_20261113&utm_content=readme_mcp); their product API keys are not the credentials for this node.

## Approved by n8n; catalog release scheduled

**Status checked November 20, 2026:** n8n has approved `n8n-nodes-appstruct` for its verified-node catalog. Creator Portal shows **Manual review: Complete** and **Launch Scheduled**. The approval notice says release is expected within the next 14 days, followed by a separate notification.

The catalog rollout is pending. For installation today, follow the compatible self-hosted npm route below with the published **2.0.1** package. We will confirm the catalog and n8n Cloud installation path after release and an installation check.

[Read the dated approval update and try the free polling example](https://blog.appstruct.ai/blog/n8n-polling-triggers-appstruct?utm_source=github&utm_medium=referral&utm_campaign=n8n_verified_20261120&utm_content=approval_readme_01#appstructs-n8n-approval-status). The ten-event browser example needs no account; connecting your own AppStruct project requires the setup below.

## Try the polling example before connecting an account

[Open the interactive New Row / Updated Row timeline](https://blog.appstruct.ai/blog/n8n-polling-triggers-appstruct?utm_source=github&utm_medium=referral&utm_campaign=n8n_polling_20261115&utm_content=interactive_readme_01#polling-timeline). No installation, account or API key is needed for this browser example.

At event 3, the same fictional source has one new request and one changed request:

| Trigger | Expected output | Why |
| --- | --- | --- |
| New Row | `POLL-003` | Its ID was absent from the saved automatic baseline. |
| Updated Row | `POLL-001` | Its existing ID has changed returned data. |

Switch modes at that event, then inspect manual preview, failed reads, recovery, a failed destination and the record limit. Download the ten-event timeline as CSV to compare the expected outcomes.

This is a fixed teaching model with fictional IDs. It does not execute n8n, connect to AppStruct or verify your actual workflow. To test your account, follow the manual first-read steps below, then use the [inactive polling workflow and acceptance log](https://blog.appstruct.ai/blog/n8n-polling-triggers-appstruct?utm_source=github&utm_medium=referral&utm_campaign=n8n_polling_20261115&utm_content=interactive_readme_setup_01#import-the-inactive-review-workflow).

## Version and compatibility

Version **2.0.1** was published with GitHub Actions provenance and passed the full n8n registry scanner. Check the [npm versions](https://www.npmjs.com/package/n8n-nodes-appstruct?activeTab=versions) before installing: a merged GitHub change does not update the published npm package. Local candidate checks are documented in [TESTING.md](TESTING.md).

2.x requires **n8n 2.47.7 or newer with Node.js 24+**. It is tested with n8n 2.47.7 and n8n-workflow 2.16.0. Older n8n hosts are not supported by this release. The package keeps its existing node type IDs, version-1 workflow definitions and `appStructApi` email/password credential fields.

## Start here: list your projects

Use [the manual first-read workflow](https://appstruct.ai/downloads/appstruct-n8n-list-projects.json) to check the connection before configuring writes or a scheduled automation.

```text
Manual trigger → AppStruct: Project / Get Many → inspect IDs and project names
```

1. Install a published `n8n-nodes-appstruct@2` release on a compatible self-hosted n8n instance that allows community packages. Follow [n8n's installation instructions](https://docs.n8n.io/integrations/community-nodes/installation/) for your deployment.
2. Download `examples/list-projects-read-only.json`, then import it using the n8n editor's **Import from File** option. See [n8n's import/export guide](https://docs.n8n.io/workflows/export-import/).
3. Open the **List AppStruct projects** node and select an **AppStruct API** credential. The package uses your AppStruct account email and password, stored in n8n credentials, to obtain an access token. n8n manages the token through `preAuthentication`; the login uses AppStruct’s explicit JSON-client protocol and does not use browser cookies.
4. Execute the manual workflow. Compare the returned `id` and `projectName` values with your AppStruct Apps library. An empty library can produce an empty result; create a separate practice project and repeat the check if needed.

The starter is inactive and contains no credentials, pinned account data, automatic triggers or third-party destination nodes. It selects a read operation; the account credential itself is **not** restricted to reads. Use an n8n instance you trust, inspect every operation you add, and remove credential references and execution data before sharing an export.

For the full walkthrough and troubleshooting, see the [AppStruct n8n setup guide](https://appstruct.ai/integrations/n8n?utm_source=github&utm_medium=referral&utm_campaign=n8n_quickstart_20261113&utm_content=readme_guide).

## Installation and hosting

Package name: `n8n-nodes-appstruct`. The 2.x release uses the current official n8n build and validation tools and has no runtime npm dependencies.

The npm installation path is for self-hosted n8n. The n8n approval described above is complete and the catalog launch is scheduled. Use the [current n8n community-node installation instructions](https://docs.n8n.io/integrations/community-nodes/installation/) for your deployment; the catalog and Cloud path will be confirmed after the release notification.

## Supported operations

| Resource | Operations |
| --- | --- |
| Projects | Get Many |
| Tables | Get Many, Create, Get Schema, Delete |
| Records | Get Many, Create, Update, Delete |
| Columns | Add |

For operations on tables or records, select the actual project and table from your account. The first-read example intentionally does not hard-code either. Authentication and project-list behavior are implemented in [AppStruct.node.ts](nodes/AppStruct/AppStruct.node.ts).

## Polling behavior in 2.x

Use n8n's **Poll Times** control to set the schedule. The previous custom Poll Interval field did not control n8n's scheduler and has been removed.

- On the first automatic poll, the node records a baseline without emitting historical data.
- New Row emits newly observed IDs once. Updated Row emits changed data for an existing ID, including nested-field changes.
- New Table and New Column emit additions instead of repeating the entire list.
- Manual tests preview the current items without moving the automatic polling baseline.
- Changing the monitored project, table or event starts a fresh baseline.
- Event timestamps come from the saved source fields; the node does not invent creation times for items without them.
- Record polling requires stable nonempty IDs. It observes the full returned table and stops with an error if the Record Poll Limit is reached, rather than silently monitoring a truncated result. The default is 1,000 records; the maximum is 10,000.
- n8n's workflow static data stores IDs and SHA-256 digests, not copies of the record contents. Normal n8n execution history can still contain returned records.

Polling sees state at each successful run. It cannot report an item created and deleted between polls or every intermediate edit. Review this behavior before upgrading an active 1.x workflow.

For a bounded exercise, use the [polling walkthrough](https://blog.appstruct.ai/blog/n8n-polling-triggers-appstruct?utm_source=github&utm_medium=referral&utm_campaign=n8n_polling_20261115&utm_content=readme_polling), [inactive New Row workflow](https://blog.appstruct.ai/downloads/appstruct-n8n-new-row-review.json) and [13-check acceptance log](https://blog.appstruct.ai/downloads/appstruct-n8n-polling-checklist.csv). The workflow has no stored credential, project/table IDs or destination. Select your own practice scope before running it. A successful poll advances its snapshot before later nodes finish, so destination failures still need an explicit retry/replay and deduplication design; polling is not an end-to-end exactly-once delivery guarantee.

## Build one useful workflow

For a service-request workflow, first define the form, stored fields and status update in AppStruct. The [service-request app tutorial](https://appstruct.ai/guides/build-service-request-app?utm_source=github&utm_medium=referral&utm_campaign=n8n_quickstart_20261113&utm_content=readme_tutorial) uses an educational example to plan these steps.

Then read a small set of fictional requests from the selected table in n8n. Before connecting notifications, decide which records qualify, what information to send and how repeated runs avoid duplicate messages. Test the destination and failure behavior separately before enabling a schedule.

For a runnable next step, try the [service-request queue audit and CSV report](https://blog.appstruct.ai/blog/n8n-service-request-queue-audit?utm_source=github&utm_medium=referral&utm_campaign=queue_audit_20261120&utm_content=readme_queue_audit). Its downloadable workflow uses five core n8n nodes and six fictional requests to check duplicate IDs, missing owners and overdue dates. No AppStruct credential or community package is required for that included example; the walkthrough explains mapping an authorized AppStruct snapshot as an optional source. It runs manually and does not send messages or update records.

The older [basic workflow](examples/basic-workflow.json) is a different example: it polls, creates log records and includes a placeholder Slack webhook. Configure and review those operations before running it; use the manual project-list starter for your first connection check.

## Troubleshooting

- **Unknown node after import:** confirm the community package is installed and available in the same n8n instance. Follow your administrator's restart requirements.
- **Authentication fails:** check the chosen AppStruct credential and the account's email/password sign-in. This package does not take a Docs, Sheets or Slides API key.
- **No projects returned:** check the account and Apps library. Importing the workflow is not proof of a working authenticated connection.
- **A later write fails:** verify the actual selected project, table schema, operation and mapped fields in a practice workflow before retrying.

## Community discussion

For questions about the New Row / Updated Row practice exercise, use the [AppStruct polling discussion on n8n Community](https://community.n8n.io/t/appstruct-community-node-test-new-row-and-updated-row-before-adding-a-destination/328923). Include your n8n and package versions, trigger type, checklist step and a redacted error. Distinguish a manual preview from an automatic poll and state whether its baseline was established. Do not post credentials, private records or unreviewed workflow exports.

The maker maintains this discussion to help reproduce the practice exercise. Catalog release status is documented above. Use [GitHub issues](https://github.com/AppStructAI/n8n-nodes-appstruct/issues) for a reproducible package bug.

## Resources

- [AppStruct n8n guide](https://appstruct.ai/integrations/n8n?utm_source=github&utm_medium=referral&utm_campaign=n8n_quickstart_20261113&utm_content=readme_resources)
- [AppStruct App Builder](https://appstruct.ai/app-builder?utm_source=github&utm_medium=referral&utm_campaign=n8n_quickstart_20261113&utm_content=readme_resources)
- [n8n community-node documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Source repository](https://github.com/AppStructAI/n8n-nodes-appstruct)

## License and support

MIT. See [LICENSE.md](LICENSE.md).

Contact [support@appstruct.cloud](mailto:support@appstruct.cloud) for support. Include your package and n8n versions and the failing operation; do not send passwords, tokens or private workflow exports.
