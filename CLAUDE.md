# Project Architecture and Rules

NestJS 11, Express adapter, TypeScript, Bun as package manager.
Validation: Zod 4 + `nestjs-zod`. API docs: `@nestjs/swagger`.

## Role

You are a senior NestJS developer. Apply NestJS-first patterns (modules,
providers, DI, guards, pipes, interceptors, filters), not generic Node.js
approaches.

## Architecture

The project uses a layered (Clean Architecture style) structure with exactly
five top-level layers under `src/`:

| Layer            | Responsibility                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `app`            | Composition root. NestJS feature modules that wire controllers, use-cases and adapters together. |
| `presentation`   | HTTP boundary: controllers, request/response DTOs (Zod), Swagger metadata.                       |
| `use-case`       | Business logic. One class per use-case, plus the ports (interfaces) and models it needs.         |
| `infrastructure` | Technical integrations (DB, cache, mail, S3, config). Implements use-case ports.                 |
| `shared`         | Framework-wide reusable code: guards, interceptors, filters, decorators, errors, utils, types.   |

Do not create any other top-level folder under `src/` (no `domain`,
`application`, `core`, `common`, `services`, `features`, `repositories`, etc.).
Sub-folders _inside_ a layer (e.g. `infrastructure/database/repository/`) are fine.

### Dependency rules

Imports may only point in these directions:

```
app ──────────► presentation, use-case, infrastructure, shared
presentation ─► use-case, shared
infrastructure► use-case (ports & models only), shared
use-case ─────► shared
shared ───────► (nothing from other layers)
```

Consequences:

- `use-case` never imports from `infrastructure` or `presentation`.
  It depends on **ports** (interfaces + injection tokens) that it defines itself;
  `infrastructure` implements them; `app` binds them (dependency inversion).
- `use-case` never imports request DTOs. It defines its own input/output types;
  controllers pass validated DTO data into them.
- `use-case` must not throw `HttpException` or use `@Req()/@Res()`/Express types.
  Throw errors from `src/shared/error/`; an exception filter maps them to HTTP.
- `use-case` may use `@Injectable()` and `@Inject()` from `@nestjs/common` — nothing else HTTP-related.
- `presentation` never talks to Prisma/SDKs directly — only through use-cases.

## Folder structure

```
src/
├── main.ts                                   # bootstrap only (helmet, swagger, listen)
├── app/
│   ├── AppModule.ts                          # root module, imports global infra + feature modules
│   └── <feature>/<Feature>Module.ts          # e.g. app/user/UserModule.ts
├── presentation/
│   ├── controller/<feature>/<Feature>Controller.ts
│   └── dto/<feature>/
│       ├── request/<Action><Resource>RequestDto.ts
│       └── response/<Resource>ResponseDto.ts
├── use-case/
│   └── <feature>/
│       ├── <Action><Resource>UseCase.ts      # e.g. CreateUserUseCase.ts
│       ├── port/<Resource>RepositoryPort.ts  # interface + injection token
│       └── model/<Resource>.ts               # plain business types (no ORM types)
├── infrastructure/
│   ├── config/                               # @Global — AppConfigModule, AppConfigService, EnvSchema (Zod)
│   ├── database/
│   │   ├── PrismaModule.ts
│   │   ├── PrismaService.ts
│   │   └── repository/Prisma<Resource>Repository.ts   # implements a use-case port
│   └── <integration>/<Integration>Module.ts + <Integration>Service.ts
└── shared/
    ├── constant/   decorator/   dto/     error/   filter/
    ├── guard/      interceptor/ middleware/ pipe/ type/ util/
```

Every feature uses a sub-folder named after the feature in each layer
(`user/`, `aws/`, ...). File and folder placement must match the tree above.

## Code standards

- Never instantiate injectables manually (`new PrismaClient()`, `new SomeService()`).
  Always use constructor injection.
- One use-case class = one business operation, one public `execute()` method.
- Every infrastructure integration gets its own module + service
  (e.g. `infrastructure/database/PrismaModule.ts` + `PrismaService.ts`).
- Mark an infrastructure module `@Global()` **only** if it is truly cross-cutting
  (config, database, logger). Import it once in `AppModule`. Other integrations
  (S3, mail, payment...) are imported explicitly by the feature modules that need them.
- Feature modules in `app/` bind ports to adapters:

```ts
// use-case/user/GetUserUseCase.ts
import type { UserRepositoryPort } from './port/UserRepositoryPort';

// use-case/user/port/UserRepositoryPort.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
}

// `import type` required (isolatedModules)
@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}
  async execute(id: string): Promise<User> {
    /* ... */
  }
}

// app/user/UserModule.ts
@Module({
  controllers: [UserController],
  providers: [
    GetUserUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
})
export class UserModule {}
```

- Controllers are thin: validate (via DTO), call one use-case, map the result to a response DTO.
- Do **not** use `nest g ...` schematics — they generate kebab-case files
  (`user.service.ts`) in the wrong folders. Create files manually following this document.

## Public API (barrel files)

- Every folder that holds source files (`shared/error/`, `infrastructure/config/`,
  `use-case/user/`, `presentation/dto/user/`, `app/`, ...) has an `index.ts` that
  re-exports what it offers to the rest of the app: `export * from './AppError';`.
- Every new file must be added to its folder's `index.ts` in the same change.
  Nested folders inside a feature (`port/`, `model/`, `request/`, `response/`) are
  re-exported from the feature's `index.ts`.
- Outside a folder, import only through its public API with the `@/` alias:
  `import { AppError } from '@/shared/error'` — never `'@/shared/error/AppError'`.
- Inside the same folder/feature, use relative imports to the file itself
  (`./AppConfigService`), never `./index` or the folder's own `@/` barrel (circular imports).
- Do not create layer-level barrels (`src/shared/index.ts`); they cause circular imports
  and pull unrelated code in.

## Import order

Imports are sorted automatically by `@trivago/prettier-plugin-sort-imports` on `bun run format`
(configured in `.prettierrc`). Groups, separated by a blank line:

1. `@nestjs/*`
2. other third-party packages
3. `@/` aliases (other layers / folders)
4. relative imports (`./`, `../`)

Do not hand-order imports against this; run the formatter.

## Naming

- Files: PascalCase, same name as the exported class (`UserController.ts`).
- Classes, interfaces, types: PascalCase. Methods/functions/variables: camelCase.
- Constants and injection tokens: UPPER_SNAKE_CASE.
- Folders: lowercase (kebab-case if multi-word).

| Kind               | Pattern                              | Example                      |
| ------------------ | ------------------------------------ | ---------------------------- |
| Module             | `<Feature>Module`                    | `UserModule`                 |
| Controller         | `<Feature>Controller`                | `UserController`             |
| Use-case           | `<Action><Resource>UseCase`          | `CreateUserUseCase`          |
| Port               | `<Resource><Role>Port`               | `UserRepositoryPort`         |
| Infra adapter      | `<Tech><Resource><Role>`             | `PrismaUserRepository`       |
| Infra service      | `<Integration>Service`               | `PrismaService`, `S3Service` |
| Request DTO        | `<Action><Resource>RequestDto`       | `CreateUserRequestDto`       |
| Response DTO       | `<Resource>ResponseDto`              | `UserResponseDto`            |
| Zod schema         | `<dtoName without Dto>Schema`        | `CreateUserRequestSchema`    |
| Guard / Decorator  | `<Name>Guard` / `<Name>Decorator`    | `JwtAuthGuard`               |
| Interceptor/Filter | `<Name>Interceptor` / `<Name>Filter` | `DomainExceptionFilter`      |
| Business error     | `<Reason>Error`                      | `UserNotFoundError`          |

## Validation (Zod / nestjs-zod)

- Zod is the only request validation library. Do not use `class-validator` /
  `class-transformer` / NestJS `ValidationPipe`.
- Validation runs through `GlobalValidationPipe` (`shared/pipe/`, a `createZodValidationPipe`)
  registered via `APP_PIPE`. Response serialization runs through `PageSerializerInterceptor`
  (`shared/interceptor/`, extends `ZodSerializerInterceptor` and understands `PageDto`)
  registered via `APP_INTERCEPTOR`.
- Every endpoint that accepts external input (body, query, params) has a Zod schema
  and a DTO created with `createZodDto(schema)` in `presentation/dto/<feature>/request/`.
- Response DTOs are also Zod-based and applied with `@ApiEnvelopeResponse(UserResponseDto)`
  (`shared/decorator/`) so internal fields never leak. It serializes like `@ZodSerializerDto`
  and documents the real `{ success, data }` envelope in Swagger — do not use
  `@ZodSerializerDto` / `@ZodResponse` directly. Paginated endpoints take `PaginationQueryDto`
  (extend `PaginationQuerySchema` for feature filters/sorting), return
  `PageDto.of(items, total, query)` and use `@ApiEnvelopeResponse(UserResponseDto, { paginated: true })`.
- Controllers return plain data; `ApiResponseInterceptor` wraps it, do not build the envelope by hand.
- Invalid input always returns HTTP 400 in the shared error format
  (handled by a filter in `shared/filter/`).
- Reuse schemas (e.g. `UpdateUserRequestSchema = CreateUserRequestSchema.partial()`)
  instead of duplicating rules. Common primitives (id, pagination) go in `shared/`.
- Zod checks shape/format only. Rules that need the DB (uniqueness, existence)
  live in use-cases.
- Environment variables are validated with `EnvSchema` at startup (`infrastructure/config/`);
  the app refuses to boot on invalid env. Add every new variable to `EnvSchema` and `.env.example`.
- Read config only through the injected `AppConfigService` (`config.get('PORT')`, fully typed),
  never `process.env` directly.

## OpenAPI / Swagger

- Zod schemas are the single source of truth; Swagger is generated from them.
- Call `cleanupOpenApiDoc(...)` from `nestjs-zod` on the generated document (`infrastructure/swagger/SwaggerConfig.ts`).
- Use Swagger decorators only for what Zod cannot express
  (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`, response status codes).
  Never repeat validation rules in `@ApiProperty`.

## Error handling

- Business errors extend `AppError` (`shared/error/AppError.ts`) and set a transport-agnostic
  `kind` (`NOT_FOUND`, `CONFLICT`, ...). Never use HTTP status codes in use-cases.

```ts
export class UserNotFoundError extends AppError {
  readonly kind = 'NOT_FOUND';
}
```

- `GlobalExceptionFilter` (`shared/filter/`, registered via `APP_FILTER`) maps `AppError`,
  validation errors, `HttpException` and unknown errors to one JSON shape
  (`TApiErrorResponse` in `shared/type/ApiResponseTypes.ts`):
  `{ success: false, statusCode, error, message, errors?, path, timestamp }`.
  `errors` is a list of `{ property?, message }` (validation errors, `AppError.details`).
  5xx errors are logged; their internals are never sent to the client.

## Response format

- Success (`TApiResponse`): `{ success: true, statusCode, timestamp, data }`.
- Paginated (`TApiPaginatedResponse`): `{ success: true, statusCode, timestamp, data: [], meta }`.
- `StreamableFile` responses are not wrapped.

## Global setup (already in place)

- `main.ts`: `helmet`, global prefix `/api`, URI versioning, shutdown hooks, `setupSwagger(app)`.
- Swagger setup lives in `infrastructure/swagger/SwaggerConfig.ts`; served at `/docs`
  **only when `NODE_ENV !== 'production'`**. Keep `main.ts` free of Swagger code.
- Rate limiting: `@nestjs/throttler`, `ThrottlerGuard` registered via `APP_GUARD`. Global limit from
  `THROTTLE_LIMIT` requests per `THROTTLE_TTL_SECONDS` per IP (in-memory, per process). Override per
  route/controller with `@RateLimit(limit, ttlSeconds)`, turn off with `@SkipRateLimit()`
  (`shared/decorator/`) — do not use `@Throttle` / `@SkipThrottle` directly.
- `AppModule`: imports `AppConfigModule`; applies `HttpLoggingMiddleware` to all routes
  (a middleware so guard rejections and 404s are logged); registers globally
  `GlobalValidationPipe` (`APP_PIPE`), `ApiResponseInterceptor` → `PageSerializerInterceptor`
  (`APP_INTERCEPTOR`, in this order — serialization must run before the envelope is built)
  and `GlobalExceptionFilter` (`APP_FILTER`).
- New feature modules are added to `AppModule.imports`.

## Enforcement

- Layer dependency rules are enforced by ESLint (`no-restricted-imports` in `eslint.config.mjs`).
  A lint error there means the design is wrong — introduce a port, don't disable the rule.
- Public API is enforced by ESLint: an `@/` import ending in a PascalCase file name
  (`@/shared/error/AppError`) is an error. Import from the folder instead.

## Testing

- Test runner: `bun test` (`bun:test` API, `bun run test` passes when there are no tests yet). Unit tests sit next to the file: `CreateUserUseCase.spec.ts`.
- Use-cases are tested with fake port implementations, not a real DB.

## Git

- Commit format (enforced by husky): `type:[branchName][developerName]: description`,
  type ∈ feat | fix | chore | docs | ci | test | refactor.
- Pre-commit runs format, lint and build — keep them green.

## Skills

Do not load any skill by default. Only invoke one when the task matches its trigger
**and** the skill is installed (skip silently if it isn't):

- `/architect` — before building something non-trivial with no plan yet
- `/review` — when a feature is done and needs a production check
- `/recover` — when something is broken and the fix isn't obvious
- `/remember` — `restore` at the start of a session, `save` at the end
