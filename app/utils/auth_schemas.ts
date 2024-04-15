import {z} from 'zod'

export const codeQueryParam = 'code'
export const targetQueryParam = 'target'
export const typeQueryParam = 'type'
export const redirectToQueryParam = 'redirectTo'

export const EmailSchema = z
	.string({required_error: 'Please enter an email address'})
	.email({message: 'Please enter a valid email address'})
	.transform(value => value.toLowerCase().trim())

export const UserSchema = z.object({
	email: EmailSchema,
	redirectTo: z.string().optional(),
})

const PasswordSchema = z
	.string({required_error: 'Please enter a password'})
	.min(6, {message: 'Password is too short'})
	.max(100, {message: 'Password is too long'})
	.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/, {
		message:
			'Password must contain at least one uppercase letter, one lowercase letter, and one number',
	})

export const OnboardingFormSchema = z
	.object({
		email: EmailSchema,
		password: PasswordSchema,
		confirmPassword: PasswordSchema,
		agreeToTermsOfServiceAndPrivacyPolicy: z.boolean({
			required_error: 'Please agree to the terms of service and privacy policy',
		}),
		remember: z.boolean().optional(),
		redirectTo: z.string().optional(),
	})
	.superRefine(({confirmPassword, password}, ctx) => {
		if (password !== confirmPassword) {
			ctx.addIssue({
				path: ['confirmPassword'],
				code: z.ZodIssueCode.custom,
				message: 'Passwords do not match',
			})
			return z.NEVER
		}
	})

export const LoginSchema = z.object({
	email: z.string({required_error: 'Email is required'}),
	password: PasswordSchema,
	remember: z.boolean().optional(),
})

const VerificationTypeSchema = z.enum(['onboarding', 'reset_password'])
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>
export const VerifySchema = z.object({
	[codeQueryParam]: z
		.string({required_error: 'Verification code is required'})
		.min(6)
		.max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
})

export const ForgotPasswordSchema = z.object({
	email: z.string({required_error: 'Email is required'}),
})

export const ResetPasswordSchema = z
	.object({
		password: PasswordSchema,
		confirmPassword: PasswordSchema,
	})
	.refine(({password, confirmPassword}) => password === confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})
