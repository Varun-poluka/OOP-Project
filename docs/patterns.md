# Design patterns in I-ITSM

Each pattern below lists the classes involved, the problem it solves here and the alternative we
did not use. Class diagram: [diagrams/class-domain.svg](diagrams/class-domain.svg).

## State
- **Classes:** `IncidentState` (abstract) and `NewState`, `ClassifiedState`, `AssignedState`,
  `AcknowledgedState`, `InProgressState`, `ResolvedState`, `VerifiedState`, `ClosedState`;
  `IncidentStates.of(status)` returns the shared instance; `Incident` delegates each lifecycle call
  to `state()`.
- **Problem:** 10 actions × 8 statuses. Only 13 pairs are legal
  ([diagrams/incident-states.svg](diagrams/incident-states.svg)). By default every action in
  `IncidentState` throws `InvalidStateTransitionException`, and each state class overrides only the
  actions it allows. Adding a status means adding one class, not editing ten methods.
- **Not used:** a `switch (status)` inside each `Incident` method. The rules would be spread over 10
  switches, and a forgotten case would silently allow an illegal move.

## Strategy
- **Classes:** `AssignmentStrategy` with `SkillBasedAssignmentStrategy` and `LoadBasedAssignmentStrategy`;
  `AssignmentStrategySelector` holds the current one (changed at runtime with
  `PUT /api/admin/assignment-strategy`). `PriorityCalculator` with `WeightedPriorityCalculator`.
- **Problem:** how to pick a technician (and how to compute priority) is a policy that should change
  without touching `IncidentService`. The service only calls `selectTechnician(...)` / `calculate(...)`.
- **Not used:** an `if (mode.equals("LOAD_BASED")) ... else ...` in the service, which grows with every
  rule and mixes the policies with the reporting workflow.

## Observer
- **Classes:** `IncidentEventListener` (observer interface), `IncidentEventPublisher` (subject),
  `IncidentEvent` (the message, built from an `AuditRecord`), and three listeners:
  `InAppNotificationListener`, `EmailNotificationListener`, `LiveUpdateListener`.
- **Problem:** many things must happen after a lifecycle change (save notifications, log an email,
  push SSE). The service publishes the new audit records once; Spring injects every listener into the
  publisher as a `List`. A new channel is a new `@Component`, with no change to `IncidentService`.
- **Not used:** Spring's `ApplicationEventPublisher` + `@TransactionalEventListener`. It would work
  and do the after-commit part for us, but it hides the pattern inside the framework; writing it
  ourselves shows the subject/observer roles explicitly. `LiveUpdateListener` does the after-commit
  step by hand with `TransactionSynchronization`.

## Decorator
- **Classes:** `DependencyAwarePriorityCalculator` implements `PriorityCalculator` and wraps another
  `PriorityCalculator` (the weighted one). `IntelligenceConfig` marks it `@Primary`.
- **Problem:** raise the priority one level when the failed service has 3 or more dependents
  (`ServiceImpactAnalyzer`). The weighted formula stays unchanged and is still tested on its own;
  callers see only the interface.
- **Not used:** adding the graph check inside `WeightedPriorityCalculator` (mixes two rules and makes
  the formula depend on the repository), or subclassing it (ties the extra rule to one base class).

## Specification
- **Classes:** `IncidentSpecifications.matching(criteria)` builds a Spring Data JPA `Specification`
  from `IncidentSearchCriteria`; `IncidentRepository` extends `JpaSpecificationExecutor`.
- **Problem:** `GET /api/incidents/search` has 8 optional filters. Each filter is one small predicate,
  added only when its value is present, then combined with AND.
- **Not used:** one repository method per filter combination (2^8 methods), or building a JPQL string
  by hand (error-prone and open to injection if values were concatenated).

## Repository
- **Classes:** `IncidentRepository`, `UserRepository`, `TechnicianRepository`, `CategoryRepository`,
  `ITServiceRepository`, `SLAPolicyRepository`, `NotificationRepository` (Spring Data interfaces;
  Spring generates the implementation).
- **Problem:** services work with domain objects and never write SQL; queries like
  `findByAssignedTechnicianIdAndStatusIn` are derived from the method name.
- **Not used:** `EntityManager` or `JdbcTemplate` calls inside services. That would mix persistence
  code into business logic. (`JdbcTemplate` is used only in `DemoDataLoader`, to backdate demo rows.)

## Static factory method
- **Classes:** `IncidentResponse.from(incident)`, `NotificationResponse.from(...)`,
  `PageResponse.from(page, mapper)`, `IncidentEvent.from(incident, record)`,
  `DuplicateCandidateResponse.full(...)` / `limited(...)`, `IncidentStates.of(status)`.
- **Problem:** a named method says *what* is built (`limited` vs `full` for employees vs staff), keeps
  the mapping code in one place, and `IncidentStates.of` can return a shared instance instead of a new
  object.
- **Not used:** public constructors called from controllers (mapping repeated in many places), or a
  mapping library such as MapStruct (extra dependency, hides the code we need to explain).

## DTO (Data Transfer Object)
- **Classes:** the records in `com.itsm.dto` (requests such as `CreateIncidentRequest`, responses such
  as `IncidentResponse`).
- **Problem:** the API shape is separate from the entities. Responses never contain `passwordHash`,
  never trigger lazy loading after the transaction, and have no entity cycles. Request records carry
  Bean Validation annotations (`@NotBlank`, `@Size`).
- **Not used:** returning entities directly from controllers.

## SOLID, one example each
- **S, single responsibility:** `NotificationRules` decides *who* is told about an event; each listener
  decides only *how* (database row, email log line, SSE push).
- **O, open/closed:** a new assignment policy is a new `AssignmentStrategy` bean.
  `AssignmentStrategySelector` registers it from the injected list, with no edit to existing classes.
- **L, Liskov substitution:** `DependencyAwarePriorityCalculator` can replace `WeightedPriorityCalculator`
  anywhere a `PriorityCalculator` is expected. It keeps the contract (always returns a priority) and
  only raises it.
- **I, interface segregation:** `IncidentEventListener` has one method, `onIncidentEvent`. A listener
  depends on nothing it does not use.
- **D, dependency inversion:** `IncidentService` depends on the `PriorityCalculator` and
  `AssignmentStrategy` interfaces, and `DuplicateService` on the `DuplicateDetector` interface.
  Spring injects the concrete classes (configured in `IntelligenceConfig`).
