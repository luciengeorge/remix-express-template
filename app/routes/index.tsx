import type {MetaFunction} from '@remix-run/node'

export const meta: MetaFunction = () => {
	return [
		{title: 'New Remix App'},
		{name: 'description', content: 'Welcome to Remix!'},
	]
}

export default function Index() {
	return (
		<div className="flex flex-col min-h-screen items-center justify-center">
			<h1>Welcome to your Remix app!</h1>
		</div>
	)
}
