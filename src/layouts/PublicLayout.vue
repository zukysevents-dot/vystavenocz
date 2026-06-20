<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
</script>

<!-- Minimální rám pro veřejné stránky. Reálné Navbar/Footer přijdou ve F2-22. -->
<template>
  <div class="flex min-h-svh flex-col bg-background text-foreground">
    <header class="border-b border-border">
      <nav class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <RouterLink to="/" class="font-semibold tracking-tight">
          Vystaveno<span class="text-coral">.cz</span>
        </RouterLink>
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <RouterLink to="/funkce" class="hover:text-foreground">Funkce</RouterLink>
          <RouterLink to="/cenik" class="hover:text-foreground">Ceník</RouterLink>
          <RouterLink to="/prihlaseni" class="hover:text-foreground">Přihlášení</RouterLink>
          <ThemeToggle />
        </div>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <slot />
    </main>

    <footer class="border-t border-border">
      <div class="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">© Vystaveno.cz</div>
    </footer>
  </div>
</template>
