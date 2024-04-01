import {z} from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test'] as const),
  TOAST_SECRET: z.string(),
  SESSION_SECRET: z.string(),
  CSRF_SECRET: z.string(),
  VERIFY_SECRET: z.string(),
  HONEYPOT_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  LITEFS_CLOUD_TOKEN: z.string(),
})

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof schema> {}
  }
}

export function init() {
  const parsed = schema.safeParse(process.env)

  if (parsed.success === false) {
    console.error(
      '❌ Invalid environment variables:',
      parsed.error.flatten().fieldErrors,
    )

    throw new Error('Invalid envirmonment variables')
  }
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getEnv() {
  return {
    MODE: process.env.NODE_ENV,
  }
}

type ENV = ReturnType<typeof getEnv>

declare global {
  let ENV: ENV
  interface Window {
    ENV: ENV
  }
}
