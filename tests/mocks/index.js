import closeWithGrace from 'close-with-grace'
import {http, passthrough} from 'msw'
import {setupServer} from 'msw/node'
import {handlers as resendHandlers} from './resend.js'

const miscHandlers = process.env.REMIX_DEV_ORIGIN
  ? [http.post(`${process.env.REMIX_DEV_ORIGIN}ping`, passthrough)]
  : []

export const server = setupServer(...miscHandlers, ...resendHandlers)

server.listen({onUnhandledRequest: 'warn'})

console.info('🔶 Mock server installed')

closeWithGrace(() => {
  server.close()
})
