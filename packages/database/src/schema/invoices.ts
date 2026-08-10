import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  date,
  timestamp,
  index,
  foreignKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { isNotNull } from 'drizzle-orm';
import { workspacesTable } from './workspaces';
import { clientsTable } from './clients';
import { projectsTable } from './projects';
import { invoiceStatusEnum } from './enums';

export const invoicesTable = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    clientId: uuid('client_id').notNull(),
    projectId: uuid('project_id'),

    // Numbering & Status
    invoiceNumber: varchar('invoice_number', { length: 50 }),
    sequenceNumber: integer('sequence_number'),
    status: invoiceStatusEnum('status').notNull().default('draft'),

    // Dates
    issueDate: date('issue_date'),
    dueDate: date('due_date'),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    // Financial Totals
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0.00'),
    discountRate: numeric('discount_rate', { precision: 5, scale: 2 }).default('0.00'),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0.00'),
    taxableAmount: numeric('taxable_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('18.00'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0.00'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).notNull().default('0.00'),
    amountDue: numeric('amount_due', { precision: 12, scale: 2 }).notNull().default('0.00'),

    // Payment Tracking Metadata
    paymentMethod: varchar('payment_method', { length: 50 }),
    paymentReference: varchar('payment_reference', { length: 255 }),

    // Content & Notes
    notes: text('notes'),
    terms: text('terms'),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').notNull(),
    updatedBy: uuid('updated_by').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index('idx_invoices_workspace_id').on(table.workspaceId),
    clientIdx: index('idx_invoices_client_id').on(table.clientId),
    projectIdx: index('idx_invoices_project_id').on(table.projectId),
    statusIdx: index('idx_invoices_status').on(table.status),
    workspaceIdIdUnique: uniqueIndex('idx_invoices_workspace_id_id').on(table.workspaceId, table.id),
    numberUnique: uniqueIndex('idx_invoices_workspace_number')
      .on(table.workspaceId, table.invoiceNumber)
      .where(isNotNull(table.invoiceNumber)),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: 'invoices_workspace_id_workspaces_id_fk',
    }).onDelete('cascade'),
    fkWorkspaceClient: foreignKey({
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clientsTable.workspaceId, clientsTable.id],
      name: 'fk_invoices_workspace_client',
    }).onDelete('restrict'),
    fkWorkspaceProject: foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projectsTable.workspaceId, projectsTable.id],
      name: 'fk_invoices_workspace_project',
    }).onDelete('set null'),
  })
);

export const invoiceItemsTable = pgTable(
  'invoice_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    invoiceId: uuid('invoice_id').notNull(),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1.00'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => ({
    invoiceIdx: index('idx_invoice_items_invoice_id').on(table.invoiceId),
    fkInvoice: foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoicesTable.id],
      name: 'fk_invoice_items_invoice',
    }).onDelete('cascade'),
    fkWorkspace: foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspacesTable.id],
      name: 'fk_invoice_items_workspace',
    }).onDelete('cascade'),
  })
);

export type Invoice = typeof invoicesTable.$inferSelect;
export type CreateInvoiceInput = typeof invoicesTable.$inferInsert;
export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;
export type CreateInvoiceItemInput = typeof invoiceItemsTable.$inferInsert;
export type InvoiceStatus = typeof invoiceStatusEnum.enumValues[number];
