# Project Meridian — Build Rules

## RULE-01: Monorepo with Turborepo
All code lives in `packages/*`. Turborepo orchestrates builds, tests, and linting.

## RULE-02: TypeScript 5.8 Strict
`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. Zero `any`.

## RULE-03: Argon2id for Passwords
bcrypt is BANNED. All password hashing uses argon2id with recommended parameters.

## RULE-04: Integer Cents for Money
All monetary values stored as `bigint` cents. The `Money` value object enforces this. No floats for money ever.

## RULE-05: Fastify 5 for HTTP
API Gateway uses Fastify 5.2+. Command service on :3000, Query service on :3001.

## RULE-06: CQRS Separation
Commands (writes) and Queries (reads) are completely separate services with separate codepaths.

## RULE-07: Append-Only Event Store
Events are immutable. Never update or delete events. Use compensating events for corrections.

## RULE-08: Optimistic Concurrency
Event store uses version-based optimistic concurrency control. ConcurrencyError on conflict.

## RULE-09: Idempotent Everything
All commands, jobs, and event handlers are idempotent. SHA256-based idempotency keys.

## RULE-10: Versioned Prompts
All Claude prompts live in `packages/intelligence/src/prompts/v{X.Y.Z}/`. Version tracked in events.

## RULE-11: Idempotent Jobs
All BullMQ workers check idempotency before processing. Safe to replay.

## RULE-12: GDPR/CCPA Ready
Crypto-shred support. Data export and purge commands. Retention policies with automatic flagging.

## RULE-13: Output is FILE BLOCKS ONLY
No prose in build output. Code files only.

## RULE-14: Domain Has Zero I/O
`packages/domain/` has ZERO runtime dependencies. Pure functions, value objects, policies only.

## RULE-15: Test Everything
Domain package: 95+ tests. All packages have test coverage.

## RULE-16: Domain Purity
Domain package imports nothing from other packages. Other packages import from domain.

## RULE-17: Event-Driven Projections
Read models are built from events via the projection engine. Never query the event store directly for reads.

## RULE-18: Circuit Breakers
All crawlers and external API calls use circuit breaker pattern. 5 failures → 5min open.

## RULE-19: Rate Limiting
All external APIs respect rate limits. BullMQ limiter config per queue.

## RULE-20: Neo4j for Relationships
Graph queries (warm paths, network proximity, shared affiliations) use Neo4j. Not SQL joins.
