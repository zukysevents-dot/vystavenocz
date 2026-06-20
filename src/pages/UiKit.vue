<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

const inputValue = ref('')
const textareaValue = ref('')
</script>

<template>
  <div class="space-y-10">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight">UI Kit</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        F1-14 · základní primitiva (dev-only přehled)
      </p>
    </header>

    <!-- Button -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Button</h2>
      <div class="flex flex-wrap items-center gap-3">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Přidat"><Plus /></Button>
        <Button disabled>Disabled</Button>
      </div>
    </section>

    <!-- Badge -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Badge</h2>
      <div class="flex flex-wrap items-center gap-3">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    </section>

    <!-- Form primitiva -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Input · Label · Textarea</h2>
      <div class="grid max-w-sm gap-4">
        <div class="grid gap-1.5">
          <Label for="demo-email">E-mail</Label>
          <Input id="demo-email" v-model="inputValue" type="email" placeholder="jan@firma.cz" />
        </div>
        <div class="grid gap-1.5">
          <Label for="demo-note">Poznámka</Label>
          <Textarea id="demo-note" v-model="textareaValue" placeholder="Napiš něco…" />
        </div>
        <div class="grid gap-1.5">
          <Label for="demo-disabled">Zakázané pole</Label>
          <Input id="demo-disabled" disabled placeholder="Nedostupné" />
        </div>
      </div>
    </section>

    <!-- Card -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Card</h2>
      <Card class="max-w-sm">
        <CardHeader>
          <CardTitle>Faktura #2024-001</CardTitle>
          <CardDescription>Splatnost 30. 6. 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-sm">Obsah karty — shrnutí položek a celkové částky.</p>
        </CardContent>
        <CardFooter class="justify-end gap-2">
          <Button variant="outline" size="sm">Detail</Button>
          <Button size="sm">Zaplatit</Button>
        </CardFooter>
      </Card>
    </section>

    <!-- Separator -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Separator</h2>
      <div class="max-w-sm">
        <p class="text-sm">Nad oddělovačem</p>
        <Separator class="my-3" />
        <p class="text-sm">Pod oddělovačem</p>
        <div class="mt-4 flex h-5 items-center gap-3 text-sm">
          <span>Vlevo</span>
          <Separator orientation="vertical" />
          <span>Vpravo</span>
        </div>
      </div>
    </section>

    <!-- Avatar -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Avatar</h2>
      <div class="flex items-center gap-4">
        <Avatar>
          <AvatarImage src="https://github.com/vuejs.png" alt="Vue" />
          <AvatarFallback>VU</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>JN</AvatarFallback>
        </Avatar>
      </div>
    </section>

    <!-- AspectRatio -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">AspectRatio (16:9)</h2>
      <div class="max-w-sm">
        <AspectRatio :ratio="16 / 9" class="overflow-hidden rounded-md bg-muted">
          <div class="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            16 / 9
          </div>
        </AspectRatio>
      </div>
    </section>

    <!-- Skeleton -->
    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Skeleton</h2>
      <div class="flex items-center gap-4">
        <Skeleton class="h-10 w-10 rounded-full" />
        <div class="space-y-2">
          <Skeleton class="h-4 w-[200px]" />
          <Skeleton class="h-4 w-[160px]" />
        </div>
      </div>
    </section>
  </div>
</template>
