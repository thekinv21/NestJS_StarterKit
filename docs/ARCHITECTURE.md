# Architecture

NestJS 11 on Express, TypeScript, Bun as package manager and test runner.
Validation with Zod 4 + `nestjs-zod`; OpenAPI with `@nestjs/swagger`.

## Layers

`src/` has exactly five top-level folders. Nothing else goes at that level.

| Layer            | Holds                                                                                         | May import                                 |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `app`            | Composition root: `AppModule` and one `<Feature>Module` per feature.                          | everything                                 |
| `presentation`   | Controllers, request/response DTOs, Swagger metadata.                                         | `use-case`, `shared`                       |
| `use-case`       | Business logic: one class per operation, plus its ports and models.                           | `shared`                                   |
| `infrastructure` | DB, cache, mail, S3, config, Swagger setup. Implements use-case ports.                        | `use-case` (ports & models only), `shared` |
| `shared`         | Framework-wide code: pipe, interceptors, filter, middleware, decorators, errors, DTOs, types. | nothing from other layers                  |

```
            ┌──────────────┐
            │     app      │  wires everything, binds ports to adapters
            └──────┬───────┘
     ┌─────────────┼──────────────┐
     ▼             ▼              ▼
presentation ─► use-case ◄── infrastructure
     │             │              │
     └─────────────┴──────► shared ◄┘
```

These rules are enforced by `no-restricted-imports` in `eslint.config.mjs`. A lint error there
means the design is wrong: introduce a port instead of disabling the rule.

### Dependency inversion

`use-case` never imports `infrastructure`. It declares what it needs as a **port**
(an interface plus an injection token); `infrastructure` implements it; the feature module
in `app/` binds the two:

```ts
// use-case/user/port/UserRepositoryPort.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
}

// app/user/UserModule.ts
providers: [
  GetUserUseCase,
  { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
],
```

Use-cases therefore run in unit tests with a fake port, without a database.

## Request lifecycle

Every HTTP request passes these steps, all registered in `src/app/AppModule.ts`:

```
request
  │
  ├─ helmet                         security headers                     (main.ts)
  ├─ HttpLoggingMiddleware          starts timer, logs on 'finish'       (shared/middleware)
  ├─ ThrottlerGuard                 rate limit per IP → 429              (APP_GUARD)
  ├─ ApiResponseInterceptor         ┐ wraps result in { success, data }  (APP_INTERCEPTOR #1)
  ├─ PageSerializerInterceptor      │ Zod-serializes result / PageDto    (APP_INTERCEPTOR #2)
  ├─ GlobalValidationPipe           │ Zod-validates body/query/params    (APP_PIPE)
  ├─ controller → use-case          │
  │                                 ┘ on the way out: serialize first, then wrap
  └─ GlobalExceptionFilter          any thrown error → error shape       (APP_FILTER)
```

**Interceptor order matters.** The first registered interceptor wraps the next one, so its
response step runs last. `ApiResponseInterceptor` must be registered before
`PageSerializerInterceptor`; swapped, the serializer receives the envelope instead of the
data and the request fails with 500.

The logger is a middleware, not an interceptor, because interceptors run after guards:
requests rejected by a guard (401/403/429) and unknown routes (404) would never be logged.

## Error model

- Use-cases throw subclasses of `AppError` (`shared/error/`) with a transport-agnostic `kind`:
  `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE`,
  `TOO_MANY_REQUESTS`, `INTERNAL`. They never use HTTP status codes or `HttpException`.
- `GlobalExceptionFilter` is the only place that maps errors to HTTP. It handles `AppError`,
  `HttpException` (including validation and throttling), client errors raised by Express
  body parsing (e.g. 413), and anything else as 500.
- 5xx responses always carry a generic message; the real error is logged.

Wire format: [API.md](API.md#errors).

## Configuration

- `infrastructure/config/EnvSchema.ts` validates `process.env` with Zod at startup.
  Invalid config stops the boot with a readable list of problems.
- Code reads config only through the injected `AppConfigService` (`config.get('PORT')`,
  fully typed). Never `process.env`.
- Every new variable goes into `EnvSchema` and `.env.example` in the same change.

| Variable               | Default       | Used by                        |
| ---------------------- | ------------- | ------------------------------ |
| `NODE_ENV`             | `development` | Swagger on/off, `isProduction` |
| `PORT`                 | `4200`        | HTTP listener                  |
| `THROTTLE_TTL_SECONDS` | `60`          | global rate-limit window       |
| `THROTTLE_LIMIT`       | `100`         | requests per window per IP     |

## Module rules

- Never instantiate injectables by hand (`new PrismaClient()`); use constructor injection.
- Each infrastructure integration has its own `<Integration>Module` + `<Integration>Service`.
- `@Global()` only for truly cross-cutting modules (config, database, logger), imported once
  in `AppModule`. Others (S3, mail, payment) are imported by the feature modules that need them.
- Each folder with source files has an `index.ts` barrel. Outside a folder, import through it
  with the `@/` alias (`@/shared/error`), never a file path. Inside, use relative imports.
  Lint enforces this.

## Adding a feature (example: `user`)

1. `use-case/user/model/User.ts` — plain business type, no ORM types.
2. `use-case/user/port/UserRepositoryPort.ts` — interface + `USER_REPOSITORY` token.
3. `use-case/user/GetUserUseCase.ts` — one class, one `execute()`, throws `AppError` subclasses.
4. `infrastructure/database/repository/PrismaUserRepository.ts` — implements the port.
5. `presentation/dto/user/request/…RequestDto.ts` and `response/UserResponseDto.ts` — Zod DTOs.
6. `presentation/controller/user/UserController.ts` — validates via DTO, calls one use-case,
   declares the response with `@ApiEnvelopeResponse(UserResponseDto)`.
7. `app/user/UserModule.ts` — controller, use-cases, port binding; add it to `AppModule.imports`.
8. Add every new file to its folder's `index.ts`. Run `bun run format && bun run lint`.

Do not use `nest g` schematics: they generate kebab-case files in the wrong folders.
