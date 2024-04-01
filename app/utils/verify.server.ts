import {createCookieSessionStorage} from '@remix-run/node'
import {requireAnonymous} from './auth.server'
import {redirectWithToast} from './toast.server'

export const onboardingEmailSessionKey = 'onboardingEmail'
export const verifySessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'sc_verify',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    secrets: [process.env.VERIFY_SECRET],
  },
})

export async function requireOnboardingEmail(request: Request) {
  await requireAnonymous(request)
  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('Cookie'),
  )
  const onboardingEmail = verifySession.get(onboardingEmailSessionKey)
  if (typeof onboardingEmail !== 'string' || !onboardingEmail) {
    throw await redirectWithToast('/signup', {
      description: 'Please signup to continue.',
      status: 'error',
    })
  }
}
