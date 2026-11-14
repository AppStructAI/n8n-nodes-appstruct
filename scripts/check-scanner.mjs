import { analyzePackage, SOURCE_FILE_PATTERNS } from '@n8n/scan-community-package/dist/scanner.js';

const result = await analyzePackage(process.cwd(), SOURCE_FILE_PATTERNS);
if (!result.passed) {
	console.error(result.details || result.message);
	process.exitCode = 1;
} else {
	console.log(
		'Current n8n scanner source checks passed (npm provenance checked after publication).',
	);
}
