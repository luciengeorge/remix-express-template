import {getFormProps, getInputProps, useForm} from '@conform-to/react'
import {getZodConstraint, parseWithZod} from '@conform-to/zod'
import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import {Form, useActionData} from '@remix-run/react'
import {AuthenticityTokenInput} from 'remix-utils/csrf/react'
import {HoneypotInputs} from 'remix-utils/honeypot/react'
import invariant from 'tiny-invariant'
import {serverOnly$} from 'vite-env-only'
import {ErrorList, Field} from '~/components/forms'
import {Spinner} from '~/components/spinner'
import {SubmitButton} from '~/components/submit_button'
import {requireAnonymous, resetUserPassword} from '~/utils/auth.server'
import {ResetPasswordSchema} from '~/utils/auth_schemas'
import {validateCSRF} from '~/utils/csrf.server'
import {prisma} from '~/utils/db.server'
import {checkHoneypot} from '~/utils/honeypot.server'
import {useIsPending} from '~/utils/misc'
import {redirectWithToast} from '~/utils/toast.server'
import {verifySessionStorage} from '~/utils/verify.server'
import {type VerifyFunctionArgs} from './verify'

const resetPasswordUsernameSessionKey = 'resetPasswordUsername'

export const meta: MetaFunction = ({matches}) => {
	const parentMeta = matches
		.flatMap(match => match.meta ?? [])
		.filter(meta => !('title' in meta))
		.filter(
			meta => 'name' in meta && !['og:title'].includes(meta.name as string),
		)

	return [
		...parentMeta,
		{
			title: 'Reset your Password',
		},
		{
			name: 'og:title',
			content: 'Reset your Password',
		},
	]
}

export const handleVerification = serverOnly$(
	async ({request, submission}: VerifyFunctionArgs) => {
		invariant(
			submission.status === 'success',
			'submission should be successful by now',
		)
		const target = submission.value.target
		const user = await prisma.user.findFirst({
			where: {email: target},
			select: {email: true},
		})

		if (!user) {
			return json(
				{
					result: submission.reply({
						formErrors: ['invalid code'],
					}),
				},
				{
					status: 400,
				},
			)
		}

		const verifySession = await verifySessionStorage.getSession(
			request.headers.get('cookie'),
		)
		verifySession.set(resetPasswordUsernameSessionKey, user.email)
		return redirect('/reset_password', {
			headers: {
				'set-cookie': await verifySessionStorage.commitSession(verifySession),
			},
		})
	},
)

export const requireResetPasswordEmail = serverOnly$(
	async (request: Request) => {
		await requireAnonymous(request)

		const verifySession = await verifySessionStorage.getSession(
			request.headers.get('cookie'),
		)
		const resetPasswordEmail = verifySession.get(
			resetPasswordUsernameSessionKey,
		)
		if (typeof resetPasswordEmail !== 'string' || !resetPasswordEmail) {
			throw redirect('/forgot_password')
		}
		return resetPasswordEmail
	},
)

export async function loader({request}: LoaderFunctionArgs) {
	const resetPasswordUsername = await requireResetPasswordEmail!(request)

	return json({resetPasswordUsername})
}

export async function action({request}: ActionFunctionArgs) {
	const resetPasswordUsername = await requireResetPasswordEmail!(request)
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	checkHoneypot(formData)

	const submission = parseWithZod(formData, {schema: ResetPasswordSchema})

	if (submission.status !== 'success') {
		return json(
			{
				result: submission.reply(),
			},
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	const {password} = submission.value
	await resetUserPassword({email: resetPasswordUsername, password})
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	return await redirectWithToast(
		'/login',
		{
			title: 'Password reset successful!',
			description: 'Your password has been reset. Please log in.',
			status: 'success',
		},
		{
			headers: {
				'set-cookie': await verifySessionStorage.destroySession(verifySession),
			},
		},
	)
}

export default function ResetPassword() {
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'reset_password_form',
		constraint: getZodConstraint(ResetPasswordSchema),
		lastResult: actionData?.result,
		onValidate({formData}) {
			return parseWithZod(formData, {schema: ResetPasswordSchema})
		},
	})

	const isPending = useIsPending()

	return (
		<>
			<div className="flex w-full flex-col items-center gap-6">
				<h2 className="text-center leading-9 tracking-tight text-gray-900">
					Reset your password
				</h2>
			</div>
			<div className="w-full">
				<Form method="POST" {...getFormProps(form)}>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<Field
						inputProps={{
							...getInputProps(fields.password, {type: 'password'}),
							type: 'password',
							autoFocus: true,
						}}
						labelProps={{htmlFor: fields.password.id, children: 'Password'}}
						errors={fields.password.errors}
					/>
					<Field
						inputProps={{
							...getInputProps(fields.confirmPassword, {type: 'password'}),
							type: 'password',
						}}
						labelProps={{
							htmlFor: fields.confirmPassword.id,
							children: 'Confirm password',
						}}
						errors={fields.confirmPassword.errors}
					/>
					<ErrorList errors={form.errors} />
					<SubmitButton
						className="w-full flex gap-3"
						disabled={isPending}
						variant={
							Boolean(form.errors?.length) ||
							Boolean(fields.password.errors?.length) ||
							Boolean(fields.confirmPassword.errors?.length)
								? 'destructive'
								: 'default'
						}
					>
						<span className="flex gap-2 items-center justify-center">
							Login
						</span>
						<Spinner active={isPending} />
					</SubmitButton>
				</Form>
			</div>
		</>
	)
}
