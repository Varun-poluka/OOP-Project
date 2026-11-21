import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage } from '@/api/errors'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import type { IncidentResponse, Priority } from '@/api/types'

/** One action plus the data it needs. A "discriminated union": `action` says which shape it is. */
export type ActionCommand =
  | { action: 'classify'; priority: Priority }
  | { action: 'assign'; technicianId: string; technicianName: string }
  | { action: 'reassign'; technicianId: string; technicianName: string }
  | { action: 'acknowledge' }
  | { action: 'start' }
  | { action: 'addNote'; text: string }
  | { action: 'resolve'; resolutionDetails: string }
  | { action: 'verify' }
  | { action: 'reopen'; reason: string }
  | { action: 'close' }

function run(id: string, command: ActionCommand): Promise<IncidentResponse> {
  switch (command.action) {
    case 'classify':
      return incidentsApi.classify(id, command.priority)
    case 'assign':
      return incidentsApi.assign(id, command.technicianId)
    case 'reassign':
      return incidentsApi.reassign(id, command.technicianId)
    case 'acknowledge':
      return incidentsApi.acknowledge(id)
    case 'start':
      return incidentsApi.start(id)
    case 'addNote':
      return incidentsApi.addNote(id, command.text)
    case 'resolve':
      return incidentsApi.resolve(id, command.resolutionDetails)
    case 'verify':
      return incidentsApi.verify(id)
    case 'reopen':
      return incidentsApi.reopen(id, command.reason)
    case 'close':
      return incidentsApi.close(id)
  }
}

function successMessage(command: ActionCommand, incident: IncidentResponse): string {
  switch (command.action) {
    case 'classify':
      return `Classified as ${command.priority}`
    case 'assign':
      return `Assigned to ${command.technicianName}`
    case 'reassign':
      return `Reassigned to ${command.technicianName}`
    case 'acknowledge':
      return 'Acknowledged: the response SLA is met'
    case 'start':
      return 'Work started'
    case 'addNote':
      return 'Note added'
    case 'resolve':
      return `Resolved. ${incident.reporterName} will be asked to verify`
    case 'verify':
      return 'Verified. Thanks for confirming the fix'
    case 'reopen':
      return 'Reopened and sent back to the technician'
    case 'close':
      return 'Incident closed'
  }
}

/**
 * Runs an action on one incident with TanStack Query's useMutation.
 * On success: the returned incident replaces the cached one (the page updates without a
 * refetch), and every list, recommendation and notification query is marked stale so it
 * refetches; then a toast. On error: a toast with the readable message.
 */
export function useIncidentAction(incidentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (command: ActionCommand) => run(incidentId, command),
    onSuccess: (incident, command) => {
      queryClient.setQueryData(queryKeys.incident(incidentId), incident)
      void queryClient.invalidateQueries({ queryKey: queryKeys.incidentLists() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations(incidentId) })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success(successMessage(command, incident))
    },
    onError: (error) => {
      toast.error(errorMessage(error))
    },
  })
}
