import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderPlus, Tags } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { ApiError, errorMessage } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import { useCategories } from '@/api/useReferenceData'
import { EmptyState } from '@/components/EmptyState'
import { FormDialog } from '@/components/FormDialog'
import { FormField } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { categorySchema, toCreateCategoryRequest, type CategoryFormValues } from '@/features/admin/categorySchema'

/** Incident categories. A new one can be chosen in the report form straight away. */
export function CategoriesPage() {
  const categories = useCategories()
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Categories"
        description="What employees file incidents under. Technicians' skills are chosen from this list."
        actions={
          <Button onClick={() => setAdding(true)}>
            <FolderPlus />
            New category
          </Button>
        }
      />

      <QueryState query={categories} isEmpty={(data) => data.length === 0} empty={<EmptyState icon={Tags} title="No categories yet" />}>
        {(data) => (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left">
              <caption className="sr-only">Categories</caption>
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-56 px-4 py-2.5 font-medium">Name</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((category) => (
                  <tr key={category.name}>
                    <td className="px-4 py-3 font-mono text-sm">{category.name}</td>
                    <td className="px-4 py-3 text-sm">
                      {category.description ?? <span className="text-muted-foreground">No description</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>

      {adding && <AddCategoryDialog onClose={() => setAdding(false)} />}
    </div>
  )
}

export function AddCategoryDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, setError, formState } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '' },
  })
  const { errors } = formState

  const create = useMutation({
    mutationFn: (values: CategoryFormValues) => adminApi.createCategory(toCreateCategoryRequest(values)),
    onSuccess: async (category) => {
      // The report form reads the same cache key, so it offers the new category at once.
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories() })
      toast.success(`Category ${category.name} added`)
      onClose()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setError('name', { type: 'server', message: 'A category with this name already exists.' })
      }
    },
  })
  const dialogError = create.isError && !(create.error instanceof ApiError && create.error.status === 409)
    ? errorMessage(create.error)
    : null

  return (
    <FormDialog
      title="New category"
      description="Names are stored in capitals, e.g. PRINTING."
      error={dialogError}
      submitLabel="Add category"
      pending={create.isPending}
      canSubmit
      onSubmit={() => void handleSubmit((values) => create.mutate(values))()}
      onClose={onClose}
    >
      <FormField label="Name" error={errors.name?.message}>
        {(controlProps) => <Input autoFocus autoComplete="off" className="uppercase" {...controlProps} {...register('name')} />}
      </FormField>
      <FormField label="Description" error={errors.description?.message} hint="Optional. Shown in the report form.">
        {(controlProps) => <Input autoComplete="off" {...controlProps} {...register('description')} />}
      </FormField>
    </FormDialog>
  )
}
