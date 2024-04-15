import {
	json,
	type LinksFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from '@remix-run/react'
import {AuthenticityTokenProvider} from 'remix-utils/csrf/react'
import {HoneypotProvider} from 'remix-utils/honeypot/react'
import {Toaster} from 'sonner'
import globalStylesheetUrl from './assets/stylesheets/global.css?url'
import tailwindStylesheetUrl from './assets/stylesheets/tailwind.css?url'
import {Error} from './components/error'
import {GeneralErrorBoundary} from './components/general_error_boundary'
import {GlobalLoading} from './components/global_loading'
import {Navbar} from './components/navbar'
import {ShowToast} from './components/show_toast'
import {useNonce} from './providers/nonce_provider'
import {getUser} from './utils/auth.server'
import {csrf} from './utils/csrf.server'
import {getEnv} from './utils/env.server'
import {honeypot} from './utils/honeypot.server'
import {cn, combineHeaders} from './utils/misc'
import {getToast} from './utils/toast.server'

export const links: LinksFunction = () => {
	return [
		{
			rel: 'stylesheet',
			href: tailwindStylesheetUrl,
		},
		{
			rel: 'stylesheet',
			href: globalStylesheetUrl,
		},
	].filter(Boolean)
}

export async function loader({request}: LoaderFunctionArgs) {
	const ENV = getEnv()
	const user = await getUser(request)
	const {toast, headers: toastHeaders} = await getToast(request)
	const [csrfToken, csrfCookieHeader] = await csrf.commitToken(request)
	const honeyProps = honeypot.getInputProps()

	return json(
		{
			env: ENV,
			toast,
			honeyProps,
			csrfToken,
			user,
		},
		{
			headers: combineHeaders(
				csrfCookieHeader ? {'set-cookie': csrfCookieHeader} : null,
				toastHeaders,
			),
		},
	)
}

function Document({
	children,
	env,
}: {
	children: React.ReactNode
	env?: Record<string, string>
}) {
	const nonce = useNonce()

	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body className="min-h-screen flex flex-col justify-start relative isolate">
				<GlobalLoading />
				<Toaster
					position="top-center"
					richColors
					closeButton
					cn={cn}
					className="toasts-wrapper"
				/>
				{children}
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
			</body>
		</html>
	)
}

function App() {
	const {env, toast, user} = useLoaderData<typeof loader>()

	return (
		<Document env={env}>
			{toast ? <ShowToast toast={toast} /> : null}
			<Navbar user={user} />
			<Outlet />
		</Document>
	)
}

export default function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<HoneypotProvider {...data.honeyProps}>
			<AuthenticityTokenProvider token={data.csrfToken}>
				<App />
			</AuthenticityTokenProvider>
		</HoneypotProvider>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => (
					<Document>
						<Error
							statusCode={404}
							title="Page not found"
							message="Sorry, we couldn't find the page you're looking for."
						/>
					</Document>
				),
				500: () => (
					<Document>
						<Error
							statusCode={500}
							title="Sorry, something went wrong"
							message="We're working on getting this fixed as soon as we can"
						/>
					</Document>
				),
			}}
		/>
	)
}
