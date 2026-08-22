<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { LOGIN_ROUTE, REGISTER_ROUTE } from '@/lib/landing-cta'

const route = useRoute()
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-4 py-16 sm:py-24">
    <p class="text-sm font-semibold uppercase tracking-wide text-primary">Chyba 404</p>
    <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Tuhle stránku tu nemáme</h1>
    <p class="mt-3 text-muted-foreground">
      Adresa <code class="rounded bg-muted px-1.5 py-0.5 text-sm">{{ route.path }}</code> neexistuje
      — nejspíš je v odkazu překlep nebo jsme stránku přesunuli.
    </p>

    <div class="mt-8 flex flex-wrap gap-3">
      <Button as-child variant="coral" size="lg">
        <RouterLink :to="REGISTER_ROUTE">Vyzkoušet zdarma</RouterLink>
      </Button>
      <Button as-child variant="outline" size="lg">
        <RouterLink to="/">Na úvodní stránku</RouterLink>
      </Button>
    </div>

    <div class="mt-10 border-t border-border pt-6">
      <p class="text-sm font-medium text-foreground">Kam nejčastěji míříte</p>
      <ul class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <li>
          <RouterLink to="/cenik" class="text-primary hover:underline">Ceník a moduly</RouterLink>
        </li>
        <li>
          <RouterLink to="/funkce" class="text-primary hover:underline"
            >Co Vystaveno umí</RouterLink
          >
        </li>
        <li>
          <RouterLink to="/faq" class="text-primary hover:underline">Časté dotazy</RouterLink>
        </li>
        <li>
          <RouterLink :to="LOGIN_ROUTE" class="text-primary hover:underline">Přihlášení</RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>
