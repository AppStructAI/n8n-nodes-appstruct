# AppStruct + n8n: first-read practice kit

Instructions updated November 26, 2026 for `n8n-nodes-appstruct` 2.0.1.
n8n's November 23 release notice confirms that the node is verified and live on
n8n Cloud. A public page in n8n's website directory is a separate listing.

## Start on n8n Cloud

1. Use your own n8n Cloud instance and AppStruct account with access to an App
   Builder project. The n8n instance owner or an admin must install the node.
2. On a workflow canvas, open **+**, search for **AppStruct**, open the matching
   result under **More from the community**, and choose **Install**. If it is
   missing, ask the owner/admin to check **Verified community nodes** in the
   Cloud instance settings. Existing installed nodes can be used by members.
3. In the workflow menu, choose **Import from File** and select
   `01-list-projects-read-only.json` from this kit. Do not import the ZIP itself.
4. Open **List AppStruct projects** and select or create an **AppStruct API**
   credential. Enter your AppStruct email and password only in the credential
   form of an n8n instance you trust. Docs, Sheets and Slides MCP keys are a
   different integration.
5. Execute the manual workflow. It runs **Manual Trigger → AppStruct:
   Project / Get Many**. Compare a returned `id` and `projectName` with the
   intended account's AppStruct Apps library.

An empty library may return no projects. Create a separate practice project if
you need a non-empty check; do not change a production project for the exercise.
An unknown-node error concerns installation; an authentication error concerns
the credential. An HTTP success or an imported file alone does not prove that
you read the intended account. The selected operation reads projects, but the
account credential itself is **not restricted to reads**.

Use your applicable n8n Cloud and AppStruct plan access. A Cloud installation
has not been independently executed for this documentation revision; the Cloud
steps follow the release notice and the official installation documentation.

## Using self-hosted n8n instead

AppStruct node 2.x requires **n8n 2.47.7+ and Node.js 24+**. Install
`n8n-nodes-appstruct@2.0.1` through the supported community-node installation
route for your instance, then follow steps 3–5 above. Cloud manages its own
runtime; these self-hosted requirements are not a request to install Node.js
inside an n8n Cloud instance. Check your installed package version.

## After the manual read: test polling

`02-new-row-inactive.json` is a separate, inactive workflow. Select your own
credential, practice project and small table before enabling it. It has a
polling trigger and a note, with no message or record-writing destination.

The first successful automatic poll saves a baseline without emitting changes.
Add one fictional row after that baseline, inspect the next poll, then repeat
without changes. A manual preview shows current rows and does not advance the
automatic baseline. Use `03-polling-checklist.csv`; all 13 results start as
**Not checked**. Destination-failure checks need a separately designed workflow.
Polling does not guarantee every intermediate edit or exactly-once delivery.

The JSON files contain no credentials, account project/table IDs, pinned account
responses or external destinations. Keep real execution data and completed
checklists private. Review and clean exports before sharing them.

## Walkthroughs

- [Current Cloud setup and troubleshooting](https://appstruct.ai/integrations/n8n?utm_source=github&utm_medium=referral&utm_campaign=n8n_cloud_20261125&utm_content=cloud_kit_setup_01#n8n-cloud)
- [30-second illustrated guide and interactive timeline](https://blog.appstruct.ai/blog/n8n-polling-triggers-appstruct#n8n-polling-video)
- [n8n: install verified community nodes](https://docs.n8n.io/integrations/community-nodes/installation-and-management/install-verified-community-nodes/)
- [n8n: export and import workflows](https://docs.n8n.io/build/manage-workflows/export-and-import/)

The video and timeline use fictional records; they are not live account tests.
This kit is a documentation revision, not a new npm runtime release. The MIT
license covers these example files, not the hosted AppStruct SaaS.
