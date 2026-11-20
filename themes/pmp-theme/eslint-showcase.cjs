// The original toolkit's JSDoc/formatter plugins are incompatible with Node 24.
// Keep executable correctness and hook checks independent of those legacy plugins.
module.exports = {
	root: true,
	parser: '@babel/eslint-parser',
	parserOptions: {
		requireConfigFile: false,
		babelOptions: { parserOpts: { plugins: ['jsx'] } },
		ecmaVersion: 2022,
		sourceType: 'module',
	},
	env: { browser: true, es2022: true },
	extends: ['eslint:recommended', 'plugin:react-hooks/recommended'],
	plugins: ['react', '@wordpress'],
	globals: { wp: 'readonly', pmpThemeData: 'readonly' },
	rules: { 'react/jsx-uses-vars': 'error', 'react/jsx-uses-react': 'error' },
};
