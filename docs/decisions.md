# Technology and Design Decisions

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| 1 | Platform | Web application | Works on any device, easy to demo |
| 2 | Backend | Java 21 + Spring Boot | OOP course; interfaces, abstract classes and patterns are first-class |
| 3 | Frontend | React (Vite) | Component-based; consumes the REST API; resume value |
| 4 | Database | PostgreSQL | Relational data (users, incidents, audit); free and industry standard |
| 5 | Architecture | Layered monolith | One deployable unit; microservices are overkill for a solo 3-week build |
| 6 | Assignment strategies | Skill-based and load-based | Strategy pattern lets us swap them at runtime |
| 7 | Notifications | In-app and simulated email | Observer + Adapter patterns |
| 8 | Innovation | Service dependency graph, impact propagation, live dashboard | Raises priority when a dependency fails |