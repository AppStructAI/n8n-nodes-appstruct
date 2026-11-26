# Review a service-request queue from AppStruct

Read an authorized AppStruct table, review missing owners, overdue dates and duplicate IDs, and download a CSV. Optional email sends counts to one reviewer. The workflow does not update AppStruct records or contact requesters.

[Download the workflow JSON](service-request-queue-review.json) · [Full walkthrough and field-mapping exercise](https://blog.appstruct.ai/blog/n8n-service-request-queue-audit?utm_source=github&utm_medium=referral&utm_campaign=queue_audit_20261120&utm_content=live_table_digest_repo_01#connect-an-appstruct-table-and-prepare-an-exception-summary)

## Before importing

- Install the verified AppStruct node on n8n Cloud, or use self-hosted n8n 2.47.7+ with Node.js 24+ and `n8n-nodes-appstruct` 2.0.1. Follow the repository's [first-read instructions](../README.md#start-here-list-your-projects) first.
- Start with a practice table and fictional records. The workflow contains no credentials, project IDs or saved responses. Your AppStruct account credential can allow other operations; selecting a read operation does not restrict the credential itself.
- The JSON is inactive. The schedule is disabled and `notify` defaults to `false`. Importing is not proof of a working connection or approval of this workflow by n8n.

## Configure one manual run

1. Download the raw JSON and use n8n's **Import from File** option.
2. Select your credential in **Read AppStruct requests**. The selected operation is **Record → Get Many**.
3. In **Configure review**, fill `projectId`, `tableName` and the exact returned column names for `id`, `request`, `status`, `owner` and `dueDate`.
4. Use status values `new`, `in_progress` and `done`, or adapt and retest the audit policy. Dates must be calendar dates in `YYYY-MM-DD` format.
5. Set an IANA `timezone`. The default is `UTC`. Leave `referenceDateOverride` empty to use the execution date in that zone, or set it for a reproducible practice run.
6. Keep `notify: false`. Configure an SMTP credential in **Email counts-only summary**, or remove both **Send enabled and issues found?** and **Email counts-only summary** for a CSV-only workflow. n8n can require the email credential during validation even when sending is disabled.
7. Run **Run a manual review**. Inspect the source output, reviewed count, flags and **Download review CSV** output against your practice table.

The source node fetches the table and applies its Limit locally; it does not paginate. Keep the practice queue below the default limit of 2,000 records. A read at or above that limit stops rather than reporting a complete queue, even if the table happens to contain exactly 2,000 records. Check the source count before changing the limit. API failures stop execution.

An empty table produces a summary-only CSV. If no row contains the mapped request or status column, the workflow stops so you can correct the mapping. Every supplied row, including repeated IDs, is retained; unmapped source columns are excluded. Spreadsheet formula-like text is neutralized in the CSV.

## Check the result before scheduling

| Practice input | Check |
| --- | --- |
| A small known queue | Reviewed count matches the source; mapped values and flags match your records. |
| An empty table | Summary-only CSV; no notification. |
| A repeated ID | Both rows remain, with duplicate-ID flags. |
| An unassigned or overdue request | Expected review flags and counts appear. |
| An invalid date or wrong mapping | Inspect the diagnostic; do not treat the result as a clean queue. |
| A read reaching the configured limit | Execution stops with a completeness warning. |
| The same snapshot and reference date twice | Same report; source records remain unchanged. |

For email, set a provider-authorized `fromEmail` and an authorized reviewer's `toEmail`. Change `notify` to `true` and run manually once. Only a queue with flagged rows sends a summary. It contains date and counts, without request text, owner names or a CSV attachment.

After successful manual checks, match the **workflow timezone** to the configured zone, enable the weekday 09:00 Schedule Trigger, then save and publish. See [n8n's schedule documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/).

Each execution reviews the current snapshot. Repeated runs can repeat an email; there is no notification deduplication or exactly-once guarantee. Review n8n execution retention before supplying private records. Design writes and customer notifications as separate, reviewed actions.

## Validation and release status

This is the same JSON distributed in the AppStruct blog walkthrough, with SHA-256 `41d4e661b4be90ee302f98bd60274ef1ff4adf22a25b772bb46a4ff231de2e4f`. It was exercised with six fixtures in a local n8n 2.47.7 runtime, mocked AppStruct HTTP and loopback SMTP. Those checks did not use a live customer account, send real email or independently test n8n Cloud.

The AppStruct node is verified and live on n8n Cloud. This workflow is an example, not an approved n8n template. No new npm release is required to import this repository example.
