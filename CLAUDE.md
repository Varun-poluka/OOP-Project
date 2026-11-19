# I-ITSM: instructions for Claude Code

## How to work with me (most important)
I am a student building this project solo for my OOP course. I must understand and
be able to explain every line, so explain what you write.

1. You may write application code: services, controllers, security, React UI,
   tests, DTOs, repositories and configuration.
2. Do NOT redesign com.itsm.domain (entities, Incident lifecycle, State / Strategy /
   Observer classes). Change a domain class only when the task explicitly says so,
   and say why the change is needed.
3. Before changing any file, explain what you plan to change, in which files, and
   why. Wait for my OK.
4. When I ask for a review: list problems with explanations and hints, most
   important first. Do not rewrite my code unless I ask.
5. When fixing a build or configuration error, explain the cause in plain words.
6. Git: one commit per slice, then push (see Workflow). No other Git operations
   (no rebase, reset, force-push, branch deletion) unless I ask.
7. Explain like I am new to Spring, JPA and React: define new terms when you use them.
8. Never write secrets into files. The database password comes from the
   DB_PASSWORD environment variable.

## Workflow
1. One slice per session: a slice is one small, complete feature or fix.
2. Plan first: list the files to change and why, then wait for my OK.
3. Compile (./mvnw compile), run (./mvnw spring-boot:run) and curl-test every
   endpoint you touched. Show the curl commands and the responses.
4. Append an entry to docs/learning-log.md: what was built, why, which files, and
   the key concepts in plain words.
5. One commit per slice (code + learning-log entry together), then push.

## Project
Intelligent IT Service Management & Incident Resolution System (CS F213 OOP course).
Employees report IT incidents; the system classifies, prioritises, assigns
technicians, tracks SLAs, notifies, audits and reports.

- Backend: Java 21, Spring Boot 4.1.2, Maven, PostgreSQL 17, springdoc 3.2.0 (Swagger)
- Frontend (later): React with Vite
- Architecture: layered monolith: controller → service → domain → repository

## Repository layout
- backend/ : the real Spring Boot app (package com.itsm)
- backend-prototype/ : plain-Java prototype of the domain model, reference only
- docs/ : decision log and documentation
- docs/learning-log.md : one entry per slice, explaining what was built and why

## Commands
- Run backend: cd backend && ./mvnw spring-boot:run (needs DB_PASSWORD set)
- Tests: cd backend && ./mvnw test
- Swagger UI: http://localhost:8080/swagger-ui.html

## Code conventions
- Null and validation checks written out in full: if (x == null) throw ...;
- No Lombok; getters follow JavaBeans naming (getX, isX)
- No setters for status: status changes only through lifecycle methods
- "Check, then change": validate everything before modifying any field
- Compare enums with ==; Strings and objects with equals()
- Custom exceptions extend RuntimeException, in com.itsm.domain.exception
- Collections returned from getters are unmodifiable
- Packages: controller, service, domain, repository, dto, config