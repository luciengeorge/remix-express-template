import {
  getFormProps,
  getInputProps,
  useForm,
  type Submission,
} from '@conform-to/react'
import {getZodConstraint, parseWithZod} from '@conform-to/zod'
import {generateTOTP, verifyTOTP} from '@epic-web/totp'
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node'
import {
  Form,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react'
import {AuthenticityTokenInput} from 'remix-utils/csrf/react'
import {HoneypotInputs} from 'remix-utils/honeypot/react'
import {serverOnly$} from 'vite-env-only'
import {z} from 'zod'
import {ErrorList, Field} from '~/components/forms'
import {Spinner} from '~/components/spinner'
import {SubmitButton} from '~/components/submit_button'
import {
  VerifySchema,
  codeQueryParam,
  redirectToQueryParam,
  targetQueryParam,
  typeQueryParam,
  type VerificationTypes,
} from '~/utils/auth_schemas.ts'
import {requireAnonymous} from '~/utils/auth.server'
import {validateCSRF} from '~/utils/csrf.server'
import {prisma} from '~/utils/db.server'
import {checkHoneypot} from '~/utils/honeypot.server'
import {getDomainUrl, useIsPending} from '~/utils/misc'
import {redirectWithToast} from '~/utils/toast.server.ts'
import {handleVerification as handleOnboardingVerification} from './onboarding.tsx'
import {handleVerification as handleResetPasswordVerification} from './reset_password.tsx'

export const meta: MetaFunction = ({matches}) => {
  const parentMeta = matches
    .flatMap((match) => match.meta ?? [])
    .filter((meta) => !('title' in meta))
    .filter(
      (meta) => 'name' in meta && !['og:title'].includes(meta.name as string),
    )

  return [
    ...parentMeta,
    {
      title: 'Verify your email',
    },
    {
      name: 'og:title',
      content: 'Verify your email',
    },
  ]
}

export function getRedirectToUrl({
  request,
  type,
  target,
  redirectTo,
}: {
  request: Request
  type: VerificationTypes
  target: string
  redirectTo?: string
}) {
  const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`)
  redirectToUrl.searchParams.set(typeQueryParam, type)
  redirectToUrl.searchParams.set(targetQueryParam, target)
  if (redirectTo) {
    redirectToUrl.searchParams.set(redirectToQueryParam, redirectTo)
  }
  return redirectToUrl
}

export const prepareVerification = serverOnly$(
  async ({
    period,
    request,
    type,
    target,
    redirectTo: postVerificationRedirectTo,
  }: {
    period: number
    request: Request
    type: VerificationTypes
    target: string
    redirectTo?: string
  }) => {
    const verifyUrl = getRedirectToUrl({
      request,
      type,
      target,
      redirectTo: postVerificationRedirectTo,
    })
    const redirectTo = new URL(verifyUrl.toString())

    const {otp, ...verificationConfig} = generateTOTP({
      algorithm: 'SHA256',
      period,
    })

    const verificationData = {
      type,
      target,
      ...verificationConfig,
      expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
    }
    await prisma.verification.upsert({
      where: {target_type: {target, type}},
      create: verificationData,
      update: verificationData,
    })

    // add the otp to the url we'll email the user.
    verifyUrl.searchParams.set(codeQueryParam, otp)

    return {otp, redirectTo, verifyUrl}
  },
)

export type VerifyFunctionArgs = {
  request: Request
  submission: Submission<z.infer<typeof VerifySchema>>
  body: FormData | URLSearchParams
}

export const isCodeValid = serverOnly$(
  async ({
    code,
    type,
    target,
  }: {
    code: string
    type: VerificationTypes
    target: string
  }) => {
    const verification = await prisma.verification.findUnique({
      where: {
        target_type: {target, type},
        OR: [{expiresAt: {gt: new Date()}}, {expiresAt: null}],
      },
      select: {algorithm: true, secret: true, period: true, charSet: true},
    })
    if (!verification) return false
    const result = verifyTOTP({
      otp: code,
      secret: verification.secret,
      algorithm: verification.algorithm,
      period: verification.period,
      charSet: verification.charSet,
    })
    if (!result) return false

    return true
  },
)

const validateRequest = serverOnly$(
  async (request: Request, body: URLSearchParams | FormData) => {
    const submission = await parseWithZod(body, {
      schema: () =>
        VerifySchema.superRefine(async (data, ctx) => {
          const codeIsValid = await isCodeValid!({
            code: data[codeQueryParam],
            type: data[typeQueryParam],
            target: data[targetQueryParam],
          })
          if (!codeIsValid) {
            ctx.addIssue({
              path: ['code'],
              code: z.ZodIssueCode.custom,
              message: `Invalid code`,
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

    const {value: submissionValue} = submission

    await prisma.verification.delete({
      where: {
        target_type: {
          target: submissionValue[targetQueryParam],
          type: submissionValue[typeQueryParam],
        },
      },
    })

    switch (submissionValue[typeQueryParam]) {
      case 'onboarding': {
        return handleOnboardingVerification!({request, body, submission})
      }
      case 'reset_password': {
        return handleResetPasswordVerification!({request, body, submission})
      }
    }
  },
)

export async function loader({request}: LoaderFunctionArgs) {
  await requireAnonymous(request)

  const params = new URL(request.url).searchParams
  const type = params.get('type')
  const target = params.get('target')

  if (
    typeof type !== 'string' ||
    !type ||
    typeof target !== 'string' ||
    !target
  ) {
    throw await redirectWithToast('/signup', {
      description: 'Invalid verification link',
      status: 'error',
    })
  }

  if (!params.has(codeQueryParam)) {
    return json({
      status: 'idle',
      submission: {
        intent: '',
        payload: Object.fromEntries(params) as Record<string, string>,
        error: {} as Record<string, Array<string>>,
      },
    })
  }
  return validateRequest!(request, params)
}

export async function action({request}: ActionFunctionArgs) {
  await requireAnonymous(request)

  const formData = await request.formData()
  await validateCSRF(formData, request.headers)
  checkHoneypot(formData)

  return validateRequest!(request, formData)
}

export default function Verify() {
  const data = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const isPending = useIsPending()
  const actionData = useActionData<typeof action>()
  const [form, fields] = useForm({
    id: 'verify-form',
    constraint: getZodConstraint(VerifySchema),
    lastResult: actionData?.result,
    onValidate({formData}) {
      return parseWithZod(formData, {schema: VerifySchema})
    },
    defaultValue: {
      [codeQueryParam]: searchParams.get(codeQueryParam) ?? '',
      [targetQueryParam]: searchParams.get(targetQueryParam) ?? '',
      [typeQueryParam]: searchParams.get(typeQueryParam) ?? '',
    },
  })

  return (
    <>
      <div className="flex w-full flex-col items-center gap-6">
        <h2 className="text-center leading-9 tracking-tight text-gray-900">
          Verify your email
        </h2>
      </div>

      <div className="w-full">
        <Form method="POST" {...getFormProps(form)}>
          <AuthenticityTokenInput />
          <HoneypotInputs />
          <Field
            inputProps={{
              ...getInputProps(fields[codeQueryParam], {type: 'text'}),
              autoFocus: true,
              placeholder: 'Enter your one-time code',
            }}
            labelProps={{
              htmlFor: fields[codeQueryParam].id,
              children: 'Code',
            }}
            errors={fields[codeQueryParam].errors}
          />
          <ErrorList errors={form.errors} />
          <input
            {...getInputProps(fields[targetQueryParam], {type: 'hidden'})}
          />
          <input {...getInputProps(fields[typeQueryParam], {type: 'hidden'})} />
          <input
            {...getInputProps(fields[redirectToQueryParam], {type: 'hidden'})}
          />
          <div className="flex items-center justify-between gap-6 pt-3">
            <SubmitButton
              className={`w-full gap-3`}
              type="submit"
              disabled={isPending}
              variant={
                Boolean(form.errors?.length) ||
                Boolean(fields.code.errors?.length)
                  ? 'destructive'
                  : 'default'
              }
            >
              <span className="flex gap-2 items-center justify-center">
                Verify
              </span>{' '}
              <Spinner active={isPending} />
            </SubmitButton>
          </div>
        </Form>
      </div>
    </>
  )
}
