# API Conventions

- Base path: `/api`. URI versioning is enabled (`/api/v1/...` when a controller sets a version).
- Content type: JSON.
- Interactive docs: `/docs` (Swagger UI), only when `NODE_ENV` is not `production`.

## Success responses

Controllers return plain data. `ApiResponseInterceptor` wraps it:

```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-10-27T11:45:15.170Z",
  "data": { "id": 1, "name": "Ada" }
}
```

`data` is `null` when the handler returns nothing. File downloads (`StreamableFile`) are sent
as-is, without the envelope.

Declare every response DTO with `@ApiEnvelopeResponse(Dto)`. It does two things:

1. Serializes the result through the DTO's Zod schema — fields not in the schema
   (e.g. `password`) are removed.
2. Documents the real envelope in OpenAPI, so generated clients get the right types.

Do not use `@ZodSerializerDto` or `@ZodResponse` directly; they document the bare DTO.

## Pagination

Offset based. Query DTO: `PaginationQueryDto` (`shared/dto/`).

| Query param | Type    | Default | Rules   |
| ----------- | ------- | ------- | ------- |
| `offset`    | integer | `0`     | ≥ 0     |
| `limit`     | integer | `10`    | 1 – 100 |

Features add filters and sorting by extending the schema:

```ts
const ListUsersRequestSchema = PaginationQuerySchema.extend({
  searchTerm: z.string().trim().max(100).optional(),
});
```

The handler returns `PageDto.of(items, total, query)` and is declared with
`@ApiEnvelopeResponse(UserResponseDto, { paginated: true })`:

```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "…",
  "data": [{ "id": 1, "name": "Ada" }],
  "meta": {
    "total": 42,
    "count": 10,
    "offset": 0,
    "limit": 10,
    "currentPage": 1,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Errors

Every error, from any source, has this shape:

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": [
    {
      "property": "name",
      "message": "Too small: expected string to have >=2 characters"
    }
  ],
  "path": "/api/users",
  "timestamp": "…"
}
```

- `error` is the standard HTTP reason phrase for `statusCode`.
- `errors` is present only when there are field-level details. `property` is the dot path of
  the field (`address.city`, `items.0.qty`) and is omitted for errors about the whole input.
- 5xx responses always say `"message": "Internal server error"`; details are only in the logs.

| Status    | When                                                                    |
| --------- | ----------------------------------------------------------------------- |
| 400       | Zod validation failed, or the JSON body is malformed.                   |
| 401 / 403 | `AppError` with kind `UNAUTHORIZED` / `FORBIDDEN`, or a guard rejected. |
| 404       | `AppError` kind `NOT_FOUND`, or the route does not exist.               |
| 409       | `AppError` kind `CONFLICT` (e.g. unique value already taken).           |
| 413       | Request body larger than the parser limit (100 KB by default).          |
| 422       | `AppError` kind `UNPROCESSABLE`.                                        |
| 429       | Rate limit exceeded. See below.                                         |
| 500       | Unhandled error, or a response that does not match its DTO schema.      |

## Rate limiting

- Global default: `THROTTLE_LIMIT` requests per `THROTTLE_TTL_SECONDS` per client IP
  (100 per 60 s unless configured).
- Per route or controller: `@RateLimit(limit, ttlSeconds)`; disable with `@SkipRateLimit()`.
- When exceeded: HTTP 429 in the error shape, with a `Retry-After` header (seconds).

```ts
@RateLimit(5, 60) // login: 5 attempts per minute per IP
@Post('login')
login() {}
```
