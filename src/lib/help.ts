import type { AppModuleId } from './modules'

export interface HelpGuide {
  id: string
  title: string
  description: string
  module: AppModuleId
  audience: 'everyone' | 'manager'
  steps: readonly string[]
  to: string
  action: string
}

export const HELP_GUIDES: readonly HelpGuide[] = [
  {
    id: 'first-steps',
    title: 'Začněte nastavením firmy',
    description: 'Doplňte údaje, pobočky a pozvěte kolegy jen do potřebných rolí.',
    module: 'core',
    audience: 'manager',
    steps: [
      'Zkontrolujte údaje firmy.',
      'Založte provozovny.',
      'Pozvěte kolegy a nastavte jejich role.',
    ],
    to: '/app/nastaveni',
    action: 'Otevřít nastavení',
  },
  {
    id: 'invoices',
    title: 'Vystavte první fakturu',
    description: 'Faktura, záloha, dobropis i opakovaná fakturace zůstávají na jednom místě.',
    module: 'invoicing',
    audience: 'manager',
    steps: [
      'Založte klienta.',
      'Vytvořte a odešlete fakturu.',
      'Pro pravidelné platby použijte opakovanou fakturu.',
    ],
    to: '/app/faktury',
    action: 'Otevřít faktury',
  },
  {
    id: 'cash-register',
    title: 'Prodejte na pokladně',
    description: 'Prodej se po zaplacení propíše do tržeb i skladu.',
    module: 'pos',
    audience: 'everyone',
    steps: ['Vyberte produkt.', 'Zkontrolujte účtenku.', 'Potvrďte hotovost nebo kartu.'],
    to: '/app/pokladna',
    action: 'Otevřít pokladnu',
  },
  {
    id: 'restaurant',
    title: 'Proveďte směnu v restauraci',
    description: 'Stůl, objednávka, kuchyň, platba a uzávěrka drží jeden společný stav.',
    module: 'gastro',
    audience: 'everyone',
    steps: [
      'Otevřete stůl a přidejte položky.',
      'Sledujte bon v kuchyni.',
      'Zaplaťte účet a proveďte uzávěrku.',
    ],
    to: '/app/restaurace',
    action: 'Otevřít restauraci',
  },
  {
    id: 'stock',
    title: 'Udržujte sklad přesný',
    description: 'Příjemky, inventura a zrcadlo ukáží skutečný stav i rozdíly bez tabulek.',
    module: 'stock',
    audience: 'manager',
    steps: ['Naskladněte dodávku.', 'Zapište inventuru.', 'Vyřešte rozdíly ve zrcadle skladu.'],
    to: '/app/naskladneni',
    action: 'Otevřít naskladnění',
  },
  {
    id: 'workforce',
    title: 'Naplánujte směny a docházku',
    description: 'Týdenní plán, píchačka a podklady pro mzdy jsou na jednom místě.',
    module: 'attendance',
    audience: 'manager',
    steps: ['Vytvořte směny.', 'Publikujte týden pro tým.', 'Zkontrolujte docházku a výjimky.'],
    to: '/app/smeny',
    action: 'Otevřít plán směn',
  },
  {
    id: 'reservations',
    title: 'Přijímejte rezervace',
    description: 'Rezervace z webu i od obsluhy najdete v jednom kalendáři.',
    module: 'booking',
    audience: 'everyone',
    steps: [
      'Nastavte zdroje a dostupnost.',
      'Vytvořte rezervaci.',
      'Potvrďte nebo upravte termín.',
    ],
    to: '/app/rezervace',
    action: 'Otevřít rezervace',
  },
  {
    id: 'jobs',
    title: 'Dokončete zakázku od nabídky po fakturu',
    description:
      'Ceník služeb, nabídka, pracovní list, materiál, předání i faktura jsou propojené.',
    module: 'jobs',
    audience: 'everyone',
    steps: [
      'Připravte nabídku.',
      'Převeďte ji na zakázku.',
      'Zapište práci a materiál, pak vytvořte fakturu.',
    ],
    to: '/app/zakazky',
    action: 'Otevřít zakázky',
  },
  {
    id: 'loyalty',
    title: 'Nastavte akce a věrnost',
    description: 'Cenové hladiny, automatické akce a body pomohou přivádět zákazníky zpět.',
    module: 'loyalty',
    audience: 'manager',
    steps: [
      'Vytvořte akci nebo cenovou hladinu.',
      'Nastavte věrnostní program.',
      'Při prodeji vyberte zákazníka.',
    ],
    to: '/app/akce-ceny',
    action: 'Otevřít akce a ceny',
  },
  {
    id: 'integrations',
    title: 'Připravte exporty a integrace',
    description: 'Pohoda XML, tiskový agent a provideri jsou rozlišené podle skutečného stavu.',
    module: 'integrations',
    audience: 'manager',
    steps: [
      'Doplňte údaje firmy.',
      'Stáhněte účetní export.',
      'Připojte jen aktivní službu se smlouvou.',
    ],
    to: '/app/nastaveni',
    action: 'Otevřít integrace',
  },
]

export function visibleHelpGuides(
  modules: readonly AppModuleId[],
  role: string | null | undefined,
): HelpGuide[] {
  const isManager = ['Owner', 'Admin', 'Manager'].includes(role ?? '')
  return HELP_GUIDES.filter(
    (guide) => modules.includes(guide.module) && (guide.audience === 'everyone' || isManager),
  )
}
