import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { Router } from './router'

const link = new RPCLink({
    url: process.env.NODE_ENV === 'production'
        ? 'https://baseball-api.gurleen.net/rpc'
        : 'http://localhost:3001/rpc',
})

export const orpc = createORPCClient<Router>(link)
