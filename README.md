# NestJS StarterKit Forge

[![npm version](https://img.shields.io/npm/v/nestjs_starter_kit_forge.svg)](https://www.npmjs.com/package/nestjs_starter_kit_forge)

A NestJS 11 API starter where the cross-cutting parts are already decided, wired and
enforced, so your first commit can be about the business feature.

> This package is a **project template**, not a library. You don't `import` it — you copy it
> into a new folder and build your API on top of it.

## Features

- **Layered architecture** (`app`, `presentation`, `use-case`, `infrastructure`, `shared`) with
  import rules enforced by ESLint.
- **Zod everywhere**: request validation, response serialization (no leaked fields),
  environment validation at startup, and the OpenAPI document.
- **One response envelope and one error format** for every endpoint, including validation
  errors, business errors, 404s, 413s and 429s.
- **Pagination** helpers: `PaginationQueryDto` in, `PageDto` out, `meta` in the response.
- **Rate limiting** per IP with `@RateLimit()` / `@SkipRateLimit()`.
- **Request logging**, `helmet`, Swagger UI outside production.
- **Commit hooks**: format, lint and build before every commit; one commit message format.
- **AI-agent friendly**: `CLAUDE.md` holds all rules in a compact form for coding agents.

## Requirements

- [Bun](https://bun.sh) (package manager and test runner)
- Node.js 24+

## Create a project

### Option 1 — from GitHub (recommended)

Includes the git hooks (`.husky/`), `.gitignore` and `bun.lock`.

```bash
bunx degit thekinv21/NestJS_StarterKit my-api   # or: npx degit ...
cd my-api
git init
bun install
cp .env.example .env
bun run start:dev
```

### Option 2 — from npm

```bash
mkdir my-api && cd my-api
npm pack nestjs_starter_kit_forge
tar -xzf nestjs_starter_kit_forge-*.tgz --strip-components=1
rm nestjs_starter_kit_forge-*.tgz
git init
bun install
cp .env.example .env
bun run start:dev
```

npm does not ship `.gitignore` or the git hooks; copy them from the
[repository](https://github.com/thekinv21/NestJS_StarterKit) if you want them
(at minimum, ignore `node_modules/`, `dist/` and `.env`).

### Then

- Rename the package: change `name`, `version`, `description` and `author` in `package.json`.
- Open the API at http://localhost:4200/api and Swagger UI at http://localhost:4200/docs.

## Configuration

Environment variables are validated with Zod at startup — the app refuses to boot when they
are invalid.

| Variable               | Default       | Description                           |
| ---------------------- | ------------- | ------------------------------------- |
| `NODE_ENV`             | `development` | `production` disables Swagger UI      |
| `PORT`                 | `4200`        | HTTP port                             |
| `THROTTLE_TTL_SECONDS` | `60`          | Rate limit window                     |
| `THROTTLE_LIMIT`       | `100`         | Max requests per IP within the window |

Add new variables to `src/infrastructure/config/EnvSchema.ts` and `.env.example`, and read them
through the injected `AppConfigService` (`config.get('PORT')`, fully typed).

## Project structure

```
src/
├── main.ts            # bootstrap: helmet, /api prefix, versioning, Swagger
├── app/               # composition root: AppModule + one module per feature
├── presentation/      # controllers, request/response DTOs (Zod), Swagger metadata
├── use-case/          # business logic, ports (interfaces) and models
├── infrastructure/    # config, database, external services — implements the ports
└── shared/            # guards, pipes, interceptors, filters, decorators, errors, utils
```

Dependencies only point inwards: `presentation` and `infrastructure` depend on `use-case`;
`use-case` depends only on `shared`. ESLint fails the build if a file breaks this.

## Response format

Controllers return plain data; the envelope is added for you.

```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-10-28T11:45:15.170Z",
  "data": { "id": 1, "name": "Ada" }
}
```

Every error, from any source, has one shape:

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": [{ "property": "email", "message": "Invalid email address" }],
  "path": "/api/users",
  "timestamp": "2026-10-28T11:45:15.170Z"
}
```

## Adding a feature (short version)

1. **Use-case** — `src/use-case/user/CreateUserUseCase.ts` with one `execute()` method and a
   port `UserRepositoryPort` for data access. Throw errors that extend `AppError`
   (`kind = 'NOT_FOUND' | 'CONFLICT' | ...`), never `HttpException`.
2. **Infrastructure** — `PrismaUserRepository` (or any other adapter) implements the port.
3. **Presentation** — a Zod request DTO, a Zod response DTO and a thin `UserController`
   decorated with `@ApiEnvelopeResponse(UserResponseDto)`.
4. **App** — `UserModule` binds the port to the adapter and is added to `AppModule.imports`.

```ts
@Module({
  controllers: [UserController],
  providers: [
    CreateUserUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
})
export class UserModule {}
```

A complete, tested `user` feature across all layers is in
[docs/EXAMPLE.md](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/EXAMPLE.md).

## Scripts

| Command              | Does                         |
| -------------------- | ---------------------------- |
| `bun run start:dev`  | Run with file watching       |
| `bun run build`      | Compile to `dist/`           |
| `bun run start:prod` | Run the compiled app         |
| `bun run lint`       | ESLint (incl. layer rules)   |
| `bun run format`     | Prettier + import sorting    |
| `bun run test`       | Run all `*.spec.ts` with Bun |

## Documentation

| Document                                                                                           | Contents                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [ARCHITECTURE.md](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/ARCHITECTURE.md) | Layers, request lifecycle, adding a feature       |
| [API.md](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/API.md)                   | Response envelope, errors, pagination, rate limit |
| [SECURITY.md](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/SECURITY.md)         | What is protected, known gaps before production   |
| [EXAMPLE.md](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/EXAMPLE.md)           | A complete `user` feature across all layers       |
| [DEVELOPMENT.md](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/DEVELOPMENT.md)   | Scripts, testing, commit rules                    |
| [PRD.md](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/PRD.md)                   | Goals and scope                                   |
| [CLAUDE.md](https://github.com/thekinv21/NestJS_StarterKit/blob/master/CLAUDE.md)                  | The same rules, compact, for AI coding agents     |

The same files are also inside the package under `docs/`.
