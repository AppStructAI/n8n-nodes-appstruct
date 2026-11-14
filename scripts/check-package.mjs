import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzePackage } from '@n8n/scan-community-package/dist/scanner.js';

const [pack] = JSON.parse(
	execFileSync('npm', ['pack', '--ignore-scripts', '--json'], { encoding: 'utf8' }),
);
const scratch = mkdtempSync(join(tmpdir(), 'appstruct-n8n-package-'));
try {
	execFileSync('tar', ['-xzf', pack.filename, '-C', scratch]);
	const dir = join(scratch, 'package');
	const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
	assert.equal(Object.keys(pkg.dependencies || {}).length, 0, 'No runtime dependencies');
	for (const filename of [...pkg.n8n.nodes, ...pkg.n8n.credentials])
		assert.ok(readFileSync(join(dir, filename)).length);
	for (const filename of [
		'dist/nodes/AppStruct/appstruct.svg',
		'dist/nodes/credentials/appstruct.svg',
		'examples/list-projects-read-only.json',
	])
		assert.ok(readFileSync(join(dir, filename)).length);
	assert.ok(
		pack.files.every(
			(file) => !/^(scripts|node_modules)\//.test(file.path) && !/\.(env|tgz)$/.test(file.path),
		),
	);
	const result = await analyzePackage(dir, ['**/*.js', 'package.json']);
	if (!result.passed) throw new Error(result.details || result.message);
	console.log(
		JSON.stringify(
			{
				version: pkg.version,
				tarball: pack.filename,
				integrity: pack.integrity,
				files: pack.files.length,
				scanner: 'passed',
				provenance: 'requires GitHub Actions publication',
			},
			null,
			2,
		),
	);
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
