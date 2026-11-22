# Report figures

Images for the project report. Screenshots were taken with Playwright against the running app
(frontend on http://localhost:5173, backend on 8080, demo data) at a 1440×900 viewport with
deviceScaleFactor 2, in light mode unless the caption says otherwise. Demo logins use password123.

## diagrams/

| File | Caption |
|------|---------|
| `architecture.png` | System architecture of the layered monolith (controller → service → domain → repository). |
| `class-domain.png` | Class diagram of the domain model (com.itsm.domain). |
| `er-diagram.png` | Entity-relationship diagram of the database schema. |
| `incident-states.png` | State diagram of the incident lifecycle. |
| `sequence-report-incident.png` | Sequence diagram of an employee reporting an incident. |

## screens/

| Fig. | File | Caption |
|------|------|---------|
| 6 | `login-page.png` | Login page with the incident lifecycle panel showing who performs each step. |
| 7 | `employee-my-incidents.png` | Employee view: My incidents with status, priority, SLA countdown and risk. |
| 8 | `employee-report-duplicates.png` | Report form: the "Possibly already reported" panel lists similar open incidents while the employee types. |
| 9 | `employee-incident-detail.png` | Incident detail (INC-0032) with the SLA panel, affected-service impact and the start of the history timeline. |
| 10 | `technician-queue.png` | Technician: My queue, sorted by most urgent SLA, with the SLA column and quick actions. |
| 11 | `technician-at-risk.png` | Technician: At risk, breached first, then by how much of the SLA window is used. |
| 12 | `technician-incident-actions.png` | Technician incident detail with the lifecycle action button (Start work) and the note form. |
| 13 | `admin-dashboard.png` | Admin dashboard for the last 30 days: KPIs, lifecycle and priority charts, Needs attention list. |
| 13 | `admin-dashboard-full.png` | The same dashboard, full page, including the category, SLA-per-priority and workload charts. |
| 14 | `admin-search-filtered.png` | Admin search with two filters applied (status In progress, SLA breached). |
| 15 | `admin-recommendations.png` | Recommended technicians for an unassigned P1 (INC-0036), ranked with the reasons behind each score. |
| 16 | `admin-sla-policies-check.png` | SLA policies per priority and the result of a manual "Run SLA check (now)". |
| 17 | `admin-assignment-strategy.png` | Assignment strategy page: switch between load-based and skill-based assignment at runtime. |
| 18 | `admin-services-graph.png` | Services page: dependency table and the Impact explorer for an outage of Network. |
| 18 | `admin-services-impact-graph.png` | Close-up of the Network impact graph: 11 services affected, up to 3 hops away. |
| 19 | `admin-technicians.png` | Technicians with skills, availability and workload against capacity. |
| 20 | `notifications.png` | Notifications page for an employee: readable messages linked to each incident. |
| 21 | `dark-mode-tablet-queue.png` | Technician queue in dark mode at tablet width (820 px), with the collapsed sidebar. |
| 22 | `swagger-ui.png` | Swagger UI for the I-ITSM API with bearer-token authorisation. |

## testing/

| Fig. | File | Caption |
|------|------|---------|
| 23 | `jacoco-coverage.png` | JaCoCo coverage summary after `./mvnw verify`: 85% instruction and 72% branch coverage. |
| 24 | `mvnw-verify-summary.png` | `./mvnw verify` result: 249 tests, 0 failures, BUILD SUCCESS. |
| 25 | `npm-test-summary.png` | `npm test` (Vitest) result: 25 test files, 231 tests passed. |
| 26 | `live-update-before.png` | Live update, before: technician queue open in the browser. |
| 27 | `live-update-after.png` | Live update, after: the queue updates by itself when another user changes an incident. |
| 28 | `network-timeline-priority-raised.png` | Network incident history showing the system's PRIORITY_RAISED event (P3 → P2, 11 dependent services). |
| 29 | `swagger-409-illegal-transition.png` | Swagger: closing an In progress incident is refused with 409 Conflict ("Cannot move incident from IN_PROGRESS to CLOSED"). |
| 30 | `swagger-403-wrong-role.png` | Swagger: an employee calling an admin-only endpoint gets 403 Forbidden. |
