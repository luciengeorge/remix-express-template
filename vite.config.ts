import {vitePlugin as remix} from '@remix-run/dev'
import {installGlobals} from '@remix-run/node'
import morgan from 'morgan'
import {flatRoutes} from 'remix-flat-routes'
import {defineConfig, type ViteDevServer} from 'vite'
import envOnly from 'vite-env-only'
import tsconfigPaths from 'vite-tsconfig-paths'

installGlobals()

export default defineConfig({
	server: {
		port: 8080,
	},
	clearScreen: false,
	plugins: [
		morganPlugin(),
		remix({
			ignoredRouteFiles: ['**/*.css'],
			routes: async defineRoutes => {
				return flatRoutes('routes', defineRoutes, {
					ignoredRouteFiles: [
						'.*',
						'**/*.css',
						'**/*.test.{js,jsx,ts,tsx}',
						'**/__*.*',
					],
				})
			},
		}),
		tsconfigPaths(),
		envOnly(),
	],
	build: {
		cssMinify: process.env.NODE_ENV === 'production' ? 'lightningcss' : false,
		minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
		sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline',
	},
})

function morganPlugin() {
	return {
		name: 'morgan-plugin',
		configureServer(server: ViteDevServer) {
			return () => {
				server.middlewares.use(morgan('dev'))
			}
		},
	}
}
