# I-ITSM: Intelligent IT Service Management & Incident Resolution System

Course project for CS F213 (Object Oriented Programming), BITS Pilani Hyderabad Campus, Semester I 2026-27.

Employees report IT incidents. The system classifies and prioritises them, assigns technicians,
tracks SLA deadlines, notifies the people involved, keeps a full audit trail and reports on it.

- Backend: Java 21, Spring Boot 4.1.2, Spring Data JPA, Spring Security (JWT), springdoc (Swagger)
- Frontend: React 19, TypeScript, Vite, TanStack Query, Tailwind
- Database: PostgreSQL 17
- Architecture: layered monolith, controller → service → domain → repository
  ([diagram](docs/diagrams/architecture.svg))

## Repository layout
| Path | Content |
|---|---|
| `backend/` | Spring Boot application (package `com.itsm`) |
| `frontend/` | React application |
| `backend-prototype/` | Plain-Java prototype of the domain model (reference only) |
| `docs/diagrams/` | Mermaid sources (`.mmd`) and rendered `.svg` / `.png` diagrams |
| `docs/patterns.md` | Design patterns and SOLID examples |
| `docs/decisions.md`, `docs/learning-log*.md` | Decision log and per-slice learning log |
| `scripts/reset-demo-db.sh` | Drops and recreates the `itsm` database for a clean demo |

## Running it

### Prerequisites
- JDK 21 (the Maven wrapper `./mvnw` downloads Maven itself)
- PostgreSQL 17 on `localhost:5432`
- Node.js 22 and npm (frontend only)

### Environment variables
| Variable | Used for | Example |
|---|---|---|
| `DB_PASSWORD` | Password of the `itsm_user` database role | set it in your shell profile |
| `JWT_SECRET` | Key that signs login tokens; at least 32 bytes | `export JWT_SECRET=$(openssl rand -base64 48)` |

Neither value is stored in any file. In IntelliJ, add both to the run configuration's environment variables.

### Database setup (once)
```bash
createuser --pwprompt itsm_user          # enter the same password as DB_PASSWORD
createdb -O itsm_user itsm               # application data
createdb -O itsm_user itsm_test          # used only by the tests (rebuilt on every test run)
```
Tables are created by Hibernate on start (`spring.jpa.hibernate.ddl-auto=update`).

### Backend
```bash
cd backend
./mvnw spring-boot:run                   # http://localhost:8080, Swagger UI at /swagger-ui.html
```
On first start `DataSeeder` creates the SLA policies, the campus service graph, 4 users and one incident.

### Demo data (profile `demo`, off by default)
The `demo` profile fills an **empty** database with 15 users and 39 incidents spread over the last
30 days, created through the real services. It includes every status, breached and at-risk SLAs,
near-duplicate pairs, a reopen, a reassign and a priority raise.
- IntelliJ: Run configuration → Active profiles = `demo`
- Terminal: `./mvnw spring-boot:run -Dspring-boot.run.profiles=demo`

If the database already has users, the loader does nothing. To start from clean data, stop the
backend and run `scripts/reset-demo-db.sh` (it drops and recreates `itsm` as your macOS PostgreSQL
superuser after asking for confirmation), then start with the demo profile again.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env                     # optional: VITE_API_URL, default http://localhost:8080
npm run dev                              # http://localhost:5173 (the only origin the backend allows)
```

### Tests and coverage
```bash
cd backend && ./mvnw verify              # 236 tests; needs PostgreSQL with itsm_test
cd frontend && npm test                  # Vitest
```
The backend coverage report is written to `backend/target/site/jacoco/index.html`.

## Demo logins
Every user has the password `password123`. The first four also exist without the demo profile.

| Role | Email | Notes |
|---|---|---|
| Employee | employee@itsm.local | Asha; has an incident waiting for verification |
| Administrator | admin@itsm.local | Ravi |
| Technician | db.tech@itsm.local | Dev: DATABASE, APPLICATION; max 4 |
| Technician | net.tech@itsm.local | Neha: NETWORK, HARDWARE; max 5 |
| Technician | apps.tech@itsm.local | Arjun: APPLICATION, ACCESS; max 6 (demo) |
| Technician | sec.tech@itsm.local | Priya: SECURITY, ACCESS; max 3; on leave (demo) |
| Technician | support.tech@itsm.local | Kiran: HARDWARE, NETWORK, ACCESS; max 8 (demo) |
| Administrator | lakshmi.menon@itsm.local | Lakshmi (demo) |
| Employees | rahul.verma, sneha.iyer, karthik.rao, meera.nair, aditya.singh, fatima.shaikh, rohan.das `@itsm.local` | demo |

## Features
- Report an incident (employee, or admin on behalf of an employee); possible duplicates are shown
  before submitting
- Automatic priority from impact × urgency × business criticality, raised one level when the affected
  service has 3 or more dependent services
- Automatic assignment by a switchable strategy (skill-based or load-based); manual classify, assign
  and reassign for admins; technician recommendations with scores and reasons
- Full lifecycle with an audit record for every step: acknowledge, start, notes, resolve, verify,
  close, reopen ([state diagram](docs/diagrams/incident-states.svg))
- SLA response and resolution deadlines per priority, checked every minute; at-risk warning at 75%
  of the window, breach flags, at-risk list and a per-technician work queue sorted by urgency
- Service dependency graph with impact analysis (which services an outage affects, and how far away)
- In-app and (logged) email notifications; live updates to the browser over Server-Sent Events
- Search with filters, paging and sorting; report summary for admins
- JWT login with role-based access (Employee, Technician, Administrator)

## Endpoints
All endpoints except login, health and Swagger need `Authorization: Bearer <token>`.
Errors are returned as `application/problem+json`; a refused lifecycle action is 409.

| Method and path | Who | What |
|---|---|---|
| `POST /api/auth/login` | public | Email + password → JWT |
| `GET /api/auth/me` | any user | The caller's id, name, email, role |
| `GET /api/health` | public | Health check |
| `POST /api/incidents` | Employee, Admin | Report; response includes `possibleDuplicates` |
| `POST /api/incidents/duplicates/check` | Employee, Admin | Possible duplicates of a draft (employees see id/title/status only) |
| `GET /api/incidents` | any user | All incidents (employees: own only); optional `?status=` |
| `GET /api/incidents/search` | any user | Filters `status, priority, categoryName, technicianId, reporterId, from, to, text`; paging and sort |
| `GET /api/incidents/{id}` | any user who may view it | Incident with notes, audit trail, `riskLevel`, `slaPercentUsed` |
| `GET /api/incidents/at-risk` | Technician (own), Admin | Breached or at-risk, most urgent first |
| `GET /api/incidents/queue` | Technician | Own ASSIGNED / ACKNOWLEDGED / IN_PROGRESS incidents, most urgent first |
| `GET /api/incidents/{id}/impact` | any user who may view it | Services impacted by the incident's service |
| `GET /api/incidents/{id}/recommendations` | Admin | Top 3 technicians with score and reasons |
| `PATCH /api/incidents/{id}/classify` | Admin | Set priority (NEW → CLASSIFIED), starts the SLA |
| `PATCH /api/incidents/{id}/assign` | Admin | CLASSIFIED → ASSIGNED |
| `PATCH /api/incidents/{id}/reassign` | Admin | Move to another technician |
| `PATCH /api/incidents/{id}/acknowledge` | assigned Technician | ASSIGNED → ACKNOWLEDGED |
| `PATCH /api/incidents/{id}/start` | assigned Technician | ACKNOWLEDGED → IN_PROGRESS |
| `POST /api/incidents/{id}/notes` | assigned Technician | Add an investigation note |
| `PATCH /api/incidents/{id}/resolve` | assigned Technician | IN_PROGRESS → RESOLVED with details |
| `PATCH /api/incidents/{id}/verify` | reporter (Employee) | RESOLVED → VERIFIED |
| `PATCH /api/incidents/{id}/reopen` | reporter (Employee) | RESOLVED → IN_PROGRESS with a reason |
| `PATCH /api/incidents/{id}/close` | reporter or Admin | VERIFIED → CLOSED |
| `GET` / `PUT /api/admin/assignment-strategy` | Admin | Current / change assignment strategy |
| `POST /api/admin/sla/check` | Admin | Run the SLA check now |
| `GET /api/admin/sla/policies`, `PUT /api/admin/sla/policies/{priority}` | Admin | Read / change SLA targets |
| `GET /api/reports/summary` | Admin | Counts by status, priority, category, SLA and technician workload |
| `GET /api/services` | any user | Services with dependencies and open incident counts |
| `GET /api/services/{id}/impact` | Technician, Admin | Impacted services with distance in hops |
| `POST /api/services` | Admin | Create a service |
| `POST` / `DELETE /api/services/{id}/dependencies/{dependsOnId}` | Admin | Add / remove a dependency |
| `GET /api/users/{userId}/notifications` | that user | Own notifications, newest first |
| `GET /api/notifications/unread-count` | any user | `{"unreadCount": n}` |
| `PATCH /api/notifications/{id}/read` | the recipient | Mark as read |
| `GET /api/categories` | any user | Categories with descriptions |
| `GET /api/technicians` | Admin | Technicians with skills, availability and workload |
| `GET /api/stream` | any user | Server-Sent Events: `connected`, `incident`, `notification`, heartbeat every 25 s |

## Documentation
- Diagrams: [class](docs/diagrams/class-domain.svg), [incident states](docs/diagrams/incident-states.svg),
  [report sequence](docs/diagrams/sequence-report-incident.svg),
  [architecture](docs/diagrams/architecture.svg), [ER](docs/diagrams/er-diagram.svg).
  Re-render after editing a `.mmd` file with `npx @mermaid-js/mermaid-cli -i <file>.mmd -o <file>.svg`.
- [Design patterns and SOLID](docs/patterns.md)
- [Decisions](docs/decisions.md), [backend learning log](docs/learning-log.md),
  [frontend learning log](docs/learning-log-frontend.md)

## Known limitations
- **Single instance only.** SSE connections live in the memory of one JVM (`LiveUpdateRegistry`), and
  `SlaScheduler` would run on every instance. Several instances would need a shared message broker
  and a scheduler lock.
- **`LocalDateTime` without a time zone.** All times are server-local. A server and browser in
  different zones would show shifted times; `Instant` / `OffsetDateTime` would fix that.
- **Test hook in a domain class.** `Incident.overrideTimestampsForTest` exists so unit tests can set
  times. It is package-private, so services and controllers cannot call it, but it is still test code
  in production.
- **Bad-token message.** A malformed or expired JWT gets 401, but the `detail` text is Spring's
  internal exception message rather than a fixed, user-friendly text.
- **No database migrations.** The schema comes from `ddl-auto=update`, which adds tables and columns
  but never renames or removes them. A real deployment would use Flyway or Liquibase.
- **Simulated email.** `EmailNotificationListener` only writes `[EMAIL]` lines to the log.
