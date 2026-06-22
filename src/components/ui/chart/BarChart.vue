<script setup lang="ts" generic="T">
import type { HTMLAttributes } from 'vue'
import { VisAxis, VisGroupedBar, VisXYContainer } from '@unovis/vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    data: T[]
    x: (d: T, i: number) => number
    y: ((d: T) => number) | ((d: T) => number)[]
    height?: number
    color?: string | string[]
    xTickFormat?: (v: number, i: number) => string
    ariaLabel?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    height: 260,
    color: 'var(--coral)',
  },
)
</script>

<template>
  <div
    :class="cn('vis-chart', props.class)"
    :role="ariaLabel ? 'img' : undefined"
    :aria-label="ariaLabel"
  >
    <VisXYContainer :data="data" :height="height">
      <VisGroupedBar :x="x" :y="y" :color="color" :rounded-corners="6" />
      <VisAxis
        type="x"
        :tick-format="xTickFormat"
        :grid-line="false"
        :domain-line="false"
        :tick-line="false"
      />
      <VisAxis type="y" :domain-line="false" :tick-line="false" :num-ticks="4" />
    </VisXYContainer>
  </div>
</template>
