<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <Button variant="ghost" size="icon" aria-label="Přepnout světlý/tmavý režim" @click="toggleTheme">
    <Sun v-if="theme === 'dark'" />
    <Moon v-else />
  </Button>
</template>
