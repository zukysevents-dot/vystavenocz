import type { InjectionKey } from 'vue'

/** Sdílí ID FormItem do potomků (Label/Control/Description/Message). */
export const FORM_ITEM_INJECTION_KEY = Symbol() as InjectionKey<string>
