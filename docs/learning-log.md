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
