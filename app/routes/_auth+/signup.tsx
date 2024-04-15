import {getFormProps, getInputProps, useForm} from '@conform-to/react'
import {getZodConstraint, parseWithZod} from '@conform-to/zod'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import {Form, Link, useActionData} from '@remix-run/react'
import {AuthenticityTokenInput} from 'remix-utils/csrf/react'
import {HoneypotInputs} from 'remix-utils/honeypot/react'
import {z} from 'zod'
import {VerificationEmail} from '~/components/emails/verification_email'
import {ErrorList, Field} from '~/components/forms'
import {Spinner} from '~/components/spinner'
import {SubmitButton} from '~/components/submit_button'
import {requireAnonymous} from '~/utils/auth.server'
import {UserSchema, redirectToQueryParam} from '~/utils/auth_schemas'
import {validateCSRF} from '~/utils/csrf.server'
import {prisma} from '~/utils/db.server'
import {sendEmail} from '~/utils/email.server'
import {checkHoneypot} from '~/utils/honeypot.server'
import {useIsPending} from '~/utils/misc'
import {redirectWithToast} from '~/utils/toast.server'
import {prepareVerification} from './verify'

export const tenMinutes = 10 * 60 // 10 minutes in seconds

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
			title: 'Signup',
		},
		{
			name: 'og:title',
			content: 'Signup',
		},
	]
}

export async function loader({request}: LoaderFunctionArgs) {
	await requireAnonymous(request)

	return json({})
}

export async function action({request}: ActionFunctionArgs) {
	await requireAnonymous(request)

	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: UserSchema.superRefine(async (data, ctx) => {
			const existingUser = await prisma.user.findUnique({
				where: {email: data.email},
				select: {id: true},
			})
			if (existingUser) {
				ctx.addIssue({
					path: ['email'],
					code: z.ZodIssueCode.custom,
					message: 'A user with this email address already exists',
				})
				return z.NEVER
			}
		}),
		async: true,
	})

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

	const {email, redirectTo: postVerificationRedirectTo} = submission.value
	const {verifyUrl, redirectTo, otp} = await prepareVerification!({
		period: tenMinutes,
		request,
		type: 'onboarding',
		target: email,
		redirectTo: postVerificationRedirectTo,
	})

	const response = await sendEmail({
		to: email,
		subject: 'Verify your email address',
		react: (
			<VerificationEmail
				onboardingUrl={verifyUrl.toString()}
				verificationCode={otp}
			/>
		),
	})

	if (response.status === 'success') {
		return await redirectWithToast(redirectTo.toString(), {
			description: 'Please check your email for a verification link.',
			status: 'success',
		})
	} else {
		return json(
			{
				result: submission.reply({
					formErrors: [response.error.message],
				}),
			},
			{
				status: 500,
			},
		)
	}
}

export default function SignUp() {
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		constraint: getZodConstraint(UserSchema),
		lastResult: actionData?.result,
		onValidate({formData}) {
			const result = parseWithZod(formData, {schema: UserSchema})
			return result
		},
		shouldRevalidate: 'onBlur',
	})
	const isPending = useIsPending()

	return (
		<div className="w-full p-5">
			<div className="flex w-full flex-col items-center gap-6">
				<h2 className="text-center leading-9 tracking-tight text-gray-900">
					Sign up now
				</h2>
			</div>

			<div className="w-full">
				<Form method="POST" {...getFormProps(form)}>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<Field
						inputProps={{
							...getInputProps(fields.email, {type: 'email'}),
							autoFocus: true,
							placeholder: 'Enter your email',
						}}
						labelProps={{htmlFor: fields.email.id, children: 'Email'}}
						errors={fields.email.errors}
					/>
					<input
						{...getInputProps(fields[redirectToQueryParam], {type: 'hidden'})}
					/>

					<ErrorList errors={form.errors} />
					<SubmitButton
						className={`w-full gap-3 mb-2`}
						type="submit"
						disabled={isPending}
						variant={
							Boolean(form.errors?.length) ||
							Boolean(fields.email.errors?.length)
								? 'destructive'
								: 'default'
						}
					>
						<span className="flex gap-2 items-center justify-center">
							Register Now
						</span>
						<Spinner active={isPending} />
					</SubmitButton>
					<p>
						Already have an account?{' '}
						<Link
							to="/login"
							className="text-primary underline-offset-4 hover:underline text-sm font-medium"
						>
							Login
						</Link>
					</p>
				</Form>
			</div>
		</div>
	)
}
