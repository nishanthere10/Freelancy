# Freelance OS: Project Context for AI Agents

**Last Updated:** August 2, 2026  
**Version:** 1.0  
**Audience:** All AI agents, engineers, product managers, and technical stakeholders

---

## 1. Purpose of This Context File

This document is the **canonical source of truth** for every technical and product decision made within Freelance OS. It serves as the onboarding handbook for AI agents and engineers joining this project.

Every AI agent must read this file before:
- Making architectural decisions
- Writing code
- Designing features
- Creating documentation
- Proposing changes to the system

This document is **not** marketing material, user documentation, or product marketing messaging. It is internal operational documentation designed to establish coherence, consistency, and alignment across the entire technical organization.

**What this document does:**
- ✅ Explains WHY we build the way we do
- ✅ Documents core principles and constraints
- ✅ Clarifies trade-offs in architectural decisions
- ✅ Provides frameworks for decision-making
- ✅ Establishes non-negotiable standards

**What this document does NOT do:**
- ❌ Serve as a user guide or tutorial
- ❌ Provide step-by-step implementation instructions
- ❌ Replace technical specifications
- ❌ Dictate exact implementation details
- ❌ Serve as marketing or sales material

---

## 2. How AI Agents Must Use This File

Before proposing ANY change, fix, feature, or decision:

1. **Read the relevant sections** of this context file
2. **Check for existing precedent** in the codebase and documentation
3. **Verify alignment** with the stated principles and philosophy
4. **Consider the trade-offs** documented in this file
5. **Document your reasoning** if you deviate from established patterns
6. **Escalate to humans** if you encounter conflicts or ambiguities

### Decision-Making Hierarchy

When making decisions, follow this priority order:

1. **Explicit rules** in this context file (highest authority)
2. **Existing patterns** in the codebase
3. **Established frameworks** documented in related files
4. **Industry best practices** for the specific technology
5. **Pragmatic judgment** (lowest authority, requires justification)

If you cannot find guidance, create a clearly marked TODO section and escalate to the human team lead.

---

## 3. Vision

Freelance OS is building the **operating system for modern freelancers in India**.

We are not building another generic project management application. We are building a comprehensive platform that combines intelligent project management, scope analysis, GST-compliant invoicing, payment tracking, and AI-assisted workflow automation into a single coherent experience.

The vision is to enable Indian freelancers to focus on their craft—not administrative overhead.

### Long-Term Evolution Path

```
Freelancer OS (Current)
        ↓
    Agency OS (Year 2)
        ↓
Business Operating System (Year 3)
        ↓
AI Project Manager (Year 4)
        ↓
Autonomous Project Intelligence (Year 5+)
```

Each phase builds on the previous one, maintaining backward compatibility while expanding the system's capabilities.

---

## 4. Mission

Our mission is threefold:

1. **Empower** Indian freelancers with professional-grade tools that were previously accessible only to enterprises
2. **Eliminate** administrative friction from the project lifecycle (from negotiation to delivery to payment)
3. **Demonstrate** that AI can be a genuine productivity multiplier without replacing human judgment

---

## 5. Startup Principles

These principles guide every decision:

| Principle | Definition | Why It Matters |
|-----------|-----------|-----------------|
| **Focus** | Do one thing exceptionally well before expanding | We compete through depth, not breadth |
| **Quality** | Production-grade code from day one | Freelancers trust us with their livelihoods |
| **Speed** | Ship fast, learn faster, iterate fearlessly | Market moves quickly; we must adapt |
| **Authenticity** | Build for real users, not imagined personas | Our target users are specific and knowable |
| **Pragmatism** | Choose boring technology that works | Sexy tech is a liability in early stages |
| **Sustainability** | Architecture that scales to 100k+ users | We must avoid technical debt traps |

---

## 6. Product Philosophy

Freelance OS should feel like:

- **Linear** (intuitive, well-designed, professional)
- **+Notion** (flexible, structured, powerful)
- **+AI Project Manager** (intelligent, context-aware, helpful)
- **+GST Billing** (Indian-specific, compliant, frictionless)
- **+Freelancer Toolkit** (practical, opinionated, Indian-first)

Every interface should feel:
- **Fast** (responsive, performant, snappy)
- **Minimal** (no unnecessary complexity or features)
- **Professional** (trustworthy, polished, enterprise-grade)
- **Opinionated** (clear defaults, smart suggestions)
- **AI-first** (AI capabilities visible, accessible, valuable)

**Non-negotiable standards:**
- Every screen loads in under 1 second (p95)
- Every action completes in under 100ms (p95)
- Every feature is tested, documented, and intuitive
- Every interaction feels purposeful, not cluttered

---

## 7. Engineering Philosophy

Our engineering approach prioritizes:

| Priority | Definition | Trade-off |
|----------|-----------|-----------|
| **Maintainability** | Code is read 10x more than written | Accept more boilerplate for clarity |
| **Readability** | Junior engineers understand our code | Reject terse or clever patterns |
| **Scalability** | Architecture grows from 1k to 100k users | Don't optimize for current load prematurely |
| **Performance** | Systems respond in milliseconds | Use boring, proven technologies |
| **Security** | Zero tolerance for preventable breaches | Assume all user input is hostile |
| **Developer Experience** | Engineers ship faster with good tooling | Invest in automation and quality gates |

**Core Tenets:**

- Never optimize prematurely. Measure first, optimize second.
- Never sacrifice maintainability for perceived cleverness.
- Architecture remains modular. Each service owns its data.
- Business logic is isolated from infrastructure concerns.
- Every architectural decision supports long-term evolution.
- Debugging should be easy. Observability is built in from day one.

**What we reject:**
- Microservices without clear boundaries
- NoSQL without understanding relational data
- Serverless without understanding cold starts
- Abstraction layers that add complexity without value
- Frameworks chosen for resume value, not team capability

---

## 8. AI Philosophy

AI exists to solve real problems for real users. It is not a feature to add because AI is fashionable.

### Core AI Principles

1. **AI augments human judgment, never replaces it**
   - Users always retain final decision authority
   - AI suggestions must be explainable
   - Confidence scores guide user trust

2. **AI reduces cognitive load and manual work**
   - Identify the bottleneck in the user workflow
   - Automate that specific pain point
   - Measure impact through actual usage

3. **AI prevents mistakes and improves project quality**
   - Catch scope drift before it happens
   - Flag risks and dependencies automatically
   - Suggest better estimates based on historical data

4. **Every AI feature must have clear success metrics**
   - Not "AI will be cool"
   - Yes "AI reduces time-to-estimate by 60%"
   - Track adoption, user satisfaction, business impact

### AI Features (Current & Planned)

| Feature | Purpose | Status |
|---------|---------|--------|
| Scope Analysis | Convert messy client requirements into structured scope | Core |
| Milestone Generation | AI-suggested breakdown of projects into milestones | Core |
| Risk Detection | Identify scope drift, dependency issues, timeline conflicts | Core |
| Estimate Refinement | ML-based estimation based on freelancer's history | Planned |
| Client Communication | Draft professional responses to scope questions | Planned |
| Invoice Generation | Auto-populate invoice data from project context | Planned |
| Smart Notifications | Prioritized alerts based on actual importance | Future |

---

## 9. Engineering Principles

### Architecture Decisions

We follow these architectural principles across all layers:

**Backend Architecture:**
- Services are organized by business domain (auth, projects, invoices, payments)
- Each domain owns its database schema
- Communication between domains uses well-defined APIs
- No shared databases or cross-domain queries
- Data flows through event streams for real-time updates

**Frontend Architecture:**
- Features are organized by business domain
- Each feature owns its API integration layer
- State management is colocated with feature code
- No global stores for business logic
- Shared components are minimal and UI-focused

**Database Architecture:**
- Neon PostgreSQL is our single source of truth
- All data is normalized
- Denormalization happens through application logic
- Real-time features use event streams, not polling
- Migrations are atomic and reversible

### Technology Choices: Why We Choose Boring

We explicitly choose **boring, proven technology** over cutting-edge alternatives.

Why?

1. **Hiring** - We need engineers who know this stack already
2. **Stability** - Boring tech has fewer surprises in production
3. **Documentation** - Mature ecosystems have excellent documentation
4. **Performance** - Boring frameworks are heavily optimized
5. **Community** - Large communities mean faster problem-solving
6. **Maintenance** - Boring tech is maintained longer

| Layer | Technology | Why | Alternative We Rejected |
|-------|-----------|-----|--------------------------|
| Frontend | Next.js + React | Mature, SSR/SSG, excellent DX | Remix, Nuxt, Qwik |
| Language (FE) | TypeScript | Catches bugs early, great DX | JavaScript, Flow |
| Styling | Tailwind CSS | Utility-first, predictable, fast | Styled Components, CSS Modules |
| State Mgmt | TanStack Query | Perfect for server state | Redux, Zustand, Valtio |
| Backend | Express.js | Minimal, flexible, lightweight | NestJS, Fastify, Hapi |
| Database | Neon PostgreSQL | Powerful, ACID, proven | MongoDB, MySQL, Supabase |
| ORM | Drizzle | Type-safe SQL, minimal overhead | Prisma, Typeorm, Sequelize |
| AI Framework | FastAPI + LangGraph | Fast, async, AI-native | Langchain, OpenAI SDK only |
| Realtime | Socket.io | Battle-tested, reliable | WebSockets raw, Pusher, Ably |
| Caching | Redis | Ubiquitous, fast, simple | Memcached, DynamoDB |
| Task Queue | BullMQ | Redis-backed, reliable, simple | Celery, RabbitMQ, Google Cloud Tasks |

---

## 10. Problem Statement

Indian freelancers today face an impossible situation:

**The Current State:**
- They use 8-12 different tools to manage a single project
- Each tool stores data in different formats with no integration
- Client requirements are captured in WhatsApp, email, and scattered documents
- Scope creep happens silently; they realize they're underwater only after weeks of work
- Invoicing is a manual, error-prone nightmare with GST calculations
- Payment tracking happens in spreadsheets
- They cannot generate professional scope documents or contracts quickly
- Estimates are guesses based on gut feeling, not data
- No visibility into profitability or time-to-payment

**The Consequences:**
- 40-60% of freelance projects exceed their timeline and budget
- Admin overhead consumes 15-25% of billable hours
- Disputes with clients arise from miscommunication and scope creep
- Invoicing errors lead to GST compliance issues
- Small payment delays cascade into cash flow crises
- Freelancers cannot scale because they're drowning in admin work

**Why Existing Tools Don't Work:**
- Generic project management tools (Asana, Monday, Jira) don't understand freelance workflows
- Invoicing tools (Wave, FreshBooks) aren't GST-native for India
- Payment tools (Razorpay, Stripe) have 2-3% transaction fees + settlement delays
- Collaboration tools (Notion, Confluence) are overkill and require training
- Aggregating these tools requires constant manual data entry
- No tool understands the specific needs of Indian tax compliance

**The Root Problem:**
There is **no single platform designed for Indian freelancers** that combines project management, scope analysis, GST invoicing, and payment tracking into a seamless, opinionated workflow.

---

## 11. Market Opportunity

### Market Size

**India's Freelancer Economy:**
- 1.5-2 million registered freelancers in India (growing 30% YoY)
- 25-30% are software developers and designers
- Average freelancer earnings: ₹3-8 lakh per year
- Total addressable market: ₹50,000+ crore annually

**TAM/SAM/SOM:**

| Metric | Value | Notes |
|--------|-------|-------|
| TAM | ₹50,000 Cr | All freelancers in India |
| SAM | ₹8,000 Cr | Tech/design/consulting freelancers |
| SOM (Year 1) | ₹100 Cr | Conservative estimate at 0.3% market penetration |
| SOM (Year 3) | ₹500 Cr | Target 3% market penetration |

### Why Now?

1. **Digital Infrastructure is Ready** - UPI, internet penetration, payment rails are mature
2. **Regulatory Clarity** - GST rules are well-established; compliance is no longer uncertain
3. **Remote Work Normalization** - COVID accelerated acceptance of freelance work
4. **AI Maturity** - LLMs are now capable enough for legitimate business automation
5. **Startup Success** - Indian startups have proven they can build global products
6. **Venture Capital** - Indian venture capital is abundant and understands B2B SaaS

---

## 12. Product Overview

Freelance OS is a unified platform that handles the complete freelance project lifecycle:

### Project Lifecycle

```
Client Inquiry
     ↓
Scope Analysis (AI-assisted)
     ↓
Proposal Generation
     ↓
Project Setup
     ↓
Milestone Tracking (AI monitoring)
     ↓
Scope Change Management
     ↓
Delivery & Approval
     ↓
Invoice Generation (GST-native)
     ↓
Payment Tracking
     ↓
Project Closure & Archival
```

### Core Modules

**1. Projects & Scope**
- Create projects from client requirements
- AI analyzes requirements and suggests structure
- Generate scope documents, deliverables, and success criteria
- Track scope changes and flag drift automatically
- Store complete project context for future reference

**2. Milestones & Tasks**
- AI-suggested milestone breakdown
- Each milestone has clear deliverables
- Real-time progress tracking
- Automatic risk detection (missed milestones, dependencies)
- Historical data for future estimation

**3. Invoicing**
- GST-compliant invoice generation
- Auto-populate from project milestones
- Support for milestone-based and retainer billing
- Digital signature support
- Automatic deadline tracking

**4. Payments**
- UPI as primary payment method
- Integration with Razorpay for payment collection
- Payment status tracking
- Automated reminders for overdue payments
- Settlement reconciliation

**5. Client Collaboration**
- Share project updates with clients
- Client can provide feedback on milestones
- Real-time notifications
- Transparent project status dashboard

**6. Analytics & Insights**
- Project profitability by client, skill, project type
- Average project duration and estimate accuracy
- Revenue trends and forecasting
- Time allocation across projects

---

## 13. Core Features (MVP)

Features required for MVP launch:

| Feature | Specification | Priority |
|---------|---------------|----------|
| **Account Setup** | Sign up with email/phone, GST registration info, bank details | P0 |
| **Project Creation** | Create project, add description, set timeline and budget | P0 |
| **Scope Analysis** | AI analyzes description and generates structure | P0 |
| **Milestone Management** | Create, edit, track milestone status | P0 |
| **Invoice Generation** | Create GST-compliant invoices from milestones | P0 |
| **Payment Tracking** | Mark payments as received, track overdue payments | P0 |
| **Project Dashboard** | Overview of all projects, their status, revenue, timeline | P0 |
| **Client Collaboration** | Share project link with clients, show milestone status | P1 |
| **Basic Analytics** | Revenue trends, project count, average duration | P1 |
| **Email Notifications** | Milestone reminders, payment due notifications | P1 |
| **Mobile Responsive** | All features work on mobile browsers | P0 |

---

## 14. Future Features (Post-MVP)

Features planned for future releases:

**Phase 2 (Months 3-6):**
- Payment collection through UPI/Razorpay
- Recurring/retainer billing
- Team collaboration (add team members)
- Advanced reporting and analytics
- Automated payment reminders

**Phase 3 (Months 6-12):**
- Client portal with document signing
- Automated scope change request workflow
- Estimate accuracy ML model
- Time tracking integration
- Inventory of reusable scope templates

**Phase 4 (Year 2+):**
- Agency mode (manage multiple freelancers)
- Subcontractor management
- Proposal generation and e-signing
- Contract templates (NDA, SOW)
- Integration with development tools (GitHub, deployment services)
- Marketplace for finding subcontractors

---

## 15. Product Differentiators

Freelance OS is different because of five core differentiators:

### 1. AI Scope Analysis Engine

**What it does:**
Freelancers describe their project in natural language (often messy, with missing information, conflicting requirements). Our AI system converts this into:
- Structured project breakdown
- Clear deliverables
- Success criteria
- Risk flags
- Suggested timeline and milestones
- Missing information alerts

**Why it matters:**
Most scope problems arise from poor requirements. By structuring requirements upfront, we reduce disputes and scope creep by 40-60%.

**Trade-off:**
AI suggestions are starting points, not gospel. Users must validate and adjust. This maintains human judgment while reducing cognitive load.

### 2. Continuous Scope Drift Detection

**What it does:**
Most projects fail because scope creeps silently. We detect:
- New features added without timeline adjustment
- Milestone deliverables changing mid-project
- Work expanding beyond original budget
- Dependencies appearing late

We alert the freelancer immediately and suggest corrective actions.

**Why it matters:**
Freelancers often accept extra work informally (over WhatsApp, chat). By the time they realize they're underwater, it's too late. Early detection prevents this.

### 3. Persistent AI Context

**What it does:**
Every project has complete context stored:
- Original client requirements
- Generated scope documents
- Milestone history
- Change requests
- Communication (linked)
- Lessons learned

When the freelancer starts a new project with the same client, AI has context from all previous projects.

**Why it matters:**
Second and third projects with the same client are 30-40% faster because context is persistent. Freelancers build institutional knowledge.

### 4. GST-Native, India-First Workflow

**What it does:**
- All invoices are GST-compliant by default
- Support for GST-registered and non-registered freelancers
- Automatic GST calculations
- Quarterly compliance reporting
- UPI as the primary payment method (not Stripe)
- Bank transfer reconciliation
- No foreign payment gateway fees

**Why it matters:**
Generic tools treat India as an afterthought. We treat India as our home market. This is not a feature; it's the entire platform.

### 5. Real-Time Project Intelligence

**What it does:**
- Dashboard shows actual vs. estimated progress
- Automatic risk scoring (this project is 87% likely to miss deadline)
- Predicted revenue and profitability
- Client satisfaction signals (based on communication)
- Peer benchmarks (how similar projects performed)

**Why it matters:**
Freelancers fly blind. Real-time intelligence lets them make corrections mid-project instead of discovering problems at delivery.

### 6. Beautiful, Opinionated UI

**What it does:**
Every screen is thoughtfully designed. No "admin panel" feel. Minimal, intentional, fast.

**Why it matters:**
Freelancers make dozens of decisions per day. Poor UI multiplies cognitive load. Good UI lets them focus on their work.

---

## 16. Product Goals (12-Month Horizon)

### Acquisition Goals
- 1,000 active freelancer accounts by end of Year 1
- 5,000 projects created
- 10,000+ invoices generated
- Organic adoption rate > 40% (users bring friends)

### Engagement Goals
- 60%+ monthly active user rate
- Average 20+ projects per freelancer per year
- 4+ logins per week per active user
- NPS > 50

### Retention Goals
- 80%+ month-1 retention
- 60%+ month-6 retention
- 40%+ month-12 retention
- Churn rate < 5% per month

### Revenue Goals
- Launch with freemium model (free + pro)
- ₹50-100 MRR per paying user
- 5% conversion to paid (conservative estimate)
- ₹25,000+ MRR by end of Year 1

---

## 17. Non-Goals (What We Will NOT Build)

Clear non-goals prevent scope creep:

| Non-Goal | Why We're Saying No |
|----------|-------------------|
| **Time tracking** | Freelancers dislike time tracking. Milestone-based billing is better. |
| **Expense tracking** | Out of scope for freelancer focus. Use separate accounting software. |
| **CRM/Sales tools** | Lead generation is outside our domain. |
| **HR/Payroll** | Not applicable to freelancers working solo. |
| **Inventory management** | Not a workflow problem for our target users. |
| **Chat/messaging** | Outsource to Slack, Telegram. Integrating adds complexity. |
| **Document storage** | Outsource to Google Drive, Dropbox. |
| **Email marketing** | Separate tool with better DX exists. |
| **International expansion (Year 1)** | Perfect India first, then expand. |
| **B2C marketplace** | Freelancer connections happen through other channels. |

---

## 18. Success Metrics

### North Star Metric

**Projects Successfully Delivered On Time and Budget**

Every other metric flows from this. If freelancers are delivering projects on schedule and within budget, everything else (retention, revenue, NPS) follows naturally.

### Supporting Metrics

| Metric | Target | Why It Matters |
|--------|--------|-----------------|
| Time-to-Estimate Reduction | 60% faster | Reduces friction |
| Scope Drift Detection Rate | 80%+ flagged early | Prevents disasters |
| Invoice Generation Time | < 2 minutes | Reduces admin work |
| Payment-to-Settlement Time | < 2 days | Improves cash flow |
| User-Generated Projects | 100+ per day | Platform adoption |
| AI Suggestion Acceptance Rate | 60%+ | AI is genuinely helpful |
| Repeat Project Ratio | 40%+ with same client | Stickiness and context reuse |
| Monthly Active Users | 10k+ by Year 1 | Business viability |
| NPS | > 50 | Product quality |

### Anti-Metrics (What We Avoid)

- Vanity metrics (total signups without engagement)
- Activity metrics that don't correlate to outcomes (clicks, page views)
- Metrics optimized through dark patterns or manipulation

---

## 19. Target Users & Personas

### Primary User: Harsh (The Independent Developer)

**Profile:**
- Age 26, 4 years into freelancing
- Works solo from home
- ₹5-8 lakh annual revenue
- 8-12 projects per year
- Uses Jira for tracking, Stripe for payments, Wave for invoicing

**Pain Points:**
- Spends 5-6 hours per week on project admin
- Scope creep loses him ₹1-2 lakh per year
- Invoicing is error-prone; GST calculation is a headache
- Cannot estimate accurately; projects often run 20-30% over

**Desired Outcome:**
- Reduce admin time to 2 hours per week
- Catch scope creep before it happens
- Invoice and track payment in 5 minutes
- Estimate confidently based on historical data

### Secondary User: Priya (The Designer Agency)

**Profile:**
- Age 32, runs design studio with 2-3 contractors
- 20-25 projects per year
- ₹15-25 lakh annual revenue
- Collaborates with contractors and clients

**Pain Points:**
- Managing multiple freelancers and tracking their work
- Clients request changes mid-project
- Subcontractor payments need tracking
- No visibility into project profitability

**Desired Outcome:**
- Coordinate across multiple team members
- Document all changes and their cost impact
- Pay subcontractors efficiently
- Understand which project types are most profitable

### Future User: Rajesh (The Small Agency)

**Profile:**
- Age 40, runs small software agency (5-10 engineers)
- 50-100 projects per year
- ₹50-100 lakh annual revenue
- Manages team, clients, proposals, and delivery

**Desired Outcome:**
- Central platform for all project coordination
- Automated resource allocation
- Client portal and real-time status
- Accurate profitability and utilization metrics

---

## 20. Technical Stack Deep Dive

### Frontend Architecture

**Framework: Next.js + React 19 + TypeScript**

Why Next.js?
- Server-side rendering for SEO and fast initial loads
- API routes for backend communication
- File-based routing is simple and scalable
- App Router (new) provides better performance
- Vercel deployment integration

**Styling: Tailwind CSS + Shadcn/ui**

Why Tailwind?
- Utility-first approach prevents CSS bloat
- Dark mode support built-in
- Consistent spacing, colors, typography
- Zero runtime overhead

Why Shadcn?
- Accessible, unstyled component primitives
- Copy-paste components (not npm packages) give full control
- Beautiful defaults with Tailwind

**State Management: TanStack Query + React Context**

Why TanStack Query?
- Server state is complex and requires synchronization
- Query caching, invalidation, background sync
- Request deduplication reduces API calls
- Optimistic updates for perceived performance

When do we use Context?
- UI state only (modals, sidebar collapse)
- Not for business logic or server data
- Avoids prop drilling for shallow hierarchies

**Data Fetching: React Query + Axios**

- Query hooks for GET requests
- Mutations for POST/PUT/DELETE
- Automatic retry and error handling
- Request/response interceptors for auth tokens

### Backend Architecture

**Framework: Express.js + TypeScript**

Why Express?
- Minimal, flexible, well-understood
- Massive ecosystem
- Not opinionated (we control our architecture)
- Lightweight for our use cases

**Architecture: Domain-Driven Services**

```
/src
  /domains
    /auth
      - routes.ts
      - service.ts
      - repository.ts
    /projects
      - routes.ts
      - service.ts
      - repository.ts
    /invoices
      - routes.ts
      - service.ts
      - repository.ts
  /shared
    - middleware
    - utils
    - constants
```

Each domain:
- Owns its routes (Express routers)
- Owns its business logic (services)
- Owns its data access (repository)
- Owns its database schema
- Communicates with other domains through well-defined APIs

**Database: Neon PostgreSQL**

Why PostgreSQL?
- ACID transactions for financial data integrity
- Strong typing through schemas
- Mature ecosystem and tooling
- Excellent performance at our scale

Why Neon?
- Serverless PostgreSQL (automatic scaling)
- Connection pooling built-in
- Branching for staging/testing
- Simple deployment story

**ORM: Drizzle**

Why Drizzle over Prisma or TypeORM?
- SQL-first approach (we control queries)
- Better performance
- Generated types are completely type-safe
- Smaller bundle size
- Active development and community

### AI/ML Architecture

**Framework: FastAPI + LangGraph**

Why FastAPI?
- Modern Python web framework (async/await native)
- Automatic API documentation
- Fast execution and startup
- Type hints enforced

Why LangGraph?
- Orchestrates multi-step AI workflows
- State management for agentic behaviors
- Deterministic and reproducible
- Excellent error handling and recovery

**LLM Integration:**
- Primary: OpenAI GPT-4 Turbo
- Fallback: OpenAI GPT-3.5
- Embeddings: OpenAI text-embedding-3-small

**Memory/Context:**
- PostgreSQL with pgvector for embedding storage
- Drizzle ORM manages vector data
- LangGraph PostgresSaver for state persistence
- Redis for request-level caching

**AI Pipeline Example: Scope Analysis**

```
Client Requirements (text)
       ↓
Embedding Generation
       ↓
Similarity Search (past projects)
       ↓
Context Retrieval
       ↓
LLM Prompt Construction
       ↓
Structured Output Generation
       ↓
Validation & Sanity Checks
       ↓
Return to Frontend
```

### Real-Time Architecture

**WebSocket: Socket.io**

Why Socket.io?
- Battle-tested for production
- Automatic fallback to HTTP long-polling
- Room/namespace support for multi-user scenarios
- Easy integration with Express

**Use Cases:**
- Real-time milestone status updates
- Live client collaboration on scope documents
- Instant notification delivery
- Live activity streams

**Architecture:**
- Socket.io server runs on same Node.js instance as Express
- Redis adapter allows horizontal scaling
- Rooms correspond to projects/invoices
- Events are validated and authorized

### Caching & Performance

**Redis:**
- Cache API responses (5-30 min TTL)
- Session storage
- Rate limiting counters
- Real-time data structures (leaderboards, counts)

**BullMQ (Task Queue):**
- Async jobs (sending emails, generating reports)
- Scheduled tasks (daily reminders, compliance reports)
- Job retry logic with exponential backoff
- Dead-letter queues for failed jobs

---

## 21. Code Quality & Developer Experience

We don't compromise on code quality. Every change is validated through multiple layers:

### Linting & Formatting

| Tool | Purpose | Coverage |
|------|---------|----------|
| **Biome** | Code formatting + linting | TS, JSX, JSON |
| **ESLint** | JavaScript best practices | TS, JSX |
| **Prettier** (via Biome) | Code formatting | All text files |

All commits are automatically formatted. Developers don't manually format code.

### Type Safety

| Tool | Purpose | Target |
|------|---------|--------|
| **TypeScript** | Compile-time type checking | 100% coverage |
| **Zod** | Runtime schema validation | API inputs, DB queries |
| **type-coverage** | Measure explicit vs. implicit types | Target: 95%+ explicit |

Every API endpoint validates input with Zod before execution.

### Performance Analysis

| Tool | Purpose | When Run |
|------|---------|----------|
| **React Scan** | Component rendering performance | Pre-commit |
| **React Doctor** | React anti-patterns | Pre-commit |
| **Import Cost** | Module size impact analysis | In-editor (IDE) |
| **Bundle Analyzer** | Build size tracking | Post-build |

### Dependency Management

| Tool | Purpose |
|------|---------|
| **Knip** | Unused dependency detection |
| **Dependabot** | Automated dependency updates |
| **Snyk** | Security vulnerability scanning |
| **License Compliance** | GPL/incompatible license detection |

### Testing

| Layer | Tool | Target | Philosophy |
|-------|------|--------|-----------|
| **Unit** | Vitest | Core business logic > 80% coverage | Test behavior, not implementation |
| **Integration** | Vitest + MSW | API integrations > 70% coverage | Test contracts between services |
| **E2E** | Playwright | Critical user flows 100% coverage | Test from user perspective |
| **Visual** | Storybook | All components are documented | Documentation-driven testing |

### Error Handling & Observability

**Structured Logging:**
- Winston (backend) with JSON format
- Console (frontend) with error boundaries
- Every log includes context: userId, projectId, timestamp

**Error Tracking:**
- Sentry for frontend and backend errors
- Automatic source map upload
- Release tracking and regression detection

**Performance Monitoring:**
- Vercel Analytics (frontend)
- APM dashboard (backend)
- Database query performance tracking

---

## 22. Architectural Principles

### API Design

**REST over GraphQL (for MVP)**

Why REST?
- Simpler caching (HTTP cache semantics)
- Easier rate limiting and DDoS protection
- Standard HTTP methods and status codes
- Easier debugging and monitoring
- Team familiarity

We use REST for MVP. GraphQL considered for future phases if data fetching becomes complex.

**API Versioning:**
- `/api/v1/*` endpoints
- Breaking changes → new version
- Old versions sunset after 6 months notice

**Authentication:**
- OAuth 2.0 for user flows
- Session-based cookies (not tokens)
- CSRF protection on all state-changing requests
- Rate limiting per IP + user

### Database Design

**Schema Principles:**
- Normalized by default (3NF)
- Denormalization only when measured to improve performance
- Audit columns on all business entities (created_at, updated_at, created_by)
- Soft deletes for compliance and reversibility

**Concurrency:**
- Optimistic locking on critical updates (using version columns)
- Row-level locking only when necessary
- No distributed transactions

### Frontend State Management

**Rule: Keep state close to where it's used**

```
Global State (Redux/Context) ← Avoid unless absolutely necessary
      ↓
Feature-level State (TanStack Query, Zustand)
      ↓
Component-level State (useState)
      ↓
Local Variables
```

Benefits:
- Easier to understand component behavior
- Simpler to test
- No prop drilling
- Fewer dependencies

### Deployment Architecture

**Frontend:**
- Deployed to Vercel
- Automatic deployments on git push
- Preview deployments for PRs
- 99.9% uptime SLA

**Backend:**
- Deployed to AWS ECS (Fargate)
- Docker containerized
- Auto-scaling based on CPU/memory
- Zero-downtime deployments

**Database:**
- Neon PostgreSQL serverless
- Automatic backups every 24 hours
- Point-in-time restore capability
- Read replicas for analytics queries

**Static Assets:**
- Cloudflare CDN
- Image optimization with Next.js Image
- Cache busting through content hashing

---

## 23. Security Principles

Security is not a feature; it's foundational.

### Data Protection

| Layer | Protection |
|-------|-----------|
| **Transmission** | TLS 1.3 everywhere (no unencrypted HTTP) |
| **Storage** | Password hashing (bcrypt, not plaintext) |
| **Sensitive Data** | Encryption at rest for SSNs, bank details |
| **Audit Trail** | All changes to financial data logged immutably |

### Access Control

- Role-based access control (RBAC)
- Freelancer can only see their own projects
- Clients can only see shared project dashboard
- Admin portal for support team (limited scope)

### Vulnerability Prevention

| Risk | Mitigation |
|------|-----------|
| **SQL Injection** | Parameterized queries (Drizzle ORM) |
| **XSS** | React's default escaping + Content Security Policy |
| **CSRF** | SameSite cookies + CSRF tokens |
| **Rate Limiting** | Per-IP and per-user limits on sensitive endpoints |
| **Secrets** | Environment variables, never in code |
| **Dependencies** | Snyk scans every dependency |

---

## 24. Decision-Making Framework

When faced with a decision, follow this framework:

### Step 1: Clarify the Problem
- What are we actually deciding?
- What trade-offs exist?
- What are the constraints?

### Step 2: Gather Information
- Check this document for precedent
- Look for similar decisions in codebase
- Consult team expertise
- Measure if it's a performance decision

### Step 3: Identify Options
- At least 3 viable options
- Document trade-offs for each
- Include "do nothing" as an option

### Step 4: Make the Decision
- Follow the decision hierarchy (see section 2)
- Document the decision and rationale
- Consider reversibility (favour reversible decisions)

### Step 5: Document & Communicate
- Update this document if it's a precedent-setting decision
- Create ADR (Architecture Decision Record) if it's significant
- Communicate to team
- Review in retrospective

---

## 25. Product Constraints

### Technical Constraints

| Constraint | Impact | Reason |
|-----------|--------|--------|
| **Single PostgreSQL database** | 100k concurrent users max | Cost, complexity trade-off |
| **No distributed transactions** | Services use eventual consistency | Complexity reduction |
| **No real-time audio/video** | Meetings in separate tool | Out of scope for MVP |
| **Max file size: 50MB** | Documents only (no media) | Storage cost and bandwidth |

### Business Constraints

| Constraint | Impact | Decision |
|-----------|--------|----------|
| **No paid acquisition (Year 1)** | Organic growth only | Preserve runway; prove PMF first |
| **Focus on India only** | Single tax system, currency | Depth over breadth |
| **Freemium model** | Support free users | Drive adoption and word-of-mouth |
| **No enterprise sales team** | Self-serve GTM | Match bootstrap stage |

### Compliance Constraints

| Constraint | Impact | Notes |
|-----------|--------|-------|
| **GST Compliance** | Invoice data structure | Non-negotiable |
| **Data Residency** | All data in India (AWS Mumbai region) | Required by law for financial data |
| **Personal Data Protection** | GDPR-like (even though not EU)** | Best practice |

---

## 26. Business Model & Pricing

### Pricing Strategy

**Freemium Model:**

| Tier | Price | Projects/Month | Invoices/Month | AI Features | Support |
|------|-------|----------------|----------------|-------------|---------|
| **Free** | ₹0 | 3 | 10 | Basic analysis | Community |
| **Pro** | ₹499/mo | Unlimited | Unlimited | Advanced AI + scope drift detection | Email |
| **Pro Annual** | ₹4,499/yr | Unlimited | Unlimited | Advanced AI + scope drift detection | Email |

**Why this pricing?**
- Low barrier to entry (free tier)
- ₹499/month is affordable for freelancers earning ₹5-8L/year (0.6-1% of revenue)
- Annual discount incentivizes commitment
- Simple, non-negotiable pricing

### Revenue Model

- 90% SaaS subscription
- 10% transaction fees on payments (future)
- No enterprise tiers (Year 1)
- No API pricing (Year 1)

### Unit Economics

| Metric | Target |
|--------|--------|
| CAC (Customer Acquisition Cost) | ₹0 (organic) |
| LTV (Lifetime Value) | ₹15,000+ (3-4 year lifetime) |
| LTV:CAC Ratio | Infinite (organic) |
| Payback Period | N/A |
| Gross Margin | 80%+ |

---

## 27. Development Philosophy

### Code Organization

**By Domain, Not by Type**

Bad (organized by type):
```
/api/routes
/api/services
/api/repositories
/api/schemas
```

Good (organized by domain):
```
/api/domains/projects/routes.ts
/api/domains/projects/service.ts
/api/domains/projects/repository.ts
/api/domains/invoices/routes.ts
/api/domains/invoices/service.ts
```

### Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| **Files** | kebab-case | `scope-analysis.ts` |
| **Folders** | kebab-case | `scope-analysis/` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_PROJECT_TITLE_LENGTH` |
| **Types** | PascalCase | `CreateProjectDTO` |
| **Functions** | camelCase | `calculateProjectBudget()` |
| **Classes** | PascalCase | `ProjectService` |
| **React Components** | PascalCase | `ProjectCard.tsx` |
| **Hooks** | camelCase with `use` prefix | `useProjectList()` |

### Commit Message Format

We follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Examples:
- `feat(scope-analysis): add AI-suggested milestones`
- `fix(invoicing): correct GST calculation for 5% slabs`
- `docs(api): update authentication endpoints`

---

## 28. Testing Philosophy

### Testing Pyramid

```
           / \
          /   \ E2E (Critical user flows)
         /     \
        /-------\
       /         \ Integration (API contracts)
      /           \
     /-------------\
    /               \ Unit (Business logic)
   /                 \
```

**Distribution:**
- 60-70% unit tests (fast, focused)
- 20-30% integration tests (realistic)
- 5-10% E2E tests (critical paths only)

### What to Test

| Layer | What | Why | Example |
|-------|------|-----|---------|
| **Unit** | Business logic | Catches bugs early | Scope analysis algorithm |
| **Integration** | API contracts | Ensures services communicate | Project → Invoice creation |
| **E2E** | User workflows | Validates end-to-end flow | Create project → Generate invoice |
| **Visual** | Component appearance | Prevents regressions | Button styles, colors, spacing |

### What NOT to Test

- ❌ Implementation details (refactoring breaks tests)
- ❌ React internals (React tests do this)
- ❌ Third-party library behavior (trust the library)
- ❌ UI interactions that don't matter to users
- ❌ Mock-heavy tests (they don't validate real behavior)

---

## 29. Deployment Strategy

### Development Workflow

1. **Feature Branch** - Create branch from `main`
2. **Local Development** - Code, test, verify locally
3. **Pre-commit Checks** - Formatting, linting, type checking
4. **Pull Request** - Push to GitHub, create PR
5. **Automated Checks** - CI runs tests, coverage, type checks
6. **Code Review** - Team reviews code, suggests changes
7. **Merge** - Squash and merge to `main`
8. **Deploy** - Automatic deployment to staging, then production

### Staging Deployment

- Every merge to `main` → Deploy to staging
- Run full test suite in staging
- Smoke tests validate critical paths
- Team reviews staging changes

### Production Deployment

- Manual trigger (not automatic)
- Deploy to production
- Monitor error rates, performance
- Rollback available within 5 minutes

### Rollback Strategy

- Deployments are atomic (all or nothing)
- Automatic rollback if error rate spikes > 5%
- Manual rollback available via dashboard
- Database migrations are reversible

---

## 30. AI Agent Instructions

When you (an AI agent) work on this project, follow these instructions:

### Before You Start

1. **Read this entire context file**
2. **Understand the problem statement and product philosophy**
3. **Check the relevant domain documentation in `/docs`**
4. **Look for existing patterns in the codebase**

### When Making Decisions

1. **Default to established patterns** in the codebase
2. **Ask for clarification** if the requirement is ambiguous
3. **Consider trade-offs** explicitly (speed vs. correctness, etc.)
4. **Document non-obvious decisions** in code comments
5. **Flag any conflicts** with stated principles

### Code Quality Standards

- ✅ All code is typed (TypeScript)
- ✅ All functions have clear purpose and parameters documented
- ✅ All API inputs validated with Zod
- ✅ All async operations have error handling
- ✅ All business logic has unit tests
- ✅ All new components have stories in Storybook

### When You Get Stuck

1. **Re-read the relevant sections** of this document
2. **Check the `/docs` folder** for detailed specifications
3. **Look at similar features** in the codebase (learning from precedent)
4. **Ask the human** for clarification if needed
5. **Create a TODO** if the decision requires human input

### Communication Standards

- Be precise about what you changed and why
- Explain trade-offs if you deviated from patterns
- Flag any ambiguities or missing information
- Provide context for non-obvious decisions
- Link to relevant documentation or code examples

---

## 31. Documentation Philosophy

All documentation serves this principle:

**Documentation exists to reduce cognitive load, not add noise.**

### What Gets Documented

| Document Type | When | Why |
|---------------|------|-----|
| **README** | Setup and first run | Help new developers get started |
| **API Docs** | After endpoints defined | Contract between frontend/backend |
| **Architecture** | When patterns emerge | Help teammates understand design |
| **Decisions** | When non-obvious | Prevent repeated discussions |
| **Runbooks** | For operational tasks | Reduce incident response time |
| **Code Comments** | For WHY, not WHAT | Explain business logic |

### What Does NOT Get Documented

- ❌ Self-evident code (comments on obvious logic)
- ❌ Change logs (git history is the source of truth)
- ❌ Outdated docs (prefer deleting over leaving stale docs)
- ❌ Generic best practices (link to external resources instead)

---

## 32. Quality Gate Summary

Every change goes through these gates (not overlapping, cumulative):

```
Commit → Pre-commit → PR → Automated Tests → Code Review → Staging → Production
```

| Gate | Tools | Purpose |
|------|-------|---------|
| **Pre-commit** | Biome, TypeScript | Catch formatting and type errors |
| **PR** | Automated checks | Run full test suite, coverage |
| **Review** | CodeRabbit, humans | Check for logic issues, standards |
| **Staging** | Manual testing, smoke tests | Validate real environment |
| **Production** | Monitoring, error tracking | Catch production issues |

---

## 33. Open Questions & TODOs

### Questions Requiring Human Input

**Question 1: International Expansion**
- When should we expand beyond India?
- Should we build for GST-equivalent systems (EU VAT, US tax)?
- Timeline: Year 2, Year 3, or never?

**Question 2: Team Collaboration**
- Should we support freelancers hiring subcontractors?
- Should agencies be able to manage multiple freelancers?
- Timeline and feature scope?

**Question 3: Payment Processing**
- Should we handle payment collection (Razorpay integration)?
- Revenue share model?
- Timing: MVP or Phase 2?

**Question 4: Mobile Application**
- Web-responsive first (current plan) or native mobile app?
- When: MVP or future?

### TODOs for Engineering Team

- [ ] Set up GitHub repository with branch protection rules
- [ ] Configure CI/CD pipeline (GitHub Actions)
- [ ] Set up Sentry for error tracking
- [ ] Set up analytics (Vercel Analytics, PostHog)
- [ ] Create Storybook setup and component library
- [ ] Design database schema (Drizzle migrations)
- [ ] Set up development environment documentation
- [ ] Create security policy (responsible disclosure)
- [ ] Set up monitoring and alerting
- [ ] Create incident response runbook

---

## 34. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 2, 2026 | Initial context document created |

---

## 35. How to Use This Document

### For New Developers

1. Read sections 1-6 (understand the big picture)
2. Read sections 7-10 (understand engineering philosophy)
3. Read section 20 (understand tech stack)
4. Read section 27 (understand development practices)
5. Bookmark and reference as needed

### For Product Decisions

1. Start with sections 4-6 (product philosophy)
2. Reference section 15-17 (product features and goals)
3. Check section 25 (constraints)
4. Use section 24 (decision-making framework)

### For Architecture Decisions

1. Start with sections 7-8 (philosophy)
2. Reference section 20-23 (technical architecture)
3. Use section 24 (decision-making framework)
4. Create ADR if it's a significant decision

### For AI Agents

1. Read everything (this is onboarding)
2. Reference sections 2, 30 (AI-specific instructions)
3. Bookmark section 24 (decision-making framework)
4. Use TODOs (section 33) to escalate unclear decisions

---

## 36. Epilogue: Why This Document Exists

This document exists because:

1. **Coherence** - Every decision should align with stated philosophy
2. **Consistency** - Similar problems get similar solutions
3. **Velocity** - New team members and AI agents can be productive immediately
4. **Quality** - Shared standards lead to better code
5. **Confidence** - Decisions can be made without constant discussion

It is a living document. Update it as:
- New patterns emerge
- Decisions are made
- Philosophy evolves
- Questions get answered

But make updates intentional and document the reasoning.

---

**End of Document**

For questions or clarifications, escalate to the engineering lead or create an issue in the project repository.