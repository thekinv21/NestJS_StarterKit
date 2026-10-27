# Security

What the starter protects against today, what it does not, and the rules for new code.

## In place

| Control                 | How                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Input validation        | Every body, query and params value goes through a Zod schema (`GlobalValidationPipe`). Unknown fields are stripped.       |
| Output filtering        | Responses are parsed by the response DTO schema; fields not in it (password hashes, internal ids) never leave the server. |
| No internal error leaks | 5xx responses carry a generic message. Stack traces and messages only go to the log.                                      |
| Security headers        | `helmet` with its defaults (CSP, HSTS, `X-Content-Type-Options`, frame protection, …).                                    |
| Rate limiting           | `ThrottlerGuard` per client IP, global and per route (`@RateLimit`).                                                      |
| Body size limit         | Express JSON parser limit (100 KB); larger bodies get 413.                                                                |
| Config validation       | The app refuses to boot with invalid or missing environment variables.                                                    |
| API docs hidden in prod | Swagger UI is only mounted when `NODE_ENV !== 'production'`.                                                              |
| Access log              | One line per request including 401/403/404/429, so scans and brute force are visible.                                     |

## Known gaps — fix before going to production

1. **No authentication or authorization.** Every route is public. Add a JWT guard
   (`shared/guard/`), register it globally via `APP_GUARD`, and mark public routes with a
   decorator instead of protecting routes one by one.
2. **Behind a reverse proxy, all clients share one IP.** Express sees the proxy's address, so
   rate limiting and logs treat every user as one client. Set `app.set('trust proxy', <n>)`
   in `main.ts` to the number of proxies in front of the app — only when there really is one,
   otherwise clients can spoof `X-Forwarded-For`.
3. **Rate-limit counters are per process.** With several instances, the effective limit is
   multiplied by the instance count. Use a shared storage (Redis) for `ThrottlerModule`.
4. **CORS is off.** Browsers on another origin cannot call the API. When needed, enable it
   with an explicit origin list from env — never `origin: '*'` together with credentials.
5. **No automated tests in the pre-commit hook.** A broken interceptor order would leak
   response fields without failing any check. See DEVELOPMENT.md.

## Rules for new code

- **Secrets** live in environment variables, validated in `EnvSchema`. Never commit `.env`;
  only `.env.example` with placeholder values.
- **Never log** passwords, tokens, full request bodies or personal data. The access log only
  writes method, URL, status and duration — keep it that way. Do not put secrets in URLs.
- **Every endpoint declares its response DTO** with `@ApiEnvelopeResponse`. Returning an
  entity without it sends every field the entity has.
- **Authorization lives in use-cases or guards**, never only in the frontend.
  Check ownership ("is this the user's order?") in the use-case, not just "is logged in".
- **Database access** goes through the ORM / parameterized queries. Never build SQL with
  string concatenation of user input.
- **Sensitive routes** (login, password reset, OTP, signup) get a strict `@RateLimit`.
- **Passwords** are hashed with a slow algorithm (argon2 or bcrypt), never stored or compared
  in plain text.
- **New dependencies**: check maintenance and known vulnerabilities (`bun audit` / `npm audit`)
  before adding them.

## Reporting a vulnerability

Do not open a public issue. Contact the repository maintainers directly with steps to
reproduce, and allow time for a fix before disclosure.
