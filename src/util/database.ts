import * as pg from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import type { DB } from '@/types/db'

console.log(process.env.DATABASE_URL);

const int8TypeId = 20
pg.types.setTypeParser(int8TypeId, (val) => {
  return parseInt(val, 10)
})

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    max: 10,
    connectionString: process.env.DATABASE_URL,
  })
})

// Database interface is passed to Kysely's constructor, and from now on, Kysely 
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how 
// to communicate with your database.
export const db = new Kysely<DB>({
  dialect,
})