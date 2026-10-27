# Development

## Requirements

- [Bun](https://bun.sh) (package manager and test runner)
- Node.js 22+ (the built app runs on Node: `node dist/main`)

## Setup

```bash
bun install
cp .env.example .env    # adjust values; see ARCHITECTURE.md → Configuration
bun run start:dev       # watch mode on http://localhost:4200
```

Swagger UI: http://localhost:4200/docs (not available when `NODE_ENV=production`).

## Scripts

| Command               | Does                                                   |
| --------------------- | ------------------------------------------------------ |
| `bun run start:dev`   | Run with file watching.                                |
| `bun run start:debug` | Same, with the Node inspector.                         |
| `bun run build`       | Compile to `dist/` (spec files are excluded).          |
| `bun run start:prod`  | Run the compiled app.                                  |
| `bun run format`      | Prettier, including automatic import sorting.          |
| `bun run lint`        | ESLint with auto-fix; includes layer and barrel rules. |
| `bun run test`        | `bun test`: runs every `*.spec.ts` / `*.test.js`.      |

## Code conventions

The full rules are in [ARCHITECTURE.md](ARCHITECTURE.md) and [`CLAUDE.md`](../CLAUDE.md).
The ones people trip over most:

- Files are PascalCase and named after their export (`CreateUserUseCase.ts`).
- Add every new file to its folder's `index.ts`; import other folders via `@/folder`.
- Do not hand-sort imports; `bun run format` does it.
- Do not use `nest g`; create files by hand in the right layer.

## Testing

- Runner: `bun test` with the `bun:test` API (`describe`, `it`, `expect`, `spyOn`).
- Unit tests sit next to the file they test: `CreateUserUseCase.spec.ts`.
- Use-cases are tested with fake port implementations, not a real database.
- The global pipeline (validation, serialization, envelope, errors, logging) is best tested
  end-to-end: create the app from a test module that imports `AppModule` plus a small test
  controller, call `app.listen(0)`, and send real requests with `fetch`.

> `src/` has no spec files yet. Add a pipeline test before the first feature, then add
> `bun run test` to `.husky/pre-commit`.

## Git

- Commit message (checked by the `commit-msg` hook):
  `type:[branchName][developerName]: description`,
  with `type` ∈ `feat | fix | chore | docs | ci | test | refactor`.
  Example: `feat:[master][Vadim Kiniabaev]: add user module`
- The `pre-commit` hook runs `format`, `lint` and `build`. Keep them green; do not bypass
  the hook with `--no-verify`.

## Publishing the `create-nestkit` CLI

The starter is distributed as a `create-*` package in [`create/`](../create). It holds no copy
of the starter in git: on `npm pack` / `npm publish`, its `prepack` script copies every
git-tracked file of this repo (except `create/`, `bun.lock` and `LICENSE`) into
`create/template/`.

```bash
bun test create/                      # CLI test: generates a project into a temp dir
cd create
npm version patch                     # or minor / major
npm pack --dry-run                    # check the file list
npm publish                           # needs `npm login`
```

Commit before publishing: the template is built from the working tree of tracked files,
so uncommitted edits would ship but untracked new files would not.
