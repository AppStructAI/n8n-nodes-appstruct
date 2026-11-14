const assert = require('node:assert/strict');
const { test } = require('node:test');
const { appStructApiTest } = require('../dist/nodes/AppStruct/AppStruct.credentials.js');
const { AppStruct } = require('../dist/nodes/AppStruct/AppStruct.node.js');
const { AppStructTrigger } = require('../dist/nodes/AppStruct/AppStructTrigger.node.js');
const { AppStructApi } = require('../dist/nodes/credentials/AppStructApi.credentials.js');

const credential = { name: 'Fixture only', data: { email: 'fixture@example.invalid', password: 'fixture-password' } };
const run = (response, input = credential) => appStructApiTest.call({ helpers: { request: async () => response } }, input);

test('accepts a token and sends the existing account login contract', async () => {
	const result = await appStructApiTest.call({ helpers: { request: async (request) => {
		assert.equal(request.uri, 'https://api.appstruct.cloud/graphql');
		assert.equal(request.method, 'POST');
		assert.deepEqual(request.body.variables.loginInput, credential.data);
		assert.ok(request.body.query.includes('access_token'));
		return { data: { login: { access_token: 'fixture-token' } } };
	} } }, credential);
	assert.equal(result.status, 'OK');
	assert.ok(!result.message.includes('fixture-token'));
});

test('rejects GraphQL errors even when HTTP succeeds and a token is present', async () => {
	const result = await run({ data: { login: { access_token: 'fixture-token' } }, errors: [{ message: 'Private server details' }] });
	assert.equal(result.status, 'Error');
	assert.ok(!result.message.includes('Private server details'));
});

for (const [name, response] of Object.entries({
	graphqlFailure: { errors: [{ message: 'Unauthorized' }] },
	nullLogin: { data: { login: null } },
	missingToken: { data: { login: {} } },
	emptyToken: { data: { login: { access_token: '' } } },
	whitespaceToken: { data: { login: { access_token: '   ' } } },
	nonStringToken: { data: { login: { access_token: 123 } } },
	missingResponse: undefined,
})) {
	test(`rejects ${name} rather than showing a false successful connection`, async () => {
		assert.equal((await run(response)).status, 'Error');
	});
}

test('does not return exception messages containing credentials or tokens', async () => {
	const result = await appStructApiTest.call({ helpers: { request: async () => { throw new Error('fixture-password fixture-token'); } } }, credential);
	assert.equal(result.status, 'Error');
	assert.ok(!result.message.includes('fixture-password'));
	assert.ok(!result.message.includes('fixture-token'));
});

test('missing inputs fail before making an authentication request', async () => {
	for (const data of [undefined, {}, { email: ' ', password: 'p' }, { email: 'a', password: '' }]) {
		let called = false;
		const result = await appStructApiTest.call({ helpers: { request: async () => { called = true; } } }, { name: 'Fixture', data });
		assert.equal(result.status, 'Error');
		assert.equal(called, false);
	}
});

test('both node types resolve the same credential test and no declarative false-positive test remains', () => {
	for (const Node of [AppStruct, AppStructTrigger]) {
		const node = new Node();
		const entry = node.description.credentials.find((item) => item.name === 'appStructApi');
		assert.equal(entry.testedBy, 'appStructApiTest');
		assert.equal(node.methods.credentialTest[entry.testedBy], appStructApiTest);
	}
	assert.equal(new AppStructApi().test, undefined);
});
