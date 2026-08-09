import { pgEnum } from 'drizzle-orm/pg-core';

export const clientStatusEnum = pgEnum('client_status', ['active', 'inactive', 'archived']);
export const projectStatusEnum = pgEnum('project_status', ['draft', 'active', 'completed', 'archived']);
export const pricingModelEnum = pgEnum('pricing_model', ['fixed', 'hourly', 'retainer']);

