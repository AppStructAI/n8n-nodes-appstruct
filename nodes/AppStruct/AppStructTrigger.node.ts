import { createHash } from 'node:crypto';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { appStructApiRequest } from './AppStructApi';

export class AppStructTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AppStruct Trigger',
		name: 'appStructTrigger',
		subtitle: '={{$parameter["triggerOn"]}}',
		icon: { light: 'file:appstruct.svg', dark: 'file:appstruct.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Triggers when something happens in AppStruct',
		defaults: {
			name: 'AppStruct Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'appStructApi',
				required: true,
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				options: [
					{
						name: 'New Row',
						value: 'newRow',
						description: 'Triggers when a new row is added to a table',
					},
					{
						name: 'Updated Row',
						value: 'updatedRow',
						description: 'Triggers when a row is updated in a table',
					},
					{
						name: 'New Table',
						value: 'newTable',
						description: 'Triggers when a new table is created',
					},
					{
						name: 'New Column',
						value: 'newColumn',
						description: 'Triggers when a new column is added to a table',
					},
				],
				default: 'newRow',
				required: true,
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				default: '',
				required: true,
				description:
					'The project to monitor. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Table Name or ID',
				name: 'tableName',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTables',
					loadOptionsDependsOn: ['projectId'],
				},
				displayOptions: {
					show: {
						triggerOn: ['newRow', 'updatedRow', 'newColumn'],
					},
				},
				default: '',
				required: true,
				description:
					'The table to monitor. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Record Poll Limit',
				name: 'pollLimit',
				type: 'number',
				default: 1000,
				typeOptions: { minValue: 2, maxValue: 10000 },
				displayOptions: { show: { triggerOn: ['newRow', 'updatedRow'] } },
				description:
					'Maximum records to inspect. Polling stops at this limit to avoid silently missing changes. Use a smaller table or increase this limit.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const query = `
					query {
						myProjects {
							id
							projectName
						}
					}
				`;

				const response = await appStructApiRequest(this, {
					method: 'POST',
					url: 'https://api.appstruct.cloud/graphql',
					headers: {
						'Content-Type': 'application/json',
					},
					body: {
						query,
					},
					json: true,
				});

				if (response.errors) {
					throw new NodeApiError(this.getNode(), response.errors[0]);
				}

				const projects = response.data?.myProjects || [];
				return projects.map((project) => ({
					name: project.projectName,
					value: project.id.toString(),
				}));
			},

			async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projectId = this.getCurrentNodeParameter('projectId') as string;
				if (!projectId) {
					return [];
				}

				const query = `
					query getBackendTables($projectId: Float!) {
						getBackendTables(projectId: $projectId)
					}
				`;

				const response = await appStructApiRequest(this, {
					method: 'POST',
					url: 'https://api.appstruct.cloud/graphql',
					headers: {
						'Content-Type': 'application/json',
					},
					body: {
						query,
						variables: {
							projectId: parseFloat(projectId),
						},
					},
					json: true,
				});

				if (response.errors) {
					throw new NodeApiError(this.getNode(), response.errors[0]);
				}

				const tables = response.data?.getBackendTables || [];
				return tables.map((tableName: string) => ({
					name: tableName,
					value: tableName,
				}));
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const triggerOn = this.getNodeParameter('triggerOn') as string;
		const projectId = this.getNodeParameter('projectId') as string;
		const tableName =
			triggerOn === 'newTable' ? '' : (this.getNodeParameter('tableName') as string);
		const staticData = this.getWorkflowStaticData('node');
		const current: { id: string; value: IDataObject }[] = [];

		if (triggerOn === 'newRow' || triggerOn === 'updatedRow') {
			const limit = this.getNodeParameter('pollLimit', 1000) as number;
			if (!Number.isInteger(limit) || limit < 2 || limit > 10000) {
				throw new NodeOperationError(
					this.getNode(),
					'Record Poll Limit must be an integer between 2 and 10000.',
				);
			}
			const response = await appStructApiRequest(this, {
				method: 'POST',
				url: 'https://api.appstruct.cloud/graphql',
				json: true,
				body: {
					query:
						'query getTableData($projectId: Float!, $tableName: String!, $limit: Float!) { getTableData(projectId: $projectId, tableName: $tableName, limit: $limit) { id data } }',
					variables: { projectId: Number(projectId), tableName, limit },
				},
			});
			if (response.errors?.length) throw new NodeApiError(this.getNode(), response.errors[0]);
			const rows = response.data?.getTableData;
			if (!Array.isArray(rows))
				throw new NodeOperationError(this.getNode(), 'AppStruct did not return table records.');
			if (rows.length >= limit)
				throw new NodeOperationError(
					this.getNode(),
					'Record Poll Limit reached. Increase the limit or monitor a smaller table to avoid missing changes.',
				);
			for (const row of rows) {
				if (!row.id)
					throw new NodeOperationError(
						this.getNode(),
						'Record polling requires a stable, non-empty record ID.',
					);
				current.push({
					id: row.id,
					value: { ...row.data, id: row.id, triggerType: triggerOn, tableName },
				});
			}
		} else if (triggerOn === 'newTable') {
			const response = await appStructApiRequest(this, {
				method: 'POST',
				url: 'https://api.appstruct.cloud/graphql',
				json: true,
				body: {
					query:
						'query getBackendTables($projectId: Float!) { getBackendTables(projectId: $projectId) }',
					variables: { projectId: Number(projectId) },
				},
			});
			if (response.errors?.length) throw new NodeApiError(this.getNode(), response.errors[0]);
			if (!Array.isArray(response.data?.getBackendTables))
				throw new NodeOperationError(this.getNode(), 'AppStruct did not return a table list.');
			for (const name of response.data.getBackendTables)
				current.push({ id: name, value: { tableName: name, triggerType: triggerOn } });
		} else if (triggerOn === 'newColumn') {
			const response = await appStructApiRequest(this, {
				method: 'POST',
				url: 'https://api.appstruct.cloud/graphql',
				json: true,
				body: {
					query:
						'query getTableSchema($projectId: Float!, $tableName: String!) { getTableSchema(projectId: $projectId, tableName: $tableName) { name columns { name type isNullable } } }',
					variables: { projectId: Number(projectId), tableName },
				},
			});
			if (response.errors?.length) throw new NodeApiError(this.getNode(), response.errors[0]);
			const columns = response.data?.getTableSchema?.columns;
			if (!Array.isArray(columns))
				throw new NodeOperationError(this.getNode(), 'AppStruct did not return table columns.');
			for (const column of columns)
				current.push({ id: column.name, value: { ...column, tableName, triggerType: triggerOn } });
		} else {
			throw new NodeOperationError(this.getNode(), `Unsupported trigger: ${triggerOn}`);
		}

		// Manual tests preview current items without moving the live polling baseline.
		if (this.getMode() === 'manual')
			return current.length
				? [this.helpers.returnJsonArray(current.map((item) => item.value))]
				: null;
		const scope = JSON.stringify([triggerOn, projectId, tableName]);
		const previous = staticData.appStructSnapshot as
			| { scope: string; values: Record<string, string> }
			| undefined;
		const values = Object.fromEntries(current.map((item) => [item.id, fingerprint(item.value)]));
		let changes: IDataObject[] = [];
		if (previous?.scope === scope && previous.values && typeof previous.values === 'object') {
			changes = current
				.filter((item) => {
					const existed = Object.prototype.hasOwnProperty.call(previous.values, item.id);
					return triggerOn === 'updatedRow'
						? existed && previous.values[item.id] !== values[item.id]
						: !existed;
				})
				.map((item) => item.value);
		}
		// Only IDs and SHA-256 digests are persisted, not copied record contents.
		staticData.appStructSnapshot = { scope, values };
		return changes.length ? [this.helpers.returnJsonArray(changes)] : null;
	}
}

function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.entries(value)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value) ?? 'null';
}

function fingerprint(value: IDataObject): string {
	return createHash('sha256').update(canonical(value)).digest('hex');
}
