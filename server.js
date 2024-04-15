import {createRequestHandler} from '@remix-run/express'
import {installGlobals} from '@remix-run/node'
import compression from 'compression'
import crypto from 'crypto'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import {
	getEnsurePrimaryMiddleware,
	getSetTxNumberMiddleware,
	getTransactionalConsistencyMiddleware,
} from 'litefs-js/express.js'

installGlobals()

const viteDevServer =
	process.env.NODE_ENV === 'production'
		? undefined
		: await import('vite').then(vite =>
				vite.createServer({
					server: {middlewareMode: true},
				}),
			)

const app = express()
const MODE = process.env.NODE_ENV

if (MODE === 'production') {
	app.use(getEnsurePrimaryMiddleware())
	app.use(getTransactionalConsistencyMiddleware())
	app.use(getSetTxNumberMiddleware())
}

if (MODE === 'development') {
	await import('./tests/mocks/index.js')
}

app.use(compression())

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by')

// handle asset requests
if (viteDevServer) {
	app.use(viteDevServer.middlewares)
} else {
	// Vite fingerprints its assets so we can cache forever.
	app.use(
		'/assets',
		express.static('build/client/assets', {immutable: true, maxAge: '1y'}),
	)
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static('build/client', {maxAge: '1h'}))

const rateLimitDefault = {
	windowMs: 60 * 1000,
	max: 1000,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (request, _response) => {
		if (!request.ip) {
			console.error('Warning: request.ip is missing!')
			return request.socket.remoteAddress
		}

		return request.ip.replace(/:\d+[^:]*$/, '')
	},
}

const strongestRateLimit = rateLimit({
	...rateLimitDefault,
	windowMs: 60 * 1000,
	max: 10,
})

const strongRateLimit = rateLimit({
	...rateLimitDefault,
	windowMs: 60 * 1000,
	max: 100,
})

const generalRateLimit = rateLimit(rateLimitDefault)

app.use((req, res, next) => {
	const strongPaths = ['/login', '/signup', '/verify', '/onboarding']
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		if (strongPaths.some(p => req.path.includes(p))) {
			return strongestRateLimit(req, res, next)
		}
		return strongRateLimit(req, res, next)
	}

	return generalRateLimit(req, res, next)
})

app.use((_req, res, next) => {
	res.locals.cspNonce = crypto.randomBytes(32).toString('base64')
	next()
})

app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				'connect-src': [
					...(MODE === 'development' ? ['ws:'] : []),
					"'self'",
				].filter(Boolean),
				'default-src': ["'self'"],
				'script-src': [
					"'self'",
					"'strict-dynamic'",
					(_req, res) => `'nonce-${res.locals.cspNonce}'`,
				],
				'script-src-elem': [
					"'self'",
					"'strict-dynamic'",
					(_req, res) => `'nonce-${res.locals.cspNonce}'`,
				],
				'style-src': [
					"'self'",
					"'unsafe-inline'",
					'https://fonts.googleapis.com',
				],
				'img-src': [
					"'self'",
					'data:',
					process.env.NODE_ENV === 'production'
						? '<YOUR_DOMAIN_URL>'
						: 'http://localhost:3000',
				],
				'font-src': ["'self'", "'unsafe-inline'", 'https://fonts.gstatic.com'],
				'frame-src': ["'self'"],
				'media-src': ["'self'"],
			},
		},
		strictTransportSecurity: {
			maxAge: 31536000,
			includeSubDomains: true,
			preload: true,
		},
		referrerPolicy: {policy: 'same-origin'},
	}),
)

const remixHandler = createRequestHandler({
	build: viteDevServer
		? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
		: await import('./build/server/index.js'),
	getLoadContext: (_req, res) => ({
		cspNonce: res.locals.cspNonce,
	}),
})

// handle SSR requests
app.all('*', remixHandler)
const port = process.env.PORT || 3000
app.listen(port, () =>
	console.log(`Express server listening at http://localhost:${port}`),
)
