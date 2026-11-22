import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { ApiError, errorMessage } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import { ROLES, type CategoryResponse } from '@/api/types'
import { FormDialog } from '@/components/FormDialog'
import { FormField } from '@/components/FormField'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ROLE_LABEL } from '@/layout/nav'
import { toggleSkill } from './technicianForm'
import { EMPTY_USER_FORM, toCreateUserRequest, userSchema, type UserFormInput, type UserFormValues } from './userSchema'

/** "New user": any role. Technician fields appear only when the role is Technician. */
export function CreateUserDialog({ categories, onClose }: { categories: CategoryResponse[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm<UserFormInput, unknown, UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: EMPTY_USER_FORM,
  })
  const { register, control, handleSubmit, setError, formState } = form
  const { errors } = formState
  const role = useWatch({ control, name: 'role' })

  const create = useMutation({
    mutationFn: (values: UserFormValues) => adminApi.createUser(toCreateUserRequest(values)),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users() })
      if (user.role === 'TECHNICIAN') await queryClient.invalidateQueries({ queryKey: queryKeys.technicians() })
      toast.success(`${user.name} added as ${ROLE_LABEL[user.role]}`, { description: `${user.id} · ${user.email}` })
      onClose()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { type: 'server', message: 'This email already has an account.' })
      }
    },
  })
  // The 409 is shown under the email field, so only other errors go in the dialog's error box.
  const dialogError = create.isError && !(create.error instanceof ApiError && create.error.status === 409)
    ? errorMessage(create.error)
    : null

  return (
    <FormDialog
      title="New user"
      description="The user signs in with this email and password. Employees can also register themselves."
      error={dialogError}
      submitLabel="Create user"
      pending={create.isPending}
      canSubmit
      onSubmit={() => void handleSubmit((values) => create.mutate(values))()}
      onClose={onClose}
    >
      <FormField label="Full name" error={errors.name?.message}>
        {(controlProps) => <Input autoFocus {...controlProps} {...register('name')} />}
      </FormField>
      <FormField label="Email" error={errors.email?.message}>
        {(controlProps) => <Input type="email" autoComplete="off" {...controlProps} {...register('email')} />}
      </FormField>
      <FormField label="Initial password" error={errors.password?.message} hint="At least 8 characters. Share it with the user.">
        {(controlProps) => <Input type="password" autoComplete="new-password" {...controlProps} {...register('password')} />}
      </FormField>
      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <FormField label="Role" error={errors.role?.message}>
            {(controlProps) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger {...controlProps} className="w-full">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ROLE_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        )}
      />

      {role === 'TECHNICIAN' && (
        <>
          <FormField label="Max workload" error={errors.maxWorkload?.message} hint="Active incidents at once (1-50).">
            {(controlProps) => <Input type="number" inputMode="numeric" min={1} max={50} className="w-28" {...controlProps} {...register('maxWorkload')} />}
          </FormField>
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Skills</legend>
                <div className="grid grid-cols-2 gap-1 rounded-md border p-2">
                  {categories.map((category) => (
                    <label key={category.name} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(field.value ?? []).includes(category.name)}
                        onChange={() => field.onChange(toggleSkill(field.value ?? [], category.name))}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}
