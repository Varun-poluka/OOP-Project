import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router'
import { ArrowRight, LoaderCircle, TriangleAlert } from 'lucide-react'
import { register as registerAccount } from '@/api/auth'
import { ApiError, errorMessage } from '@/api/errors'
import { homePathFor } from '@/auth/roleHome'
import { useAuth } from '@/auth/useAuth'
import { BrandMark } from '@/components/BrandMark'
import { FormField } from '@/components/FormField'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  EMPTY_REGISTER_FORM,
  registerSchema,
  toRegisterRequest,
  type RegisterFormInput,
  type RegisterFormValues,
} from '@/features/register/registerSchema'
import { LifecyclePanel } from './LoginPage'

const FORM_FIELDS = ['name', 'email', 'password'] as const
type FormFieldName = (typeof FORM_FIELDS)[number]
function isFormField(name: string): name is FormFieldName {
  return (FORM_FIELDS as readonly string[]).includes(name)
}

/**
 * Self-registration. The backend always creates an employee account; after it succeeds we log
 * in with the same email and password, so the new employee lands on "My incidents" at once.
 */
export function RegisterPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const form = useForm<RegisterFormInput, unknown, RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: EMPTY_REGISTER_FORM,
  })
  const { register, handleSubmit, setError, formState } = form
  const { errors } = formState

  const create = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const request = toRegisterRequest(values)
      await registerAccount(request)
      return login(request.email, request.password)
    },
    onSuccess: (loggedIn) => navigate(homePathFor(loggedIn.role), { replace: true }),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { type: 'server', message: 'An account with this email already exists. Sign in instead.' })
        return
      }
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (isFormField(field)) setError(field, { type: 'server', message })
        }
        return
      }
      setError('root.server', { type: 'server', message: errorMessage(error) })
    },
  })

  // Already signed in (e.g. opened /register from a bookmark): go home instead.
  if (user !== null && !create.isPending) return <Navigate to={homePathFor(user.role)} replace />

  const serverError = errors.root?.server?.message

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <LifecyclePanel />

      <div className="relative flex flex-col items-center justify-center px-6 py-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <p className="font-semibold">I-ITSM Service Desk</p>
          </div>

          <h1 className="text-[1.6rem] leading-tight font-semibold tracking-tight">Create an account</h1>
          <p className="mt-1.5 text-muted-foreground">
            Employees can register here to report incidents. Technician and administrator accounts are set up by IT.
          </p>

          <form noValidate onSubmit={handleSubmit((values) => create.mutate(values))} className="mt-6 space-y-4">
            {serverError !== undefined && (
              <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {serverError}
              </p>
            )}
            <FormField label="Full name" error={errors.name?.message}>
              {(controlProps) => <Input autoComplete="name" autoFocus className="h-10" {...controlProps} {...register('name')} />}
            </FormField>
            <FormField label="Work email" error={errors.email?.message}>
              {(controlProps) => (
                <Input type="email" autoComplete="email" className="h-10" {...controlProps} {...register('email')} />
              )}
            </FormField>
            <FormField label="Password" error={errors.password?.message} hint="At least 8 characters.">
              {(controlProps) => (
                <Input type="password" autoComplete="new-password" className="h-10" {...controlProps} {...register('password')} />
              )}
            </FormField>
            <FormField label="Confirm password" error={errors.confirmPassword?.message}>
              {(controlProps) => (
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="h-10"
                  {...controlProps}
                  {...register('confirmPassword')}
                />
              )}
            </FormField>

            <Button type="submit" className="h-10 w-full" disabled={create.isPending}>
              {create.isPending ? <LoaderCircle className="animate-spin" /> : null}
              {create.isPending ? 'Creating account…' : 'Create account'}
              {!create.isPending && <ArrowRight />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
