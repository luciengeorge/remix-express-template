import {getFormProps, getInputProps, useForm} from '@conform-to/react'
import {getZodConstraint, parseWithZod} from '@conform-to/zod'
import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import {AuthenticityTokenInput} from 'remix-utils/csrf/react'
import {HoneypotInputs} from 'remix-utils/honeypot/react'
import {safeRedirect} from 'remix-utils/safe-redirect'
import invariant from 'tiny-invariant'
import {serverOnly$} from 'vite-env-only'
import {z} from 'zod'
import {CheckboxField, ErrorList, Field} from '~/components/forms'
import {Spinner} from '~/components/spinner'
import {SubmitButton} from '~/components/submit_button'
import {
	getSessionExpirationDate,
	requireAnonymous,
	sessionKey,
	signup,
} from '~/utils/auth.server'
import {OnboardingFormSchema} from '~/utils/auth_schemas'
import {validateCSRF} from '~/utils/csrf.server'
import {prisma} from '~/utils/db.server'
import {checkHoneypot} from '~/utils/honeypot.server'
import {useIsPending} from '~/utils/misc'
import {sessionStorage} from '~/utils/session.server'
import {redirectWithToast} from '~/utils/toast.server'
import {
	onboardingEmailSessionKey,
	verifySessionStorage,
} from '~/utils/verify.server'
import {type VerifyFunctionArgs} from './verify'

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
			title: 'Onboarding',
		},
		{
			name: 'og:title',
			content: 'Onboarding',
		},
	]
}

export const handleVerification = serverOnly$(
	async ({request, submission}: VerifyFunctionArgs) => {
		invariant(
			submission.status === 'success',
			'submission should be successful by now',
		)
		const verifySession = await verifySessionStorage.getSession(
			request.headers.get('cookie'),
		)
		verifySession.set(onboardingEmailSessionKey, submission.value.target)
		return redirect('/onboarding', {
			headers: {
				'set-cookie': await verifySessionStorage.commitSession(verifySession),
			},
		})
	},
)

const requireOnboardingEmail = serverOnly$(async (request: Request) => {
	await requireAnonymous(request)

	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const email = verifySession.get(onboardingEmailSessionKey)
	if (typeof email !== 'string' || !email) {
		throw await redirectWithToast('/signup', {
			description: 'Please signup to continue.',
			status: 'error',
		})
	}
	return email
})

export async function loader({request}: LoaderFunctionArgs) {
	const email = await requireOnboardingEmail!(request)

	return json({email})
}

export async function action({request}: ActionFunctionArgs) {
	const email = await requireOnboardingEmail!(request)
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: intent =>
			OnboardingFormSchema.superRefine(async (data, ctx) => {
				const existingUser = await prisma.user.findUnique({
					where: {email: data.email},
					select: {email: true, id: true},
				})

				if (existingUser) {
					ctx.addIssue({
						path: [''],
						code: z.ZodIssueCode.custom,
						message: 'Email is already taken',
					})
					return z.NEVER
				}
			}).transform(async data => {
				const session = await signup({...data, email})
				return {...data, session}
			}),
		async: true,
	})

	if (submission.status !== 'success' || !submission.value.session) {
		return json(
			{
				result: submission.reply({
					hideFields: ['password', 'confirmPassword'],
				}),
			},
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	const {session, remember, redirectTo} = submission.value

	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	cookieSession.set(sessionKey, session.id)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const headers = new Headers()
	headers.append(
		'set-cookie',
		await sessionStorage.commitSession(cookieSession, {
			expires: remember ? getSessionExpirationDate() : undefined,
		}),
	)
	headers.append(
		'set-cookie',
		await verifySessionStorage.destroySession(verifySession),
	)

	return await redirectWithToast(
		safeRedirect(redirectTo),
		{
			description: `Welcome, ${session.user.email}!`,
			status: 'success',
		},
		{headers},
	)
}

export default function Onboarding() {
	const actionData = useActionData<typeof action>()
	const {email} = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')
	const [form, fields] = useForm({
		id: 'onboarding-form',
		constraint: getZodConstraint(OnboardingFormSchema),
		defaultValue: {redirectTo, email},
		lastResult: actionData?.result,
		onValidate({formData}) {
			return parseWithZod(formData, {schema: OnboardingFormSchema})
		},
	})
	const isPending = useIsPending()

	return (
		<>
			<div className="flex w-full flex-col items-center gap-6">
				<h2 className="text-center leading-9 tracking-tight text-gray-900">
					Onboarding
				</h2>
			</div>
			<div className="w-full">
				<Form method="POST" {...getFormProps(form)}>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<Field
						inputProps={{
							...getInputProps(fields.email, {type: 'hidden'}),
							value: fields.email.value,
						}}
						labelProps={{
							htmlFor: fields.email.id,
						}}
						errors={fields.email.errors}
					/>
					<Field
						inputProps={{
							...getInputProps(fields.password, {type: 'password'}),
							placeholder: 'Enter your password',
						}}
						labelProps={{htmlFor: fields.password.id, children: 'Password'}}
						errors={fields.password.errors}
					/>
					<Field
						inputProps={{
							...getInputProps(fields.confirmPassword, {type: 'password'}),
							placeholder: 'Confirm your password',
						}}
						labelProps={{
							htmlFor: fields.confirmPassword.id,
							children: 'Confirm Password',
						}}
						errors={fields.confirmPassword.errors}
					/>
					<CheckboxField
						buttonProps={getInputProps(fields.remember, {type: 'checkbox'})}
						labelProps={{htmlFor: fields.remember.id, children: 'Remember me'}}
						errors={fields.remember.errors}
					/>
					<CheckboxField
						buttonProps={getInputProps(
							fields.agreeToTermsOfServiceAndPrivacyPolicy,
							{type: 'checkbox'},
						)}
						labelProps={{
							htmlFor: fields.agreeToTermsOfServiceAndPrivacyPolicy.id,
							children: (
								<>
									I agree to the{' '}
									<Link
										to="/terms"
										target="_blank"
										rel="noreferrer"
										className="underline"
									>
										Terms of Service and Privacy Policy
									</Link>{' '}
								</>
							),
						}}
						errors={fields.agreeToTermsOfServiceAndPrivacyPolicy.errors}
					/>
					<input {...getInputProps(fields.redirectTo, {type: 'hidden'})} />
					<ErrorList errors={form.errors} id={form.errorId} />
					<SubmitButton
						className={`w-full gap-3`}
						type="submit"
						disabled={isPending}
						variant={
							Boolean(fields.email.errors?.length) ||
							Boolean(form.errors?.length) ||
							Boolean(fields.password.errors?.length) ||
							Boolean(fields.confirmPassword.errors?.length) ||
							Boolean(fields.remember.errors?.length) ||
							Boolean(
								fields.agreeToTermsOfServiceAndPrivacyPolicy.errors?.length,
							)
								? 'destructive'
								: 'default'
						}
					>
						<span className="flex gap-2 items-center justify-center">
							Register Now
						</span>
						<Spinner active={isPending} />
					</SubmitButton>
				</Form>
			</div>
		</>
	)
}
