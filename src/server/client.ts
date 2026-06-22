import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { Router } from './router'

const link = new RPCLink({
    url: 'https://baseball-api.gurleen.net/rpc',
})

export const orpc = createORPCClient<Router>(link)
