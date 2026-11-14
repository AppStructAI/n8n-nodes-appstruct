import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtime = process.env.N8N_RUNTIME_DIR;
assert.ok(runtime, 'Set N8N_RUNTIME_DIR to a separate installation of n8n 2.47.7 and nock 14.');
const sandbox = mkdtempSync(join(tmpdir(), 'appstruct-n8n-runtime-'));
writeFileSync(join(sandbox, 'fixture.marker'), 'AppStruct fictional n8n runtime fixture');
const home = join(sandbox, 'home');
const nodesDir = join(home, '.n8n', 'nodes');
mkdirSync(nodesDir, { recursive: true });
const eventsFile = join(sandbox, 'events.jsonl');
writeFileSync(eventsFile, '');
const env = {
	PATH: `${dirname(process.execPath)}:${process.env.PATH}`,
	LANG: 'en_US.UTF-8',
	N8N_USER_FOLDER: home,
	DB_TYPE: 'sqlite',
	N8N_DIAGNOSTICS_ENABLED: 'false',
	N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
	N8N_TEMPLATES_ENABLED: 'false',
	N8N_PYTHON_ENABLED: 'false',
	N8N_LOG_LEVEL: 'info',
	NODE_PATH: join(runtime, 'node_modules'),
	N8N_RUNTIME_DIR: runtime,
	NODE_OPTIONS: `--require=${join(root, 'scripts/runtime-fixture.cjs')}`,
	APPSTRUCT_FIXTURE_EVENTS: eventsFile,
};
function cli(args, success = true) {
	const result = spawnSync(process.execPath, [join(runtime, 'node_modules/n8n/bin/n8n'), ...args], {
		env,
		encoding: 'utf8',
		timeout: 120000,
		maxBuffer: 8 * 1024 * 1024,
	});
	if (result.error) throw result.error;
	if (success && result.status !== 0)
		throw Error(`n8n ${args[0]} failed: ${result.stdout}\n${result.stderr}`);
	return result;
}
const [pack] = JSON.parse(
	spawnSync('npm', ['pack', '--ignore-scripts', '--json'], { cwd: root, encoding: 'utf8' }).stdout,
);
const install = spawnSync(
	'npm',
	[
		'install',
		'--prefix',
		nodesDir,
		'--ignore-scripts',
		'--legacy-peer-deps',
		'--offline',
		'--no-audit',
		'--no-fund',
		join(root, pack.filename),
	],
	{ env: { PATH: env.PATH }, encoding: 'utf8', timeout: 120000 },
);
assert.equal(install.status, 0, install.stderr);
const cases = [
	{
		name: 'valid',
		data: { email: 'fixture@example.invalid', password: 'Fixture-password-123!', accessToken: '' },
		success: true,
		expected: ['login:success', 'projects:success'],
	},
	{
		name: 'legacy-no-token-field',
		data: { email: 'fixture@example.invalid', password: 'Fixture-password-123!' },
		success: true,
		expected: ['login:success', 'projects:success'],
	},
	{
		name: 'graphql-expiry',
		data: {
			email: 'fixture@example.invalid',
			password: 'Fixture-password-123!',
			accessToken: 'expired-fixture-token',
		},
		success: true,
		expected: ['projects:expired', 'login:success', 'projects:success'],
	},
	{
		name: 'http-expiry',
		data: {
			email: 'fixture@example.invalid',
			password: 'Fixture-password-123!',
			accessToken: 'http-expired-fixture-token',
		},
		success: true,
		expected: ['projects:http401', 'login:success', 'projects:success'],
	},
	{
		name: 'invalid-password',
		data: {
			email: 'fixture@example.invalid',
			password: 'Incorrect-fixture-password!',
			accessToken: '',
		},
		success: false,
		expected: ['login:rejected'],
	},
	{
		name: 'forbidden',
		data: {
			email: 'fixture@example.invalid',
			password: 'Fixture-password-123!',
			accessToken: 'forbidden-fixture-token',
		},
		success: false,
		expected: ['projects:forbidden'],
	},
];
function executionResult(text) {
	for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
		let depth = 0,
			quoted = false,
			escaped = false;
		for (let i = start; i < text.length; i++) {
			const c = text[i];
			if (quoted) {
				if (escaped) escaped = false;
				else if (c.charCodeAt(0) === 92) escaped = true;
				else if (c === '"') quoted = false;
			} else if (c === '"') quoted = true;
			else if (c === '{') depth++;
			else if (c === '}' && --depth === 0) {
				try {
					const value = JSON.parse(text.slice(start, i + 1));
					if (value?.data?.resultData) return value;
				} catch {
					/* Try the next complete JSON object. */
				}
				break;
			}
		}
	}
	throw Error('n8n did not expose an execution result: ' + text.slice(-2000));
}
const results = [];
for (const entry of cases) {
	const credentialId = `appstruct-fixture-${entry.name}`;
	const workflowId = `appstruct-${entry.name}`;
	const credentialsFile = join(sandbox, `${entry.name}-credentials.json`);
	writeFileSync(
		credentialsFile,
		JSON.stringify([
			{ id: credentialId, name: 'Release fixture only', type: 'appStructApi', data: entry.data },
		]),
		{ mode: 0o600 },
	);
	const workflow = JSON.parse(
		readFileSync(join(root, 'examples/list-projects-read-only.json'), 'utf8'),
	);
	workflow.id = workflowId;
	workflow.nodes.find((node) => node.type === 'n8n-nodes-appstruct.appStruct').credentials = {
		appStructApi: { id: credentialId, name: 'Release fixture only' },
	};
	const workflowFile = join(sandbox, `${entry.name}-workflow.json`);
	writeFileSync(workflowFile, JSON.stringify(workflow));
	cli(['import:credentials', '--input', credentialsFile]);
	cli(['import:workflow', '--input', workflowFile]);
	writeFileSync(eventsFile, '');
	const result = cli(['execute', '--id', workflowId, '--rawOutput'], entry.success);
	writeFileSync(join(sandbox, `${entry.name}-output.log`), result.stdout + result.stderr);
	const execution = executionResult(result.stdout);
	if (entry.success) {
		assert.equal(execution.data.resultData.error, undefined);
		assert.equal(
			execution.data.resultData.runData['List AppStruct projects'][0].data.main[0][0].json.id,
			'9001',
		);
	} else
		assert.ok(
			execution.data.resultData.error,
			'Failure must not become a successful workflow execution',
		);
	const events = readFileSync(eventsFile, 'utf8')
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line).event);
	assert.deepEqual(events, entry.expected, `${entry.name}: request order / bounded auth retry`);
	results.push({ case: entry.name, passed: true, events });
	console.log(`PASS n8n ${entry.name}`);
}
const credentialService = spawnSync(
	process.execPath,
	[join(root, 'scripts/credential-service-smoke.mjs'), sandbox],
	{
		env: { PATH: env.PATH, N8N_RUNTIME_DIR: runtime },
		encoding: 'utf8',
		timeout: 120000,
	},
);
assert.equal(credentialService.status, 0, credentialService.stdout + credentialService.stderr);
console.log(credentialService.stdout.trim());
const credentialTests = JSON.parse(
	readFileSync(join(sandbox, 'credential-service-result.json'), 'utf8'),
);
results.push(
	...credentialTests.results.map((result) => ({ ...result, layer: 'credential-service' })),
);
writeFileSync(
	join(sandbox, 'result.json'),
	JSON.stringify(
		{
			runtime: 'n8n 2.47.7',
			node: process.version,
			package: pack.name,
			version: pack.version,
			transport: 'Mocked HTTP at original AppStruct hostname; external network disabled',
			results,
		},
		null,
		2,
	),
);
console.log(`Runtime evidence: ${join(sandbox, 'result.json')}`);
