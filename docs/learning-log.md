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

---

### 2026-11-21: Slice 3 · Intelligent features and service-dependency impact

- **What was built:** four "intelligent" features.
  1. **Duplicate detection** when an incident is reported.
  2. **Technician recommendations** for an incident.
  3. **SLA risk prediction**: warnings before a breach.
  4. **Service-dependency impact analysis**, which can raise an incident's priority.
- **Why:**
  - Duplicates waste technician time.
  - Admins need a reasoned suggestion of who should fix an incident.
  - A breach alarm comes too late, so we also need a warning before it.
  - An outage of a core service like Network hurts every service built on it, so its
    priority should reflect that.
- **Domain changes (each one approved):**
  - `Incident`:
    - `responseAtRisk` / `resolutionAtRisk` flags, `RISK_THRESHOLD = 0.75` and
      `checkSlaRisk(now)`, which mirrors `checkSla`.
    - `recordSystemEvent(action, description)`: an audit-only SYSTEM record, used for
      PRIORITY_RAISED and SERVICE_IMPACT.
  - `PriorityCalculator`: a default service-aware `calculate(impact, urgency, ITService)`,
    so a decorator can see which service failed.
  - `ITService`: `removeDependency` and `dependsOn`.
- **Files:**
  - `service/intelligence/` (pure Java, no Spring):
    - `DuplicateDetector`, `TokenSimilarityDuplicateDetector`, `IncidentText`,
      `DuplicateMatch`: duplicate detection.
    - `TechnicianScorer`, `TechnicianScore`: recommendation scoring.
    - `SlaRiskAssessor`, `SlaRisk`, `RiskLevel`: SLA risk levels.
    - `ServiceImpactAnalyzer`, `ImpactedService`: the dependency graph search.
    - `DependencyAwarePriorityCalculator`: the decorator.
  - `config/IntelligenceConfig`: registers those classes as beans, and makes the decorator
    the `@Primary` `PriorityCalculator`.
  - `service/`:
    - `DuplicateService`, `RecommendationService`, `ServiceCatalogService` are new.
    - `IncidentService` changes: the report flow, `atRisk` and `impact`.
    - `SlaService` changes: `checkAll` now also runs the risk check.
    - `SlaScheduler` logs both counts.
  - `service/notification/`: admins are notified of at-risk, PRIORITY_RAISED and
    SERVICE_IMPACT events. The technician also gets at-risk events. The reporter gets none
    of these internal warnings.
  - `controller/`:
    - `ServiceController` is new (`/api/services`).
    - `IncidentController` gains `duplicates/check`, `at-risk`, `{id}/recommendations` and
      `{id}/impact`.
  - `config/SecurityConfig`: the role rules for the new URLs.
  - `config/DataSeeder`: `seedServiceGraph()` on every start (find-or-create, never deletes).
  - `dto/`:
    - New: `DuplicateCheckRequest`, `DuplicateCandidateResponse`,
      `TechnicianRecommendationResponse`, `ServiceResponse`, `ServiceRef`,
      `ImpactResponse`, `CreateServiceRequest`.
    - Changed: `IncidentResponse` gains risk fields and `possibleDuplicates`;
      `SlaCheckResponse` gains `risksRecorded`.
  - `repository/`: new finders and counters, and `UserRepository.findAdministrators()`
    (JPQL `type(u) = Administrator`).
- **Key concepts:**
  - **Jaccard similarity:** treat each text as a *set* of words. Similarity = shared words /
    all distinct words = |A ∩ B| / |A ∪ B|, from 0 (nothing shared) to 1 (same words).
    - First we lowercase, turn punctuation into spaces and drop *stop words* ("the", "is",
      "in"), because those words appear everywhere and would make unrelated texts look
      alike.
    - Score = 0.6 · J(title) + 0.4 · J(description), plus 0.15 for the same category and
      0.15 for the same service, capped at 1.0. The title gets more weight because it is
      short and focused, while descriptions ramble.
    - Only open incidents from the last 7 days are compared, with a threshold of 0.5 and the
      top 3 kept.
    - Reporting never blocks: duplicates are a hint. Employees see only the id, title and
      status of a match (`@JsonInclude(NON_NULL)` drops the null score and reasons), so no
      one else's details leak.
  - **Weighted scoring (technician recommendations):** each factor earns points, and the
    points add up to 100.
    - **Skill, 40:** has the category skill. The biggest weight, because without the skill
      the person probably can't fix it.
    - **Spare capacity, 25:** 25 × free slots / max workload, and 0 if `canTakeMoreWork()`
      is false. It spreads work and avoids queues.
    - **Experience, 20:** 20 × min(resolved in category, 5) / 5. Capped at 5 so a veteran
      doesn't win on history alone.
    - **Available, 15:** the technician is marked available.
    - Ranking puts available technicians first, so an unavailable one is never recommended
      first, even with a high score. Each factor adds a human-readable reason, so the admin
      can see *why*.
  - **Leading vs lagging indicators:**
    - A breach is a *lagging* indicator: it tells you after the fact.
    - "At risk" (≥ 75% of a running clock's window used) is a *leading* indicator: it warns
      while there is still time to act.
    - `checkSlaRisk` sets each flag once (idempotent: running it again changes nothing) and
      adds an audit record. The Observer publisher then notifies the technician and the
      admins.
    - `riskLevel` (NONE / LOW < 50% / MEDIUM 50–75% / HIGH ≥ 75% / BREACHED) is computed
      when each response is built, from the most urgent running clock.
    - `/api/incidents/at-risk` lists HIGH, BREACHED and flagged incidents.
  - **BFS and cycle safety:**
    - "A depends on B" means an outage of B impacts A, so we follow the edges backwards.
    - Breadth-first search uses a queue, so it visits all services 1 hop away, then 2 hops,
      and so on. The hop count is the distance.
    - A *visited set* stops the search from revisiting a service. Without it, the seeded
      cycle DNS → Monitoring → Network → DNS would loop forever.
    - The set and the reverse graph are keyed by **service id**, not by Java object. Two
      objects loaded in different persistence contexts can be the same database row, and a
      unit test checks exactly that case.
  - **Decorator vs Strategy:**
    - *Strategy* swaps one algorithm for another behind an interface:
      `WeightedPriorityCalculator` is one priority strategy.
    - *Decorator* wraps an object of the same interface and adds behaviour around it,
      without changing it. `DependencyAwarePriorityCalculator` asks the inner calculator,
      then raises the result one level (never above P1) if 3 or more services are impacted.
    - `IncidentService` still only knows "a `PriorityCalculator`". `@Primary` tells Spring to
      inject the decorator, because two beans now implement the interface.
    - The service compares the base and the decorated priority and audits PRIORITY_RAISED
      with the reason.
  - **Adding columns to a table with rows:** with `ddl-auto=update`, Hibernate adds the new
    columns to the existing table. A plain `boolean not null` column can't be added when
    rows already exist, so the new columns use `columnDefinition = "boolean default false"`,
    which fills the existing rows.
- **How it was tested:**
  - `./mvnw test`: 65 tests pass.
    - Unit tests for:
      - the detector: tokens, Jaccard, weights, cap, filters, top 3;
      - the scorer: each factor, and an unavailable technician ranked last;
      - risk levels at their boundaries, and `checkSlaRisk` idempotency;
      - the BFS: distances, the cycle, and a same-id copy of the outage service;
      - the decorator: 3 vs 2 impacted, P1 cap, P4 → P3, the int version unchanged.
    - `IntelligenceIntegrationTest` (6 tests) covers the role rules and behaviour of every
      new endpoint.
  - curl against the running app:
    - The service graph is seeded next to the existing services.
    - A Network outage impacts 7 services: SSO@1, Monitoring@1, Email@2, LMS@2, ERP@2,
      DNS@2, Payroll@3.
    - A Network incident was raised from P3 to P2 with audit records.
    - The duplicate check scored 0.82 for the admin, and the employee saw only
      id/title/status.
    - Recommendations came back with reasons.
    - An admin SLA check at 80% of the response window recorded 1 risk, then 0 on the
      second run. The incident then appears in `/at-risk`.
    - Notifications reached the technician and the admin, and not the employee.
    - Dependency add, duplicate add (400), remove and self-dependency (400) work, and
      employees get 403.

---

### 2026-11-21: Slice 4 · Live updates (SSE) and the backend test suite

- **What was built:**
  - `GET /api/stream` pushes live `incident` and `notification` events to the browser.
  - Three small read endpoints: unread count, categories and technicians.
  - The test suite grew from 65 to 230 tests, and JaCoCo now measures coverage (84.9% of lines).
  - One approved domain fix: adding a note in the wrong state now throws
    `InvalidStateTransitionException`, like every other refused action.
- **Why:** the React frontend should update by itself when an incident changes, instead of the user
  reloading. The forms need the category and technician lists. The tests show that the State,
  Strategy and Observer code really behaves as the design says.
- **Files:**
  - `service/live/LiveUpdateRegistry.java`: keeps the open connections, one emitter per browser tab,
    and sends to them; heartbeat every 25 s.
  - `service/notification/LiveUpdateListener.java`: the third Observer. It decides who should hear
    about an event and sends after the commit.
  - `controller/LiveUpdateController.java`: `GET /api/stream` returns an `SseEmitter`.
  - `config/SecurityConfig.java`: lets ASYNC dispatches through (explained below); `/api/technicians`
    is admin only.
  - `repository/NotificationRepository.java`, `service/NotificationService.java`,
    `controller/NotificationController.java`: the unread count.
  - `service/ReferenceDataService.java`, `controller/ReferenceDataController.java`,
    `dto/CategoryResponse`, `dto/TechnicianResponse`: the two lists.
  - `dto/IncidentUpdateEvent`, `dto/UnreadCountResponse`: the event payloads.
  - `domain/IncidentState.java`: the default `addNote` now calls `refuse(getStatus())`.
  - `pom.xml`: the JaCoCo plugin.
  - Tests:
    - unit: `IncidentStateTransitionTest`, `WeightedPriorityCalculatorTest`, `AssignmentStrategyTest`,
      `IncidentSlaTest`, `NotificationRulesTest`, `LiveUpdateRegistryTest`;
    - integration: `SearchIntegrationTest`, `ReportSummaryIntegrationTest`, `LiveUpdateIntegrationTest`,
      `IncidentConflictIntegrationTest`;
    - helper: `ApiTestClient`.
- **Key concepts:**
  - **Polling vs SSE vs WebSocket:**
    - Polling means the browser asks "anything new?" every few seconds. It is simple, but wasteful
      and always a little late.
    - Server-Sent Events (SSE) is one long HTTP response that the server keeps writing small text
      events into (`event:incident` / `data:{...}`). It goes one way only, server to browser. It is
      plain HTTP, so our JWT security and CORS work unchanged.
    - A WebSocket is a two-way connection with its own protocol. We don't need two-way messages:
      the browser already sends its actions as normal REST calls. So SSE is the simplest tool that
      fits.
    - The frontend uses a fetch-based SSE client so it can send the `Authorization` header. A token
      in the URL would end up in server logs.
  - **`SseEmitter`:**
    - A Spring MVC object returned from a controller. Spring keeps the response open, and every
      `emitter.send(...)` writes one event.
    - After 30 minutes it times out and the client reconnects. That clears out connections that
      silently died.
    - The `:heartbeat` comment line is ignored by clients. It keeps proxies from closing an idle
      connection, and a failed heartbeat tells us a tab is gone.
  - **Sending only after commit:**
    - Listeners run inside the service's `@Transactional` method, before the data is committed.
    - If we pushed right away, the browser could refetch the incident while the change is still
      uncommitted and get the old data. If the transaction then rolled back, we would have
      announced a change that never happened.
    - So the listener builds the payload now but registers a `TransactionSynchronization`. Its
      `afterCommit()` runs only once the commit succeeded, and that is where the events are sent.
    - The unread count is read in `afterCommit` with `propagation = REQUIRES_NEW`, because the old
      transaction is finished and must not be joined.
  - **The ASYNC dispatch fix:**
    - When a streaming response ends (timeout or the client leaves), the servlet container sends the
      request through the filters once more, as an "ASYNC dispatch".
    - Our API is STATELESS: the login comes only from the JWT on the original request and is not
      stored anywhere. So on that second pass Spring Security sees an anonymous user, and access is
      denied.
    - `.dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()` lets that internal re-dispatch
      through. It is safe because the original request was already authenticated and authorised.
  - **Thread-safe collections:**
    - Request threads, the heartbeat scheduler thread and the threads that commit transactions all
      use the registry at the same time.
    - `ConcurrentHashMap` allows safe parallel reads and writes. `computeIfAbsent` and
      `computeIfPresent` make "create the list if missing" and "remove the key when the list is
      empty" atomic, so two threads cannot interleave halfway.
    - `CopyOnWriteArrayList` copies the list on every add or remove. Sending can therefore loop over
      it while another thread removes a dead tab, with no `ConcurrentModificationException`. This
      suits us because sends are frequent and connects and disconnects are rare.
  - **Domain fix (approved):**
    - The default `IncidentState.addNote` used to throw `IllegalStateException`. Every other refused
      action throws `InvalidStateTransitionException`.
    - `GlobalExceptionHandler` happens to map both to 409. But one exception type for "not allowed
      in this state" is clearer, and the state test can expect it for every illegal case.
    - A note does not change the status, so the refused target is the current status. The message
      is therefore "Cannot move incident from CLOSED to CLOSED".
  - **Parameterized tests:**
    - `@ParameterizedTest` runs one test method many times with different inputs, supplied by
      `@CsvSource`, `@ValueSource` or a `@MethodSource` method.
    - The State pattern test is a table of 8 statuses × 10 actions = 80 cases, built from one list of
      the 13 legal moves. Every other pair must throw and leave the status and audit trail unchanged.
      A new state or action shows up as a failing case immediately.
  - **Test pyramid:**
    - Many fast unit tests at the bottom: plain Java, no Spring, milliseconds each. These cover the
      domain rules, the strategies, the calculators and the registry.
    - Fewer, slower integration tests on top: `@SpringBootTest` + MockMvc against the real
      `itsm_test` database. These check what only the whole stack can show: JPA queries, LIKE
      escaping, security rules and the SSE wiring.
    - The integration tests share one database and two technicians with a workload of 3. So they
      search with a unique marker word, use APPLICATION incidents (never auto-assigned), and resolve
      any assigned incident they create.
  - **Coverage (JaCoCo):**
    - A Java agent records which lines ran during the tests. `./mvnw verify` writes the report to
      `target/site/jacoco/index.html`.
    - The total is 84.9% of lines. Domain strategies are at 97%, live updates at 97% and
      notifications at 94%.
    - Coverage shows what was *run*, not what was *checked*. A line can run in a test that asserts
      nothing, so it is a guide to gaps and not a grade.
- **How it was tested:**
  - `./mvnw verify`: 230 tests pass and BUILD SUCCESS, with the JaCoCo report generated.
  - curl against the app on port 8081:
    - `curl -N` on `/api/stream` as admin and as employee received `event:connected`.
    - After the employee reported INC-0010, both streams received `event:incident` for CREATED and
      CLASSIFIED (`status CLASSIFIED, priority P3, riskLevel LOW`). The employee's stream also
      received `event:notification {"unreadCount":23}`.
    - Each stream received a `:heartbeat`. There was no access-denied error in the log when the
      streams closed.
    - `/api/notifications/unread-count` returned 200, `/api/categories` returned 200 sorted by name,
      `/api/technicians` returned 200 for the admin and 403 for the employee, and `/api/stream`
      without a token returned 401.
