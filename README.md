# I-ITSM: Intelligent IT Service Management & Incident Resolution System

Course project for CS F213 (Object Oriented Programming), BITS Pilani Hyderabad Campus, Semester I 2026-27.

## What it does
Employees report IT incidents. The system classifies and prioritises them, assigns technicians, tracks SLA deadlines, sends notifications and keeps a full audit trail.

## Tech stack (planned)
- Backend: Java 21, Spring Boot (REST API)
- Frontend: React (Vite)
- Database: PostgreSQL

## Status
Work in progress. Repository setup done.

## Repository structure
- `backend/` - Spring Boot application (coming soon)
- `frontend/` - React application (coming soon)
- `docs/` - design decisions, UML, wireframes, test cases, report drafts
## Demo logins
Seeded by `DataSeeder` on first start. Every demo user has the password `password123`.

| Role | Email | User id |
|---|---|---|
| Employee | employee@itsm.local | U-EMP-1 |
| Admin | admin@itsm.local | U-ADM-1 |
| Technician (database) | db.tech@itsm.local | U-TEC-1 |
| Technician (network, hardware) | net.tech@itsm.local | U-TEC-2 |

Log in with `POST /api/auth/login` and send the returned token as `Authorization: Bearer <token>`.
The backend needs the `DB_PASSWORD` and `JWT_SECRET` (at least 32 bytes) environment variables, e.g.
`export JWT_SECRET=$(openssl rand -base64 48)`.

## Intelligent features (slice 3)
| Endpoint | Who | What |
|---|---|---|
| `POST /api/incidents/duplicates/check` | Employee, Admin | Possible duplicates of a draft report (employees see id/title/status only) |
| `GET /api/incidents/{id}/recommendations` | Admin | Top 3 technicians with a 0-100 score and reasons |
| `GET /api/incidents/at-risk` | Technician (own), Admin | Incidents at SLA risk or breached, most urgent first |
| `GET /api/incidents/{id}/impact` | Anyone who can view the incident | Services impacted by the incident's service |
| `GET /api/services` | Any logged-in user | Services with direct dependencies and open incident counts |
| `GET /api/services/{id}/impact` | Technician, Admin | Services impacted by an outage, with distance in hops |
| `POST /api/services` | Admin | Create a service |
| `POST` / `DELETE /api/services/{id}/dependencies/{dependsOnId}` | Admin | Add / remove a dependency |

The create-incident response includes `possibleDuplicates`, and every incident response includes `riskLevel` and `slaPercentUsed`.

