<script setup lang="ts">
import { Apple, Download, Monitor } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { vReveal } from '@/lib/reveal'

// V desktop appce (Tauri) běží stejný build z lokálního bundlu — nabízet tam stažení už
// nainstalované aplikace nedává smysl (stejný guard jako v patičce).
const isDesktopApp = '__TAURI_INTERNALS__' in window
</script>

<template>
  <section v-if="!isDesktopApp" id="stahnout" class="py-16 sm:py-20">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div v-reveal class="rounded-3xl border border-border bg-surface-soft p-8 sm:p-10">
        <p
          class="flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span class="h-px w-7 bg-coral" aria-hidden="true" />
          Aplikace na počítač
        </p>
        <h2
          class="mt-4 font-display text-2xl font-black leading-[1.05] tracking-[-0.02em] text-foreground sm:text-3xl"
        >
          Vystaveno i <span class="text-gradient-heading">mimo prohlížeč</span>
        </h2>
        <p class="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Stejná aplikace ve vlastním okně — bez adresního řádku a záložek, s ikonou v docku nebo na
          hlavním panelu. Data i přihlášení jsou stejná jako na webu.
        </p>

        <div class="mt-8 grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col rounded-2xl border border-border bg-background p-6">
            <div class="flex items-center gap-3">
              <Apple class="h-5 w-5 text-foreground" aria-hidden="true" />
              <h3 class="font-display text-lg font-bold text-foreground">macOS</h3>
            </div>
            <p class="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Pro Macy s čipem Apple (M1 a novější). Instalátor není podepsaný, takže ho macOS
              napoprvé otevře až přes
              <span class="whitespace-nowrap">pravé tlačítko → Otevřít</span>.
            </p>
            <Button variant="default" size="lg" class="mt-5 w-full" as-child>
              <a href="/download/vystaveno-mac.dmg" download>
                <Download class="h-4 w-4" />
                Stáhnout pro macOS
              </a>
            </Button>
          </div>

          <!-- Instalátor staví GitHub Actions na Windows runneru (.github/workflows/build-windows.yml
               v repu vystaveno-desktop) — Tauri nekompiluje napříč platformami, na Macu .exe nevznikne. -->
          <div class="flex flex-col rounded-2xl border border-border bg-background p-6">
            <div class="flex items-center gap-3">
              <Monitor class="h-5 w-5 text-foreground" aria-hidden="true" />
              <h3 class="font-display text-lg font-bold text-foreground">Windows</h3>
            </div>
            <p class="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Pro 64bitové Windows 10 a 11. Instalátor není podepsaný, takže SmartScreen napoprvé
              ukáže varování — rozbalte
              <span class="whitespace-nowrap">Více informací → Přesto spustit</span>.
            </p>
            <Button variant="default" size="lg" class="mt-5 w-full" as-child>
              <a href="/download/vystaveno-windows.exe" download>
                <Download class="h-4 w-4" />
                Stáhnout pro Windows
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
