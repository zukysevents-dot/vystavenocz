<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ImportWizard from '@/import/components/ImportWizard.vue'
import { clientsConfig, productsConfig } from '@/import/configs'

const route = useRoute()
const isProducts = computed(() => route.query.entity === 'products')
</script>

<template>
  <ImportWizard v-if="isProducts" :config="productsConfig" />
  <ImportWizard v-else :config="clientsConfig" />
</template>
