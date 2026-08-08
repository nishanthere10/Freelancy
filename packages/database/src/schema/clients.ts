import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  foreignKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { isNull } from 'drizzle-orm';
import { workspacesTable } from './workspaces';
import { clientStatusEnum } from './enums';

export const clientsTable = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),

    // Identity
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    website: varchar('website', { length: 255 }),

    // Company
    companyName: varchar('company_name', { length: 255 }),
    gstNumber: varchar('gst_number', { length: 50 }),
    contactPerson: varchar('contact_person', { length: 255 }),
    department: varchar('department', { length: 255 }),

    // Address
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    country: varchar('country', { length: 100 }).default('IN'),

    // Status
    status: clientStatusEnum('status').notNull().default('active'),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index('idx_clients_workspace_id').on(table.workspaceId),
    emailIdx: index('idx_clients_email').on(table.email),
    workspaceEmailUnique: uniqueIndex('idx_clients_workspace_email')
      .on(table.workspaceId, table.email)
      .where(isNull(table.deletedAt)),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: 'clients_workspace_id_workspaces_id_fk',
    }).onDelete('cascade'),
  })
);

export type Client = typeof clientsTable.$inferSelect;
export type CreateClientInput = typeof clientsTable.$inferInsert;
export type ClientStatus = typeof clientStatusEnum.enumValues[number];
