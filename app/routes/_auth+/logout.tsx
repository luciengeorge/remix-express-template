import {redirect, type ActionFunctionArgs} from '@remix-run/node'
import {logout} from '~/utils/auth.server.ts'
import {validateCSRF} from '~/utils/csrf.server'
import {checkHoneypot} from '~/utils/honeypot.server'

export async function loader() {
	return redirect('/login')
}

export async function action({request}: ActionFunctionArgs) {
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	checkHoneypot(formData)

	throw await logout({request})
}
