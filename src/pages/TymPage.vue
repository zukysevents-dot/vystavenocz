<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import SecretRevealDialog from '@/components/settings/SecretRevealDialog.vue'
import { toast } from '@/components/ui/sonner'
import {
  INVITABLE_ROLES,
  MEMBER_ROLE_LABELS,
  STAFF_ROLES,
  useMembers,
  type Invitation,
  type Member,
  type MemberRole,
} from '@/composables/useMembers'
import { useLocations } from '@/composables/useLocations'
import { useAuthStore } from '@/stores/auth'
import { ApiError, isApiMode } from '@/lib/http'

const apiMode = isApiMode()
const membersApi = useMembers()
const { locations, load: loadLocations } = useLocations()
const auth = useAuthStore()

const loading = ref(true)
const loadError = ref(false)
const busy = ref(false)
const members = ref<Member[]>([])
const invitations = ref<Invitation[]>([])

const pendingInvitations = computed(() => invitations.value.filter((i) => i.status === 'Pending'))

function roleLabel(role: MemberRole): string {
  return MEMBER_ROLE_LABELS[role] ?? role
}

function locationName(id: string | null): string {
  if (!id) return 'Všechny pobočky'
  return locations.value.find((l) => l.id === id)?.name ?? 'Neznámá pobočka'
}

async function load(): Promise<void> {
  if (!apiMode) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = false
  try {
    const [memberList, invitationList] = await Promise.all([
      membersApi.listMembers(),
      membersApi.listInvitations(),
    ])
    members.value = memberList.items
    invitations.value = invitationList.items
    await loadLocations()
  } catch (e) {
    loadError.value = true
    console.warn('Načtení týmu selhalo:', e)
  } finally {
    loading.value = false
  }
}

// --- Pozvánka e-mailem ---
const inviteOpen = ref(false)
const inviteForm = reactive({ email: '', role: 'Employee' as MemberRole, locationId: '' })
const invitationToken = ref('')
const invitationTokenNote = ref('')

async function submitInvite(): Promise<void> {
  if (!inviteForm.email.trim()) {
    toast.error('Zadejte e-mail.')
    return
  }
  busy.value = true
  try {
    const created = await membersApi.createInvitation({
      email: inviteForm.email.trim(),
      role: inviteForm.role,
      locationId: inviteForm.locationId || null,
    })
    inviteOpen.value = false
    inviteForm.email = ''
    invitationToken.value = `${window.location.origin}/pozvanka/${created.token}`
    invitationTokenNote.value = created.emailDelivered
      ? 'Pozvánka odešla e-mailem. Odkaz můžete předat i jinak (např. chatem) — platí 7 dní.'
      : 'E-mail se nepodařilo odeslat — předejte pozvánkový odkaz kolegovi sami. Platí 7 dní.'
    await load()
  } catch (e) {
    if (e instanceof ApiError && e.status === 409)
      toast.error('Uživatel už je členem, nebo má čekající pozvánku.')
    else if (e instanceof ApiError && e.status === 422) toast.error('Zkontrolujte e-mail a roli.')
    else toast.error('Pozvánku se nepodařilo vytvořit.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function revokeInvitation(id: string): Promise<void> {
  busy.value = true
  try {
    await membersApi.revokeInvitation(id)
    toast.success('Pozvánka zrušena.')
    await load()
  } catch (e) {
    toast.error('Pozvánku se nepodařilo zrušit.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

// --- Pracovník bez e-mailu ---
const staffOpen = ref(false)
const staffForm = reactive({ displayName: '', role: 'Employee' as MemberRole, locationId: '' })

async function submitStaff(): Promise<void> {
  if (!staffForm.displayName.trim()) {
    toast.error('Zadejte jméno pracovníka.')
    return
  }
  busy.value = true
  try {
    await membersApi.createStaff({
      displayName: staffForm.displayName.trim(),
      role: staffForm.role,
      locationId: staffForm.locationId || null,
    })
    staffOpen.value = false
    staffForm.displayName = ''
    // Nesmí slibovat přihlášení PINem — obrazovka pro přihlášení PINem zatím není ani ve webové
    // pokladně, ani v mobilní aplikaci. Pracovník bez e-mailu se tedy sám nikam nepřihlásí.
    toast.success('Pracovník založen. Zatím se ale sám nepřihlásí — potřebuje účet s e-mailem.')
    await load()
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) toast.error('Zkontrolujte jméno a roli.')
    else toast.error('Pracovníka se nepodařilo založit.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

// --- Úprava člena ---
const editOpen = ref(false)
const editTarget = ref<Member | null>(null)
const editForm = reactive({ role: 'Employee' as MemberRole, locationId: '', discountLimit: '' })

function openEdit(member: Member): void {
  editTarget.value = member
  editForm.role = member.role
  editForm.locationId = member.locationId ?? ''
  editForm.discountLimit =
    member.discountLimitPercent == null ? '' : String(member.discountLimitPercent)
  editOpen.value = true
}

async function submitEdit(): Promise<void> {
  const target = editTarget.value
  if (!target) return
  const limit = editForm.discountLimit.trim() === '' ? null : Number(editForm.discountLimit)
  if (limit != null && (!Number.isFinite(limit) || limit < 0 || limit > 100)) {
    toast.error('Limit slevy zadejte v procentech (0–100), nebo nechte prázdné.')
    return
  }
  busy.value = true
  try {
    await membersApi.updateMember(target.userId, {
      role: editForm.role,
      locationId: editForm.locationId || null,
      discountLimitPercent: limit,
    })
    editOpen.value = false
    toast.success('Člen upraven.')
    await load()
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) toast.error('Zkontrolujte roli a pobočku.')
    else if (e instanceof ApiError && e.status === 409)
      toast.error('Tuto změnu nelze provést (např. poslední majitel).')
    else toast.error('Člena se nepodařilo upravit.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

// --- PIN ---
const pinOpen = ref(false)
const pinTarget = ref<Member | null>(null)
const pinValue = ref('')

function openPin(member: Member): void {
  pinTarget.value = member
  pinValue.value = ''
  pinOpen.value = true
}

async function submitPin(): Promise<void> {
  const target = pinTarget.value
  if (!target) return
  if (!/^\d{4,8}$/.test(pinValue.value)) {
    toast.error('PIN zadejte jako 4–8 číslic.')
    return
  }
  busy.value = true
  try {
    await membersApi.setPin(target.userId, pinValue.value)
    pinOpen.value = false
    pinValue.value = ''
    toast.success('PIN nastaven. Hodnotu nikde neukládáme — předejte ji pracovníkovi.')
    await load()
  } catch (e) {
    if (e instanceof ApiError && e.status === 422)
      toast.error('Tento PIN už ve firmě někdo používá — zvolte jiný.')
    else if (e instanceof ApiError && e.status === 503)
      toast.error('PINy nejsou na serveru nakonfigurované. Obraťte se na podporu.')
    else toast.error('PIN se nepodařilo nastavit.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function clearPin(member: Member): Promise<void> {
  busy.value = true
  try {
    await membersApi.clearPin(member.userId)
    toast.success('PIN zrušen.')
    await load()
  } catch (e) {
    toast.error('PIN se nepodařilo zrušit.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

// --- Odebrání člena ---
// Otevření dialogu řídí samostatný flag (vzor KlientiPage deleteOpen/deleteId):
// AlertDialogAction při kliku dialog rovnou zavírá a update:open by cíl vynuloval
// dřív, než akce doběhne — DELETE by se pak vůbec neodeslal.
const removeTarget = ref<Member | null>(null)
const removeOpen = ref(false)

function askRemove(member: Member): void {
  removeTarget.value = member
  removeOpen.value = true
}

async function confirmRemove(): Promise<void> {
  const target = removeTarget.value
  if (!target) return
  removeOpen.value = false
  busy.value = true
  try {
    await membersApi.removeMember(target.userId)
    toast.success('Člen odebrán z firmy.')
    await load()
  } catch (e) {
    if (e instanceof ApiError && e.status === 409)
      toast.error('Člena nelze odebrat (např. poslední majitel firmy).')
    else toast.error('Člena se nepodařilo odebrat.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

function isSelf(member: Member): boolean {
  return member.email != null && member.email === auth.user?.email
}

onMounted(() => load())
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div
      v-if="!apiMode"
      class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <Users class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Správa týmu teď není dostupná</p>
      <p class="mt-1 text-sm">Členy, role a pozvánky spravujete v online aplikaci.</p>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Tým</h1>
          <p class="mt-1 text-muted-foreground">
            Členové firmy, role, pobočky, limity slev a PINy pro pokladnu.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" :disabled="loading" @click="load()">
            <RefreshCw class="h-4 w-4" /> Obnovit
          </Button>
          <Button variant="outline" @click="staffOpen = true">
            <Plus class="h-4 w-4" /> Pracovník bez e-mailu
          </Button>
          <Button @click="inviteOpen = true"> <UserPlus class="h-4 w-4" /> Pozvat člena </Button>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
      </div>

      <div
        v-else-if="loadError"
        class="mt-6 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground"
      >
        <p class="font-semibold text-foreground">Tým se nepodařilo načíst</p>
        <Button class="mt-3" variant="outline" @click="load()">Zkusit znovu</Button>
      </div>

      <template v-else>
        <div class="mt-6 space-y-3">
          <div
            v-for="member in members"
            :key="member.userId"
            class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div class="min-w-0">
              <p class="font-semibold">
                {{ member.displayName }}
                <span v-if="isSelf(member)" class="text-xs font-normal text-muted-foreground">
                  (vy)</span
                >
              </p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                {{ member.email ?? 'Bez e-mailu — zatím se nemůže sám přihlásit' }}
              </p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {{ locationName(member.locationId) }}
                <template v-if="member.discountLimitPercent != null">
                  · sleva do {{ member.discountLimitPercent }} %</template
                >
                <template v-if="member.hasPin"> · PIN nastaven</template>
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {{ roleLabel(member.role) }}
              </span>
              <Button
                variant="outline"
                size="sm"
                :disabled="busy"
                :title="member.hasPin ? 'Změnit PIN' : 'Nastavit PIN'"
                @click="openPin(member)"
              >
                <KeyRound class="h-4 w-4" />
              </Button>
              <Button
                v-if="member.hasPin"
                variant="outline"
                size="sm"
                :disabled="busy"
                @click="clearPin(member)"
              >
                Zrušit PIN
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="busy || member.role === 'Owner'"
                title="Upravit roli a pobočku"
                @click="openEdit(member)"
              >
                <Pencil class="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="text-destructive"
                :disabled="busy || isSelf(member) || member.role === 'Owner'"
                title="Odebrat z firmy"
                @click="askRemove(member)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div class="mt-8">
          <h2 class="text-lg font-semibold">Čekající pozvánky</h2>
          <p v-if="!pendingInvitations.length" class="mt-2 text-sm text-muted-foreground">
            Žádné čekající pozvánky.
          </p>
          <div v-else class="mt-3 space-y-2">
            <div
              v-for="invitation in pendingInvitations"
              :key="invitation.id"
              class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div>
                <p class="text-sm font-medium">{{ invitation.email }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ roleLabel(invitation.role) }} · platí do
                  {{ new Date(invitation.expiresAt).toLocaleDateString('cs-CZ') }}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                :disabled="busy"
                @click="revokeInvitation(invitation.id)"
              >
                Zrušit pozvánku
              </Button>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Pozvat člena -->
    <Dialog :open="inviteOpen" @update:open="(v) => (inviteOpen = v)">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pozvat člena</DialogTitle>
          <DialogDescription>
            Kolegovi přijde e-mail s pozvánkou. Token uvidíte i tady — kdyby e-mail nedorazil,
            předáte ho sami.
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-3" @submit.prevent="submitInvite">
          <div class="space-y-1.5">
            <Label for="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              v-model="inviteForm.email"
              type="email"
              required
              placeholder="kolega@firma.cz"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="invite-role">Role</Label>
            <select
              id="invite-role"
              v-model="inviteForm.role"
              class="flex h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option v-for="role in INVITABLE_ROLES" :key="role" :value="role">
                {{ roleLabel(role) }}
              </option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="invite-location">Pobočka</Label>
            <select
              id="invite-location"
              v-model="inviteForm.locationId"
              class="flex h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Všechny pobočky</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="inviteOpen = false">Zrušit</Button>
            <Button type="submit" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Poslat pozvánku
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Pracovník bez e-mailu -->
    <Dialog :open="staffOpen" @update:open="(v) => (staffOpen = v)">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pracovník bez e-mailu</DialogTitle>
          <DialogDescription>
            Zavedete pracovníka do týmu (role, pobočka, limit slevy) bez zakládání e-mailového účtu.
            <strong>Přihlášení PINem na pokladně zatím není hotové</strong> — kdo se má sám
            přihlašovat, potřebuje pozvánku na e-mail.
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-3" @submit.prevent="submitStaff">
          <div class="space-y-1.5">
            <Label for="staff-name">Jméno a příjmení</Label>
            <Input
              id="staff-name"
              v-model="staffForm.displayName"
              required
              placeholder="Jan Novák"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="staff-role">Role</Label>
            <select
              id="staff-role"
              v-model="staffForm.role"
              class="flex h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option v-for="role in STAFF_ROLES" :key="role" :value="role">
                {{ roleLabel(role) }}
              </option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="staff-location">Pobočka</Label>
            <select
              id="staff-location"
              v-model="staffForm.locationId"
              class="flex h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Všechny pobočky</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="staffOpen = false">Zrušit</Button>
            <Button type="submit" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Založit pracovníka
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Upravit člena -->
    <Dialog :open="editOpen" @update:open="(v) => (editOpen = v)">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upravit člena</DialogTitle>
          <DialogDescription>{{ editTarget?.displayName }}</DialogDescription>
        </DialogHeader>
        <form class="space-y-3" @submit.prevent="submitEdit">
          <div class="space-y-1.5">
            <Label for="edit-role">Role</Label>
            <select
              id="edit-role"
              v-model="editForm.role"
              class="flex h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option v-for="role in INVITABLE_ROLES" :key="role" :value="role">
                {{ roleLabel(role) }}
              </option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="edit-location">Pobočka</Label>
            <select
              id="edit-location"
              v-model="editForm.locationId"
              class="flex h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Všechny pobočky</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="edit-discount">Limit slevy v % (prázdné = bez limitu)</Label>
            <Input
              id="edit-discount"
              v-model="editForm.discountLimit"
              inputmode="numeric"
              placeholder="např. 10"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="editOpen = false">Zrušit</Button>
            <Button type="submit" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit změny
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Nastavit PIN -->
    <Dialog :open="pinOpen" @update:open="(v) => (pinOpen = v)">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{{ pinTarget?.hasPin ? 'Změnit PIN' : 'Nastavit PIN' }}</DialogTitle>
          <DialogDescription>
            {{ pinTarget?.displayName }} — PIN dnes slouží k
            <strong>schválení rizikové akce</strong>
            (storno, sleva nad limit), kde ho nadřízený zadá na zařízení obsluhy. Rychlé přepnutí
            obsluhy PINem na pokladně zatím není hotové. Nikde se neukládá v čitelné podobě.
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-3" @submit.prevent="submitPin">
          <div class="space-y-1.5">
            <Label for="pin-value">PIN (4–8 číslic)</Label>
            <Input
              id="pin-value"
              v-model="pinValue"
              type="password"
              inputmode="numeric"
              autocomplete="off"
              placeholder="••••"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="pinOpen = false">Zrušit</Button>
            <Button type="submit" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit PIN
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Odebrat člena -->
    <AlertDialog :open="removeOpen" @update:open="(v) => (removeOpen = v)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Odebrat člena z firmy?</AlertDialogTitle>
          <AlertDialogDescription>
            {{ removeTarget?.displayName }} ztratí přístup k firmě okamžitě. Historie jeho akcí
            zůstane zachovaná.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="removeOpen = false">Ponechat</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground"
            @click="confirmRemove"
          >
            Odebrat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <SecretRevealDialog
      :open="invitationToken !== ''"
      title="Pozvánka vytvořena"
      :description="invitationTokenNote"
      :secret="invitationToken"
      @close="invitationToken = ''"
    />
  </div>
</template>
