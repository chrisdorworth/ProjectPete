# Changelog

## [0.1.0] — 2026-03-19

### Added
- **Batch 0 — Bootstrap**: Monorepo with Turborepo, Docker Compose (dev + prod), Prisma schema, CI/CD pipelines
- **Batch 1 — Domain Core**: 8 value objects, 50+ event types, 5 aggregates, 8 policies, 95 passing tests
- **Batch 2 — Event Store & Projections**: Append-only event store with optimistic concurrency, 9 projection handlers
- **Batch 3 — Infrastructure**: BullMQ queues (13 queues, 13 workers), command service (7 handlers), query service (12 routes), graph package (Neo4j sync), enrichment orchestrator (6 providers), ML serving (FastAPI + XGBoost)
- **Batch 4 — Intelligence**: Ensemble scorer (Claude + XGBoost), rapport extraction, 6 drafters (email, LinkedIn, voicemail, handwritten, SMS, campaign sequencer), meeting brief generator, 10 versioned prompt templates
- **Batch 5 — Tier 1 Crawlers**: Clerk-of-court (6 FL counties), SEC EDGAR, probate, Sunbiz, property appraiser, divorce
- **Batch 6-9 — Tier 2-4 Crawlers**: PACER, pension/salary, license boards, USPTO, news, commercial RE, auction, LinkedIn proxy, intent, social
- **Batch 10 — Outreach Integrations**: Postmark (email), Slybroadcast (voicemail), Bond.co (handwritten), LinkedIn API, Twilio (SMS), webhook handler
- **Batch 11 — CRM Sync**: Wealthbox, Redtail, Salesforce adapters with bidirectional sync
- **Batch 12 — Notifications**: Digest builder (daily/weekly HTML + text), push notifications (Expo)
- **Batch 13 — Dashboard**: Next.js 15 + Tailwind 4, KPI cards, lead management, signal feed, analytics, outreach management
- **Batch 14 — Mobile**: Expo SDK 52, tab navigation, lead list, signal feed, meeting prep
- **Batch 15 — Security**: Security headers middleware, CSRF protection, content type validation
- **Batch 16 — Monitoring**: Traefik config, Prometheus scrape + alert rules, Loki config
- **Batch 17 — ML Pipeline**: Channel optimization trainer, lookalike model trainer, A/B testing framework
