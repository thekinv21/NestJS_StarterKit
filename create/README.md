# nestjs-starterkit-forge

Create a new NestJS 11 API with the cross-cutting parts already decided and wired:
layered (Clean Architecture style) structure enforced by ESLint, Zod validation, response
serialization, one success envelope and one error format, rate limiting, request logging,
Swagger generated from Zod, and commit hooks.

```bash
bunx nestjs-starterkit-forge my-api
# or: npx nestjs-starterkit-forge my-api

cd my-api
cp .env.example .env
bun run start:dev
```

The project uses [Bun](https://bun.sh) as package manager and test runner.

## Options

| Option           | Effect                                                       |
| ---------------- | ------------------------------------------------------------ |
| `--skip-install` | Copy the files and `git init`, but do not run `bun install`. |

## What you get

See the generated project's `docs/` folder (architecture, API conventions, security) and
`CLAUDE.md`, or browse them on [GitHub](https://github.com/thekinv21/NestJS_StarterKit).

## License

MIT
