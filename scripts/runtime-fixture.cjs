// Dev-only transport for an isolated n8n process. It cannot reach real AppStruct.
const fs = require('node:fs');
const path = require('node:path');
const nock = require(path.join(process.env.N8N_RUNTIME_DIR, 'node_modules/nock'));
nock.disableNetConnect();
nock.enableNetConnect((host) => /^(127\.0\.0\.1|localhost)(:|$)/.test(host));
function event(name) {
	if (process.env.APPSTRUCT_FIXTURE_EVENTS)
		fs.appendFileSync(process.env.APPSTRUCT_FIXTURE_EVENTS, JSON.stringify({ event: name }) + '\n');
}
nock('https://api.appstruct.cloud')
	.persist()
	.post('/graphql')
	.reply(function (_uri, body) {
		if (typeof body === 'string') body = JSON.parse(body);
		if (body.query?.includes('login(')) {
			const input = body.variables?.loginInput;
			if (input?.password === 'Fixture-missing-login-123!') {
				event('login:missing');
				return [200, { data: {} }];
			}
			if (input?.password === 'Fixture-null-login-123!') {
				event('login:null');
				return [200, { data: { login: { access_token: null } } }];
			}
			if (input?.password === 'Fixture-empty-login-123!') {
				event('login:empty');
				return [200, { data: { login: { access_token: '' } } }];
			}

			const valid =
				this.req.headers['apollo-require-preflight'] === 'true' &&
				!this.req.headers.origin &&
				!this.req.headers.cookie &&
				input?.email === 'fixture@example.invalid' &&
				[
					'Fixture-password-123!',
					'Fixture-empty-projects-123!',
					'Fixture-missing-projects-123!',
				].includes(input.password);
			event(valid ? 'login:success' : 'login:rejected');
			const token =
				input?.password === 'Fixture-empty-projects-123!'
					? 'empty-fixture-token'
					: input?.password === 'Fixture-missing-projects-123!'
						? 'missing-fixture-token'
						: 'fixture-access-token';
			return [
				200,
				valid
					? { data: { login: { access_token: token } } }
					: {
							data: null,
							errors: [{ message: 'Invalid credentials', extensions: { code: 'UNAUTHENTICATED' } }],
						},
			];
		}
		if (body.query?.includes('myProjects')) {
			const auth = this.req.headers.authorization;
			if (auth === 'Bearer empty-fixture-token') {
				event('projects:empty');
				return [200, { data: { myProjects: [] } }];
			}
			if (auth === 'Bearer missing-fixture-token') {
				event('projects:missing');
				return [200, { data: {} }];
			}
			if (auth === 'Bearer http-expired-fixture-token') {
				event('projects:http401');
				return [401, { message: 'Unauthorized' }];
			}
			if (auth === 'Bearer forbidden-fixture-token') {
				event('projects:forbidden');
				return [
					200,
					{ data: null, errors: [{ message: 'Not permitted', extensions: { code: 'FORBIDDEN' } }] },
				];
			}
			if (auth !== 'Bearer fixture-access-token') {
				event('projects:expired');
				return [
					200,
					{
						data: null,
						errors: [{ message: 'Expired session', extensions: { code: 'UNAUTHENTICATED' } }],
					},
				];
			}
			event('projects:success');
			return [
				200,
				{ data: { myProjects: [{ id: '9001', projectName: 'Release fixture project' }] } },
			];
		}
		event('request:unexpected');
		return [400, { errors: [{ message: 'Unexpected fixture operation' }] }];
	});
