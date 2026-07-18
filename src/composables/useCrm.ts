import { http } from '@/lib/http'
import type {
  CrmActivity,
  CrmActivityKind,
  CrmClientDetail,
  CrmClientSummary,
  CrmTask,
  CrmTaskPriority,
} from '@/lib/types'

const idempotencyKey = () => crypto.randomUUID()

export function useCrm() {
  const listClients = (search?: string, overdueTask?: boolean) => {
    const query = new URLSearchParams()
    if (search?.trim()) query.set('q', search.trim())
    if (overdueTask) query.set('overdueTask', 'true')
    const suffix = query.size ? `?${query.toString()}` : ''
    return http.get<CrmClientSummary[]>(`/crm/clients${suffix}`)
  }
  const getClient = (clientId: string) => http.get<CrmClientDetail>(`/crm/clients/${clientId}`)
  const timeline = (clientId: string) =>
    http.get<CrmActivity[]>(`/crm/clients/${clientId}/timeline`)
  const tasks = (overdue = false) =>
    http.get<CrmTask[]>(`/crm/tasks${overdue ? '?overdue=true' : ''}`)
  const createActivity = (
    clientId: string,
    kind: Extract<CrmActivityKind, 'Note' | 'Call' | 'Email' | 'Meeting'>,
    body: string,
  ) =>
    http.postWithHeaders<CrmActivity>(
      `/crm/clients/${clientId}/activities`,
      { kind, body },
      { 'Idempotency-Key': idempotencyKey() },
    )
  const createTask = (
    clientId: string,
    title: string,
    description: string | null,
    dueAt: string | null,
    priority: CrmTaskPriority,
  ) =>
    http.postWithHeaders<CrmTask>(
      '/crm/tasks',
      { clientId, title, description, dueAt, priority },
      { 'Idempotency-Key': idempotencyKey() },
    )
  const completeTask = (taskId: string) => http.post<CrmTask>(`/crm/tasks/${taskId}/complete`)
  const cancelTask = (taskId: string) => http.post<CrmTask>(`/crm/tasks/${taskId}/cancel`)
  return {
    listClients,
    getClient,
    timeline,
    tasks,
    createActivity,
    createTask,
    completeTask,
    cancelTask,
  }
}
