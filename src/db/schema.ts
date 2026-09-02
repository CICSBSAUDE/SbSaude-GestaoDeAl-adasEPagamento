import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

// Store system collections as JSON documents keyed by collection and id,
// providing immediate, lossless persistence for all entities (users, processes, matrices, requests, logs, config, cost centers).
export const appData = pgTable('app_data', {
  collection: text('collection').notNull(),
  id: text('id').notNull(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
