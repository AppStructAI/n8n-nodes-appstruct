import type { ICredentialTestFunction } from 'n8n-workflow';

// GraphQL can return HTTP 200 with an authentication error. Require an actual
// token instead of interpreting a successful HTTP request as a successful login.
export const appStructApiTest: ICredentialTestFunction = async function (credential) {
	const email = credential.data?.email;
	const password = credential.data?.password;
	if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
		return { status: 'Error', message: 'Enter your AppStruct account email and password.' };
	}

	try {
		// ICredentialTestFunctions in the supported n8n API exposes request here.
		// Do not substitute an untyped httpRequest helper without runtime support.
		const response = await this.helpers.request({
			method: 'POST',
			uri: 'https://api.appstruct.cloud/graphql',
			headers: { 'Content-Type': 'application/json' },
			body: {
				query: 'mutation ($loginInput: LoginInput!) { login(loginInput: $loginInput) { access_token } }',
				variables: { loginInput: { email, password } },
			},
			json: true,
		});
		const token = response?.data?.login?.access_token;
		if (response?.errors?.length || typeof token !== 'string' || !token.trim()) {
			return {
				status: 'Error',
				message: 'AppStruct could not authenticate this account. Check the email and password.',
			};
		}
		return { status: 'OK', message: 'AppStruct account authenticated successfully.' };
	} catch {
		// Do not echo HTTP errors: they can contain a credential, token or response body.
		return {
			status: 'Error',
			message: 'Unable to authenticate with AppStruct. Check your credentials and connection, then retry.',
		};
	}
};
