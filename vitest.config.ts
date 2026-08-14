import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectRoot = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
	resolve: {
		// Mirrors the tsconfig "@/*" path alias so tests import the same modules as the app.
		alias: [{ find: /^@\//, replacement: projectRoot }],
	},
	esbuild: {
		// tsconfig uses jsx: "preserve" for Next, so tests need an explicit runtime.
		jsx: 'automatic',
		jsxImportSource: 'react',
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./test/setup.ts'],
		include: ['{app,lib}/**/*.test.{ts,tsx}'],
	},
});
