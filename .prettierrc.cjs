module.exports = {
	importOrder: ['^components/(.*)$', '^[./]'],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	arrowParens: 'avoid',
	bracketSameLine: false,
	bracketSpacing: false,
	embeddedLanguageFormatting: 'auto',
	endOfLine: 'lf',
	htmlWhitespaceSensitivity: 'css',
	insertPragma: false,
	jsxSingleQuote: false,
	printWidth: 80,
	proseWrap: 'always',
	quoteProps: 'as-needed',
	requirePragma: false,
	semi: false,
	singleAttributePerLine: false,
	singleQuote: true,
	tabWidth: 2,
	trailingComma: 'all',
	useTabs: true,
	overrides: [
		{
			files: ['**/*.json'],
			options: {
				useTabs: false,
			},
		},
		{
			files: ['**/*.mdx'],
			options: {
				proseWrap: 'preserve',
				htmlWhitespaceSensitivity: 'ignore',
			},
		},
	],
	plugins: ['prettier-plugin-tailwindcss', 'prettier-plugin-organize-imports'],
}
