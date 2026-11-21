import { Navigate, Outlet, useLocation } from 'react-router'
import { canAccess, homePathFor } from './roleHome'
import { useAuth } from './useAuth'

/**
 * Route guard. Wraps every page except /login.
 *  - not logged in        -> /login (remembering where they wanted to go, and who was
 *                            signed in there, so only that person is sent back)
 *  - wrong role for page  -> their own home page
 *  - otherwise            -> render the page (<Outlet/> is "the matched child route")
 */
export function RequireAuth() {
  const { user, lastUserId } = useAuth()
  const location = useLocation()

  if (user === null) {
    const from = location.pathname + location.search
    return <Navigate to="/login" replace state={{ from, fromUserId: lastUserId }} />
  }
  if (!canAccess(user.role, location.pathname)) {
    return <Navigate to={homePathFor(user.role)} replace />
  }
  return <Outlet />
}
