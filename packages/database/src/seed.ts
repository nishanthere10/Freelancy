import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';
import {
  usersTable,
  workspacesTable,
  workspaceMembersTable,
  clientsTable,
  projectsTable,
  invoicesTable,
  invoiceItemsTable,
  activityEventsTable,
} from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const candidates = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'packages/database/.env'),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...rest] = trimmed.split('=');
            const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
            const cleanKey = key.trim();
            if (cleanKey && val && !process.env[cleanKey]) {
              process.env[cleanKey] = val;
            }
          }
        }
        if (process.env.DATABASE_URL) break;
      } catch {
        // Ignore read errors
      }
    }
  }
}

async function seedDatabase() {
  loadEnv();
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🌱 Connecting to database for seeding...');
  const sql = postgres(connectionString, { max: 1, ssl: 'require' });
  const db = drizzle(sql);

  try {
    // 1. Resolve Target User
    const TARGET_USER_ID = process.env.SEED_USER_ID || '9f310b18-4459-4521-9213-66d24335d6ed';
    console.log(`👤 Linking seed data to User ID: ${TARGET_USER_ID}...`);

    let userId = TARGET_USER_ID;
    const existingUsers = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, TARGET_USER_ID))
      .limit(1);

    if (existingUsers.length === 0) {
      // If user doesn't exist yet, insert with exact UUID
      const [seedUser] = await db
        .insert(usersTable)
        .values({
          id: TARGET_USER_ID,
          clerkId: 'user_seed_master_01',
          email: 'founder@apexdesign.studio',
          status: 'active',
        })
        .onConflictDoNothing()
        .returning();

      if (seedUser) {
        userId = seedUser.id;
      }
    } else {
      userId = existingUsers[0].id;
      console.log(`✓ Found existing user (${existingUsers[0].email})`);
    }

    // 2. Create Workspace
    console.log('🏢 Seeding workspace...');
    const [workspace] = await db
      .insert(workspacesTable)
      .values({
        name: 'Apex Design Studio',
        slug: 'apex-design-studio',
        description: 'Boutique digital product design & branding studio',
        ownerId: userId,
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: workspacesTable.slug,
        set: { name: 'Apex Design Studio' },
      })
      .returning();

    const workspaceId = workspace.id;

    // 3. Create Workspace Member (Owner)
    console.log('👥 Seeding workspace membership...');
    await db
      .insert(workspaceMembersTable)
      .values({
        workspaceId,
        userId,
        role: 'owner',
        joinedAt: new Date(),
      })
      .onConflictDoNothing();

    // 4. Create Clients
    console.log('🤝 Seeding clients...');
    const [clientAcme] = await db
      .insert(clientsTable)
      .values({
        workspaceId,
        name: 'Acme Corporation',
        email: 'finance@acmecorp.com',
        phone: '+91 98765 43210',
        companyName: 'Acme Technologies Pvt Ltd',
        gstNumber: '27AABCU9603R1ZM',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'IN',
        status: 'active',
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: [clientsTable.workspaceId, clientsTable.email],
        set: { name: 'Acme Corporation' },
      })
      .returning();

    const [clientStarlight] = await db
      .insert(clientsTable)
      .values({
        workspaceId,
        name: 'Starlight Media',
        email: 'hello@starlightmedia.io',
        phone: '+91 91234 56789',
        companyName: 'Starlight Digital Media LLP',
        gstNumber: '29ABCDE1234F1Z5',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'IN',
        status: 'active',
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: [clientsTable.workspaceId, clientsTable.email],
        set: { name: 'Starlight Media' },
      })
      .returning();

    const [clientZenith] = await db
      .insert(clientsTable)
      .values({
        workspaceId,
        name: 'Zenith Health',
        email: 'accounts@zenithhealth.co',
        phone: '+91 99887 76655',
        companyName: 'Zenith Healthcare Solutions',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'IN',
        status: 'active',
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: [clientsTable.workspaceId, clientsTable.email],
        set: { name: 'Zenith Health' },
      })
      .returning();

    // 5. Create Projects
    console.log('📁 Seeding projects...');
    const [projectBrand] = await db
      .insert(projectsTable)
      .values({
        workspaceId,
        clientId: clientAcme.id,
        name: 'Brand Identity & Design System',
        slug: 'brand-identity-design-system',
        description: 'Complete visual identity overhaul, logo suite, and Figma token system',
        status: 'completed',
        pricingModel: 'fixed',
        budgetAmount: '120000.00',
        budgetCurrency: 'INR',
        startDate: '2026-06-01',
        targetDate: '2026-07-15',
        completedAt: new Date('2026-07-14T18:30:00.000Z'),
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: [projectsTable.workspaceId, projectsTable.slug],
        set: { name: 'Brand Identity & Design System' },
      })
      .returning();

    const [projectMobile] = await db
      .insert(projectsTable)
      .values({
        workspaceId,
        clientId: clientAcme.id,
        name: 'Mobile App UX/UI Prototypes',
        slug: 'mobile-app-ux-ui-prototypes',
        description: 'iOS & Android design system with interactive prototypes',
        status: 'active',
        pricingModel: 'hourly',
        budgetAmount: '85000.00',
        budgetCurrency: 'INR',
        startDate: '2026-07-20',
        targetDate: '2026-09-30',
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: [projectsTable.workspaceId, projectsTable.slug],
        set: { name: 'Mobile App UX/UI Prototypes' },
      })
      .returning();

    const [projectPortal] = await db
      .insert(projectsTable)
      .values({
        workspaceId,
        clientId: clientStarlight.id,
        name: 'Corporate Web Portal & CMS',
        slug: 'corporate-web-portal-cms',
        description: 'High-performance Next.js marketing site with headless CMS integration',
        status: 'active',
        pricingModel: 'fixed',
        budgetAmount: '250000.00',
        budgetCurrency: 'INR',
        startDate: '2026-08-01',
        targetDate: '2026-10-15',
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: [projectsTable.workspaceId, projectsTable.slug],
        set: { name: 'Corporate Web Portal & CMS' },
      })
      .returning();

    const [projectMarketing] = await db
      .insert(projectsTable)
      .values({
        workspaceId,
        clientId: clientZenith.id,
        name: 'Q3 Marketing Collateral Suite',
        slug: 'q3-marketing-collateral-suite',
        description: 'Social graphics, investor pitch deck, and trade show banners',
        status: 'draft',
        pricingModel: 'retainer',
        budgetAmount: '45000.00',
        budgetCurrency: 'INR',
        startDate: '2026-08-15',
        targetDate: '2026-09-15',
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: [projectsTable.workspaceId, projectsTable.slug],
        set: { name: 'Q3 Marketing Collateral Suite' },
      })
      .returning();

    // 6. Create Invoices
    console.log('🧾 Seeding invoices and line items...');
    
    // Invoice 1: Paid
    const [inv1] = await db
      .insert(invoicesTable)
      .values({
        workspaceId,
        clientId: clientAcme.id,
        projectId: projectBrand.id,
        invoiceNumber: 'INV-2026-0001',
        sequenceNumber: 1,
        status: 'paid',
        issueDate: '2026-07-01',
        dueDate: '2026-07-15',
        paidAt: new Date('2026-07-12T14:30:00.000Z'),
        currency: 'INR',
        subtotal: '101694.92',
        taxRate: '18.00',
        taxAmount: '18305.08',
        totalAmount: '120000.00',
        amountPaid: '120000.00',
        amountDue: '0.00',
        paymentMethod: 'Bank Transfer (NEFT)',
        paymentReference: 'UTR9847291837',
        notes: 'Thank you for partnering with Apex Design Studio!',
        terms: 'Payment received in full.',
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: [invoicesTable.workspaceId, invoicesTable.invoiceNumber],
        set: { status: 'paid' },
      })
      .returning();

    await db.insert(invoiceItemsTable).values([
      {
        workspaceId,
        invoiceId: inv1.id,
        description: 'Brand Identity & Visual Guidelines',
        quantity: '1.00',
        unitPrice: '60000.00',
        amount: '60000.00',
        sortOrder: 0,
      },
      {
        workspaceId,
        invoiceId: inv1.id,
        description: 'Logo Asset Suite (Vector, Digital & Print formats)',
        quantity: '1.00',
        unitPrice: '25000.00',
        amount: '25000.00',
        sortOrder: 1,
      },
      {
        workspaceId,
        invoiceId: inv1.id,
        description: 'Design Token System & Figma Component Library',
        quantity: '1.00',
        unitPrice: '16694.92',
        amount: '16694.92',
        sortOrder: 2,
      },
    ]).onConflictDoNothing();

    // Invoice 2: Sent (Pending payment)
    const [inv2] = await db
      .insert(invoicesTable)
      .values({
        workspaceId,
        clientId: clientStarlight.id,
        projectId: projectPortal.id,
        invoiceNumber: 'INV-2026-0002',
        sequenceNumber: 2,
        status: 'sent',
        issueDate: '2026-08-01',
        dueDate: '2026-08-25',
        currency: 'INR',
        subtotal: '72033.90',
        taxRate: '18.00',
        taxAmount: '12966.10',
        totalAmount: '85000.00',
        amountPaid: '0.00',
        amountDue: '85000.00',
        notes: 'Milestone 1 — Architecture & Wireframe Approval',
        terms: 'Net 25 Days. Late payments incur 1.5% monthly interest.',
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: [invoicesTable.workspaceId, invoicesTable.invoiceNumber],
        set: { status: 'sent' },
      })
      .returning();

    await db.insert(invoiceItemsTable).values([
      {
        workspaceId,
        invoiceId: inv2.id,
        description: 'Portal Information Architecture & Wireframes',
        quantity: '1.00',
        unitPrice: '45000.00',
        amount: '45000.00',
        sortOrder: 0,
      },
      {
        workspaceId,
        invoiceId: inv2.id,
        description: 'Content Strategy & SEO Sitemap Plan',
        quantity: '1.00',
        unitPrice: '27033.90',
        amount: '27033.90',
        sortOrder: 1,
      },
    ]).onConflictDoNothing();

    // Invoice 3: Overdue
    const [inv3] = await db
      .insert(invoicesTable)
      .values({
        workspaceId,
        clientId: clientAcme.id,
        projectId: projectMobile.id,
        invoiceNumber: 'INV-2026-0003',
        sequenceNumber: 3,
        status: 'overdue',
        issueDate: '2026-07-15',
        dueDate: '2026-08-05',
        currency: 'INR',
        subtotal: '55084.75',
        taxRate: '18.00',
        taxAmount: '9915.25',
        totalAmount: '65000.00',
        amountPaid: '0.00',
        amountDue: '65000.00',
        notes: 'UX Research & User Journey Mapping Deliverable',
        terms: 'Payment due on receipt.',
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: [invoicesTable.workspaceId, invoicesTable.invoiceNumber],
        set: { status: 'overdue' },
      })
      .returning();

    await db.insert(invoiceItemsTable).values([
      {
        workspaceId,
        invoiceId: inv3.id,
        description: 'User Journey Mapping & Stakeholder Interviews',
        quantity: '30.00',
        unitPrice: '1500.00',
        amount: '45000.00',
        sortOrder: 0,
      },
      {
        workspaceId,
        invoiceId: inv3.id,
        description: 'Competitive UX Analysis Report',
        quantity: '1.00',
        unitPrice: '10084.75',
        amount: '10084.75',
        sortOrder: 1,
      },
    ]).onConflictDoNothing();

    // 7. Seed Activity Events History
    console.log('⚡ Seeding activity history...');
    await db.insert(activityEventsTable).values([
      {
        workspaceId,
        actorUserId: userId,
        eventType: 'workspace.created',
        entityType: 'workspace',
        entityId: workspaceId,
        metadata: { entityName: 'Apex Design Studio' },
        createdAt: new Date('2026-06-01T09:00:00.000Z'),
      },
      {
        workspaceId,
        actorUserId: userId,
        eventType: 'client.created',
        entityType: 'client',
        entityId: clientAcme.id,
        metadata: { entityName: 'Acme Corporation' },
        createdAt: new Date('2026-06-02T10:15:00.000Z'),
      },
      {
        workspaceId,
        actorUserId: userId,
        eventType: 'project.created',
        entityType: 'project',
        entityId: projectBrand.id,
        metadata: { entityName: 'Brand Identity & Design System' },
        createdAt: new Date('2026-06-05T11:30:00.000Z'),
      },
      {
        workspaceId,
        actorUserId: userId,
        eventType: 'invoice.created',
        entityType: 'invoice',
        entityId: inv1.id,
        metadata: { invoiceNumber: 'INV-2026-0001', amount: '120000.00', currency: 'INR' },
        createdAt: new Date('2026-07-01T14:00:00.000Z'),
      },
      {
        workspaceId,
        actorUserId: userId,
        eventType: 'invoice.paid',
        entityType: 'invoice',
        entityId: inv1.id,
        metadata: { invoiceNumber: 'INV-2026-0001', amount: '120000.00', currency: 'INR' },
        createdAt: new Date('2026-07-12T14:30:00.000Z'),
      },
      {
        workspaceId,
        actorUserId: userId,
        eventType: 'project.status_changed',
        entityType: 'project',
        entityId: projectBrand.id,
        metadata: { entityName: 'Brand Identity & Design System', fromStatus: 'active', toStatus: 'completed' },
        createdAt: new Date('2026-07-14T18:30:00.000Z'),
      },
      {
        workspaceId,
        actorUserId: userId,
        eventType: 'client.created',
        entityType: 'client',
        entityId: clientStarlight.id,
        metadata: { entityName: 'Starlight Media' },
        createdAt: new Date('2026-07-28T09:45:00.000Z'),
      },
      {
        workspaceId,
        actorUserId: userId,
        eventType: 'project.created',
        entityType: 'project',
        entityId: projectPortal.id,
        metadata: { entityName: 'Corporate Web Portal & CMS' },
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
      },
      {
        workspaceId,
        actorUserId: userId,
        eventType: 'invoice.sent',
        entityType: 'invoice',
        entityId: inv2.id,
        metadata: { invoiceNumber: 'INV-2026-0002', amount: '85000.00', currency: 'INR' },
        createdAt: new Date('2026-08-01T11:00:00.000Z'),
      },
      {
        workspaceId,
        actorUserId: userId,
        eventType: 'client.created',
        entityType: 'client',
        entityId: clientZenith.id,
        metadata: { entityName: 'Zenith Health' },
        createdAt: new Date('2026-08-15T15:20:00.000Z'),
      },
    ]).onConflictDoNothing();

    console.log('✅ Database seeded successfully with comprehensive demo data!');
    console.log(`
📊 Seed Summary:
  - Workspace: "${workspace.name}" (ID: ${workspaceId})
  - User ID: ${userId}
  - Clients: 3 (Acme Corp, Starlight Media, Zenith Health)
  - Projects: 4 (Brand Identity, Mobile App, Web Portal, Marketing Suite)
  - Invoices: 3 (1 Paid ₹1.2L, 1 Sent ₹85K, 1 Overdue ₹65K)
  - Activity Events: 10 chronological events
    `);

    await sql.end();
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    await sql.end();
    process.exit(1);
  }
}

seedDatabase();
