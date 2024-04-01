import {type User} from '@prisma/client'
import bcrypt from 'bcryptjs'
import {safeRedirect} from 'remix-utils/safe-redirect'
import {prisma} from './db.server'
import {combineResponseInits} from './misc'
import {sessionStorage} from './session.server'
import {redirectWithToast, type ToastInput} from './toast.server'

const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
  new Date(Date.now() + SESSION_EXPIRATION_TIME)

export async function verifyUserCredentials({
  email,
  password,
}: {
  email: User['email']
  password: string
}) {
  const userWithPassword = await prisma.user.findFirst({
    where: {email},
    select: {id: true, password: {select: {hash: true}}},
  })
  if (!userWithPassword || !userWithPassword.password) {
    return null
  }

  const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

  if (!isValid) {
    return null
  }

  return {id: userWithPassword.id}
}

export async function logout(
  {
    request,
    toast = {
      title: 'Goodbye!',
      description: 'You have been logged out.',
      status: 'info',
    },
    redirectTo = '/',
  }: {
    request: Request
    toast?: ToastInput
    redirectTo?: string
  },
  responseInit?: ResponseInit,
) {
  const cookieSession = await sessionStorage.getSession(
    request.headers.get('Cookie'),
  )
  throw await redirectWithToast(
    safeRedirect(redirectTo),
    toast,
    combineResponseInits(responseInit, {
      headers: {
        'set-cookie': await sessionStorage.destroySession(cookieSession),
      },
    }),
  )
}

export async function signup({
  email,
  password,
}: {
  email: User['email']
  password: string
}) {
  const hashedPassword = await getPasswordHash(password)
  const user = await prisma.user.create({
    data: {
      email,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
  })
  return user
}

export async function getPasswordHash(password: string) {
  const hash = await bcrypt.hash(password, 10)
  return hash
}

export async function getUserId(request: Request) {
  const cookieSession = await sessionStorage.getSession(
    request.headers.get('Cookie'),
  )
  const userId = cookieSession.get('userId')
  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: {id: userId},
    select: {id: true},
  })

  if (!user) {
    throw await logout({request})
  }

  return user.id
}

export async function getUser(request: Request) {
  const userId = await getUserId(request)
  if (!userId) {
    return null
  }
  return await prisma.user.findUnique({
    where: {id: userId},
    select: {id: true},
  })
}

export async function requireUserId(
  request: Request,
  {redirectTo}: {redirectTo?: string | null} = {},
) {
  const userId = await getUserId(request)
  if (!userId) {
    const requestUrl = new URL(request.url)
    redirectTo =
      redirectTo === null
        ? null
        : redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`
    const loginParams = redirectTo ? new URLSearchParams({redirectTo}) : null
    const loginRedirect = ['/login', loginParams?.toString()]
      .filter(Boolean)
      .join('?')
    throw await redirectWithToast(loginRedirect, {
      title: 'Login required',
      description: 'Please login to continue',
      status: 'warning',
    })
  }
  return userId
}

export async function requireAnonymous(request: Request) {
  const userId = await getUserId(request)
  if (userId) {
    throw await redirectWithToast('/', {
      description: 'You are already logged in.',
      status: 'info',
    })
  }
}

export async function requireUser(request: Request) {
  const userId = await requireUserId(request)
  const user = await prisma.user.findUnique({
    select: {id: true, email: true},
    where: {id: userId},
  })
  if (!user) {
    throw await logout({request})
  }
  return user
}

export async function resetUserPassword({
  email,
  password,
}: {
  email: User['email']
  password: string
}) {
  const hashedPassword = await getPasswordHash(password)
  await prisma.user.update({
    where: {email},
    data: {
      password: {
        update: {
          hash: hashedPassword,
        },
      },
    },
  })
}
