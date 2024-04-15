import {getFormProps, getInputProps, useForm} from '@conform-to/react'
import {getZodConstraint, parseWithZod} from '@conform-to/zod'
import {json, type ActionFunctionArgs, type MetaFunction} from '@remix-run/node'
import {Form, useActionData} from '@remix-run/react'
import {AuthenticityTokenInput} from 'remix-utils/csrf/react'
import {HoneypotInputs} from 'remix-utils/honeypot/react'
import {safeRedirect} from 'remix-utils/safe-redirect'
import {z} from 'zod'
import {ForgotPasswordEmail} from '~/components/emails/forgot_password_email'
import {ErrorList, Field} from '~/components/forms'
import {Spinner} from '~/components/spinner'
import {SubmitButton} from '~/components/submit_button'
import {requireAnonymous} from '~/utils/auth.server'
import {ForgotPasswordSchema} from '~/utils/auth_schemas'
import {validateCSRF} from '~/utils/csrf.server'
import {prisma} from '~/utils/db.server'
import {sendEmail} from '~/utils/email.server'
import {checkHoneypot} from '~/utils/honeypot.server'
import {useIsPending} from '~/utils/misc'
import {redirectWithToast} from '~/utils/toast.server'
import {tenMinutes} from './signup'
import {prepareVerification} from './verify'

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
			title: 'Forgot your Password',
		},
		{
			name: 'og:title',
			content: 'Forgot your Password',
		},
	]
}

export async function action({request}: ActionFunctionArgs) {
	await requireAnonymous(request)
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: ForgotPasswordSchema.transform(async (data, ctx) => {
			const user = await prisma.user.findFirst({
				where: {
					email: data.email,
				},
				select: {id: true, email: true},
			})

			if (!user) {
				ctx.addIssue({
					path: ['email'],
					code: 'custom',
					message: 'No user found with that email',
				})
				return z.NEVER
			}

			return {...data, user}
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

	const {email, user} = submission.value

	const {verifyUrl, redirectTo, otp} = await prepareVerification!({
		period: tenMinutes,
		request,
		type: 'reset_password',
		target: email,
	})

	const response = await sendEmail({
		to: user.email,
		subject: 'Reset your password',
		react: (
			<ForgotPasswordEmail
				onboardingUrl={verifyUrl.toString()}
				verificationCode={otp}
			/>
		),
	})

	if (response.status === 'success') {
		return await redirectWithToast(safeRedirect(redirectTo.toString()), {
			title: 'Check your email',
			description: `We've sent you an email with a link to reset your password.`,
			status: 'success',
		})
	} else {
		return json(
			{
				result: submission.reply({formErrors: [response.error.message]}),
			},
			{status: 500},
		)
	}
}

export default function ForgotPassword() {
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'forgot_password',
		constraint: getZodConstraint(ForgotPasswordSchema),
		lastResult: actionData?.result,
		onValidate({formData}) {
			return parseWithZod(formData, {schema: ForgotPasswordSchema})
		},
	})
	const isPending = useIsPending()

	return (
		<>
			<div className="flex w-full flex-col items-center gap-6">
				<h2 className="text-center leading-9 tracking-tight text-gray-900">
					Forgot your passowrd?
				</h2>
			</div>
			<div className="w-full">
				<Form method="POST" {...getFormProps(form)}>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<Field
						inputProps={{
							...getInputProps(fields.email, {type: 'text'}),
							autoFocus: true,
							placeholder: 'Enter your Email',
						}}
						labelProps={{
							htmlFor: fields.email.id,
							children: 'Email',
						}}
						errors={fields.email.errors}
					/>
					<ErrorList errors={form.errors} id={form.errorId} />
					<SubmitButton
						className="w-full flex gap-3"
						disabled={isPending}
						variant={
							Boolean(form.errors?.length) ||
							Boolean(fields.email.errors?.length)
								? 'destructive'
								: 'default'
						}
					>
						<span className="flex gap-2 items-center justify-center">
							Get reset link
						</span>
						<Spinner active={isPending} />
					</SubmitButton>
				</Form>
			</div>
		</>
	)
}
