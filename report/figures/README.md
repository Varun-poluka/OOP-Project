# Report figures

Images for the project report. Screenshots were taken with Playwright against the running app
(frontend on http://localhost:5173, backend on 8080, demo data) at a 1440×900 viewport with
deviceScaleFactor 2, in light mode unless the caption says otherwise. Demo logins use password123.
The v1.1 screens (marked v1.1 below) were taken the same way against v1.1 (frontend on 5174,
backend on 8081 with a fresh copy of the demo data). Existing figure numbers are unchanged;
new screens are numbered from 31.

## diagrams/

| File | Caption |
|------|---------|
| `architecture.png` | System architecture of the layered monolith (controller → service → domain → repository). |
| `class-domain.png` | Class diagram of the domain model (com.itsm.domain). |
| `er-diagram.png` | Entity-relationship diagram of the database schema. |
| `incident-states.png` | State diagram of the incident lifecycle. |
| `sequence-report-incident.png` | Sequence diagram of an employee reporting an incident. |
| `use-case.png` | Use-case diagram: Employee, Technician, Administrator and System/Scheduler with every use case from the project statement; green ones were added in v1.1; dotted arrows are «include» / «extend». Drawn as a Mermaid flowchart in UML use-case style. |
| `class-detailed-domain.png` | Detailed class diagram (1 of 2): domain classes with attributes and methods, the User hierarchy, associations with multiplicities, composition (Incident with AuditRecord and InvestigationNote) and aggregation (ITService dependencies). |
| `class-detailed-patterns.png` | Detailed class diagram (2 of 2): the pattern types (IncidentState and its eight states, PriorityCalculator with its decorator, AssignmentStrategy, DuplicateDetector, IncidentEventListener with the publisher) and their implementations. |

## screens/

| Fig. | File | Caption |
|------|------|---------|
| 6 | `login-page.png` | Login page with the incident lifecycle panel showing who performs each step, and the Register link for new employees (v1.1). |
| 7 | `employee-my-incidents.png` | Employee view: My incidents with status, priority, SLA countdown and risk. |
| 8 | `employee-report-duplicates.png` | Report form: the "Possibly already reported" panel lists similar open incidents while the employee types. |
| 9 | `employee-incident-detail.png` | Incident detail (INC-0032) with the SLA panel, affected-service impact and the start of the history timeline. |
| 10 | `technician-queue.png` | Technician (Kiran): My queue, sorted by most urgent SLA, with the "My workload" bar (5 / 8 active) and a red left border on the P1 incident INC-0036, assigned to Kiran as the #2 recommendation (v1.1). |
| 11 | `technician-at-risk.png` | Technician: At risk, breached first, then by how much of the SLA window is used. |
| 12 | `technician-incident-actions.png` | Technician incident detail with the lifecycle action button (Start work) and the note form. |
| 13 | `admin-dashboard.png` | Admin dashboard for the last 30 days: KPIs including the average feedback rating (4.4 / 5 from 8 ratings), lifecycle and priority charts, Needs attention list (v1.1). |
| 13 | `admin-dashboard-full.png` | The same dashboard, full page, including the category, SLA-per-priority and workload charts (v1.1). |
| 14 | `admin-search-filtered.png` | Admin search with two filters applied (status In progress, SLA breached). |
| 15 | `admin-recommendations.png` | Recommended technicians for an unassigned P1 (INC-0036), ranked with the reasons behind each score. |
| 16 | `admin-sla-policies-check.png` | SLA policies per priority and the result of a manual "Run SLA check (now)". |
| 17 | `admin-assignment-strategy.png` | Assignment strategy page: switch between load-based and skill-based assignment at runtime. |
| 18 | `admin-services-graph.png` | Services page: dependency table and the Impact explorer for an outage of Network. |
| 18 | `admin-services-impact-graph.png` | Close-up of the Network impact graph: 11 services affected, up to 3 hops away. |
| 19 | `admin-technicians.png` | Technicians with skills, availability (Available / On leave / Deactivated), workload against capacity and an Edit button per row (v1.1). |
| 20 | `notifications.png` | Notifications page for an employee: readable messages linked to each incident. |
| 21 | `dark-mode-tablet-queue.png` | Technician queue in dark mode at tablet width (820 px), with the collapsed sidebar. |
| 22 | `swagger-ui.png` | Swagger UI for the I-ITSM API with bearer-token authorisation. |
| 31 | `register-page.png` | Self-registration: the new employee's name, work email and password (v1.1). |
| 32 | `employee-info-requested.png` | Reporter view of INC-0032: the highlighted "Information requested" banner with the technician's question, the notes-and-comments thread and the answer box (v1.1). |
| 33 | `employee-incident-feedback.png` | INC-0024 after the reporter verified it with feedback: Reporter feedback panel (5/5 · Excellent with a comment) and the FEEDBACK_GIVEN history entry (v1.1). |
| 34 | `admin-users.png` | Admin Users page: every account with role and status; the admin's own row cannot be deactivated (v1.1). |
| 35 | `admin-users-new-technician.png` | New user dialog creating a technician: role, max workload and skills (v1.1). |
| 36 | `admin-categories.png` | Admin Categories page, including PRINTING, added by an administrator (v1.1). |
| 37 | `admin-technician-edit.png` | Edit technician dialog: skills, on leave and max workload, with the current workload as a lower limit (v1.1). |
| 38 | `admin-audit-log.png` | System-wide audit log, newest first, with filters for incident, user, action and dates (v1.1). |
| 39 | `admin-audit-log-filtered.png` | Audit log filtered to INC-0022: the technician's INFO_REQUESTED and the reporter's INFO_PROVIDED at the top (v1.1). |

## testing/

| Fig. | File | Caption |
|------|------|---------|
| 23 | `jacoco-coverage.png` | JaCoCo coverage summary after `./mvnw verify` (v1.1): 88% instruction and 75% branch coverage. |
| 24 | `mvnw-verify-summary.png` | `./mvnw verify` result (v1.1): 315 tests, 0 failures, BUILD SUCCESS. |
| 25 | `npm-test-summary.png` | `npm test` (Vitest) result (v1.1): 30 test files, 263 tests passed. |
| 26 | `live-update-before.png` | Live update, before: technician queue open in the browser. |
| 27 | `live-update-after.png` | Live update, after: the queue updates by itself when another user changes an incident. |
| 28 | `network-timeline-priority-raised.png` | Network incident history showing the system's PRIORITY_RAISED event (P3 → P2, 11 dependent services). |
| 29 | `swagger-409-illegal-transition.png` | Swagger: closing an In progress incident is refused with 409 Conflict ("Cannot move incident from IN_PROGRESS to CLOSED"). |
| 30 | `swagger-403-wrong-role.png` | Swagger: an employee calling an admin-only endpoint gets 403 Forbidden. |
