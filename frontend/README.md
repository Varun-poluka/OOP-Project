# I-ITSM frontend

React + TypeScript + Vite UI for the I-ITSM service desk.

## Run

```sh
npm install
npm run dev        # http://localhost:5173 (the backend allows CORS from this port)
```

The backend URL defaults to `http://localhost:8080`. To change it, copy `.env.example`
to `.env` and edit `VITE_API_URL`.

## Checks

```sh
npm run build      # type-check (tsc) + production build
npm run lint       # oxlint
npm test           # Vitest
```

## Layout

- `src/api/`: types mirroring the backend DTOs, `apiFetch` wrapper, one module per controller
- `src/auth/`: session storage, AuthProvider/useAuth, role rules, route guard
- `src/components/`: shared components (badges, SLA countdown, states); `ui/` is shadcn/ui
- `src/layout/`: app shell (sidebar) and navigation per role
- `src/pages/`: one file per page, grouped by role
- `src/lib/`: SLA logic, theme, query client, labels

See `docs/learning-log-frontend.md` for how and why it was built.
