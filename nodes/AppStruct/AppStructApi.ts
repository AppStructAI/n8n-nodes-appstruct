import { NodeApiError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';

export const APPSTRUCT_API_URL = 'https://api.appstruct.cloud';
export const APPSTRUCT_TOKEN_URL = `${APPSTRUCT_API_URL}/graphql`;
export interface AppStructProject extends IDataObject {
	id: string | number;
	projectName: string;
}
export interface AppStructRecord extends IDataObject {
	id: string | null;
	data: IDataObject;
}
export interface AppStructColumn extends IDataObject {
	name: string;
	type: string;
	isNullable?: boolean;
}
export interface AppStructSchema extends IDataObject {
	name: string;
	columns: AppStructColumn[];
}
export interface AppStructGraphqlData extends IDataObject {
	myProjects?: AppStructProject[];
	getBackendTables?: string[];
	getTableData?: AppStructRecord[];
	getTableSchema?: AppStructSchema;
	updateRecord?: AppStructRecord;
	createTable?: boolean;
	deleteTable?: boolean;
	insertRecord?: boolean;
	deleteRecord?: boolean;
	addColumn?: boolean;
	deleteColumn?: boolean;
}
export interface AppStructResponse {
	data?: AppStructGraphqlData | null;
	errors?: JsonObject[];
}
type AppStructContext = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

function isUnauthenticated(response: AppStructResponse): boolean {
	if (response.data != null || !Array.isArray(response.errors) || !response.errors.length)
		return false;
	return response.errors.every((error) => {
		const extensions = error.extensions;
		return (
			extensions &&
			typeof extensions === 'object' &&
			!Array.isArray(extensions) &&
			extensions.code === 'UNAUTHENTICATED'
		);
	});
}

// n8n owns credential loading, preAuthentication and the Authorization header.
// Retry GraphQL's HTTP-200 authentication failure once; never retry partial data.
export async function appStructApiRequest(
	context: AppStructContext,
	options: IHttpRequestOptions,
): Promise<AppStructResponse> {
	const request = { ...options, timeout: 30000 };
	const response = await context.helpers.httpRequestWithAuthentication.call(
		context,
		'appStructApi',
		request,
	);
	if (!response || typeof response !== 'object' || Array.isArray(response)) {
		throw new NodeApiError(context.getNode(), {
			message: 'AppStruct returned an invalid API response',
		});
	}
	if (!isUnauthenticated(response)) return response;
	const credential = context.getNode().credentials?.appStructApi;
	if (!credential?.id) return response;
	const credentials = await context.getCredentials('appStructApi');
	return await context.helpers.httpRequestWithAuthentication.call(
		context,
		'appStructApi',
		request,
		{
			credentialsDecrypted: {
				id: credential.id,
				name: credential.name,
				type: 'appStructApi',
				data: { ...credentials, accessToken: '' },
			},
		},
	);
}
