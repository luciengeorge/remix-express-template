import {Link} from '@remix-run/react'

export function Error({
  statusCode,
  title,
  message,
  ctaText = 'Go back home',
  ctaPath = '/',
}: {
  statusCode: number
  title: string
  message: string
  ctaText?: string
  ctaPath?: string
}) {
  return (
    <main className="grid screen-height place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8 mb-auto">
      <div className="text-center">
        <h3 className="font-semibold text-primary">{statusCode}</h3>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-600">{message}</p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link to={ctaPath} target="_top">
            {ctaText}
          </Link>
        </div>
      </div>
    </main>
  )
}
