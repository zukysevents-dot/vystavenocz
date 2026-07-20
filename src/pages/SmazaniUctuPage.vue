<script setup lang="ts">
import PageHeader from '@/components/landing/PageHeader.vue'
</script>

<template>
  <PageHeader
    eyebrow="Právní"
    title="Smazání účtu Vystaveno"
    subtitle="Jak trvale smazat účet a osobní údaje v aplikaci Vystaveno (web, Android i iOS)."
  />

  <article
    class="prose-fakturio mx-auto mt-12 max-w-3xl space-y-8 px-4 pb-24 text-foreground sm:px-6 lg:px-8"
  >
    <section>
      <h2 class="text-2xl font-bold">1. Smazání účtu přímo v mobilní aplikaci</h2>
      <ol class="ml-6 mt-3 list-decimal space-y-2 text-muted-foreground">
        <li>Přihlaste se do mobilní aplikace <strong>Vystaveno</strong>.</li>
        <li>Otevřete <strong>Více → Nastavení</strong>.</li>
        <li>Dole zvolte <strong>Smazat účet</strong>.</li>
        <li>
          Potvrďte akci heslem (účty přihlašované jen přes Google nebo Apple heslo nemají — stačí
          potvrzení).
        </li>
      </ol>
      <p class="mt-3 text-muted-foreground">
        Smazání je okamžité a nevratné. Všechna přihlášení se ihned ukončí.
      </p>
    </section>

    <section>
      <h2 class="text-2xl font-bold">2. Žádost o smazání bez přístupu do aplikace</h2>
      <p class="mt-3 text-muted-foreground">
        Pokud už aplikaci nemáte nainstalovanou nebo se nemůžete přihlásit, pošlete žádost o smazání
        účtu z e-mailové adresy, na kterou je účet registrovaný, na
        <a href="mailto:patrik@vystaveno.cz" class="text-primary underline">patrik@vystaveno.cz</a>
        s předmětem <strong>„Smazání účtu Vystaveno"</strong>. Žádost vyřídíme nejpozději do 30 dnů
        a potvrdíme e-mailem.
      </p>
    </section>

    <section>
      <h2 class="text-2xl font-bold">3. Co se smaže a co musíme uchovat</h2>
      <h3 class="mt-4 text-lg font-semibold">Smažeme / anonymizujeme okamžitě</h3>
      <ul class="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
        <li>e-mailovou adresu, jméno a heslo účtu,</li>
        <li>propojení s přihlášením přes Google a Apple,</li>
        <li>všechna aktivní přihlášení (tokeny) a PINy,</li>
        <li>členství ve firmách vedených ve Vystaveno.</li>
      </ul>

      <h3 class="mt-4 text-lg font-semibold">Ze zákona musíme uchovat</h3>
      <p class="mt-2 text-muted-foreground">
        Vystavené daňové doklady, účetní záznamy a související provozní záznamy firmy (faktury,
        prodeje, uzávěrky, audit) podléhají zákonné archivaci podle zákona č. 563/1991 Sb., o
        účetnictví, a zákona č. 235/2004 Sb., o DPH (až 10 let). Tyto záznamy zůstávají uložené bez
        vazby na váš smazaný účet a nelze se k nim vaším účtem nadále přihlásit.
      </p>
      <p class="mt-3 text-muted-foreground">
        Pokud jste poslední majitel firmy, ve které zůstávají další členové, je nejprve potřeba
        předat roli majitele jinému členovi (v aplikaci v sekci <strong>Tým</strong>), jinak by
        ostatní ztratili přístup k datům firmy.
      </p>
    </section>

    <section>
      <h2 class="text-2xl font-bold">4. Správce údajů a další informace</h2>
      <p class="mt-3 text-muted-foreground">
        Správcem osobních údajů je <strong>Patrik Zukal</strong>, IČO 24991686. Podrobnosti o
        zpracování osobních údajů najdete v dokumentu
        <RouterLink to="/gdpr" class="text-primary underline"
          >Ochrana osobních údajů (GDPR)</RouterLink
        >.
      </p>
    </section>
  </article>
</template>
