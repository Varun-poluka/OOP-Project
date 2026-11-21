# Learning Log: Frontend

This log records how the I-ITSM React frontend was built, one slice at a time. It follows
the same template as `docs/learning-log.md` (the backend log). Frontend entries live here so
frontend and backend work can happen in parallel without editing the same file.

---

### 2026-11-21: Frontend slice 1 · Foundation (auth, app shell, design system)

- **What was built:** a new `frontend/` app (Vite + React + TypeScript) with Tailwind CSS,
  shadcn/ui components, React Router and TanStack Query. It has a typed API layer, a login
  page, sign-in state that ends when the token expires, a sidebar layout that changes with
  the user's role, guarded routes, placeholder pages for every planned screen, a small set of
  shared components, light/dark mode, and 48 Vitest tests.
- **Why:** every later frontend slice (report incident, my queue, dashboard...) needs the
  same base: calling the API with a token, knowing who is logged in, deciding which pages a
  role may open, and consistent building blocks. Building that once means each later slice
  only adds its own page.

- **Files:**
  - *Tooling:* `package.json` (scripts `dev`, `build`, `lint`, `test`), `vite.config.ts`
    (React + Tailwind plugins, the `@/` import alias, Vitest settings), `tsconfig*.json`,
    `.oxlintrc.json`, `components.json` (shadcn settings), `.env.example`, `index.html`.
  - `src/api/types.ts`: TypeScript types copied from the Java DTO records in
    `com.itsm.dto`, and the enums (`IncidentStatus`, `Priority`, `Role`...).
  - `src/api/errors.ts`: `ApiError` and the rules that turn a ProblemDetail into a sentence.
  - `src/api/client.ts`: `apiFetch`, the single function every API call goes through.
  - `src/api/auth.ts`, `incidents.ts`, `notifications.ts`, `admin.ts`, `reports.ts`: one
    small typed function per backend endpoint (only `login` is used yet).
  - `src/auth/session.ts`: save/read/clear the session in sessionStorage; drops expired or
    damaged data.
  - `src/auth/roleHome.ts`: each role's home page, which role may open which path, and where
    to go after login.
  - `src/auth/authContext.ts`, `AuthProvider.tsx`, `useAuth.ts`: who is logged in, shared
    with every component; logs out when the token expires or the backend answers 401.
  - `src/auth/RequireAuth.tsx`: the route guard.
  - `src/layout/RootLayout.tsx`, `AppShell.tsx`, `nav.ts`: providers, the sidebar frame, and
    the navigation list for each role.
  - `src/components/`: `StatusBadge`, `PriorityBadge`, `SlaCountdown`, `EmptyState`,
    `LoadingState`, `ErrorState`, `PageHeader`, `ThemeToggle`, `BrandMark`; `ui/` holds the
    shadcn components (button, input, label, card, badge, dropdown-menu, separator, skeleton,
    tooltip, sonner).
  - `src/lib/sla.ts`: time-left logic for SLA deadlines; `useNow.ts`: a ticking clock hook;
    `theme.ts`: light/dark/system; `queryClient.ts`: TanStack Query settings; `labels.ts`:
    display text for enums.
  - `src/pages/`: `LoginPage` and a placeholder page per screen, grouped by role
    (`employee/`, `technician/`, `admin/`, `shared/`). `sampleData.ts`,
    `IncidentPreviewTable.tsx` and `PreviewSection.tsx` show labelled sample rows.
  - `src/router.tsx`, `src/main.tsx`, `src/index.css` (design tokens and fonts).
  - Tests: `api/errors.test.ts`, `api/client.test.ts`, `lib/sla.test.ts`,
    `auth/roleHome.test.ts`, `auth/session.test.ts`, `pages/LoginPage.test.tsx`.

- **Key concepts:**
  - **Component:** a function that returns what to show (JSX, HTML-like syntax inside
    TypeScript). `<StatusBadge status="NEW" />` calls `StatusBadge` with
    `{ status: 'NEW' }`. Those inputs are called **props**. Like a Java method parameter,
    TypeScript checks their types, so `status="DONE"` will not compile.
  - **State and re-rendering:** `useState` gives a component a value that survives between
    renders, plus a setter. Calling the setter makes React run the component again and update
    the screen. The login form keeps `email`, `password`, `error` and `submitting` in state
    ("controlled inputs": the input shows the state, and typing updates it).
  - **Hooks:** functions whose names start with `use` that plug into React: `useState`,
    `useEffect` (run code after rendering, e.g. start a timer, and return a cleanup function
    that stops it), `useMemo`/`useCallback` (keep the same object or function between
    renders), `useContext`. Rule: call hooks only at the top level of a component, never
    inside `if` or loops, because React identifies them by call order. Custom hooks
    (`useAuth`, `useNow`, `useTheme`) are our own functions built from these.
  - **Context:** a way to share a value with every component below a provider, without
    passing props through each level. `AuthProvider` puts `{ user, login, logout,
    lastLogoutReason }` into `AuthContext`. Any page calls `useAuth()` to read it. It is
    similar to a Spring bean that many classes receive, but it is scoped to the React tree.
  - **Routing (React Router):** maps the URL to components without reloading the page.
    Routes are **nested**: `RootLayout → RequireAuth → AppShell → page`. A parent shows its
    matched child where it places `<Outlet/>`. `useNavigate()` changes the URL from code,
    `<Navigate to=.../>` redirects while rendering, `useParams()` reads `:id` from
    `/incidents/:id`, and `useMatch()` tells the sidebar which link is the current page.
  - **Route guard:** `RequireAuth` runs before every protected page. No user → redirect to
    `/login` and remember the page (`state.from`). Wrong role → redirect to that role's
    home. The rules live in one table in `roleHome.ts` (first matching pattern wins).
    `/incidents/new` is listed before `/incidents/:id` so a technician cannot reach the
    employee-only form by accident. **This is only for the user experience.** The real
    protection is the backend's `SecurityConfig`, because anyone can change JavaScript
    running in their own browser.
  - **Role redirect after login:** `postLoginPath(role, from)` returns `from` if that role
    may open it, otherwise the role's home (Employee → My incidents, Technician → My queue,
    Admin → Dashboard). It only accepts paths starting with a single `/`, so a crafted link
    like `/login` with `from = //evil.com` cannot send someone to another site after login
    (an "open redirect").
  - **Typed API layer:** `types.ts` mirrors the Java records field by field, because Jackson
    writes each record component as a JSON property with the same name. Nullable Java fields
    become `string | null`. The Java `LocalDateTime` arrives as text without a timezone
    (`"2026-11-21T10:00:00"`), and `Instant` arrives with `Z` (UTC). We parse
    `LocalDateTime` as the browser's local time. That is correct while the backend and the
    browser run in the same timezone, which is true for this project. If they ever differ,
    the backend should send `Instant`/`OffsetDateTime` instead.
  - **`apiFetch` and ProblemDetail:** every call goes through one function. It adds the base
    URL, the `Authorization: Bearer <token>` header and JSON encoding. For any non-2xx
    response it reads the ProblemDetail body (the standard JSON error format the backend's
    `GlobalExceptionHandler` returns) and throws an `ApiError` with a readable `message`. It
    uses `detail` first. Validation details like `"title: must not be blank; "` become
    `"Title: must not be blank."`. Then it uses a non-default `title`, and finally a
    sentence per status code. A request that never reaches the server becomes status 0,
    "Cannot reach the server". Pages never deal with raw responses.
  - **401 handling without a circular dependency:** `client.ts` cannot import the router or
    React (and the auth code already imports the client). Instead the client keeps a
    callback, `setUnauthorizedHandler`. `AuthProvider` registers "end the session" in a
    `useEffect` and removes it in the cleanup. This is the Observer idea from the domain
    model, used on the client. The login call opts out with `skipUnauthorizedHandler`,
    because a wrong password is also a 401 and should show on the form, not trigger a
    logout.
  - **JWT on the client:** the token is a signed string. The browser only stores it and
    sends it back. It never checks the signature, because only the backend has the key. We
    do not decode the token to get the role; we use the `user` object that the login
    response returns. The session ends in three ways: (1) a timer fires at `expiresAt`
    (`setTimeout`, capped at ~24.8 days because that is the largest delay it accepts),
    (2) any API call returns 401, (3) the user clicks Sign out. In each case we clear
    storage and the TanStack Query cache, so the next person using the tab sees none of
    the previous user's data.
  - **A bug found during manual testing (two redirects racing):** at first, expiry called
    `navigate('/login', { state: { reason: 'expired' } })`. Clearing the user also made
    `RequireAuth` redirect to `/login` with `{ from }`. The second redirect replaced the
    first, so the "Your session ended" notice never showed. Fix: the reason is kept in
    `AuthContext` (`lastLogoutReason`), and on expiry only `RequireAuth` redirects. A
    bonus: after signing in again you return to the page you were on. A test now covers
    this.
  - **sessionStorage trade-off:** where to keep the token?
    - *sessionStorage* (chosen): survives a reload, and is cleared when the tab closes. Each
      tab has its own, so two tabs can be logged in as different roles, which is handy for
      testing the workflow.
    - *localStorage*: also survives closing the browser, so a forgotten shared PC stays
      logged in longer. It is shared by all tabs.
    - *Both* can be read by any JavaScript on the page. If an attacker injects script (XSS),
      they can steal the token. React lowers this risk by escaping text by default (we never
      use `dangerouslySetInnerHTML`), and the token expires.
    - *httpOnly cookie*: JavaScript cannot read it, so it is safer against XSS. But it needs
      backend changes (setting the cookie, CSRF protection, CORS with credentials), and the
      backend is designed as a stateless bearer-token API. For a course project,
      sessionStorage with a short expiry is a reasonable, explainable choice.
  - **TanStack Query (server state):** data that lives on the server (incidents,
    notifications) is cached by a **query key** such as `['incident', id]`. `useQuery`
    returns `{ data, isPending, error, refetch }`, which maps directly onto our
    `LoadingState` / `ErrorState` / `EmptyState` components. `useMutation` runs changes
    (e.g. acknowledge) and can then invalidate the affected keys so lists refresh. Our
    settings: data counts as fresh for 30 s, and failed queries are retried at most twice,
    but never on a 4xx error (a 403 will not fix itself). It is set up in this slice; pages
    start using it when they load real data.
  - **SLA countdown:** `slaCountdown(dueAt, now, breached)` is a pure function. "Now" is a
    parameter, so tests can use a fixed time. It returns `none` (no deadline), `ok`,
    `warning` (under 60 minutes), or `breached` (deadline reached, or the backend's
    `*Breached` flag is true). The label is the two largest units: `2d 4h`, `3h 12m`,
    `8m`, `<1m`. Java can send nanoseconds (`.123456789`); JavaScript dates only handle
    milliseconds, so extra digits are cut off before parsing. The `SlaCountdown` component
    re-renders every 30 s using `useNow`, which starts an interval in `useEffect` and clears
    it when the component disappears.
  - **useSyncExternalStore (theme):** the theme choice lives in a plain module, outside
    React, because both the toggle and the toast container need it. This hook subscribes a
    component to such an outside value and re-renders it when the value changes. An inline
    script in `index.html` applies the saved theme before React loads, so the page never
    flashes light before turning dark.
  - **Radix Slot pitfall:** shadcn's `Tooltip` uses `asChild`, which merges its props into
    the child element. `NavLink`'s `className` can be a *function*
    (`({isActive}) => ...`). The merge turned the function into a string, so the sidebar
    lost its styles. Fix: a plain `Link` plus `useMatch()` to work out the active state.
  - **Design direction: "operations console".** A service desk is used all day by people
    scanning lists for what is urgent, so the UI should be calm and dense, and colour should
    carry meaning.
    - *Typeface:* IBM Plex Sans for text and IBM Plex Mono for IDs, timestamps and
      countdowns. Plex was designed for technical software. The mono face makes `INC-1042`
      and `3h 12m` stand out from prose. Its `tabular-nums` setting gives every digit the
      same width, so a ticking countdown does not shift sideways. The fonts are bundled
      with `@fontsource` (no external font CDN).
    - *Colour:* cool graphite neutrals and one teal accent for actions and focus. Other
      colours are reserved for meaning. Priority: P1 red, P2 orange, P3 blue, P4 grey. SLA:
      green/amber/red. Status badges are neutral outlines with a small dot coloured by
      lifecycle *phase* (intake, active, resolved, closed), so red only ever means urgent.
    - *Layout:* a 14 px base size, thin borders instead of shadows, and a dark sidebar in
      both themes (like the frame of a control-room screen). The login page's visual is the
      incident lifecycle itself, set like a departures board.
    - *Tokens:* all colours are CSS variables in `index.css` (`--p1`, `--sla-warning`,
      `--phase-active`...), redefined under `.dark`. Tailwind exposes them as classes such
      as `text-p1` and `bg-sla-warning/10`. Dark mode therefore only swaps variables.
    - *Responsive:* the sidebar shows labels at ≥1024 px. On tablets it becomes a 64 px icon
      rail with tooltips.
    - The `frontend-design` plugin exists in the marketplace but is not installed here, so
      its skill could not be loaded. I followed its approach by hand: ground the look in
      the subject matter, choose typefaces on purpose, and use colour for meaning.
  - **Tooling notes:**
    - The current Vite template uses **oxlint** (a fast linter written in Rust) instead of
      ESLint, so `npm run lint` runs oxlint. Its "only export components" rule is switched
      off for `src/components/ui/` only, because shadcn's generated files intentionally
      export style helpers next to components.
    - TypeScript 7 removed `baseUrl`; the `@/*` path alias works without it.
    - shadcn's `cn` helper now comes from shadcn's own `cn` package (a replacement for
      clsx + tailwind-merge).
    - I removed `next-themes` and the Geist font that shadcn added, since we have our own
      theme hook and fonts.
    - The production build warns that the JavaScript bundle is over 500 kB. That is fine for
      now. Later we can split each role's pages into separate chunks with lazy `import()`.
  - **Not built yet (on purpose):** pages show placeholders. The technician queue and
    notifications show sample rows clearly labelled "Preview · sample data". The Admin
    Services page waits for a backend endpoint (none exists yet). `/` and unknown URLs
    redirect to the role's home page.

- **How it was tested:**
  - `npm run build` (type-check + build): passes. `npm run lint`: 0 warnings, 0 errors.
  - `npm test`: **48 tests, all passing**, in 6 files:
    - errors: detail is used, validation detail is reformatted, default titles are ignored,
      status fallbacks, blank detail;
    - client: Bearer header only when logged in, JSON body, ProblemDetail → ApiError,
      non-JSON error body, network failure → status 0, a 401 clears the session and calls
      the handler, login's 401 does not, empty 204 body, query-string building;
    - SLA: ok / warning / exactly due / past / breached flag / no deadline / bad date /
      nanoseconds / multi-day labels;
    - roles: home per role, access rules, return to the requested page, ignore a page the
      role can't see, no off-site redirect;
    - session: expired and damaged data are dropped, `expiresAt` is parsed;
    - login page (whole app in an in-memory router, login mocked): each role lands on its
      home, returns to the requested page, a wrong-role URL bounces home, a failed login
      shows the error, and token expiry shows "Your session ended" and returns you after
      re-login.
  - Manual check with the dev server and Playwright (the backend's login endpoint was not
    running yet, so sessions were faked in sessionStorage):
    - screenshots of the login page, Employee "My incidents", Technician "My queue", Admin
      "Dashboard", and the queue at tablet width in dark mode;
    - an employee opening `/admin` lands on `/incidents/mine`; an admin opening `/queue`
      lands on `/admin`;
    - a session expiring after 3 s → `/login` with the notice, storage cleared;
    - Sign out → `/login`, storage cleared, no "expired" notice;
    - signing in with the backend down → "Cannot reach the server. Check that the backend is
      running."
  - Not yet tested against the real `/api/auth/login`. That happens once the backend slice
    lands.

---

### 2026-11-21: Frontend slice F2 · Employee flow, incident detail, notifications

- **What was built:**
  - *Report incident:* a form for employees, with a "Possibly already reported" panel that
    checks for duplicates while they type.
  - *My incidents:* a list with filters, sorting and paging, all kept in the URL.
  - *Incident detail:* one page used by all roles, with SLA clocks, the service impact
    list, notes, the history timeline, and only the actions the current user may take.
    Admins also get ranked technician recommendations.
  - *Notifications:* real data, mark as read, and an unread badge in the top bar that
    refreshes every 30 s.
  - Then a full walkthrough against the real backend, fixing what broke.
- **Why:** this is the first slice where the UI really drives the incident lifecycle. An
  employee can report, a technician can work the incident, an admin can assign it, and the
  employee can confirm the fix.

- **Files:**
  - *API layer:*
    - `src/api/types.ts`: updated to today's backend. Action bodies no longer carry user IDs
      (the backend takes the user from the JWT). New types: `RiskLevel`, services, impact,
      duplicate candidates, recommendations.
    - `src/api/incidents.ts`: one function per endpoint, plus `checkDuplicates`, `impact`,
      `recommendations` and `atRisk`.
    - `src/api/services.ts`: the services list and service impact.
    - `src/api/categories.ts`: `getCategories()`, the stopgap described below.
    - `src/api/useReferenceData.ts`: `useServices` and `useCategories`.
    - `src/api/queryKeys.ts`: every cache key in one place.
    - `src/api/errors.ts` + `client.ts`: `ApiError.fieldErrors`, the per-field validation
      messages from a 400.
  - *Report:*
    - `src/features/report/reportSchema.ts`: the zod rules.
    - `src/features/report/useDuplicateCheck.ts`: debounced duplicate query.
    - `src/features/report/DuplicatePanel.tsx`: the "Possibly already reported" panel.
    - `src/pages/employee/ReportIncidentPage.tsx`: the form page.
  - *List:*
    - `src/features/incidents/listParams.ts`: URL ↔ filters, as pure functions.
    - `src/features/incidents/IncidentTable.tsx`: the table and pager, reusable later by
      the technician queue.
    - `src/pages/employee/MyIncidentsPage.tsx`: the list page.
  - *Detail:*
    - `src/features/incident/actions.ts`: `availableActions`, the one pure function that
      decides the buttons.
    - `useIncidentAction.ts`: the single mutation hook every action goes through.
    - `ActionBar.tsx`, `RecommendationsPanel.tsx` + `recommendations.ts`, `SlaPanel.tsx` +
      `slaClocks.ts`, `ImpactPanel.tsx`, `NotesSection.tsx`, `AuditTimeline.tsx`,
      `Panel.tsx`.
    - `src/pages/shared/IncidentDetailPage.tsx`: the page, with friendly 403 and 404
      screens.
  - *Notifications:*
    - `src/features/notifications/useNotifications.ts`: `useNotifications`,
      `useUnreadCount`, `useMarkAsRead`.
    - `NotificationBell.tsx`: the bell in the top bar.
    - `src/pages/shared/NotificationsPage.tsx`: the page.
  - *Shared:*
    - `src/components/FormField.tsx`, `ConfirmDialog.tsx`, `QueryState.tsx`,
      `RiskBadge.tsx`, `SlaClockBadge.tsx`.
    - `src/lib/useDebouncedValue.ts`, `time.ts`, `labels.ts` (risk and level labels).
    - `src/lib/sla.ts`: adds `slaClock` (running / met / missed).
    - shadcn `select`, `textarea`, `alert-dialog`, `progress`.
  - *Tests:*
    - `actions.test.ts`, `recommendations.test.ts`, `reportSchema.test.ts`,
      `DuplicatePanel.test.tsx`, `ReportIncidentPage.test.tsx`, `listParams.test.ts`,
      `useDebouncedValue.test.ts`.
    - Additions to `errors`, `client` and `sla` tests.
    - `LoginPage.test.tsx` now uses a fake `fetch` (see below).

- **Key concepts:**
  - **Forms with react-hook-form:** the library keeps field values inside the form instead
    of in React state, so typing in one field doesn't re-render the whole page.
    - `register('title')` connects a plain input.
    - `<Controller>` connects components that aren't plain inputs, like the Radix Select.
    - `useWatch` subscribes to just the fields we need: the four that feed the duplicate
      check.
    - `handleSubmit(fn)` validates first, and calls `fn` only with valid values.
    - `setError(field, …)` puts a message under a field. We use it to show the backend's own
      validation messages: a 400 with `"title: must not be blank; "` becomes
      `ApiError.fieldErrors = { title: 'must not be blank' }`, and each entry goes under its
      field. The form fields use the backend's names (`serviceId`, `categoryName`) on
      purpose, so this needs no translation table.
  - **Validation with zod:** `reportSchema` describes the rules once: required fields,
    trimming, length limits copied from the Java `@Size` annotations, and allowed enum
    values.
    - `zodResolver` plugs it into the form.
    - `z.input` / `z.output` give two TypeScript types: what the user typed (impact may still
      be unset) and what validation guarantees (impact is set, text is trimmed).
    - Client-side validation is for quick feedback only. The backend still validates
      everything, which is why server field errors are handled too.
  - **Debouncing:** wait until the user stops typing before doing the expensive thing.
    - `useDebouncedValue(value, 600)` restarts a timer on every change and passes the value
      on only when the timer finishes. The effect's cleanup function cancels the previous
      timer.
    - Pitfall avoided: the duplicate-check request object is built with `useMemo` from its
      four values. A new object on every render would count as a "change" every time and
      restart the timer forever.
    - The duplicate query is also `enabled` only from 4 characters, uses `retry: false`
      (it's only a hint), and receives TanStack Query's `AbortSignal`, so an outdated
      request is cancelled.
    - On My incidents, the search box debounces inside the change handler instead.
      `update()` uses `setSearchParams(prev => …)`, which reads the latest URL, so a status
      filter changed during the 400 ms wait isn't overwritten. This was a real bug in my
      first version.
  - **URL as state:** the list's filters, page and sort live in the query string
    (`?status=RESOLVED&q=vpn&page=2`).
    - A reload keeps them, a link shares them, and Back undoes a filter change.
    - `readListFilters` ignores anything unknown, because users can type any URL.
    - `writeListFilters` leaves out default values, so URLs stay short.
    - When Back changes the URL's text, the search box catches up using React's "adjust
      state while rendering" pattern (compare with the last value seen) instead of an
      effect that copies state into state.
  - **Mutations and cache invalidation:** a *query* reads server data and caches it under a
    key. A *mutation* changes server data. After a mutation, the cache is out of date, so
    `useIncidentAction` does three things on success:
    1. `setQueryData(incident key, returned incident)`: the backend returns the updated
       incident, so the detail page updates instantly without another request.
    2. `invalidateQueries` on the lists, recommendations and notifications: these are
       marked stale and refetch in the background. Keys are prefix-matched, so
       `['incidents', 'list']` covers every filtered list page.
    3. A toast. On error, a toast with the readable `ApiError.message`.

    `queryKeys.ts` keeps every key in one place, so a typo can't make an invalidation
    silently miss. Notifications use `refetchInterval: 30_000`, a simple poll until live
    updates arrive. `useUnreadCount` reads the same cached query and derives the count
    with `select`, so the badge costs no extra request.
  - **Deriving the UI from one pure function:** `availableActions(incident, user)` returns
    the actions allowed for this role, owner and status. It mirrors the backend's three
    layers: the State classes (which status allows what), `SecurityConfig` (which role),
    and the service's ownership checks (reporter / assigned technician).
    - The page shows exactly those buttons and nothing else.
    - So the whole rule set is tested in one table-driven test: 8 statuses × 5 kinds of
      user.
    - The same idea is used for `unassignableReason(tech)`, which mirrors
      `Technician.canTakeMoreWork()`.
  - **Confirm dialogs that survive errors:** `ConfirmDialog` stays open while the request
    runs and closes only on success. If the backend refuses (e.g. 409 "Cannot take more
    work"), the user keeps what they typed.
    - shadcn's `AlertDialogAction` closes immediately, so a plain `Button` is used instead.
    - Text-required actions (resolve, reopen) show "This is required" until filled.
  - **Render props (`FormField`):** `FormField` passes the label's `id`/`aria-*` props to a
    function, and each field decides which element receives them.
    - This fixed an accessibility bug a test found: the props were going to Radix's
      `<Select>` root, which renders no element. So the four dropdowns had no label linked
      to them, and screen readers announced an unnamed combobox. They now go on the
      trigger button.
  - **Tests and the network:** the login tests render the whole app, and the shell now
    loads notifications. Without a fake `fetch`, jsdom tried real network calls, which made
    one test fail at random. `vi.stubGlobal('fetch', …)` now gives every test predictable,
    instant answers.
  - **Missing vs null in JSON:** `DuplicateCandidateResponse` uses
    `@JsonInclude(NON_NULL)`, so for employees `score` and `reasons` are *missing*, not
    `null`. In TypeScript that's `score?: number` (undefined), and code must check for
    `undefined`. I had typed them as `null`, the unit test used `null` too, so it passed,
    and the live page crashed. The lesson: test fixtures should be copied from real
    responses, not from what I expect.
  - **Stopgaps behind one function:** categories come from `getCategories()`, which returns
    the 4 seeded categories for now, and the badge comes from `useUnreadCount()`. When
    `GET /api/categories` and `GET /api/notifications/unread-count` land, only those
    function bodies change.

- **How it was tested:**
  - `npm run build` passes. `npm run lint` shows 0 warnings. `npm test` passes **120 tests**
    in 13 files:
    - `availableActions`: every status × reporter / assigned technician / admin / other
      employee / other technician.
    - The report schema: required fields, trimming, limits, enums, request conversion.
    - The report page: empty submit shows every field message and sends nothing; backend
      field errors appear under the right fields; success navigates to the new incident.
    - The duplicate panel: links and statuses; score and reasons only when present; spinner
      while rechecking.
    - The pure helpers: list URL filters, `slaClock`, `useDebouncedValue` (fake timers),
      `parseFieldErrors`, and the capacity rule.
  - **Real-backend walkthrough** (seeded users, password123, Playwright, screenshots of
    every step):
    1. *Employee:* My incidents shows real data. Reporting "Hostel network down again"
       showed two similar incidents in the duplicate panel. Submitting created **INC-0009**.
       The backend raised it to P1 (7 dependent services) and could not auto-assign it, so
       it was CLASSIFIED.
    2. *Admin:* Opening it shows the recommendations. Assigning to Neha first returned
       **409 "Cannot take more work (3/3)"**, because every technician was full. The error
       toast showed it and the dialog stayed open.
    3. To free capacity, Neha started and resolved her existing INC-0003 through the UI.
       This was the only change made to other demo data.
    4. *Admin:* Assigning INC-0009 to Neha then worked. The page and recommendations
       updated without a reload.
    5. *Technician (Neha):* Her notifications list INC-0009, and mark-as-read dropped the
       badge from 9 to 8. She acknowledged it (response SLA **Met**), started work, added a
       note, and resolved it (resolution SLA **Met**).
    6. *Employee:* She verified, then closed it.

    The backend audit trail confirms all ten entries with the correct actor for each.
  - **What broke and was fixed:**
    1. The duplicate panel crashed the report page on missing `score`/`reasons` (above).
    2. Every notification's `incidentId` is `null` on the live backend, so the type is now
       nullable, and such a row is marked read on click instead of opening `/incidents/null`.
    3. The recommendations panel offered "Assign" for technicians the backend always
       refuses. They now show "Full (3/3)" or "Unavailable", and the highlight goes to the
       best technician who can take it.
  - **Tooling note:** partway through, the Playwright browser stopped delivering any mouse
    or keyboard input, even to a bare HTML page with one button, and restarting the browser
    didn't fix it. The final two steps (verify, close) were therefore triggered with
    JavaScript `element.click()`. That runs the same handlers, dialogs and API calls, and
    every earlier step used real clicks.

---

### 2026-11-21: Frontend slice F3 · Live updates, technician screens, fixes

- **What was built:**
  - *Live updates:* the app keeps one Server-Sent Events stream (`GET /api/stream`) open
    while someone is signed in. A pill in the top bar shows "Live" or "Reconnecting".
  - *My queue:* the technician's real unfinished incidents, with one SLA column ("Respond
    in 3m", "Resolve in 4h 11m", "Breached"), a risk badge, a red edge on P1 rows and
    Acknowledge / Start work buttons that ask for confirmation.
  - *At risk:* a new technician page, breached first, then by how much SLA time is used,
    with a bar per row.
  - *Fixes:* categories and the unread count come from the real endpoints; notifications
    open their incident; the login panel says who acts at each step; after a session
    expires, only the *same* user is sent back to the page they were on.
- **Why:** before this, every screen polled every 30 s and the technician queue was sample
  data. Now a change made by one person (an admin assigning) shows up for another (the
  technician) within a second, without a reload.

- **Files:**
  - *Live:* `src/live/backoff.ts`, `liveConnection.ts` (reconnect / stop rules),
    `openLiveStream.ts` (the fetch-based stream), `eventToInvalidations.ts` (event → cache
    changes), `LiveUpdatesProvider.tsx`, `liveContext.ts`, `useLiveStatus.ts`,
    `src/layout/LiveIndicator.tsx`. `src/api/client.ts` gained `handleUnauthorized()`.
  - *API:* `categories.ts`, `notifications.ts` (`unreadCount`), `incidents.ts` (`queue`),
    `queryKeys.ts` (`queue`, `atRisk`, `unreadCount`), `types.ts`.
  - *Technician:* `src/pages/technician/MyQueuePage.tsx`, `AtRiskPage.tsx`,
    `src/features/incidents/atRisk.ts`, `mostUrgentClock` in
    `src/features/incident/slaClocks.ts`, `src/components/UrgentClockBadge.tsx`,
    `SlaUsageBar.tsx` (taken out of `SlaPanel`), `src/features/incident/actionMeta.ts` and
    `src/lib/slaTone.ts` (shared constants moved out of component files).
  - *Auth:* `AuthProvider.tsx` / `authContext.ts` (`lastUserId`), `RequireAuth.tsx`,
    `LoginPage.tsx`.
  - *Tests:* `liveConnection.test.ts`, `eventToInvalidations.test.ts`,
    `slaClocks.test.ts`, `atRisk.test.ts`, `RequireAuth.test.tsx` (148 tests in total).

- **Key concepts:**
  - **Server-Sent Events (SSE):** an HTTP response that never finishes. The server keeps
    writing small `event:` / `data:` messages into it. It only goes server → browser, which
    is all we need. The browser's built-in `EventSource` cannot send an `Authorization`
    header, so the token would have to go in the URL (where it ends up in logs). So we use
    `@microsoft/fetch-event-source`, which does the same over `fetch` and accepts headers.
  - **Cache invalidation from events:** an event says *what* changed, not the new data.
    `eventToInvalidations` (a pure function) turns it into "mark these queries stale".
    TanStack Query then refetches the ones on screen. Data still arrives through one
    path, the normal queries. The one exception is the unread count, which the event
    carries, so we write it straight into the cache.
  - **Exponential backoff:** after a failed connection, wait 1 s, then 2 s, 4 s … up to 30 s
    before trying again; reset after a success. A down backend is not flooded, a blip heals
    fast. A 401 stops for good: retrying with a rejected token can't help.
  - **Dependency injection for testing:** `createLiveConnection` receives the function
    that opens the stream. Tests pass a fake one and use Vitest's fake timers to "wait"
    30 s instantly.
  - **Derived UI state:** values computed from data instead of stored separately. Examples:
    the queue's SLA label (`mostUrgentClock`), the at-risk order (`select: sortAtRisk`),
    and "poll only while offline" (`refetchInterval` from the live status). Nothing can
    go out of sync because there is no second copy.

- **Verification:** build, lint and tests pass. curl: `/api/categories` 200,
  `/api/notifications/unread-count` 200, `/api/incidents/queue` 200 (after the backend
  restart). Playwright with two separate browser contexts against the backend on 8080:
  - Technician (Neha Network) on My queue, admin in the other context assigns INC-0002 to
    her. The row appeared in her queue about 2.5 s later, with no reload, and her bell went
    8 → 9 from the "notification" event.
  - Acknowledge from the queue: the confirm dialog opened without opening the row; after
    confirming, the row showed Acknowledged and offered Start work.
  - At risk: the two breached incidents, 4044 % used before 417 %, each with a red bar.
  - Notifications: only the new notification carries an incident id ("Open incident");
    clicking it opened `/incidents/INC-0002` and marked it read (bell 9 → 8).
  - No console warnings or errors. The Live → Reconnecting switch was not tested, because
    that needs the backend stopped and restarted.

### 2026-11-21: Frontend slice F4 · Admin screens and small fixes

- **What was built:**
  - *Dashboard (`/admin`):* a 7 / 30 / 90-day range kept in the URL, six KPI tiles and five
    bar charts from `GET /api/reports/summary`, plus a "Needs attention" list (top 5 from
    `GET /api/incidents/at-risk`). "Open incidents" and "Open P1" are **right now** (the new
    backend fields `openIncidents` / `openByPriority`). The rest are **in the selected range**.
    A value the backend sends as null shows "No data", never 0. The figures refresh on
    every live "incident" event.
  - *Search (`/admin/search`):* all nine filters, paging and sort in the URL, the same
    result table as My incidents, and "Export CSV" of every match (up to 1000 rows).
  - *SLA policies (`/admin/sla`):* P1–P4 with inline edit and validation, and a "Run SLA
    check" panel, either now or "as if" at a chosen future time (time travel for the demo).
  - *Assignment strategy (`/admin/strategy`):* the two strategies explained, switching
    after a confirm.
  - *Services (`/admin/services`):* catalogue table, create service, add / remove
    dependency (the backend's 400 message for a self or duplicate dependency is shown in
    the dialog), and an impact explorer: an SVG graph with columns by hop distance, plus a list.
  - *Technicians (`/admin/technicians`):* skills, availability, active / max workload bar.
  - *Fixes:*
    - The SLA bar says "Overdue by 1d 5h" past 100 % and stays full.
    - The acknowledge toast mentions the response SLA only when the incident has one.
    - The placeholder and sample-data helpers are deleted.
- **Why:** the admin role had only placeholder pages. Now every admin endpoint of the
  backend has a screen, and the Strategy pattern (assignment) and the service dependency
  graph can be shown live in the demo.

- **Files:**
  - *API:* `types.ts` (`TechnicianResponse`, `CreateServiceRequest`, the new report fields),
    `services.ts` (create / add / remove dependency), `technicians.ts`, `queryKeys.ts`,
    `useReferenceData.ts` (`useTechnicians`). `live/eventToInvalidations.ts` now also
    refreshes `['reports']`.
  - *Pure logic (each with a test file):*
    - `features/dashboard/reportCharts.ts` and `dashboardRange.ts`
    - `features/search/searchParams.ts`
    - `lib/csv.ts`
    - `features/sla/policyValidation.ts`
    - `features/services/impactLayout.ts`
    - `lib/dates.ts`
    - `runningOverdueMs` in `features/incident/slaClocks.ts`
  - *Components:*
    - `features/dashboard/charts.tsx` (Recharts charts and `ChartCard`)
    - `features/services/ImpactGraph.tsx`, `features/search/incidentCsv.ts`
    - `components/FilterSelect.tsx` (moved out of My incidents) and `DebouncedInput.tsx`
    - `SlaUsageBar.tsx` (overdue text)
  - *Pages:* `pages/admin/*.tsx` (5 rewritten, `TechniciansPage.tsx` new), `router.tsx`,
    `layout/nav.ts`.
  - *Theme:* `index.css` got `--chart-1` / `--chart-2` (blue and aqua, light and dark).
    Priority bars reuse `--p1`…`--p4`.
  - *Dependency:* `recharts` 3.10.1.
  - *Tests:* 231 in total.

- **Key concepts:**
  - **Data transform vs. drawing:** a chart component should only decide *how* to draw.
    *What* to count is decided by pure functions in `reportCharts.ts`, for example:
    - every status in lifecycle order, with zeros
    - P1–P4, then "Unclassified" only if there are some
    - compliance kept as `null` when there's nothing to measure

    Pure functions are easy to unit-test without a browser. A mistake like "null shown as
    0 %" is caught by a test, not by an admin.
  - **Chart rules we followed:**
    - one question per chart, asked by the title ("Are we resolving in time?")
    - horizontal bars, so long labels stay readable
    - the number written at every bar end, so colour is never the only way to read a value
    - priority colours from the same CSS variables as the badges, so dark mode switches
      them automatically
    - a legend only where there are two series
    - exact values in the tooltip
    - a "Show as table" view under each chart

    The two series colours were checked with a colour-blindness validator, in both themes.
  - **URL state:** filters and the date range live in the query string, not in React
    state. The URL is the single source of truth: pure `read…` / `write…` functions
    translate it both ways, and any change is a navigation. So a reload, a bookmark or
    the Back button all just work. Invalid values in a hand-edited URL fall back to "no
    filter" instead of crashing.
  - **Exclusive end dates:** the backend counts `createdAt >= from` and `< to`. To include
    the whole last day, "to 20 Nov" is sent as midnight at the start of 21 Nov. `addDays`
    uses the `Date` constructor, which rolls 30 Nov + 1 day over to 1 Dec correctly.
  - **CSV escaping (RFC 4180):**
    - a cell with a comma, quote or line break is wrapped in quotes, with inner quotes
      doubled
    - lines end in CRLF
    - text starting with `=`, `+`, `-` or `@` gets a leading `'`, so a spreadsheet won't
      run it as a formula ("CSV injection")
    - a BOM at the start tells Excel the file is UTF-8
  - **Deterministic graph layout:** the backend's impact search is a breadth-first search
    (BFS), so each service has a hop distance.
    - **Placement:** column = distance; rows inside a column are sorted by name. The same
      data always gives the same picture, whatever order the API used (a test checks this
      by reversing the input).
    - **Edges:** an edge to the next column is how BFS first reached a service (solid).
      Any other edge reaches an already-visited service: a cycle, or a second path. It is
      drawn dashed.
    - **Routing:** edges only run through empty space (the gaps between columns and a
      lane under all the boxes), so no line crosses a box.
  - **Using the server's answer vs. refetching:** after saving a policy we write the
    server's *answer* into the cache with `setQueryData` (no refetch). After a dependency
    change we invalidate `['services']`, so the list and every impact result refetch.

- **Verification:** build, lint (no warnings) and 231 tests pass. curl
  `GET /api/reports/summary` shows `openIncidents: 17` and
  `openByPriority: {P1: 1, P2: 3, P3: 9, P4: 2}`. Playwright against 8080 as admin:
  - Dashboard: tiles 17 / 1 "right now", all charts, needs-attention list, 90-day range
    from the URL, readable in dark mode, tooltip with exact values. One fix: the date range
    under each tile wrapped badly, so the tiles now say "In the selected range".
  - Search with `?priority=P3&breached=yes&sort=priority`: 3 results; Export CSV gave a
    file with BOM, CRLF and the same 3 rows in the same order.
  - SLA: 500 / 300 rejected ("Must be at least the response time"). P4 resolution 1440 →
    2880 saved. Time-travel check at 22 Nov 12:00 recorded 10 breaches and 1 risk.
  - Strategy: confirm dialog, then switched to LOAD_BASED.
  - Services:
    - Network impact graph: 11 services across 3 columns. The first version's dashed edges
      crossed boxes, so they were rerouted through the gaps.
    - Self and duplicate dependency showed the backend's 400 messages in the dialog.
    - Removing Printing → Network refreshed the table and the graph.
  - Technicians page.
  - As technician Neha: At risk shows "Overdue by 1d 5h" on INC-0026.

  Restored afterwards: P4 policy, SKILL_BASED, Printing → Network. The time-travel
  breaches stay recorded: the backend has no undo for them.
