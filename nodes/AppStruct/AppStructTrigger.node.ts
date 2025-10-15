import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeApiError,
	NodeOperationError,
	NodeConnectionType,
	LoggerProxy as Logger,
} from 'n8n-workflow';

async function getAccessToken(context: any, credentials: IDataObject): Promise<string> {
	const loginMutation = `
		mutation ($loginInput: LoginInput!) {
			login(loginInput: $loginInput) {
				access_token
				refresh_token
			}
		}
	`;

	const response = await context.helpers.httpRequest({
		method: 'POST',
		url: 'https://api.appstruct.cloud/graphql',
		headers: {
			'Content-Type': 'application/json',
		},
		body: {
			query: loginMutation,
			variables: {
				loginInput: {
					email: credentials.email,
					password: credentials.password,
				},
			},
		},
		json: true,
	});

	if (response.errors || !response.data?.login?.access_token) {
		throw new NodeApiError(context.getNode(), {
			message: 'Authentication failed',
			description: 'Invalid credentials or login error',
		});
	}

	return response.data.login.access_token;
}

export class AppStructTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AppStruct Trigger',
		name: 'appStructTrigger',
		icon: 'file:appstruct.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers when something happens in AppStruct',
		defaults: {
			name: 'AppStruct Trigger',
		},
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.Main],
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
				description: 'The project to monitor. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				description: 'The table to monitor. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Poll Interval (Minutes)',
				name: 'pollInterval',
				type: 'number',
				default: 5,
				description: 'How often to check for changes (in minutes)',
			},
		],
	};

	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('appStructApi');
				const accessToken = await getAccessToken(this, credentials);

				const query = `
					query {
						myProjects {
							id
							projectName
						}
					}
				`;

				const response = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.appstruct.cloud/graphql',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${accessToken}`,
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
				return projects.map((project: any) => ({
					name: project.projectName,
					value: project.id.toString(),
				}));
			},

			async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projectId = this.getCurrentNodeParameter('projectId') as string;
				if (!projectId) {
					return [];
				}

				const credentials = await this.getCredentials('appStructApi');
				const accessToken = await getAccessToken(this, credentials);

				const query = `
					query getBackendTables($projectId: Float!) {
						getBackendTables(projectId: $projectId)
					}
				`;

				const response = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.appstruct.cloud/graphql',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${accessToken}`,
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
		const tableName = this.getNodeParameter('tableName') as string;

		const credentials = await this.getCredentials('appStructApi');
		const accessToken = await getAccessToken(this, credentials);

		const workflowStaticData = this.getWorkflowStaticData('node');
		const lastPoll = workflowStaticData.lastPoll as string || new Date(0).toISOString();

		let responseData: IDataObject[] = [];

		try {
			if (triggerOn === 'newRow') {
				responseData = await pollNewRows(this, accessToken, projectId, tableName, lastPoll);
			} else if (triggerOn === 'updatedRow') {
				responseData = await pollUpdatedRows(this, accessToken, projectId, tableName, lastPoll);
			} else if (triggerOn === 'newTable') {
				responseData = await pollNewTables(this, accessToken, projectId, lastPoll);
			} else if (triggerOn === 'newColumn') {
				responseData = await pollNewColumns(this, accessToken, projectId, tableName, lastPoll);
			}

			workflowStaticData.lastPoll = new Date().toISOString();

			if (responseData.length === 0) {
				return null;
			}

			return [this.helpers.returnJsonArray(responseData)];
		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Polling failed: ${(error as Error).message}`);
		}
	}
}

async function pollNewRows(
	context: IPollFunctions,
	accessToken: string,
	projectId: string,
	tableName: string,
	lastPoll: string,
): Promise<IDataObject[]> {
	const query = `
		query getTableData($projectId: Float!, $tableName: String!) {
			getTableData(projectId: $projectId, tableName: $tableName) {
				id
				data
			}
		}
	`;

	const response = await context.helpers.httpRequest({
		method: 'POST',
		url: 'https://api.appstruct.cloud/graphql',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: {
			query,
					variables: {
			projectId: parseFloat(projectId),
			tableName,
		},
		},
		json: true,
	});

	if (response.errors) {
		throw new NodeApiError(context.getNode(), response.errors[0]);
	}

	const records = response.data?.getTableData || [];
	
	// Debug logging
	Logger.debug('AppStruct Trigger: Found records', { 
		totalRecords: records.length, 
		lastPoll,
		tableName,
		projectId 
	});
	
	// Filter for new records since last poll
	const newRecords = records.filter((record: any) => {
		// Check if record has a created_at field
		const createdAt = record.data?.created_at;
		if (!createdAt) {
			// If no created_at field, consider it new (fallback behavior)
			return true;
		}
		
		// Parse the date and compare with lastPoll
		try {
			const recordDate = new Date(createdAt);
			const lastPollDate = new Date(lastPoll);
			return recordDate > lastPollDate;
		} catch (error) {
			// If date parsing fails, consider it new (fallback behavior)
			return true;
		}
	});
	
	Logger.debug('AppStruct Trigger: Filtered new records', { 
		newRecords: newRecords.length,
		tableName,
		projectId 
	});
	
	// Map to the expected format
	return newRecords.map((record: any) => ({
		id: record.id,
		...record.data,
		triggerType: 'newRow',
		tableName,
		// Ensure created_at is properly formatted
		created_at: record.data?.created_at || new Date().toISOString(),
	}));
}

async function pollUpdatedRows(
	context: IPollFunctions,
	accessToken: string,
	projectId: string,
	tableName: string,
	lastPoll: string,
): Promise<IDataObject[]> {
	return [];
}

async function pollNewTables(
	context: IPollFunctions,
	accessToken: string,
	projectId: string,
	lastPoll: string,
): Promise<IDataObject[]> {
	const query = `
		query getBackendTables($projectId: Float!) {
			getBackendTables(projectId: $projectId)
		}
	`;

	const response = await context.helpers.httpRequest({
		method: 'POST',
		url: 'https://api.appstruct.cloud/graphql',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
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
		throw new NodeApiError(context.getNode(), response.errors[0]);
	}

	const tables = response.data?.getBackendTables || [];
	
	return tables.map((tableName: string) => ({
		tableName,
		triggerType: 'newTable',
		createdAt: new Date().toISOString(),
	}));
}

async function pollNewColumns(
	context: IPollFunctions,
	accessToken: string,
	projectId: string,
	tableName: string,
	lastPoll: string,
): Promise<IDataObject[]> {
	const query = `
		query getTableSchema($projectId: Float!, $tableName: String!) {
			getTableSchema(projectId: $projectId, tableName: $tableName) {
				name
				columns {
					name
					type
					isNullable
				}
			}
		}
	`;

	const response = await context.helpers.httpRequest({
		method: 'POST',
		url: 'https://api.appstruct.cloud/graphql',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: {
			query,
			variables: {
				projectId: parseFloat(projectId),
				tableName,
			},
		},
		json: true,
	});

	if (response.errors) {
		throw new NodeApiError(context.getNode(), response.errors[0]);
	}

	const schema = response.data?.getTableSchema;
	if (!schema) {
		return [];
	}

	return schema.columns.map((column: any) => ({
		...column,
		tableName: schema.name,
		triggerType: 'newColumn',
		createdAt: new Date().toISOString(),
	}));
}