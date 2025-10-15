import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeApiError,
	NodeOperationError,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeConnectionType,
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

export class AppStruct implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AppStruct',
		name: 'appStruct',
		icon: 'file:appstruct.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AppStruct API',
		defaults: {
			name: 'AppStruct',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [NodeConnectionType.Main],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'appStructApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Table',
						value: 'table',
					},
					{
						name: 'Record',
						value: 'record',
					},
					{
						name: 'Column',
						value: 'column',
					},
					{
						name: 'Project',
						value: 'project',
					},
				],
				default: 'table',
			},

			// Table Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['table'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new table',
						action: 'Create a table',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all tables in a project',
						action: 'Get many tables',
					},
					{
						name: 'Get Schema',
						value: 'getSchema',
						description: 'Get table schema',
						action: 'Get table schema',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a table',
						action: 'Delete a table',
					},
				],
				default: 'getMany',
			},

			// Record Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['record'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Insert a new record',
						action: 'Create a record',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an existing record',
						action: 'Update a record',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a record',
						action: 'Delete a record',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get records from a table',
						action: 'Get many records',
					},
				],
				default: 'getMany',
			},

			// Column Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['column'],
					},
				},
				options: [
					{
						name: 'Add',
						value: 'add',
						description: 'Add a column to a table',
						action: 'Add a column',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a column from a table',
						action: 'Delete a column',
					},
				],
				default: 'add',
			},

			// Project Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['project'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all projects',
						action: 'Get many projects',
					},
				],
				default: 'getMany',
			},

			// Project ID field
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				displayOptions: {
					show: {
						resource: ['table', 'record', 'column'],
					},
				},
				default: '',
				required: true,
				description: 'The project to work with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// Table Name field
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
						resource: ['record', 'column'],
					},
				},
				default: '',
				required: true,
				description: 'The table to work with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// Table Name field for table operations
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['create', 'getSchema', 'delete'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the table',
			},

			// Record ID field
			{
				displayName: 'Record ID',
				name: 'recordId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['update', 'delete'],
					},
				},
				default: '',
				required: true,
				description: 'ID of the record to update or delete',
			},

			// Column Name field
			{
				displayName: 'Column Name',
				name: 'columnName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['column'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the column',
			},

			// Column Type field
			{
				displayName: 'Column Type',
				name: 'columnType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['column'],
						operation: ['add'],
					},
				},
				options: [
					{
						name: 'Boolean',
						value: 'boolean',
					},
					{
						name: 'Date',
						value: 'date',
					},
					{
						name: 'DateTime',
						value: 'datetime',
					},
					{
						name: 'Number',
						value: 'number',
					},
					{
						name: 'Text',
						value: 'text',
					},
				],
				default: 'text',
				required: true,
				description: 'Type of the column',
			},

			// Column Nullable field
			{
				displayName: 'Is Nullable',
				name: 'isNullable',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['column'],
						operation: ['add'],
					},
				},
				default: true,
				description: 'Whether the column can contain null values',
			},

			// Data field for record operations
			{
				displayName: 'Data',
				name: 'data',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['create', 'update'],
					},
				},
				default: '{}',
				required: true,
				description: 'Record data as JSON object',
			},

			// Limit field for get operations
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['getMany'],
					},
				},
				default: 50,
				description: 'Max number of results to return',
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('appStructApi');
		const accessToken = await getAccessToken(this, credentials);

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let responseData: IDataObject | IDataObject[];

				if (resource === 'project') {
					responseData = await executeProjectOperation(this, accessToken, operation, i);
				} else if (resource === 'table') {
					responseData = await executeTableOperation(this, accessToken, operation, i);
				} else if (resource === 'record') {
					responseData = await executeRecordOperation(this, accessToken, operation, i);
				} else if (resource === 'column') {
					responseData = await executeColumnOperation(this, accessToken, operation, i);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, {
						itemIndex: i,
					});
				}

				if (Array.isArray(responseData)) {
					// For array responses, each item should be paired with the input item
					responseData.forEach((item) => {
						returnData.push({
							json: item,
							pairedItem: { item: i },
						});
					});
				} else {
					// For single responses, pair with the input item
					returnData.push({
						json: responseData,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

async function executeProjectOperation(
	context: IExecuteFunctions,
	accessToken: string,
	operation: string,
	itemIndex: number,
): Promise<IDataObject[]> {
	if (operation === 'getMany') {
		const query = `
			query {
				myProjects {
					id
					projectName
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
			},
			json: true,
		});

		if (response.errors) {
			throw new NodeApiError(context.getNode(), response.errors[0]);
		}

		return response.data?.myProjects || [];
	}

	throw new NodeOperationError(context.getNode(), `Unknown operation "${operation}"`, {
		itemIndex,
	});
}

async function executeTableOperation(
	context: IExecuteFunctions,
	accessToken: string,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const projectId = context.getNodeParameter('projectId', itemIndex) as string;
	// Only get tableName for operations that need it (not for getMany)
	const tableName = operation === 'getMany' ? '' : (context.getNodeParameter('tableName', itemIndex) as string);

	if (operation === 'getMany') {
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
		return tables.map((name: string) => ({ tableName: name }));
	}

	if (operation === 'create') {
		const mutation = `
			mutation createTable($projectId: Float!, $tableName: String!, $columns: [ColumnTypeInput!]!) {
				createTable(projectId: $projectId, tableName: $tableName, columns: $columns)
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
				query: mutation,
				variables: {
					projectId: parseFloat(projectId),
					tableName,
					columns: [],
				},
			},
			json: true,
		});

		if (response.errors) {
			throw new NodeApiError(context.getNode(), response.errors[0]);
		}

		return {
			success: response.data?.createTable === true,
			tableName,
		};
	}

	if (operation === 'getSchema') {
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

		return response.data?.getTableSchema || {};
	}

	if (operation === 'delete') {
		const mutation = `
			mutation deleteTable($projectId: Float!, $tableName: String!) {
				deleteTable(projectId: $projectId, tableName: $tableName)
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
				query: mutation,
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

		return {
			success: response.data?.deleteTable === true,
			tableName,
		};
	}

	throw new NodeOperationError(context.getNode(), `Unknown operation "${operation}"`, {
		itemIndex,
	});
}

async function executeRecordOperation(
	context: IExecuteFunctions,
	accessToken: string,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const projectId = context.getNodeParameter('projectId', itemIndex) as string;
	const tableName = context.getNodeParameter('tableName', itemIndex) as string;

	if (operation === 'getMany') {
		const limit = context.getNodeParameter('limit', itemIndex, 100) as number;

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
		const mappedRecords = records.map((record: any) => ({
			id: record.id,
			...record.data,
		}));
		
		// Apply client-side limiting since API doesn't support it
		return limit > 0 ? mappedRecords.slice(0, limit) : mappedRecords;
	}

	if (operation === 'create') {
		const data = context.getNodeParameter('data', itemIndex) as string;
		let parsedData: IDataObject;

		try {
			parsedData = typeof data === 'string' ? JSON.parse(data) : data;
		} catch (error) {
			throw new NodeOperationError(context.getNode(), 'Invalid JSON in data field', {
				itemIndex,
			});
		}

		const mutation = `
			mutation insertRecord($projectId: Float!, $tableName: String!, $data: JSONObject!) {
				insertRecord(projectId: $projectId, tableName: $tableName, data: $data)
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
				query: mutation,
				variables: {
					projectId: parseFloat(projectId),
					tableName,
					data: parsedData,
				},
			},
			json: true,
		});

		if (response.errors) {
			throw new NodeApiError(context.getNode(), response.errors[0]);
		}

		return {
			success: response.data?.insertRecord === true,
			data: parsedData,
		};
	}

	if (operation === 'update') {
		const recordId = context.getNodeParameter('recordId', itemIndex) as string;
		const data = context.getNodeParameter('data', itemIndex) as string;
		let parsedData: IDataObject;

		try {
			parsedData = typeof data === 'string' ? JSON.parse(data) : data;
		} catch (error) {
			throw new NodeOperationError(context.getNode(), 'Invalid JSON in data field', {
				itemIndex,
			});
		}

		const mutation = `
			mutation updateRecord($projectId: Float!, $tableName: String!, $id: String!, $data: JSONObject!) {
				updateRecord(projectId: $projectId, tableName: $tableName, id: $id, data: $data) {
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
				query: mutation,
				variables: {
					projectId: parseFloat(projectId),
					tableName,
					id: recordId,
					data: parsedData,
				},
			},
			json: true,
		});

		if (response.errors) {
			throw new NodeApiError(context.getNode(), response.errors[0]);
		}

		const updatedRecord = response.data?.updateRecord;
		return {
			id: updatedRecord?.id,
			...updatedRecord?.data,
		};
	}

	if (operation === 'delete') {
		const recordId = context.getNodeParameter('recordId', itemIndex) as string;

		const mutation = `
			mutation deleteRecord($projectId: Float!, $tableName: String!, $id: String!) {
				deleteRecord(projectId: $projectId, tableName: $tableName, id: $id)
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
				query: mutation,
				variables: {
					projectId: parseFloat(projectId),
					tableName,
					id: recordId,
				},
			},
			json: true,
		});

		if (response.errors) {
			throw new NodeApiError(context.getNode(), response.errors[0]);
		}

		return {
			success: response.data?.deleteRecord === true,
			id: recordId,
		};
	}

	throw new NodeOperationError(context.getNode(), `Unknown operation "${operation}"`, {
		itemIndex,
	});
}

async function executeColumnOperation(
	context: IExecuteFunctions,
	accessToken: string,
	operation: string,
	itemIndex: number,
): Promise<IDataObject> {
	const projectId = context.getNodeParameter('projectId', itemIndex) as string;
	const tableName = context.getNodeParameter('tableName', itemIndex) as string;
	const columnName = context.getNodeParameter('columnName', itemIndex) as string;

	if (operation === 'add') {
		const columnType = context.getNodeParameter('columnType', itemIndex) as string;
		const isNullable = context.getNodeParameter('isNullable', itemIndex) as boolean;

		const mutation = `
			mutation addColumn($projectId: Float!, $tableName: String!, $column: ColumnTypeInput!) {
				addColumn(projectId: $projectId, tableName: $tableName, column: $column)
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
				query: mutation,
				variables: {
					projectId: parseFloat(projectId),
					tableName,
					column: {
						name: columnName,
						type: columnType,
						isNullable,
					},
				},
			},
			json: true,
		});

		if (response.errors) {
			throw new NodeApiError(context.getNode(), response.errors[0]);
		}

		return {
			success: response.data?.addColumn === true,
			columnName,
			columnType,
			isNullable,
		};
	}

	if (operation === 'delete') {
		const mutation = `
			mutation deleteColumn($projectId: Float!, $tableName: String!, $columnName: String!) {
				deleteColumn(projectId: $projectId, tableName: $tableName, columnName: $columnName)
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
				query: mutation,
				variables: {
					projectId: parseFloat(projectId),
					tableName,
					columnName,
				},
			},
			json: true,
		});

		if (response.errors) {
			throw new NodeApiError(context.getNode(), response.errors[0]);
		}

		return {
			success: response.data?.deleteColumn === true,
			columnName,
		};
	}

	throw new NodeOperationError(context.getNode(), `Unknown operation "${operation}"`, {
		itemIndex,
	});
}