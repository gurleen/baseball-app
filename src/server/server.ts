import { RPCHandler } from '@orpc/server/fetch'
import { router } from './router'

const handler = new RPCHandler(router)

const server = Bun.serve({
    async fetch(req) {
        const { matched, response } = await handler.handle(req, {
            prefix: '/rpc',
            context: {},
        })
        if (matched) return response
        return new Response('Not Found', { status: 404 })
    },
    port: 3001,
})

console.log(`Server running at http://localhost:${server.port}`)
