import { Outlet } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

/** Wraps every route: AuthProvider needs to be inside the router because it navigates. */
export function RootLayout() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={300}>
        <Outlet />
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </AuthProvider>
  )
}
