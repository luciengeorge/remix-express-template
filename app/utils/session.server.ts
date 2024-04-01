import {createCookieSessionStorage} from '@remix-run/node'

export const sessionKey = 'userId'

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'sc_session',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production',
  },
})
