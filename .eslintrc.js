module.exports = {
	root: true,

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},

	ignorePatterns: [
		'.eslintrc.js',
		'**/*.js',
		'**/node_modules/**',
		'**/dist/**',
	],

	overrides: [
		{
			files: ['./nodes/**/*.ts'],
			plugins: ['n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/nodes'],
			rules: {
				'n8n-nodes-base/node-filename-against-convention': 'error',
				'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'error',
				'n8n-nodes-base/node-class-description-outputs-wrong': 'error',
			},
		},
		{
			files: ['./credentials/**/*.ts'],
			plugins: ['n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/credentials'],
		},
	],
};
