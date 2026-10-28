# NestJS StarterKit Forge

[![npm version](https://img.shields.io/npm/v/nestjs_starter_kit_forge.svg)](https://www.npmjs.com/package/nestjs_starter_kit_forge)

A ready-to-use NestJS 11 API template. Validation, error handling, response format, rate
limiting and Swagger are already set up — you start with your business code.

![Logo](public/logo.png)

## Features

- Layered architecture, with import rules checked by ESLint
- Zod validation for requests, responses and environment variables
- One response format and one error format for every endpoint
- Pagination, rate limiting, request logging, `helmet`, Swagger UI
- Format, lint and build on every commit

## Getting started

Requires [Bun](https://bun.sh) and Node.js 24+.

```bash
bunx degit thekinv21/NestJS_StarterKit my-api
cd my-api
bun install
cp .env.example .env
bun run start:dev
```

- API: http://localhost:4200/api
- Swagger: http://localhost:4200/docs

## Swagger

- Swagger UI: `/docs`, OpenAPI JSON: `/docs-json`
- Generated from the Zod schemas — no `@ApiProperty` needed
- Documents the real response envelope (`{ success, data }`) for every endpoint
- Turned off when `NODE_ENV=production`

## Project structure

```
src/
├── app/              # modules
├── presentation/     # controllers and DTOs
├── use-case/         # business logic
├── infrastructure/   # database, config, external services
└── shared/           # guards, pipes, filters, errors, utils
```

## Documentation

- [Architecture](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/ARCHITECTURE.md)
- [API format](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/API.md)
- [Full example: user feature](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/EXAMPLE.md)
- [Development](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/DEVELOPMENT.md)
- [Security](https://github.com/thekinv21/NestJS_StarterKit/blob/master/docs/SECURITY.md)
