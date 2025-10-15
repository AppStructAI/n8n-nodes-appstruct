import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AppStructApi implements ICredentialType {
	name = 'appStructApi';
	displayName = 'AppStruct API';
	documentationUrl = 'https://docs.appstruct.cloud';
	properties: INodeProperties[] = [
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
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your AppStruct account password',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.appstruct.cloud',
			url: '/graphql',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				query: `
					mutation ($loginInput: LoginInput!) {
						login(loginInput: $loginInput) {
							access_token
							refresh_token
						}
					}
				`,
				variables: {
					loginInput: {
						email: '={{$credentials.email}}',
						password: '={{$credentials.password}}',
					},
				},
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'data.login.access_token',
					message: 'Login successful',
					value: 'test',
				},
			},
		],
	};
}
