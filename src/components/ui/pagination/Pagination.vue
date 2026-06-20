<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import {
  PaginationEllipsis,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from 'reka-ui'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const page = defineModel<number>({ default: 1 })

const props = defineProps<{
  total: number
  itemsPerPage?: number
  siblingCount?: number
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <PaginationRoot
    v-model:page="page"
    :total="total"
    :items-per-page="itemsPerPage ?? 10"
    :sibling-count="siblingCount ?? 1"
    show-edges
    :class="cn('mx-auto flex w-full justify-center', props.class)"
  >
    <PaginationList v-slot="{ items }" class="flex items-center gap-1">
      <PaginationPrev as-child>
        <Button variant="outline" size="icon" class="h-9 w-9" aria-label="Předchozí stránka">
          <ChevronLeft class="h-4 w-4" />
        </Button>
      </PaginationPrev>

      <template v-for="(item, index) in items">
        <PaginationListItem
          v-if="item.type === 'page'"
          :key="`page-${item.value}`"
          :value="item.value"
          as-child
        >
          <Button
            :variant="item.value === page ? 'default' : 'outline'"
            size="icon"
            class="h-9 w-9"
            :aria-label="`Stránka ${item.value}`"
            :aria-current="item.value === page ? 'page' : undefined"
          >
            {{ item.value }}
          </Button>
        </PaginationListItem>
        <PaginationEllipsis
          v-else
          :key="`ellipsis-${index}`"
          :index="index"
          class="flex h-9 w-9 items-center justify-center text-sm"
        >
          …
        </PaginationEllipsis>
      </template>

      <PaginationNext as-child>
        <Button variant="outline" size="icon" class="h-9 w-9" aria-label="Další stránka">
          <ChevronRight class="h-4 w-4" />
        </Button>
      </PaginationNext>
    </PaginationList>
  </PaginationRoot>
</template>
