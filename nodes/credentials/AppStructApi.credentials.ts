import {
	ApplicationError,
	type IAuthenticateGeneric,
	type ICredentialDataDecryptedObject,
	type ICredentialTestRequest,
	type ICredentialType,
	type IDataObject,
	type IHttpRequestHelper,
	type INodeProperties,
} from 'n8n-workflow';
import { APPSTRUCT_API_URL, APPSTRUCT_TOKEN_URL } from '../AppStruct/AppStructApi';

export class AppStructApi implements ICredentialType {
	name = 'appStructApi';
	displayName = 'AppStruct API';
	documentationUrl = 'https://appstruct.ai/integrations/n8n';
	icon = { light: 'file:appstruct.svg', dark: 'file:appstruct.svg' } as const;
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: { expirable: true, password: true },
			default: '',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
			required: true,
			description: 'Your AppStruct account email',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your AppStruct account password',
		},
	];

	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<IDataObject> {
		const { email, password } = credentials;
		if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
			throw new ApplicationError('Enter your AppStruct account email and password.');
		}
		try {
			const response = await this.helpers.httpRequest({
				method: 'POST',
				url: APPSTRUCT_TOKEN_URL,
				headers: { 'Content-Type': 'application/json', 'Apollo-Require-Preflight': 'true' },
				body: {
					query:
						'mutation ($loginInput: LoginInput!) { login(loginInput: $loginInput) { access_token } }',
					variables: { loginInput: { email, password } },
				},
				json: true,
				timeout: 15000,
			});
			const token = response?.data?.login?.access_token;
			if (response?.errors || typeof token !== 'string' || !token.trim()) {
				throw new ApplicationError('AppStruct did not return an access token.');
			}
			return { accessToken: token };
		} catch {
			// HTTP exceptions can include the login request. Keep them out of messages.
			throw new ApplicationError(
				'Unable to authenticate with AppStruct. Check your account credentials and connection.',
			);
		}
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Content-Type': 'application/json',
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	// Probe the supplied password explicitly: n8n may reuse a cached token.
	// This request is independent of the token used to authenticate normal API reads.
	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			baseURL: APPSTRUCT_API_URL,
			url: '/graphql',
			json: true,
			headers: { 'Content-Type': 'application/json', 'Apollo-Require-Preflight': 'true' },
			body: {
				query:
					'mutation ($loginInput: LoginInput!) { login(loginInput: $loginInput) { access_token } }',
				variables: {
					loginInput: { email: '={{$credentials.email}}', password: '={{$credentials.password}}' },
				},
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'data.login.access_token',
					value: undefined,
					message: 'AppStruct could not authenticate the supplied email and password.',
				},
			},
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'data.login.access_token',
					value: null,
					message: 'AppStruct did not return an access token.',
				},
			},
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'data.login.access_token',
					value: '',
					message: 'AppStruct returned an empty access token.',
				},
			},
		],
	};
}
