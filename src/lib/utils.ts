import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Slučování Tailwind tříd (shadcn-vue konvence). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
