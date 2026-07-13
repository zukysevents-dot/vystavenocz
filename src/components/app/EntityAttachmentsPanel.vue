<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download, FileImage, FileText, Loader2, Paperclip, Plus, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/sonner'
import { ApiError, isApiMode } from '@/lib/http'
import { useDocuments, type EntityDocument } from '@/composables/useDocuments'

const props = defineProps<{
  entityId: string
  canManage: boolean
}>()

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const FALLBACK_TYPES = new Set(['', 'application/octet-stream'])
const ACCEPTED_EXTENSION = /\.(pdf|jpe?g|png|webp)$/i
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'

const apiMode = isApiMode()
const documentsApi = useDocuments(props.entityId)
const documents = ref<EntityDocument[]>([])
const loading = ref(apiMode)
const loadError = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const downloadingId = ref<string | null>(null)
const deleteTarget = ref<EntityDocument | null>(null)
const deleting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const busy = computed(() => loading.value || uploading.value || deleting.value)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`
}

function formatUploadedAt(value: string): string {
  if (!value) return 'Datum neuvedeno'
  return new Date(value).toLocaleString('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' })
}

function isAccepted(file: File): boolean {
  const type = file.type.toLowerCase()
  return (
    ACCEPTED_TYPES.has(type) || (FALLBACK_TYPES.has(type) && ACCEPTED_EXTENSION.test(file.name))
  )
}

function uploadError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Soubor se nepodařilo nahrát.'
  if (error.status === 413) return 'Soubor je příliš velký. Maximální velikost je 10 MB.'
  if (error.status === 415) return 'Tento typ souboru není podporovaný.'
  if (error.status === 422) return error.message || 'Soubor nesplňuje požadavky pro nahrání.'
  return 'Soubor se nepodařilo nahrát.'
}

async function load(): Promise<void> {
  if (!apiMode) return
  loading.value = true
  loadError.value = false
  try {
    documents.value = await documentsApi.list()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function chooseFiles(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const selected = Array.from(input.files ?? [])
  input.value = ''
  if (!selected.length || uploading.value) return

  uploading.value = true
  uploadProgress.value = 0
  let uploaded = 0
  const failures: Array<{ name: string; reason: string }> = []
  for (let index = 0; index < selected.length; index += 1) {
    const file = selected[index]
    let validationError: string | null = null
    if (!isAccepted(file)) validationError = 'nepodporovaný typ souboru'
    else if (file.size > MAX_FILE_SIZE) validationError = 'soubor je větší než 10 MB'

    if (validationError) {
      failures.push({ name: file.name, reason: validationError })
      uploadProgress.value = Math.max(
        uploadProgress.value,
        Math.round(((index + 1) / selected.length) * 100),
      )
      continue
    }

    try {
      const document = await documentsApi.upload(selected[index], (fileProgress) => {
        uploadProgress.value = Math.max(
          uploadProgress.value,
          Math.round(((index + fileProgress / 100) / selected.length) * 100),
        )
      })
      documents.value = [document, ...documents.value.filter((item) => item.id !== document.id)]
      uploaded += 1
    } catch (error) {
      failures.push({ name: file.name, reason: uploadError(error) })
    }
  }

  if (!failures.length) {
    toast.success(uploaded === 1 ? 'Soubor byl nahrán.' : `Nahráno ${uploaded} souborů.`)
  } else {
    const detail = failures.map((failure) => `${failure.name}: ${failure.reason}`).join('; ')
    const summary = `Nahráno ${uploaded} z ${selected.length} souborů. Selhalo ${failures.length}: ${detail}`
    if (uploaded) toast.warning(summary)
    else toast.error(summary)
  }
  uploading.value = false
  uploadProgress.value = 0
}

async function download(document: EntityDocument): Promise<void> {
  if (downloadingId.value) return
  downloadingId.value = document.id
  try {
    const response = await documentsApi.download(document.id)
    const url = URL.createObjectURL(response.blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = response.fileName || document.fileName
    window.document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch {
    toast.error('Soubor se nepodařilo stáhnout.')
  } finally {
    downloadingId.value = null
  }
}

async function remove(target: EntityDocument | null): Promise<void> {
  if (!target || deleting.value) return
  deleting.value = true
  try {
    await documentsApi.remove(target.id)
    documents.value = documents.value.filter((document) => document.id !== target.id)
    deleteTarget.value = null
    toast.success('Soubor byl smazán.')
  } catch {
    toast.error('Soubor se nepodařilo smazat.')
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="rounded-2xl border border-border bg-card" aria-labelledby="attachments-heading">
    <div
      class="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border p-4"
    >
      <div>
        <h2 id="attachments-heading" class="flex items-center gap-1.5 font-semibold">
          <Paperclip class="h-4 w-4 text-primary" /> Dokumenty a soubory
        </h2>
        <p v-if="apiMode" class="mt-0.5 text-xs text-muted-foreground">
          PDF nebo obrázky, každý nejvýše 10 MB
        </p>
      </div>
      <template v-if="apiMode && canManage">
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          :accept="ACCEPT"
          multiple
          :disabled="busy"
          aria-label="Vybrat soubory k nahrání"
          @change="chooseFiles"
        />
        <Button variant="outline" size="sm" :disabled="busy" @click="fileInput?.click()">
          <Loader2 v-if="uploading" class="animate-spin" />
          <Plus v-else />
          {{ uploading ? 'Nahrávám' : 'Přidat soubory' }}
        </Button>
      </template>
    </div>

    <div v-if="!apiMode" class="p-4 text-sm text-muted-foreground">
      Přílohy jsou dostupné po přihlášení do online aplikace.
    </div>

    <template v-else>
      <div class="min-h-6 px-4 pt-2" aria-live="polite">
        <div v-if="uploading" class="flex items-center gap-3 text-xs text-muted-foreground">
          <Progress :model-value="uploadProgress" class="h-1.5 flex-1" />
          <span class="w-9 text-right tabular-nums">{{ uploadProgress }} %</span>
        </div>
      </div>

      <div v-if="loading" class="flex min-h-24 items-center justify-center p-4">
        <Loader2 class="h-5 w-5 animate-spin text-primary" aria-label="Načítám soubory" />
      </div>
      <div v-else-if="loadError" class="flex min-h-24 items-center justify-between gap-3 p-4">
        <p class="text-sm text-muted-foreground">Soubory se nepodařilo načíst.</p>
        <Button variant="outline" size="sm" @click="load">Zkusit znovu</Button>
      </div>
      <div v-else-if="!documents.length" class="min-h-24 p-4 text-sm text-muted-foreground">
        K zakázce zatím nejsou přiložené žádné soubory.
      </div>
      <ul v-else class="divide-y divide-border">
        <li
          v-for="document in documents"
          :key="document.id"
          class="flex min-h-20 items-center gap-3 px-4 py-3"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileImage v-if="document.contentType.startsWith('image/')" class="h-4 w-4" />
            <FileText v-else class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium" :title="document.fileName">
              {{ document.fileName }}
            </div>
            <div class="mt-0.5 text-xs text-muted-foreground">
              {{ formatSize(document.size) }} · {{ formatUploadedAt(document.uploadedAt) }}
              <span v-if="document.uploadedByName"> · {{ document.uploadedByName }}</span>
            </div>
          </div>
          <div class="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              :title="`Stáhnout ${document.fileName}`"
              :aria-label="`Stáhnout ${document.fileName}`"
              :disabled="Boolean(downloadingId)"
              @click="download(document)"
            >
              <Loader2 v-if="downloadingId === document.id" class="animate-spin" />
              <Download v-else />
            </Button>
            <Button
              v-if="canManage"
              variant="ghost"
              size="icon"
              :title="`Smazat ${document.fileName}`"
              :aria-label="`Smazat ${document.fileName}`"
              :disabled="busy"
              @click="deleteTarget = document"
            >
              <Trash2 class="text-destructive" />
            </Button>
          </div>
        </li>
      </ul>
    </template>
  </section>

  <AlertDialog
    :open="Boolean(deleteTarget)"
    @update:open="(open) => !open && (deleteTarget = null)"
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Smazat soubor?</AlertDialogTitle>
        <AlertDialogDescription>
          Soubor „{{ deleteTarget?.fileName }}“ bude ze zakázky trvale odstraněn.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="deleting">Zrušit</AlertDialogCancel>
        <Button variant="destructive" :disabled="deleting" @click="remove(deleteTarget)">
          <Loader2 v-if="deleting" class="animate-spin" />
          Smazat
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
