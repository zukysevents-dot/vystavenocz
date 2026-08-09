export const ORDER_COURSES = ['Předkrm', 'Hlavní chod', 'Dezert'] as const

export type OrderCourse = (typeof ORDER_COURSES)[number]

const LEGACY_COURSE_LABELS: Record<string, OrderCourse> = {
  '1. chod': 'Předkrm',
  '2. chod': 'Hlavní chod',
  '3. chod': 'Dezert',
}

const COURSE_PRIORITY = new Map<string, number>(
  ORDER_COURSES.map((course, index) => [course, index]),
)

export interface OrderCourseGroup<T> {
  key: string
  label: string | null
  items: T[]
}

/** Překládá staré číselné chody, ale zachová případný vlastní backendový název. */
export function normalizeOrderCourse(course: string | null | undefined): string | null {
  const value = course?.trim()
  if (!value) return null
  return LEGACY_COURSE_LABELS[value] ?? value
}

/**
 * Seskupí položky v pořadí výdeje. Pokud žádná položka chod nemá, nevykresluje
 * zbytečný nadpis „Bez chodu“. Jakmile se chody používají, nezařazené položky
 * dostanou vlastní poslední sekci, aby se v kuchyni neztratily.
 */
export function groupItemsByCourse<T extends { course: string | null | undefined }>(
  items: T[],
): OrderCourseGroup<T>[] {
  const usesCourses = items.some((item) => normalizeOrderCourse(item.course) !== null)
  const groups = new Map<string, OrderCourseGroup<T> & { priority: number; order: number }>()

  items.forEach((item, index) => {
    const course = normalizeOrderCourse(item.course)
    const key = course ?? '__without_course__'
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        label: course ?? (usesCourses ? 'Bez chodu' : null),
        items: [],
        priority: course ? (COURSE_PRIORITY.get(course) ?? 50) : 100,
        order: index,
      }
      groups.set(key, group)
    }
    group.items.push(item)
  })

  return [...groups.values()]
    .sort((a, b) => a.priority - b.priority || a.order - b.order)
    .map(({ key, label, items: groupedItems }) => ({ key, label, items: groupedItems }))
}
