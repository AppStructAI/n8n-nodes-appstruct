import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { readFileSync, writeFileSync } from 'node:fs';
const runtime = process.env.N8N_RUNTIME_DIR;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = process.argv[2];
assert.ok(
	runtime && sandbox && basename(sandbox).startsWith('appstruct-n8n-runtime-'),
	'Use the sandbox created by runtime-smoke.mjs.',
);
assert.equal(
	readFileSync(`${sandbox}/fixture.marker`, 'utf8'),
	'AppStruct fictional n8n runtime fixture',
);
async function freePort() {
	const server = createServer();
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const port = server.address().port;
	server.close();
	await once(server, 'close');
	return port;
}
const port = await freePort();
const brokerPort = await freePort();
const base = `http://127.0.0.1:${port}`;
const eventsFile = `${sandbox}/credential-events.jsonl`;
writeFileSync(eventsFile, '');
const child = spawn(process.execPath, [`${runtime}/node_modules/n8n/bin/n8n`, 'start'], {
	env: {
		PATH: `${dirname(process.execPath)}:${process.env.PATH}`,
		N8N_USER_FOLDER: `${sandbox}/home`,
		DB_TYPE: 'sqlite',
		N8N_LISTEN_ADDRESS: '127.0.0.1',
		N8N_HOST: '127.0.0.1',
		N8N_PORT: String(port),
		N8N_PROTOCOL: 'http',
		N8N_SECURE_COOKIE: 'false',
		N8N_DIAGNOSTICS_ENABLED: 'false',
		N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
		N8N_TEMPLATES_ENABLED: 'false',
		N8N_PYTHON_ENABLED: 'false',
		N8N_RUNNERS_BROKER_PORT: String(brokerPort),
		N8N_LOG_LEVEL: 'warn',
		NODE_PATH: `${runtime}/node_modules`,
		N8N_RUNTIME_DIR: runtime,
		NODE_OPTIONS: `--require=${root}/scripts/runtime-fixture.cjs`,
		APPSTRUCT_FIXTURE_EVENTS: eventsFile,
	},
	stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', (b) => (logs += b));
child.stderr.on('data', (b) => (logs += b));
const results = [];
try {
	let ready = false;
	for (let i = 0; i < 180; i++) {
		try {
			const response = await fetch(`${base}/rest/settings`);
			if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
				ready = true;
				break;
			}
		} catch {}
		if (child.exitCode !== null) throw Error(`n8n exited: ${logs}`);
		await new Promise((r) => setTimeout(r, 500));
	}
	assert.ok(ready, logs);
	const owner = await fetch(`${base}/rest/owner/setup`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email: 'release-fixture@example.invalid',
			firstName: 'Release',
			lastName: 'Fixture',
			password: 'FixtureOwner-Password-473!',
		}),
	});
	assert.ok(owner.ok, await owner.text());
	const cookie = owner.headers
		.getSetCookie()
		.map((x) => x.split(';')[0])
		.join('; ');
	assert.ok(cookie.includes('n8n-auth'));
	const cases = [
		{
			name: 'fresh-valid',
			password: 'Fixture-password-123!',
			token: '',
			status: 'OK',
			events: ['login:success', 'login:success'],
		},
		{
			name: 'cached-token-valid',
			password: 'Fixture-password-123!',
			token: 'fixture-access-token',
			status: 'OK',
			events: ['login:success'],
		},
		{
			name: 'cached-token-wrong-password',
			password: 'Incorrect-fixture-password!',
			token: 'fixture-access-token',
			status: 'Error',
			events: ['login:rejected'],
		},
		{
			name: 'missing-login-token',
			password: 'Fixture-missing-login-123!',
			token: 'fixture-access-token',
			status: 'Error',
			events: ['login:missing'],
		},
		{
			name: 'null-login-token',
			password: 'Fixture-null-login-123!',
			token: 'fixture-access-token',
			status: 'Error',
			events: ['login:null'],
		},
		{
			name: 'empty-login-token',
			password: 'Fixture-empty-login-123!',
			token: 'fixture-access-token',
			status: 'Error',
			events: ['login:empty'],
		},
	];
	for (const entry of cases) {
		writeFileSync(eventsFile, '');
		const response = await fetch(`${base}/rest/credentials/test`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({
				credentials: {
					id: 'appstruct-fixture-valid',
					name: 'Release fixture only',
					type: 'appStructApi',
					data: {
						email: 'fixture@example.invalid',
						password: entry.password,
						accessToken: entry.token,
					},
				},
			}),
		});
		const body = await response.json();
		assert.ok(response.ok, JSON.stringify(body));
		assert.equal(body.data.status, entry.status, JSON.stringify(body));
		assert.ok(!JSON.stringify(body).includes(entry.password));
		const events = readFileSync(eventsFile, 'utf8')
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((x) => JSON.parse(x).event);
		assert.deepEqual(events, entry.events);
		results.push({ case: entry.name, status: body.data.status, passed: true, events });
		console.log(`PASS credential service ${entry.name}`);
	}
	writeFileSync(
		`${sandbox}/credential-service-result.json`,
		JSON.stringify(
			{ runtime: 'n8n 2.47.7', transport: 'Mocked HTTP with external network disabled', results },
			null,
			2,
		) + '\n',
	);
} finally {
	if (child.exitCode === null) {
		child.kill('SIGTERM');
		const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
		timer.unref();
		await once(child, 'exit');
		clearTimeout(timer);
	}
	writeFileSync(`${sandbox}/credential-server.log`, logs);
}
