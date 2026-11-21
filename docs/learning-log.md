# Learning Log

This log records how I-ITSM was built, one slice at a time. Each entry explains
what was added and why, so I can understand and explain every part of the code
for the CS F213 OOP course.

A new entry is appended at the end of every slice, in the same commit as the code.

## Entry template

### YYYY-MM-DD: <slice name>
- **What was built:** the feature or fix, in one or two sentences.
- **Why:** the problem it solves, or the requirement it meets.
- **Files:** the files that were added or changed, with one line each on their role.
- **Key concepts:** new Spring / JPA / React / OOP ideas used, explained in plain words.
- **How it was tested:** the curl commands or tests that were run, and what they showed.

---

### 2026-11-20: Slice 1 · Fix search, add report summary

- **What was built:** fixed the search endpoint `GET /api/incidents/search` and added
  `GET /api/reports/summary`. The report gives incident counts, SLA compliance, mean time
  to acknowledge (MTTA) and mean time to resolve (MTTR), and technician workload.
- **Why:** search was broken. Filtering by a user ID gave 400 and an unknown sort field
  gave 500. The project brief requires reporting on SLAs and workload.
- **Files:**
  - `dto/IncidentSearchCriteria.java`: `technicianId` and `reporterId` are now `String`,
    matching `User.id`.
  - `repository/IncidentSpecifications.java`: the text filter escapes `\`, `%` and `_`.
  - `service/IncidentService.java`: `search` rejects sort fields outside the allowed set.
  - `service/ReportCalculator.java`: pure-Java compliance and MTTA/MTTR maths.
  - `repository/IncidentRepository.java`: a date-range finder and three JPQL `GROUP BY`
    count queries.
  - `dto/CountRow`, `SlaSummary`, `TechnicianWorkload`, `ReportSummary`: the response shapes.
  - `service/ReportService.java`: builds the summary.
  - `controller/ReportController.java`: the thin HTTP layer.
  - `domain/Incident.java`: a package-private `overrideTimestampsForTest` hook.
  - `test/.../domain/IncidentTestData.java` and `test/.../service/ReportCalculatorTest.java`.
- **Key concepts:**
  - **Specification pattern:** each search filter is a small object, a
    `Specification<Incident>`, that knows how to add one condition to a query. We collect
    only the filters the user actually sent and combine them with `Specification.allOf`
    (AND). Adding a new filter means adding one more small piece; the query code itself
    doesn't change. This is the Open/Closed principle.
  - **Compliance denominator rule:** an incident counts toward SLA compliance only when its
    result is *decided*. That means it has a deadline (`responseDueAt`) and it was either
    acknowledged or flagged as breached. Incidents with no SLA, or still inside their time
    window, are left out. Otherwise a fresh incident would count as a failure (or a
    success) before anyone could know. Met means acknowledged at or before the deadline,
    judged by the timestamps rather than only the flag. Compliance = 100 × met / decided,
    and it is `null` (not 0 or 100) when nothing is decided. Resolution uses the same rule
    with `resolutionDueAt` and `resolvedAt`.
  - **LIKE escaping:** in SQL `LIKE`, `%` means "anything" and `_` means "any one
    character". We put a `\` in front of them in the user's text and tell the database that
    `\` is the escape character, so `50%` finds the literal text "50%".
  - **Sort whitelist:** Spring builds `Pageable` from `?sort=...`. An unknown property
    used to crash the query, giving 500. We now check the property against an allowed list
    and throw `IllegalArgumentException`, which `GlobalExceptionHandler` turns into a 400
    ProblemDetail (a standard JSON error format). Priority and status are stored as text,
    so they sort alphabetically (P1 before P2; statuses A–Z, not in lifecycle order).
  - **JPQL constructor expression + GROUP BY:** `select new com.itsm.dto.CountRow(...)`
    makes the database do the counting and builds a record for each group. `cast(... as
    String)` turns the enum into its name. `coalesce(..., 'UNCLASSIFIED')` replaces a null
    priority with a label.
  - **`@Transactional(readOnly = true)`:** all report queries run in one read-only
    transaction. Hibernate can skip checking the loaded objects for changes. The incidents
    are loaded once and reused for the totals, SLA figures and workload.
  - **Utility class:** `ReportCalculator` is `final` with a private constructor and only
    static methods. It has no Spring and no database, so it can be unit tested with plain
    JUnit.
  - **Package-private test hook:** the lifecycle always uses `LocalDateTime.now()`, so tests
    could not create a "late" acknowledgement. One package-private method lets a test helper
    in the same package (`com.itsm.domain`, under `src/test`) set chosen times. Services and
    controllers live in other packages and cannot call it.
- **How it was tested:**
  - `./mvnw test`: 13 tests, all passing (12 calculator tests + `contextLoads`).
  - Ran the app and curl-tested search. Each filter works, upper/lower case text matches,
    `50%` is matched literally, `sort=foo` gives 400, from > to gives 400, paging works, and
    a filter with no matches gives 200 with empty content.
  - Report: the sum of byStatus equals `totalIncidents` (5 = 5), from > to gives 400, and
    an empty range gives `null` compliance with every technician listed at 0.

### 2026-11-21: Slice 2 · Authentication and authorization

- **What was built:**
  - Login with email and password (`POST /api/auth/login`) returns a JWT that lasts 8 hours.
  - `GET /api/auth/me` returns the logged-in user.
  - Every other endpoint needs the token and checks the caller's role and ownership.
  - Request bodies no longer carry "who am I" ids. The server takes the caller from the token.
- **Why:** before this, anyone could call anything and claim to be anyone, for example by
  sending `"technicianId":"U-TEC-1"` in the body. Now identity comes from a signed token the
  client cannot forge.
- **Files:**
  - `config/JwtConfig.java`: builds the signing key from `JWT_SECRET` (startup fails if it is
    missing or under 32 bytes), plus the JWT encoder and decoder.
  - `config/SecurityConfig.java`: stateless sessions, the role rules (request matchers), the
    401/403 handlers, BCrypt and CORS.
  - `config/OpenApiConfig.java`: the Swagger "Authorize" button.
  - `service/AuthService.java` and `controller/AuthController.java`: login and `me`.
  - `dto/LoginRequest`, `LoginResponse`, `UserResponse`, `AssignRequest`: new.
  - Request DTOs without actor ids: `CreateIncidentRequest` (plus an admin-only
    `onBehalfOfEmployeeId`), `AddNoteRequest`, `ResolveRequest`, `ReopenRequest` and
    `ReassignRequest`. `VerifyRequest`, `CloseRequest` and `TechnicianActionRequest` were
    removed.
  - `IncidentService` and `NotificationService` take `actorId` from the token and check
    ownership:
    - An employee only sees their own incidents.
    - Only the reporter or an admin can close.
    - Users can only read their own notifications.
  - `IncidentController` and `NotificationController`: `@AuthenticationPrincipal Jwt`.
  - `GlobalExceptionHandler`: 401 and 403 as ProblemDetail.
  - `DataSeeder`: BCrypt demo passwords, plus a backfill for old placeholder hashes.
  - Domain:
    - `User`: `changePasswordHash` and `getPasswordHash` added; the misleading
      `checkPassword` removed.
    - `Incident`, `IncidentState`, `NewState`, `ClassifiedState`: `classify` and `assignTo`
      accept the acting user, so a manual classify or assign is audited as the admin. The
      automatic path still records SYSTEM.
  - Tests: `src/test/resources/application-test.properties` (the `itsm_test` database, a fake
    key) and `controller/AuthAndAccessIntegrationTest.java`.
- **Key concepts:**
  - **Authentication vs authorization:** authentication answers "who are you?" (login checks
    the password, and the token proves it later). Authorization answers "are you allowed to
    do this?" (role rules plus ownership checks).
  - **401 vs 403:**
    - 401 Unauthorized means "I don't know who you are": no token, a broken or expired
      token, or a wrong password.
    - 403 Forbidden means "I know who you are, but you may not do this": the wrong role, or
      not your incident.
  - **JWT (JSON Web Token):** three Base64 parts, `header.payload.signature`.
    - The payload holds claims: `sub` (user id), `name`, `role`, `exp` (expiry).
    - The server signs the token with HS256 (HMAC-SHA256) using the secret key.
    - On every request it recomputes the signature. If anyone changed a claim (say, role to
      ADMIN), the signature no longer matches and the request gets a 401.
    - The payload is only encoded, not encrypted: anyone can read it, but nobody can change it
      without the key. So never put secrets in it.
  - **BCrypt:** a slow, salted, one-way password hash.
    - "One-way": we can't turn the hash back into the password. Login hashes the typed
      password and compares the results (`passwordEncoder.matches`).
    - "Salted": two users with the same password get different hashes.
    - "Slow": guessing millions of passwords takes far longer.
    - That's why `equals()` on hashes (the old `checkPassword`) is wrong: each hash includes a
      random salt.
    - Login gives the same message for an unknown email and a wrong password. It also runs a
      dummy BCrypt check for unknown emails, so attackers can't tell which emails exist.
  - **Stateless sessions:** the server keeps no login memory (no session, no cookie). Every
    request brings its token, and the server verifies it from scratch. This scales easily and
    suits a React client. The trade-off is that a token stays valid until it expires (8 h).
    CSRF protection is turned off because it guards cookie sessions, which we don't use.
  - **Request matchers vs `@PreAuthorize`:** the URL → role rules are request matchers in one
    table in `SecurityConfig`, so the whole access policy is readable in one place. Rules that
    need data (is this the reporter? the assigned technician?) can't be decided from the URL,
    so they live in the services and the domain, and throw `UnauthorizedActionException` →
    403.
  - **`@AuthenticationPrincipal Jwt jwt`:** Spring hands the controller the already-verified
    token. `jwt.getSubject()` is the caller's id.
  - **CORS (Cross-Origin Resource Sharing):** browsers block a page on one origin
    (`localhost:5173`, the Vite dev server) from calling another (`localhost:8080`) unless the
    server allows it. Before the real call the browser sends an `OPTIONS` "preflight" request,
    and we answer "yes" only for `http://localhost:5173` with the `Authorization` and
    `Content-Type` headers. CORS is a browser rule. It is not security against curl or other
    servers.
  - **Fail fast:** if `JWT_SECRET` is missing or too short, the app refuses to start with a
    clear message, instead of starting with a weak or empty key.
  - **Delegating security errors to `@RestControllerAdvice`:** security filters run before the
    controllers, so `GlobalExceptionHandler` would not normally see their errors. The entry
    point and access-denied handler pass them to `HandlerExceptionResolver`, so 401/403 use the
    same ProblemDetail JSON as every other error.
- **How it was tested:**
  - `./mvnw test`: 22 tests pass.
    - 9 MockMvc integration tests against `itsm_test`: login ok/fail (same 401 text), no token
      → 401, bad token → 401, employee on reports → 403, employee can't see another employee's
      incident (403, and search is forced to their own), an unassigned technician can't
      resolve (403), manual assign is audited as "Ravi Admin", and the full report →
      acknowledge → start → resolve → verify → close path with the right logins.
    - 12 calculator tests and `contextLoads`.
  - Startup fails fast with an empty and with a 9-byte `JWT_SECRET`.
  - curl against the running app:
    - Login for all four users; `me`; 401 with no token and with a garbage token.
    - Per role, one allowed and one forbidden call.
    - Notification ownership, the CORS preflight (5173 allowed, another origin 403), and the
      Swagger security scheme.
