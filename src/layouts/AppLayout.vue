<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
</script>

<!-- Minimální rám pro /app/*. Reálný AppSidebar/topbar přijde ve F4-37. -->
<template>
  <div class="flex min-h-svh bg-background text-foreground">
    <aside class="hidden w-60 shrink-0 border-r border-border md:block">
      <div class="flex h-14 items-center px-4 font-semibold tracking-tight">
        Vystaveno<span class="text-coral">.cz</span>
      </div>
      <nav class="flex flex-col gap-1 px-2 text-sm">
        <RouterLink to="/app" class="rounded-md px-3 py-2 hover:bg-accent">Přehled</RouterLink>
        <RouterLink to="/app/faktury" class="rounded-md px-3 py-2 hover:bg-accent"
          >Faktury</RouterLink
        >
        <RouterLink to="/app/klienti" class="rounded-md px-3 py-2 hover:bg-accent"
          >Klienti</RouterLink
        >
        <RouterLink to="/app/nastaveni" class="rounded-md px-3 py-2 hover:bg-accent">
          Nastavení
        </RouterLink>
      </nav>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 items-center justify-between border-b border-border px-4">
        <span class="text-sm text-muted-foreground">Aplikace</span>
        <ThemeToggle />
      </header>
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
