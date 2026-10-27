# NestJS StarterKit Forge

A NestJS 11 API starter where the cross-cutting parts are already decided, wired and
enforced, so the first commit can be about the business feature.

- **Layered architecture** (`app`, `presentation`, `use-case`, `infrastructure`, `shared`) with
  import rules enforced by ESLint.
- **Zod everywhere**: request validation, response serialization (no leaked fields),
  environment validation at startup, and the OpenAPI document.
- **One response envelope and one error format** for every endpoint, including validation,
  business errors, 404s, 413s and 429s.
- **Rate limiting** per IP with `@RateLimit()` / `@SkipRateLimit()`.
- **Request logging**, `helmet`, Swagger UI outside production.
- **Commit hooks**: format, lint and build before every commit; one commit message format.

## Create a project

```bash
bunx nestjs-starterkit-forge my-api   # or: npx nestjs-starterkit-forge my-api
cd my-api
cp .env.example .env
bun run start:dev
```

API: http://localhost:4200/api — Swagger UI: http://localhost:4200/docs

Requires [Bun](https://bun.sh) and Node.js 20+.

## Documentation

| Document                                     | Contents                                          |
| -------------------------------------------- | ------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, request lifecycle, adding a feature       |
| [docs/API.md](docs/API.md)                   | Response envelope, errors, pagination, rate limit |
| [docs/SECURITY.md](docs/SECURITY.md)         | What is protected, known gaps before production   |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)   | Scripts, testing, commit rules                    |
| [docs/PRD.md](docs/PRD.md)                   | Goals and scope                                   |
| [CLAUDE.md](CLAUDE.md)                       | The same rules, compact, for AI coding agents     |

## Scripts

| Command             | Does                         |
| ------------------- | ---------------------------- |
| `bun run start:dev` | Run with file watching       |
| `bun run build`     | Compile to `dist/`           |
| `bun run lint`      | ESLint (incl. layer rules)   |
| `bun run format`    | Prettier + import sorting    |
| `bun run test`      | Run all `*.spec.ts` with Bun |

## License

[MIT](LICENSE)
