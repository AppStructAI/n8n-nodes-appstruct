const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AppStructTrigger } = require('../dist/nodes/AppStruct/AppStructTrigger.node.js');
function fixture(triggerOn = 'newRow') {
	const state = {};
	const params = { triggerOn, projectId: '9', tableName: 'requests', pollLimit: 1000 };
	let response;
	const ctx = {
		state,
		params,
		getMode: () => 'trigger',
		getNode: () => ({
			id: 'poll',
			name: 'Poll fixture',
			type: 'n8n-nodes-appstruct.appStructTrigger',
			typeVersion: 1,
			parameters: {},
			position: [0, 0],
		}),
		getNodeParameter: (key, fallback) => params[key] ?? fallback,
		getWorkflowStaticData: () => state,
		helpers: {
			returnJsonArray: (items) => items.map((json) => ({ json })),
			httpRequestWithAuthentication: async () => {
				if (response instanceof Error) throw response;
				return response;
			},
		},
	};
	return {
		ctx,
		state,
		params,
		run: async (value) => {
			response = value;
			return new AppStructTrigger().poll.call(ctx);
		},
	};
}
const rows = (items) => ({ data: { getTableData: items.map(([id, data]) => ({ id, data })) } });
test('new rows without timestamps fire once; unchanged rows never repeat', async () => {
	const f = fixture();
	assert.equal(await f.run(rows([['1', { title: 'Private fixture' }]])), null);
	assert.equal(await f.run(rows([['1', { title: 'Private fixture' }]])), null);
	const result = await f.run(
		rows([
			['1', { title: 'Private fixture' }],
			['2', { title: 'Added' }],
		]),
	);
	assert.equal(result[0].length, 1);
	assert.equal(result[0][0].json.id, '2');
	assert.equal(
		await f.run(
			rows([
				['1', { title: 'Private fixture' }],
				['2', { title: 'Added' }],
			]),
		),
		null,
	);
	assert.ok(!JSON.stringify(f.state).includes('Private fixture'));
	assert.match(f.state.appStructSnapshot.values['1'], /^[a-f0-9]{64}$/);
});
test('updated rows detect nested changes but ignore key order and new IDs', async () => {
	const f = fixture('updatedRow');
	await f.run(rows([['1', { info: { status: 'new', owner: 'A' } }]]));
	assert.equal(
		await f.run(
			rows([
				['1', { info: { owner: 'A', status: 'new' } }],
				['2', { title: 'new row' }],
			]),
		),
		null,
	);
	const result = await f.run(
		rows([
			['1', { info: { owner: 'A', status: 'done' } }],
			['2', { title: 'new row' }],
		]),
	);
	assert.equal(result[0].length, 1);
	assert.equal(result[0][0].json.id, '1');
});
for (const kind of ['newTable', 'newColumn']) {
	test(`${kind} reports additions once rather than re-emitting the whole list`, async () => {
		const f = fixture(kind);
		const response = (names) =>
			kind === 'newTable'
				? { data: { getBackendTables: names } }
				: {
						data: {
							getTableSchema: {
								name: 'requests',
								columns: names.map((name) => ({ name, type: 'text' })),
							},
						},
					};
		assert.equal(await f.run(response(['first'])), null);
		assert.equal(await f.run(response(['first'])), null);
		const result = await f.run(response(['first', 'second']));
		assert.equal(result[0].length, 1);
		assert.equal(await f.run(response(['first', 'second'])), null);
	});
}
test('failed polls do not advance the last successful baseline', async () => {
	const f = fixture();
	await f.run(rows([['1', {}]]));
	const before = JSON.stringify(f.state);
	await assert.rejects(f.run(new Error('temporary network failure')), /network failure/);
	assert.equal(JSON.stringify(f.state), before);
	const result = await f.run(
		rows([
			['1', {}],
			['2', {}],
		]),
	);
	assert.equal(result[0][0].json.id, '2');
});
test('manual preview does not overwrite the live baseline', async () => {
	const f = fixture();
	await f.run(rows([['1', {}]]));
	const before = JSON.stringify(f.state);
	f.ctx.getMode = () => 'manual';
	assert.equal(
		(
			await f.run(
				rows([
					['1', {}],
					['2', {}],
				]),
			)
		)[0].length,
		2,
	);
	assert.equal(JSON.stringify(f.state), before);
});
test('changing monitored project/table starts a separate baseline', async () => {
	const f = fixture();
	await f.run(rows([['1', {}]]));
	f.params.projectId = '10';
	assert.equal(await f.run(rows([['2', {}]])), null);
});
test('limit exhaustion fails visibly without saving an incomplete baseline', async () => {
	const f = fixture();
	f.params.pollLimit = 2;
	await assert.rejects(
		f.run(
			rows([
				['1', {}],
				['2', {}],
			]),
		),
		/Limit reached/,
	);
	assert.deepEqual(f.state, {});
});
test('ID keys such as __proto__ are compared as real IDs', async () => {
	const f = fixture();
	await f.run(rows([['1', {}]]));
	const result = await f.run(
		rows([
			['1', {}],
			['__proto__', {}],
		]),
	);
	assert.equal(result[0][0].json.id, '__proto__');
	assert.equal(
		await f.run(
			rows([
				['1', {}],
				['__proto__', {}],
			]),
		),
		null,
	);
});
