<script setup lang="ts" generic="T">
import type { HTMLAttributes } from 'vue'
import { VisArea, VisAxis, VisLine, VisXYContainer } from '@unovis/vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    data: T[]
    x: (d: T, i: number) => number
    y: (d: T) => number
    height?: number
    color?: string
    showArea?: boolean
    xTickFormat?: (v: number, i: number) => string
    class?: HTMLAttributes['class']
  }>(),
  {
    height: 260,
    color: 'var(--primary)',
    showArea: true,
  },
)
</script>

<template>
  <div :class="cn('vis-chart', props.class)">
    <VisXYContainer :data="data" :height="height">
      <VisArea v-if="showArea" :x="x" :y="y" :color="color" :opacity="0.12" />
      <VisLine :x="x" :y="y" :color="color" />
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
