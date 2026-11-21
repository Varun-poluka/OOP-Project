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
