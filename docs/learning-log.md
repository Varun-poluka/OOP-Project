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

---

### 2026-11-21: Slice 5 · Demo data, technician queue, notification fix, diagrams and docs
- **What was built:**
  - A `demo` Spring profile that loads 15 users and 39 realistic incidents spread over 30 days.
  - `GET /api/incidents/queue` (a technician's own work, most urgent first).
  - A fix for notifications that never stored their incident id.
  - A clearer message when an action is refused.
  - Five Mermaid diagrams, `docs/patterns.md` and a full README.
- **Why:** the video needs believable data from a clean start; the frontend needs the queue and
  clickable notifications; the report needs diagrams and a pattern overview.
- **Domain changes (each one approved):**
  - `Notification` constructor: it received `incidentId` but never assigned it, so every notification
    had `incidentId = null`. One line: `this.incidentId = incidentId;`.
  - `InvalidStateTransitionException`: a second constructor `(from, action)` gives
    "Cannot add a note while the incident is CLOSED". Before, a refused note said
    "from CLOSED to CLOSED", because a note has no target status. `getTo()` is null in that case.
- **Files:**
  - `config/DemoDataLoader.java`: the demo data (`@Profile("demo")`, `@Order(2)`).
  - `service/DemoDataStatus.java`: the "demo data ready" flag the SLA scheduler checks.
  - `service/SlaScheduler.java`: skips its run while the flag is false.
  - `config/DataSeeder.java`: `@Order(1)`; with the demo profile it skips its 4 sample users and
    incident (the SLA policies and service graph are still seeded, the demo needs them).
  - `resources/application-demo.properties`: SQL logging off for a readable console.
  - `IncidentRepository`, `IncidentService`, `IncidentController`, `SecurityConfig`: the queue.
    `atRisk()` and `queue()` share one comparator, `MOST_URGENT_FIRST`.
  - `scripts/reset-demo-db.sh`: drops and recreates `itsm` after asking for confirmation.
  - Tests: `NotificationTest`, `NotificationIntegrationTest`, `TechnicianQueueIntegrationTest`, two new
    cases in `IncidentStateTransitionTest`, updated message in `IncidentConflictIntegrationTest`.
  - `docs/diagrams/*.mmd` + `.svg` + `.png`, `docs/patterns.md`, `README.md`; the outdated
    `docs/er-diagram.png` was removed.
- **Key concepts:**
  - **Spring profile:** a named switch for configuration. `@Profile("demo")` creates the bean only
    when the profile is active, and `application-demo.properties` is read only then. Without the
    profile the app behaves exactly as before.
  - **`CommandLineRunner` and `@Order`:** Spring runs every `CommandLineRunner` once after startup.
    `@Order(1)` / `@Order(2)` make `DataSeeder` run before `DemoDataLoader`.
  - **Creating demo data through the real services:** every incident goes through
    `IncidentService.report`, `acknowledge`, `resolve`, etc. So the audit trail, workloads and
    notifications are exactly what the app produces. Two NEW incidents are the exception:
    `report()` always classifies, so they are built with the domain constructor, like `DataSeeder` does.
  - **Backdating with `JdbcTemplate`:** the domain stamps `LocalDateTime.now()`, so a 3-week-old story
    would otherwise happen in one second. `JdbcTemplate` runs plain SQL. A helper `at(time, step)`
    works like this:
    - Before the step, it notes the highest id in `audit_record`, `investigation_note` and `notification`.
    - It runs the step.
    - It sets the time of every row with a larger id to `time`.
    - After a report, `created_at` moves back, and the two SLA due times move by the same amount, so
      each window keeps its policy length.
    - The domain is not changed: "pretend this happened last week" belongs to demo data, not to an
      incident. The loader is deliberately not `@Transactional`, so each service call commits and
      the next call reloads the backdated values.
  - **Real SLA flags:** at the end the loader calls `slaService.checkAll(now)`, so the domain itself
    decides what is breached or at risk. Those audit rows and their notifications are then moved to
    the due time (breach) or the 75% point (at risk).
  - **Scheduler gate (race condition):**
    - `SlaScheduler` runs on its own thread at startup and every 60 s.
    - If it ran in the middle of a loader step, the SLA rows it adds would have an id above the
      step's "before" id. The loader would then backdate them to the wrong time.
    - `DemoDataStatus` holds an `AtomicBoolean`. It starts `false` with the demo profile (`true` without).
    - The loader sets it to `true` in a `finally` block, so even a failed load never blocks the
      scheduler for good. Until then the scheduler logs "SLA check skipped" and returns.
    - `AtomicBoolean` instead of `boolean`: one thread writes and another reads, and a plain field is
      not guaranteed to be seen by the other thread.
  - **Mermaid:** diagrams written as text (`.mmd`) and rendered to SVG/PNG with
    `npx @mermaid-js/mermaid-cli`. The text versions diff well in Git. Rendering needs a Chrome
    binary; the system Chrome was passed with `-p puppeteer.json` (`executablePath`).
- **How it was tested:**
  - `./mvnw verify`: 236 tests pass, BUILD SUCCESS. A first run stopped with a Surefire
    "dump files" error. It did not happen again on the immediate rerun, and the cause was not found.
  - Line coverage is now 74.7% (was 84.9%). `DemoDataLoader` (about 600 lines) is not run by any
    test; it was checked by running it instead.
  - Demo profile on port 8081 against the scratch database `itsm_demo_check`:
    `./mvnw spring-boot:run -Dspring-boot.run.profiles=demo -Dspring-boot.run.arguments="--server.port=8081 --spring.datasource.url=jdbc:postgresql://localhost:5432/itsm_demo_check"`.
    - Log: "SLA check skipped: demo data is still loading", then "DemoDataLoader: loaded 39 demo
      incidents". After that the scheduler ran normally.
    - `GET /api/incidents` (admin): 39 incidents, every status, created 2026-10-23 to today. 5 were
      BREACHED, 2 HIGH, 5 MEDIUM and 3 LOW risk.
    - INC-0028 audit trail: CREATED 13:26 → ACKNOWLEDGED 13:46 → … → REASSIGNED 15:26 →
      ACKNOWLEDGED 15:41. INC-0032 shows `PRIORITY_RAISED` P3 → P2 (Network has 11 dependents).
    - INC-0026: `SLA_RESPONSE_BREACHED` at its response due time 13:26, `SLA_RESOLUTION_BREACHED` at 20:26.
    - `GET /api/incidents/queue`: net.tech 200 (INC-0026 BREACHED first, then 88%, 51%, 21%);
      employee 403; admin 403.
    - `POST /api/incidents/INC-0003/notes` (CLOSED): 409 "Cannot add a note while the incident is CLOSED".
    - `GET /api/users/U-EMP-1/notifications`: 27 notifications, 0 with a null `incidentId`, 10 unread.
    - `POST /api/incidents/duplicates/check` with a Ram Bhawan Wi-Fi draft: found INC-0030.
    - Database: no audit row has a timestamp in the future.

---

### 2026-11-21: Slice 6 · Readable notifications, report backlog, coverage exclusion
- **What was built:**
  - Notification and email texts now come from `NotificationMessageFormatter`, for example
    "INC-0026 (Lab 3 PCs stuck): Response SLA breached: not acknowledged by 20 Nov, 1:26 PM".
  - `GET /api/reports/summary` gained `openIncidents` and `openByPriority`.
  - JaCoCo no longer counts `DemoDataLoader`.
- **Why:** raw codes and ISO times (`SLA_RESPONSE_BREACHED - Not Acknowledged by 2026-11-20T13:26:22`)
  were not readable for users; the admin dashboard needs the current backlog; coverage should
  measure code that tests are meant to cover.
- **Files:**
  - `service/notification/NotificationMessageFormatter.java` (new): pure static class, one sentence
    per action. "Assigned to you" only for the assigned technician, times as "21 Nov, 6:50 PM",
    impact lists capped at 3 names + "and N more", 500-character cut.
  - `NotificationRules`: `message()` removed (it now only decides who is notified).
  - `InAppNotificationListener`, `EmailNotificationListener`: call the formatter and say whether the
    recipient is the assigned technician.
  - `IncidentRepository.countOpenByPriority`, `ReportService`, `ReportSummary`: the backlog.
  - `pom.xml`: JaCoCo `<excludes>`.
  - Tests: `NotificationMessageFormatterTest` (13), a new case in `NotificationIntegrationTest` and
    `ReportSummaryIntegrationTest`; the two message tests left `NotificationRulesTest`.
- **Key concepts:**
  - **Data vs presentation:** audit records keep their codes and exact times, because they are data
    that reports and the frontend read. Only the text for people is formatted, at the edge where it
    is sent.
  - **Reading our own description text (option A, no domain change):** the due time and the service
    list exist only inside descriptions written by `Incident` and `IncidentService`. The formatter
    finds the time with a regular expression and splits the list after "may impact:". If a marker is
    missing, it shows the description unchanged instead of failing. Guard tests run real
    `Incident.checkSla` / `checkSlaRisk` output and a real report through the formatter, so rewording
    those texts breaks a test.
  - **`DateTimeFormatter` with `Locale.ENGLISH`:** the pattern `d MMM, h:mm a` gives "21 Nov, 6:50 PM"
    whatever language the server runs in.
  - **One grouped count query:** `group by i.priority` over all unfinished incidents returns one
    `CountRow` per priority (UNCLASSIFIED for NEW ones). `openIncidents` is the sum of all rows. The
    `EnumMap` is pre-filled with 0 for P1–P4, so every key is always present. NEW incidents count in
    the total but under no key, so the four values can add up to less.
  - **JaCoCo excludes:** class-file patterns; `DemoDataLoader*` also matches the inner class
    `DemoDataLoader$Story`. Coverage rose from 74.7% to 86.2% of lines.
- **How it was tested:**
  - `./mvnw verify`: 249 tests pass, BUILD SUCCESS.
  - On port 8081 against `itsm_demo_check`:
    - `GET /api/reports/summary?from=2000-01-01T00:00&to=2000-02-01T00:00` gave `totalIncidents 0`,
      `openIncidents 17`, `openByPriority {P1:1, P2:3, P3:9, P4:2}`. The default range gave
      `totalIncidents 39` and the same open figures. The 2 NEW incidents explain 17 vs 15.
    - A NETWORK report on Network (INC-0040):
      - Admin: "Priority raised from P3 to P2: …" and "Service impact: an outage of Network may
        affect SSO, Monitoring, Campus Wi-Fi and 8 more".
      - Kiran: "Assigned to you". Asha: "Assigned to Kiran Support" and "Classified as P2".
    - `POST /api/admin/sla/check`: the new notifications and `[EMAIL]` log lines read e.g. "Response
      SLA breached: not acknowledged by 21 Nov, 6:31 PM". Notifications created before this slice
      keep the old text until the demo data is reset.

---

### 2026-11-22: Slice 7 (backend) · Registration, reporter comments, info requests, feedback, admin users, categories, audit log

- **What was built:**
  - `POST /api/auth/register`: anyone can create an **employee** account (a duplicate email gives 409).
  - Login refuses a deactivated account with 401 "This account has been deactivated. Contact your
    administrator."
  - `POST /api/incidents/{id}/comments`: the reporter adds information to their own unfinished
    incident. It is stored with the notes but marked `fromReporter`, audited as `COMMENT_ADDED`, and
    sent to the technician.
  - `POST /api/incidents/{id}/info-request`: the assigned technician asks the reporter a question
    (`INFO_REQUESTED`, notifies the reporter). The reporter's next comment answers it
    (`INFO_PROVIDED`) and clears the request.
  - `PATCH /api/incidents/{id}/verify` takes an optional body `{rating 1-5, comment}`. It is stored
    on the incident and audited as `FEEDBACK_GIVEN`; the report summary gained `averageRating` and
    `ratingCount`.
  - Admin: `GET/POST /api/admin/users`, `PATCH /api/admin/users/{id}/deactivate|reactivate`,
    `PUT /api/admin/technicians/{id}` (skills, on leave, max workload), `POST /api/admin/categories`,
    `GET /api/admin/audit` (paged, filters, newest first).
  - `GET /api/technicians/me` for the technician's own workload.
- **Why:** these were the MVP use cases from the project statement that were still missing for each
  role (employee: register, add information, feedback; technician: ask for information, see own
  workload; admin: manage users, technicians and categories, read the audit log).
- **Files (domain changes, each needed by a feature):**
  - `User`: `active` flag, `deactivate()`, `reactivate()`. Users are never deleted, so their history
    stays linked.
  - `Technician`: `replaceSkills`, `changeMaxWorkload` (at least 1 and not below current work);
    `canTakeMoreWork()` is false for a deactivated technician.
  - `InvestigationNote`: author is now any `User`; `isFromReporter()` is true when the author is an
    `Employee`. The column already pointed at the shared `users` table, so the schema is the same.
  - `AuditRecord`: read-only `incidentId` (and `getId()`) for the audit log filter.
  - `Incident`: `addReporterComment`, `requestInfo`, `verify(employee, rating, comment)`, and the
    fields `pendingInfoRequest`, `infoRequestedAt`, `feedbackRating`, `feedbackComment`.
  - `IncidentState` and the five unfinished states: `addReporterComment`; `AcknowledgedState` and
    `InProgressState`: `requestInfo`; `ResolvedState.verify` passes the feedback on.
  - `exception/DuplicateResourceException` → 409.
- **Files (application):**
  - `service/UserAccounts` (new, shared): duplicate-email check, next free id per role (`U-EMP-9`).
  - `service/AuthService`, `controller/AuthController`: registration, deactivated check.
  - `service/AdminUserService`, `service/AuditLogService` (new); `repository/AuditRecordRepository`,
    `repository/AuditSpecifications` (new); `controller/AdminController`: the admin endpoints.
  - `service/ReferenceDataService`, `controller/ReferenceDataController`: create category,
    technician `me`.
  - `service/IncidentService`, `controller/IncidentController`: comments, info request, verify body.
  - `service/RecommendationService`: deactivated technicians are never recommended.
  - `service/ReportCalculator`, `service/ReportService`, `dto/ReportSummary`: average rating.
  - `service/notification/NotificationRules`, `NotificationMessageFormatter`: who hears about the new
    actions and how the message reads ("Dev Database needs more information: …").
  - DTOs: `RegisterRequest`, `CreateUserRequest`, `UpdateTechnicianRequest`, `CreateCategoryRequest`,
    `RequestInfoRequest`, `VerifyRequest`, `AuditLogCriteria`, `AuditLogEntry` (new); `UserResponse`
    (+`active`), `TechnicianResponse` (+`active`), `NoteResponse` (+`fromReporter`),
    `IncidentResponse` (+ info request and feedback fields).
  - `config/SecurityConfig`: rules for the new URLs; CORS origins now come from the property
    `itsm.cors.allowed-origins` (default `http://localhost:5173`).
  - `config/DemoDataLoader`: seven demo verifications now include a rating.
  - Tests: `IncidentReporterInteractionTest`, `UserAccountTest` (new), `IncidentStateTransitionTest`
    (two new actions, 96 cases), rules/formatter/calculator cases; integration tests
    `RegistrationIntegrationTest`, `AdminUserIntegrationTest`, `CategoryAdminIntegrationTest`,
    `AuditLogIntegrationTest`, `ReporterInteractionIntegrationTest`. `AuthAndAccessIntegrationTest`
    now finds its second employee by email, because registration may already have taken `U-EMP-2`.
- **Key concepts:**
  - **Why "information requested" is not a lifecycle state:** waiting for an answer does not move
    the incident forward or back. A `WAITING_FOR_INFO` state would need transitions from both
    ACKNOWLEDGED and IN_PROGRESS and a rule for where to return, and it would touch the SLA clocks,
    reports and every state table. A flag beside the status (`pendingInfoRequest`) answers "is a
    question open?" without changing the state machine. The State pattern still decides *when*
    asking is allowed: only `AcknowledgedState` and `InProgressState` override `requestInfo`.
  - **One audit record per action:** a comment that answers a question is recorded once, as
    `INFO_PROVIDED`, not as `COMMENT_ADDED` plus `INFO_PROVIDED`. Each audit record becomes one event,
    so this also means one notification.
  - **Soft delete (deactivation):** the row stays, only a flag changes. Foreign keys from incidents,
    notes and audit records stay valid, so history is kept. A technician with active incidents
    cannot be deactivated (409), so no incident is left with nobody to work on it.
  - **`DisabledException`:** a Spring Security `AuthenticationException`, so the existing handler turns
    it into 401. It is thrown only after the password matched, so a stranger guessing passwords
    still sees the generic "Invalid email or password".
  - **Mapping one column twice in JPA:** `Incident.auditTrail` owns the `incident_id` join column.
    `AuditRecord.incidentId` maps the same column with `insertable = false, updatable = false`, so
    JPA reads it but never writes it twice.
  - **Specifications:** like the incident search, the audit log adds one small predicate per filter
    that was given and combines them with `Specification.allOf`. `actorId=SYSTEM` means "no actor".
  - **409 vs 400:** a request that is well-formed but clashes with existing data (duplicate email,
    duplicate category, deactivating yourself) is a *conflict* (409); a malformed field is 400.
  - **Optional request body:** `@RequestBody(required = false)` lets `PATCH /verify` work with no body
    (older clients) and with `{rating, comment}`.
- **Known limitation:** a token issued before a user was deactivated stays valid until it expires
  (8 h). Checking the flag on every request would cost a database read per call.
- **How it was tested:**
  - `./mvnw verify`: 315 tests, 0 failures (was 249), BUILD SUCCESS; JaCoCo 88.1% instructions,
    75.8% branches.
  - On port 8081 against a fresh `itsm_demo_check` database (demo profile), with curl:
    - `POST /api/auth/register` → 201 `U-EMP-9`; same email in capitals → 409; blank name, bad email,
      short password → 400 naming all three fields.
    - `POST /api/incidents/INC-0022/info-request` as Dev → 200; again → 409 "A question is already
      waiting…"; as Asha → 403. `POST …/comments` as Asha → 200 and the audit shows `INFO_PROVIDED`;
      as Dev → 403.
    - `GET /api/technicians/me` as Dev → `activeIncidents 3, maxWorkload 4`.
    - `GET /api/admin/users` as Asha → 403. `POST /api/admin/users` (technician Vikram) → 201
      `U-TEC-6`; duplicate admin email → 409.
    - Deactivate `U-EMP-9` → 200; their login → 401 with the deactivated message; reactivate → 200.
      Deactivate `U-ADM-1` as `U-ADM-1` → 409; deactivate Dev (3 active) → 409 "Reassign them first".
    - `PUT /api/admin/technicians/U-TEC-6` → 200 with the new skills; `maxWorkload 0` → 400.
    - `POST /api/admin/categories` `printing` → 201 `PRINTING`; again → 409; as Asha → 403.
    - `GET /api/admin/audit?incidentId=INC-0022` → newest first (`INFO_PROVIDED`, `INFO_REQUESTED`, …);
      `action=FEEDBACK_GIVEN` → 7 demo records; `size=500` → 400.
    - `GET /api/reports/summary` → `averageRating 4.3, ratingCount 7`.

---

### 2026-11-22: Slice 7 (diagrams) · Use-case and detailed class diagrams

- **What was built:** `docs/diagrams/use-case.mmd`, `class-detailed-domain.mmd` and
  `class-detailed-patterns.mmd` (sources, with SVGs next to them), rendered as PNGs into
  `report/figures/diagrams/`.
- **Why:** the report needs a use-case diagram covering every role in the project statement
  (including this slice's new use cases) and a class diagram detailed enough to show attributes,
  methods, multiplicities, composition and aggregation.
- **Key concepts:**
  - **Use-case diagram in Mermaid:** Mermaid has no use-case diagram type, and PlantUML was not
    available here. So it is a flowchart in UML style: stadium shapes are use cases, the large box
    is the system boundary, and dotted arrows are «include» (always part of the base use case, e.g.
    reporting always calculates a priority) or «extend» (optional, e.g. giving feedback extends
    verifying). Actors on the left draw edges *to* their use cases and actors on the right *from*
    them, which is how Mermaid's layout puts them on different sides.
  - **Composition vs aggregation:** `Incident *-- AuditRecord` (filled diamond) means the records
    belong to the incident and are created and removed with it (`cascade = ALL, orphanRemoval`).
    `ITService o-- ITService` (hollow diamond) means a service refers to other services that exist
    on their own.
  - **Why two class images:** one diagram with all ~35 classes was too small to read when printed.
    The domain model and the pattern hierarchies are separate concerns, so each gets its own page.
    `IncidentState` is an abstract class in the code (not an interface), and the diagram marks it
    «abstract».
  - **Resolution:** `mmdc --size 4000` renders the longest side at 4000 px; `-s 2` alone was capped
    by the default 800 px page width.
