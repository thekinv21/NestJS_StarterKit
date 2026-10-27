# nestjs-starterkit-forge

[![npm version](https://img.shields.io/npm/v/nestjs-starterkit-forge.svg)](https://www.npmjs.com/package/nestjs-starterkit-forge)
[![license](https://img.shields.io/npm/l/nestjs-starterkit-forge.svg)](https://github.com/thekinv21/NestJS_StarterKit/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/nestjs-starterkit-forge.svg)](https://nodejs.org)

Scaffold a production-minded **NestJS 11** API in one command. Validation, response format,
error handling, rate limiting, logging, Swagger and a layered architecture are already
decided, wired and enforced, so your first commit is about your business feature.

```bash
bunx nestjs-starterkit-forge my-api
cd my-api
cp .env.example .env
bun run start:dev
```

API on `http://localhost:4200/api`, Swagger UI on `http://localhost:4200/docs`.

---

## Contents

- [Why](#why)
- [What you get](#what-you-get)
- [Usage](#usage)
- [Project structure](#project-structure)
- [Example: a feature](#example-a-feature)
- [Response and error format](#response-and-error-format)
- [Pagination](#pagination)
- [Rate limiting](#rate-limiting)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [FAQ](#faq)

## Why

`nest new` gives you a controller and a service. Every real API then needs the same dozen
decisions: how input is validated, how responses and errors look, how internal fields are
kept out of responses, where business logic lives, how the Swagger document stays correct.
This starter makes those decisions once, wires them globally, and enforces the structure
with lint rules, so every feature looks the same and reviews are about logic, not layout.

## What you get

| Area                  | What is in place                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| **Architecture**      | 5 layers (`app`, `presentation`, `use-case`, `infrastructure`, `shared`); import rules enforced by ESLint |
| **Validation**        | Zod 4 via `nestjs-zod` for body, query and params; field-level 400 errors                                 |
| **Serialization**     | Response DTOs strip every field not in the schema (no leaked `passwordHash`)                              |
| **Response envelope** | `{ success, statusCode, timestamp, data, meta? }` on every success                                        |
| **Errors**            | One JSON shape for validation, business (`AppError`), 404, 413, 429 and 500 errors                        |
| **Business errors**   | `AppError` with a transport-agnostic `kind` (`NOT_FOUND`, `CONFLICT`, …) mapped to HTTP in one place      |
| **OpenAPI**           | Generated from Zod; `@ApiEnvelopeResponse` documents the real envelope                                    |
| **Pagination**        | `PaginationQueryDto` + `PageDto` → `data[]` and a `meta` block                                            |
| **Rate limiting**     | `@nestjs/throttler` per IP; `@RateLimit(5, 60)` and `@SkipRateLimit()` decorators                         |
| **Config**            | Env validated with Zod at startup, typed `AppConfigService`                                               |
| **Security**          | `helmet`, Swagger hidden in production, 5xx messages never exposed                                        |
| **Logging**           | One access log line per request, including guard rejections and unknown routes                            |
| **Tooling**           | Bun, Prettier with import sorting, ESLint, Husky hooks, commit message format, `bun test`                 |
| **Docs**              | `docs/` (architecture, API, security, full example) and `CLAUDE.md` for AI coding agents                  |

## Usage

```bash
bunx nestjs-starterkit-forge <project-directory> [--skip-install]
# or
npx nestjs-starterkit-forge <project-directory> [--skip-install]
```

The CLI:

1. copies the starter into `<project-directory>` (must be new or empty),
2. sets `package.json` `name` to the directory name,
3. runs `git init` (needed by the Husky hooks),
4. runs `bun install` — skip it with `--skip-install`.

**Requirements:** [Bun](https://bun.sh) and Node.js 20+.

## Project structure

```
src/
├── main.ts                bootstrap: helmet, /api prefix, versioning, Swagger
├── app/                   composition root: AppModule + one module per feature
├── presentation/          controllers, request/response DTOs (Zod)
├── use-case/              business logic, ports (interfaces), models
├── infrastructure/        config, database, external services (implement ports)
└── shared/
    ├── decorator/         @ApiEnvelopeResponse, @RateLimit, @SkipRateLimit
    ├── dto/               PageDto, PaginationQueryDto
    ├── error/             AppError + your business errors
    ├── filter/            GlobalExceptionFilter
    ├── interceptor/       response envelope, Zod serializer
    ├── middleware/        HTTP access log
    ├── pipe/              Zod validation pipe
    └── type/              response and error types
```

Allowed imports — anything else fails `bun run lint`:

```
app ──────────► presentation, use-case, infrastructure, shared
presentation ─► use-case, shared
infrastructure► use-case (ports & models), shared
use-case ─────► shared
```

## Example: a feature

A trimmed `user` feature. The full, tested version (list endpoint, in-memory adapter,
barrel files, a use-case test) ships in every generated project as **`docs/EXAMPLE.md`**.

**Port** — what the business logic needs, not how it is stored:

```ts
// src/use-case/user/port/UserRepositoryPort.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}
```

**Use-case** — one class, one `execute()`, throws business errors, knows nothing about HTTP:

```ts
// src/use-case/user/GetUserUseCase.ts
@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async execute(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundError(`User ${id} not found`);
    return user;
  }
}

// src/shared/error/UserNotFoundError.ts
export class UserNotFoundError extends AppError {
  readonly kind = 'NOT_FOUND'; // → HTTP 404
}
```

**DTOs** — Zod validates input; the response schema decides what leaves the server:

```ts
// src/presentation/dto/user/request/CreateUserRequestDto.ts
export const CreateUserRequestSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(8).max(128),
});
export class CreateUserRequestDto extends createZodDto(
  CreateUserRequestSchema,
) {}

// src/presentation/dto/user/response/UserResponseDto.ts
const isoDate = z.codec(z.iso.datetime(), z.date(), {
  decode: (iso) => new Date(iso),
  encode: (date) => date.toISOString(),
});

export const UserResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  createdAt: isoDate, // no passwordHash → never sent
});
export class UserResponseDto extends createZodDto(UserResponseSchema, {
  codec: true,
}) {}
```

**Controller** — thin: validated input in, one use-case, plain data out:

```ts
// src/presentation/controller/user/UserController.ts
@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly getUser: GetUserUseCase,
  ) {}

  @Post()
  @RateLimit(5, 60)
  @ApiEnvelopeResponse(UserResponseDto, { status: HttpStatus.CREATED })
  create(@Body() body: CreateUserRequestDto) {
    return this.createUser.execute(body);
  }

  @Get(':id')
  @ApiEnvelopeResponse(UserResponseDto)
  get(@Param() { id }: GetUserRequestDto) {
    return this.getUser.execute(id);
  }
}
```

**Module** — binds the port to an adapter; swap `InMemoryUserRepository` for a Prisma one
without touching anything above:

```ts
// src/app/user/UserModule.ts
@Module({
  controllers: [UserController],
  providers: [
    CreateUserUseCase,
    GetUserUseCase,
    { provide: USER_REPOSITORY, useClass: InMemoryUserRepository },
  ],
})
export class UserModule {}
```

## Response and error format

Real responses from the example:

```http
POST /api/users
{"email":"ada@example.com","name":"Ada Lovelace","password":"s3cret-pass"}
```

```json
{
  "success": true,
  "statusCode": 201,
  "timestamp": "2026-10-27T19:15:00.306Z",
  "data": {
    "id": "3ef0f28b-3275-45cc-af24-5bf6c0c6762d",
    "email": "ada@example.com",
    "name": "Ada Lovelace",
    "createdAt": "2026-10-27T19:15:00.305Z"
  }
}
```

```http
POST /api/users
{"email":"nope","name":"A","password":"123"}
```

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": [
    { "property": "email", "message": "Invalid email address" },
    {
      "property": "name",
      "message": "Too small: expected string to have >=2 characters"
    },
    {
      "property": "password",
      "message": "Too small: expected string to have >=8 characters"
    }
  ],
  "path": "/api/users",
  "timestamp": "2026-10-27T19:15:00.329Z"
}
```

| Status  | Source                                                   |
| ------- | -------------------------------------------------------- |
| 400     | Zod validation (body, query, params) or malformed JSON   |
| 401/403 | `AppError` kind `UNAUTHORIZED` / `FORBIDDEN`, or a guard |
| 404     | `AppError` kind `NOT_FOUND`, or unknown route            |
| 409     | `AppError` kind `CONFLICT`                               |
| 413     | Body larger than 100 KB                                  |
| 422     | `AppError` kind `UNPROCESSABLE`                          |
| 429     | Rate limit exceeded (with `Retry-After`)                 |
| 500     | Anything else — generic message, details only in the log |

## Pagination

```ts
@Get()
@ApiEnvelopeResponse(UserResponseDto, { paginated: true })
async list(@Query() query: PaginationQueryDto) { // ?offset=0&limit=10 (max 100)
  const [users, total] = await this.listUsers.execute(query.offset, query.limit);
  return PageDto.of(users, total, query);
}
```

```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-10-27T19:15:00.356Z",
  "data": [
    {
      "id": "3ef0f28b-3275-45cc-af24-5bf6c0c6762d",
      "email": "ada@example.com",
      "name": "Ada Lovelace",
      "createdAt": "2026-10-27T19:15:00.305Z"
    }
  ],
  "meta": {
    "total": 1,
    "count": 1,
    "offset": 0,
    "limit": 10,
    "currentPage": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

Add filters by extending the schema:
`PaginationQuerySchema.extend({ searchTerm: z.string().optional() })`.

## Rate limiting

Global: `THROTTLE_LIMIT` requests per `THROTTLE_TTL_SECONDS` per IP (default 100 / 60 s).
Over the limit: HTTP 429 with a `Retry-After` header.

```ts
@RateLimit(5, 60) // this route: 5 per minute
@Post('login')
login() {}

@SkipRateLimit() // this route: no limit
@Get('health')
health() {}
```

## Configuration

Validated with Zod at startup — the app refuses to boot on invalid values.

| Variable               | Default       |
| ---------------------- | ------------- |
| `NODE_ENV`             | `development` |
| `PORT`                 | `4200`        |
| `THROTTLE_TTL_SECONDS` | `60`          |
| `THROTTLE_LIMIT`       | `100`         |

Add your own in `src/infrastructure/config/EnvSchema.ts` and read them with
`config.get('MY_VAR')` — fully typed.

## Scripts

| Command              | Does                                   |
| -------------------- | -------------------------------------- |
| `bun run start:dev`  | Run with file watching                 |
| `bun run build`      | Compile to `dist/`                     |
| `bun run start:prod` | Run the compiled app                   |
| `bun run lint`       | ESLint, including the layer rules      |
| `bun run format`     | Prettier with automatic import sorting |
| `bun run test`       | `bun test`                             |

Git hooks: `pre-commit` runs format, lint and build; `commit-msg` enforces
`type:[branch][developer]: description`.

## FAQ

**Is there a database?**
No ORM is preinstalled, so you pick one. Put it in `src/infrastructure/database/` and
implement your use-case ports there; see `docs/EXAMPLE.md`.

**Is there authentication?**
Not yet. Add a JWT guard in `src/shared/guard/` and register it with `APP_GUARD`.
`docs/SECURITY.md` lists this and the other items to finish before production.

**My app crashes with `Date cannot be represented in JSON Schema`.**
A response DTO uses `z.date()`. Use the `isoDate` codec shown above and
`createZodDto(schema, { codec: true })`.

**Can I use npm or pnpm instead of Bun?**
Installing works, but the Git hooks and the `test` script call `bun`. Bun is the supported setup.

**Running behind nginx or a load balancer?**
Set `app.set('trust proxy', 1)` in `main.ts`; otherwise all clients share the proxy's IP for
rate limiting. With several instances, use a Redis storage for the throttler.

**Does my project get updates from this package?**
No. The CLI copies the files once; the result is your code.

## License

[MIT](https://github.com/thekinv21/NestJS_StarterKit/blob/master/LICENSE)
