import type { Role } from '@/api/types'

// Which role may open which URL. The backend enforces the real rules (SecurityConfig);
// these only decide what the UI shows and where it sends people.

export const ROLE_HOME: Record<Role, string> = {
  EMPLOYEE: '/incidents/mine',
  TECHNICIAN: '/queue',
  ADMIN: '/admin',
}

export function homePathFor(role: Role): string {
  return ROLE_HOME[role]
}

const ALL_ROLES: Role[] = ['EMPLOYEE', 'TECHNICIAN', 'ADMIN']

// Checked top to bottom; the first matching pattern wins.
// /incidents/new and /incidents/mine must come before /incidents/:id.
const ACCESS_RULES: { pattern: RegExp; roles: Role[] }[] = [
  { pattern: /^\/incidents\/new\/?$/, roles: ['EMPLOYEE'] },
  { pattern: /^\/incidents\/mine\/?$/, roles: ['EMPLOYEE'] },
  { pattern: /^\/incidents\/[^/]+\/?$/, roles: ALL_ROLES },
  { pattern: /^\/queue\/?$/, roles: ['TECHNICIAN'] },
  { pattern: /^\/at-risk\/?$/, roles: ['TECHNICIAN'] },
  { pattern: /^\/admin(\/.*)?$/, roles: ['ADMIN'] },
  { pattern: /^\/notifications\/?$/, roles: ALL_ROLES },
]

export function canAccess(role: Role, pathname: string): boolean {
  for (const rule of ACCESS_RULES) {
    if (rule.pattern.test(pathname)) return rule.roles.includes(role)
  }
  return false
}

/**
 * Where to go right after login. If the user was sent to /login from a page
 * (e.g. a bookmarked incident), return there when their role may see it;
 * otherwise go to their role's home page.
 */
export function postLoginPath(role: Role, requestedPath: string | null | undefined): string {
  // Only same-site paths ("/x"), never "//other-site.com", so login can't redirect off the app.
  if (
    requestedPath !== null &&
    requestedPath !== undefined &&
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//')
  ) {
    const pathname = requestedPath.split(/[?#]/)[0]
    if (canAccess(role, pathname)) return requestedPath
  }
  return homePathFor(role)
}
