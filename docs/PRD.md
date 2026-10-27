# Product Requirements: NestJS Starter

## Problem

Every new backend service repeats the same setup work: validation, error format, response
format, config, API docs, logging, rate limiting, lint rules, commit rules. Done by hand, each
service ends up slightly different, and the differences cost time in review, on-call and in
the frontend that consumes several services.

## Goal

A starter that a developer clones to begin a new HTTP API, with the cross-cutting parts
already decided, wired and enforced, so the first commit is about the business feature.

## Users

- **Backend developers** starting a new service or adding a feature to one built on this starter.
- **Frontend / client developers** consuming the API through its OpenAPI (Swagger) document.
- **AI coding agents** working in the repo, guided by `CLAUDE.md`.

## Requirements

### Must have (in place)

| #   | Requirement                                                                               | Where                                                |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| R1  | Layered structure with import rules enforced by lint, not by review.                      | `eslint.config.mjs`, ARCHITECTURE.md                 |
| R2  | All request input (body, query, params) validated with Zod; invalid input returns 400.    | `shared/pipe/GlobalValidationPipe.ts`                |
| R3  | Response bodies serialized through a Zod DTO so internal fields never leak.               | `shared/interceptor/PageSerializerInterceptor.ts`    |
| R4  | One success envelope and one error shape for every endpoint.                              | API.md                                               |
| R5  | Business errors are transport-agnostic (`AppError.kind`) and mapped to HTTP in one place. | `shared/error/`, `shared/filter/`                    |
| R6  | Environment validated at startup; the app does not boot on invalid config.                | `infrastructure/config/EnvSchema.ts`                 |
| R7  | OpenAPI document generated from the Zod schemas, matching the real response envelope.     | `shared/decorator/ApiEnvelopeResponse.ts`            |
| R8  | Offset pagination with a standard query and `meta` block.                                 | `shared/dto/`                                        |
| R9  | One access log line per request, including guard rejections and unknown routes.           | `shared/middleware/HttpLoggingMiddleware.ts`         |
| R10 | Rate limiting per IP, configurable globally and per route.                                | `@nestjs/throttler`, `shared/decorator/RateLimit.ts` |
| R11 | Security headers (helmet); Swagger UI disabled in production.                             | `main.ts`                                            |
| R12 | Format, lint and build run before every commit; commit messages follow one format.        | `.husky/`                                            |

### Should have (not yet)

- Authentication and authorization (JWT guard, roles). See SECURITY.md.
- Database integration (`infrastructure/database/`, Prisma) and a first example feature.
- CORS configuration via env, for browser clients on another origin.
- Health check endpoint for the load balancer / orchestrator.
- `trust proxy` setting via env, for deployments behind a reverse proxy.
- Tests for the global pipeline running in the pre-commit hook.

### Out of scope

- Any specific business domain. Features are added by the team that uses the starter.
- Frontend, GraphQL, WebSockets, microservice transports.
- Deployment manifests (Docker, Kubernetes, CI pipelines) — each team owns its own.

## Success criteria

- A developer can add a CRUD feature by following ARCHITECTURE.md without touching `shared/`.
- No endpoint returns a body outside the documented envelope or error shape.
- A layer rule violation fails `bun run lint`, and therefore the commit.
