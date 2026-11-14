const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AppStructApi } = require('../dist/nodes/credentials/AppStructApi.credentials.js');
const { appStructApiRequest } = require('../dist/nodes/AppStruct/AppStructApi.js');
const { AppStruct } = require('../dist/nodes/AppStruct/AppStruct.node.js');
const credential = new AppStructApi();
const login = { email: 'fixture@example.invalid', password: 'fixture-password' };
const preAuth = (response, data = login) =>
	credential.preAuthentication.call({ helpers: { httpRequest: async () => response } }, data);
const node = {
	id: 'fixture-node',
	name: 'AppStruct fixture',
	type: 'n8n-nodes-appstruct.appStruct',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	credentials: { appStructApi: { id: 'fixture-credential', name: 'Fixture' } },
};

test('login uses the explicit JSON-client protocol without browser Origin/cookies', async () => {
	const result = await credential.preAuthentication.call(
		{
			helpers: {
				httpRequest: async (request) => {
					assert.equal(request.url, 'https://api.appstruct.cloud/graphql');
					assert.equal(request.headers['Apollo-Require-Preflight'], 'true');
					assert.equal(request.headers.Origin, undefined);
					assert.equal(request.headers.Cookie, undefined);
					assert.deepEqual(request.body.variables.loginInput, login);
					return { data: { login: { access_token: 'fixture-token' } } };
				},
			},
		},
		login,
	);
	assert.deepEqual(result, { accessToken: 'fixture-token' });
});

for (const [name, value] of Object.entries({
	undefined: undefined,
	null: null,
	empty: '',
	whitespace: '  ',
	number: 123,
})) {
	test(`HTTP 200 with ${name} token fails authentication`, async () => {
		await assert.rejects(
			preAuth({ data: { login: { access_token: value } } }),
			/Unable to authenticate/,
		);
	});
}
test('GraphQL errors fail even when a token is present', async () => {
	await assert.rejects(
		preAuth({
			data: { login: { access_token: 'fixture-token' } },
			errors: [{ message: 'private error' }],
		}),
		/Unable to authenticate/,
	);
});
test('exceptions do not reveal request credentials or returned tokens', async () => {
	const result = credential.preAuthentication.call(
		{
			helpers: {
				httpRequest: async () => {
					throw Error('fixture-password secret-token');
				},
			},
		},
		login,
	);
	await assert.rejects(
		result,
		(error) =>
			!error.message.includes('fixture-password') && !error.message.includes('secret-token'),
	);
});
test('missing credential fields fail before sending a request', async () => {
	for (const data of [{}, { email: ' ', password: 'p' }, { email: 'a', password: '' }]) {
		let sent = false;
		await assert.rejects(
			credential.preAuthentication.call(
				{
					helpers: {
						httpRequest: async () => {
							sent = true;
						},
					},
				},
				data,
			),
			/Enter your AppStruct/,
		);
		assert.equal(sent, false);
	}
});

const expired = {
	errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHENTICATED' } }],
	data: null,
};
const request = {
	method: 'POST',
	url: 'https://api.appstruct.cloud/graphql',
	body: { query: 'query { myProjects { id projectName } }' },
	json: true,
};
function context(responses) {
	const calls = [];
	return {
		calls,
		getNode: () => node,
		getCredentials: async () => ({ ...login, accessToken: 'expired-token' }),
		helpers: {
			httpRequestWithAuthentication: async function (type, options, extra) {
				calls.push({ type, options, extra, thisValue: this });
				return responses.shift();
			},
		},
	};
}
test('GraphQL HTTP-200 expiry refreshes through n8n once and preserves request/context', async () => {
	const success = { data: { myProjects: [] } };
	const ctx = context([expired, success]);
	assert.equal(await appStructApiRequest(ctx, request), success);
	assert.equal(ctx.calls.length, 2);
	assert.equal(ctx.calls[0].type, 'appStructApi');
	assert.equal(ctx.calls[0].thisValue, ctx);
	assert.deepEqual(ctx.calls[1].options.body, request.body);
	assert.equal(ctx.calls[1].extra.credentialsDecrypted.data.accessToken, '');
	assert.equal(ctx.calls[1].extra.credentialsDecrypted.id, 'fixture-credential');
	assert.equal(ctx.calls[1].extra.credentialsDecrypted.data.password, login.password);
});
for (const [name, response] of Object.entries({
	forbidden: { data: null, errors: [{ extensions: { code: 'FORBIDDEN' } }] },
	partialMutation: { data: { updateRecord: { id: '1' } }, errors: expired.errors },
	success: { data: { myProjects: [] } },
})) {
	test(`${name} does not replay the request or reload credentials`, async () => {
		const ctx = context([response]);
		ctx.getCredentials = async () => {
			throw Error('unexpected credential read');
		};
		assert.equal(await appStructApiRequest(ctx, request), response);
		assert.equal(ctx.calls.length, 1);
	});
}
test('repeated GraphQL expiry stops after one retry', async () => {
	const ctx = context([expired, expired]);
	assert.equal(await appStructApiRequest(ctx, request), expired);
	assert.equal(ctx.calls.length, 2);
});
test('an invalid HTTP body is reported as an API error', async () => {
	await assert.rejects(appStructApiRequest(context([null]), request), /invalid API response/);
});
test('Project Get Many preserves returned IDs and pairs results with input items', async () => {
	const ctx = context([
		{
			data: {
				myProjects: [
					{ id: '91', projectName: 'Fixture A' },
					{ id: '92', projectName: 'Fixture B' },
				],
			},
		},
	]);
	Object.assign(ctx, {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (key) => ({ resource: 'project', operation: 'getMany' })[key],
		continueOnFail: () => false,
	});
	const [items] = await new AppStruct().execute.call(ctx);
	assert.deepEqual(
		items.map((x) => x.json.id),
		['91', '92'],
	);
	assert.deepEqual(items[0].pairedItem, { item: 0 });
});
