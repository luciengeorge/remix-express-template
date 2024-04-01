import {User} from '@prisma/client'
import {Form, Link} from '@remix-run/react'
import {AuthenticityTokenInput} from 'remix-utils/csrf/react'
import {HoneypotInputs} from 'remix-utils/honeypot/react'

export function Navbar({user}: {user: Pick<User, 'id'> | null}) {
  return (
    <nav className="w-full container py-4">
      <ul className="grow flex items-center justify-end gap-3">
        <li>
          <Link to="/">Home</Link>
        </li>
        {user ? (
          <li>
            <Form method="POST" action="/logout" className="w-full">
              <AuthenticityTokenInput />
              <HoneypotInputs />
              <button
                type="submit"
                className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:text-primary-600 hover:bg-primary-50"
              >
                Logout
              </button>
            </Form>
          </li>
        ) : (
          <>
            <li>
              <Link to="/login">Login</Link>
            </li>
            <li>
              <Link to="/signup">Signup</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  )
}
