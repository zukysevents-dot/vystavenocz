import type { InjectionKey } from 'vue'
import type { ToggleVariants } from '@/components/ui/toggle'

/** ToggleGroup předává variant/size svým položkám (jako React context ve staré appce). */
export const TOGGLE_GROUP_INJECTION_KEY = Symbol() as InjectionKey<{
  variant: ToggleVariants['variant']
  size: ToggleVariants['size']
}>
