import { pgEnum } from 'drizzle-orm/pg-core';

export const clientStatusEnum = pgEnum('client_status', ['active', 'inactive', 'archived']);
