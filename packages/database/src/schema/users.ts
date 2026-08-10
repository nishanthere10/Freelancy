import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'suspended',
  'deactivated',
]);

export const usersTable = pgTable(
  'users',
  {
    // Primary Key — Internal UUID referenced by all domain tables
    id: uuid('id').primaryKey().defaultRandom(),

    // External Provider Reference — Clerk User Identifier
    clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),

    // Identity Fields
    email: varchar('email', { length: 255 }).notNull().unique(),
    firstName: varchar('first_name', { length: 255 }),
    lastName: varchar('last_name', { length: 255 }),
    imageUrl: varchar('image_url', { length: 512 }),

    // Status
    status: userStatusEnum('status').notNull().default('active'),

    // Audit Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    clerkIdIdx: uniqueIndex('idx_users_clerk_id').on(table.clerkId),
    emailIdx: uniqueIndex('idx_users_email').on(table.email),
  })
);

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
