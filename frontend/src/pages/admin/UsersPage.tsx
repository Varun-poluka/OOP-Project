import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { errorMessage } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import { ROLES, type Role, type UserResponse } from '@/api/types'
import { useCategories } from '@/api/useReferenceData'
import { useAuth } from '@/auth/useAuth'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { ALL, FilterSelect } from '@/components/FilterSelect'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { CreateUserDialog } from '@/features/admin/CreateUserDialog'
import { ROLE_LABEL } from '@/layout/nav'
import { cn } from '@/lib/utils'

type Pending = { user: UserResponse; action: 'deactivate' | 'reactivate' }

/**
 * Every account with its role and status. Deactivating keeps the account and its history but
 * stops the user from signing in; it can be undone. Your own account cannot be deactivated.
 */
export function UsersPage() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const users = useQuery({ queryKey: queryKeys.users(), queryFn: adminApi.users })
  const categories = useCategories()
  const [creating, setCreating] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>(ALL)
  const [pending, setPending] = useState<Pending | null>(null)

  const change = useMutation({
    mutationFn: ({ user, action }: Pending) =>
      action === 'deactivate' ? adminApi.deactivateUser(user.id) : adminApi.reactivateUser(user.id),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.technicians() })
      toast.success(saved.active ? `${saved.name} can sign in again` : `${saved.name} is deactivated`)
      setPending(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Employees, technicians and administrators. Deactivated users cannot sign in; their incidents and history stay."
        actions={
          <Button onClick={() => setCreating(true)} disabled={!categories.isSuccess}>
            <UserPlus />
            New user
          </Button>
        }
      />

      <FilterSelect
        label="Role"
        value={roleFilter}
        onChange={setRoleFilter}
        allLabel="All roles"
        options={ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] }))}
      />

      <QueryState query={users} isEmpty={(data) => data.length === 0} empty={<EmptyState icon={Users} title="No users yet" />}>
        {(data) => {
          const shown = roleFilter === ALL ? data : data.filter((u) => u.role === (roleFilter as Role))
          return (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full min-w-[44rem] text-left">
                <caption className="sr-only">Users</caption>
                <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Name</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Email</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Role</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shown.map((user) => {
                    const isMe = me !== null && me.id === user.id
                    const active = user.active !== false
                    return (
                      <tr key={user.id} className={cn('align-middle', !active && 'text-muted-foreground')}>
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {user.name}
                            {isMe && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">{user.email}</td>
                        <td className="px-4 py-3 text-sm">{ROLE_LABEL[user.role]}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <span aria-hidden className={cn('size-2 rounded-full', active ? 'bg-sla-ok' : 'bg-phase-closed')} />
                            {active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {active ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isMe}
                              title={isMe ? 'You cannot deactivate your own account' : undefined}
                              onClick={() => setPending({ user, action: 'deactivate' })}
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setPending({ user, action: 'reactivate' })}>
                              Reactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }}
      </QueryState>

      {creating && categories.isSuccess && <CreateUserDialog categories={categories.data} onClose={() => setCreating(false)} />}

      {pending !== null && (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next) setPending(null)
          }}
          title={pending.action === 'deactivate' ? `Deactivate ${pending.user.name}?` : `Reactivate ${pending.user.name}?`}
          description={
            pending.action === 'deactivate'
              ? 'They can no longer sign in. Their incidents, notes and history stay. A technician with active incidents must have them reassigned first.'
              : 'They can sign in again with their existing password.'
          }
          confirmLabel={pending.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
          destructive={pending.action === 'deactivate'}
          pending={change.isPending}
          onConfirm={() => change.mutate(pending)}
        />
      )}
    </div>
  )
}
