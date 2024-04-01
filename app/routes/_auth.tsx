import {type MetaFunction} from '@remix-run/node'
import {Outlet, useLocation} from '@remix-run/react'
import clsx from 'clsx'

export const meta: MetaFunction = () => []

export default function Auth() {
  const location = useLocation()

  return (
    <div className="full-screen-h flex w-screen items-center justify-center bg-white">
      <div className="flex min-h-full w-full min-w-full flex-col items-center justify-center px-6 py-12 lg:px-8">
        <main
          className={clsx(
            'flex min-w-full flex-col items-center rounded-md border p-5 md:min-w-96 gap-6',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
