import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const revisions = sqliteTable('farm_revisions', {
  owner: text('owner').notNull(),
  revision: integer('revision').notNull(),
  payload: text('payload').notNull(),
  action: text('action').notNull(),
  created: text('created').notNull(),
}, table => [primaryKey({columns: [table.owner, table.revision]})]);
