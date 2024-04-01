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
import {CheckboxField, ErrorList, Field} from '~/components/forms'
import {Spinner} from '~/components/spinner'
import {SubmitButton} from '~/components/submit_button'
import {LoginSchema} from '~/utils/auth_schemas'
import {
  getSessionExpirationDate,
  requireAnonymous,
  verifyUserCredentials,
} from '~/utils/auth.server'
import {validateCSRF} from '~/utils/csrf.server'
import {prisma} from '~/utils/db.server'
import {checkHoneypot} from '~/utils/honeypot.server'
import {useIsPending} from '~/utils/misc'
import {sessionKey, sessionStorage} from '~/utils/session.server'
import {redirectWithToast} from '~/utils/toast.server'

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
      title: 'Login',
    },
    {
      name: 'og:title',
      content: 'Login',
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
    schema: (intent) =>
      LoginSchema.transform(async (data, ctx) => {
        if (intent !== null) {
          return {...data, user: null}
        }

        const user = await verifyUserCredentials(data)

        if (!user) {
          ctx.addIssue({
            path: ['emailOrUsername'],
            code: z.ZodIssueCode.custom,
            message: 'Invalid email or password',
          })

          return z.NEVER
        }
        return {...data, user}
      }),
    async: true,
  })

  if (submission.status !== 'success' || !submission.value.user) {
    return json(
      {
        result: submission.reply({
          hideFields: ['password'],
        }),
      },
      {
        status: submission.status === 'error' ? 400 : 200,
      },
    )
  }

  const {user, remember} = submission.value
  const cookieSession = await sessionStorage.getSession(
    request.headers.get('cookie'),
  )
  cookieSession.set(sessionKey, user.id)

  return await redirectWithToast(
    '/',
    {
      title: 'Welcome back!',
      description: 'You have successfully logged in.',
      status: 'success',
    },
    {
      headers: {
        'set-cookie': await sessionStorage.commitSession(cookieSession, {
          expires: remember ? getSessionExpirationDate() : undefined,
        }),
      },
    },
  )
}

export default function Login() {
  const actionData = useActionData<typeof action>()
  const [form, fields] = useForm({
    id: 'login-form',
    constraint: getZodConstraint(LoginSchema),
    lastResult: actionData?.result,
    onValidate({formData}) {
      return parseWithZod(formData, {schema: LoginSchema})
    },
  })
  const isPending = useIsPending()

  return (
    <div className="w-full p-5">
      <div className="flex w-full flex-col items-center gap-6">
        <h2 className="text-center leading-9 tracking-tight text-gray-900">
          Login
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
              placeholder: 'hello@example.com',
            }}
            labelProps={{
              htmlFor: fields.email.id,
              children: 'Email',
            }}
            errors={fields.email.errors}
          />
          <Field
            inputProps={{
              ...getInputProps(fields.password, {type: 'password'}),
              placeholder: 'Enter your assword',
              type: 'password',
            }}
            labelProps={{
              htmlFor: fields.password.id,
              children: (
                <div className="flex items-center justify-between">
                  Password
                  <Link
                    to="/forgot_password"
                    className="text-primary underline-offset-4 hover:text-primary-700 text-sm font-medium"
                  >
                    Forgot your password?
                  </Link>
                </div>
              ),
            }}
            errors={fields.password.errors}
          />
          <CheckboxField
            buttonProps={getInputProps(fields.remember, {type: 'checkbox'})}
            labelProps={{
              htmlFor: fields.remember.id,
              children: 'Remember me',
            }}
            errors={fields.remember.errors}
          />
          <ErrorList errors={form.errors} />
          <SubmitButton
            type="submit"
            className="w-full flex gap-3 mb-2"
            disabled={isPending}
            variant={
              Boolean(form.errors?.length) ||
              Boolean(fields.email.errors?.length) ||
              Boolean(fields.password.errors?.length)
                ? 'destructive'
                : 'default'
            }
          >
            <span className="flex gap-2 items-center justify-center">
              Login
            </span>
            <Spinner active={isPending} />
          </SubmitButton>
          <p>
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-primary underline-offset-4 hover:text-primary-700 text-sm font-medium"
            >
              Sign up
            </Link>
          </p>
        </Form>
      </div>
    </div>
  )
}
