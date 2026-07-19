import type { AppModuleId } from './modules'

export interface HelpStep {
  title: string
  description: string
}

export interface HelpGuide {
  id: string
  title: string
  description: string
  module: AppModuleId
  audience: 'everyone' | 'manager'
  whatItMeans: string
  whenToUse: string
  steps: readonly HelpStep[]
  tip: string
  to: string
  action: string
}

const step = (title: string, description: string): HelpStep => ({ title, description })

export const HELP_GUIDES: readonly HelpGuide[] = [
  {
    id: 'first-steps',
    title: '1. Nastavte firmu a tým',
    module: 'core',
    audience: 'manager',
    description: 'Nejdřív připravte údaje firmy, pobočky a přístupy kolegů.',
    whatItMeans: 'Pobočka je konkrétní provozovna. Role určuje, co člověk smí vidět a měnit.',
    whenToUse: 'Při prvním spuštění aplikace nebo když otevíráte další provozovnu.',
    steps: [
      step('Doplňte údaje firmy', 'Zkontrolujte název, IČO, kontakty a fakturační údaje.'),
      step('Založte pobočky', 'Přidejte místo, kde prodáváte nebo poskytujete služby.'),
      step('Pozvěte kolegy', 'Každému přidělte jen roli, kterou pro práci opravdu potřebuje.'),
    ],
    tip: 'Začněte vlastníkem a jednou pobočkou. Další nastavení lze doplnit později.',
    to: '/app/nastaveni',
    action: 'Otevřít nastavení',
  },
  {
    id: 'growth-referral-partner',
    title: 'Doporučte Vystaveno nebo se staňte partnerem',
    module: 'core',
    audience: 'manager',
    description: 'Jednorázový doporučovací kód, partnerská přihláška a přehled o stavu nároku.',
    whatItMeans:
      'Doporučení bezpečně spojí vaši firmu s novou firmou. Partner může po schválení přivádět zákazníky vlastním kódem. Ani kód, ani návrat z platební stránky samy o sobě nevytvoří slevu nebo provizi.',
    whenToUse:
      'Když chcete doporučit Vystaveno jiné firmě, obdrželi jste kód, nebo chcete podat partnerskou přihlášku.',
    steps: [
      step(
        'Vytvořte a hned zkopírujte kód',
        'V Nastavení firmy otevřete Doporučení a partnerství. Kód platí 90 dní a zobrazí se jen při vytvoření.',
      ),
      step(
        'Nová firma kód uplatní',
        'Majitel, administrátor nebo vedoucí ho zadá ve stejném místě. Systém pak ukáže, že vztah čeká na ověření.',
      ),
      step(
        'Sledujte kvalifikaci',
        'Jeden měsíc zdarma se zpřístupní až po první ověřené platbě nové firmy. Partner může před schválením jen odeslat přihlášku; po schválení uvidí získané a kvalifikované firmy.',
      ),
    ],
    tip: 'Kód neposílejte veřejně ani ho neukládejte do sdíleného dokumentu. Pokud ho ztratíte, vytvořte nový; starý nelze znovu zobrazit.',
    to: '/app/nastaveni',
    action: 'Otevřít doporučení a partnerství',
  },
  {
    id: 'catalog',
    title: '2. Připravte nabídku produktů',
    module: 'pos',
    audience: 'manager',
    description: 'Produkty a kategorie jsou základ pro pokladnu, restauraci i sklad.',
    whatItMeans:
      'Kategorie třídí nabídku. Produkt je položka, kterou zákazník kupuje; může mít cenu, DPH, čárový kód i skladovou zásobu.',
    whenToUse: 'Než začnete prodávat nebo když přidáváte nové zboží či jídlo.',
    steps: [
      step('Založte kategorie', 'Například Nápoje, Jídla nebo Služby.'),
      step('Přidejte produkty', 'Vyplňte název, cenu a správnou sazbu DPH.'),
      step('Zkontrolujte zobrazení', 'Otevřete Pokladnu a ověřte, že se nabídka dá rychle najít.'),
    ],
    tip: 'U skladového zboží doplňte nákupní cenu a jednotku — reporty pak umí spočítat marži.',
    to: '/app/kategorie',
    action: 'Otevřít kategorie',
  },
  {
    id: 'invoices',
    title: 'Vystavte fakturu',
    module: 'invoicing',
    audience: 'manager',
    description: 'Fakturace pro jednorázové i firemní odběratele.',
    whatItMeans:
      'Faktura je běžný daňový doklad. Zálohová faktura (proforma) je výzva k platbě; dobropis opravuje již vystavenou fakturu.',
    whenToUse: 'Když prodáváte na fakturu nebo potřebujete vyúčtovat službu klientovi.',
    steps: [
      step('Založte klienta', 'Uložte jméno nebo firmu a kontaktní údaje.'),
      step('Vytvořte doklad', 'Přidejte položky; součty a DPH spočítá systém.'),
      step('Vystavte nebo odešlete', 'Před odesláním zkontrolujte splatnost a údaje odběratele.'),
    ],
    tip: 'Dobropis nevytvářejte ručně: otevřete původní fakturu a použijte její akci Dobropis.',
    to: '/app/faktury',
    action: 'Otevřít faktury',
  },
  {
    id: 'recurring',
    title: 'Nastavte opakovanou fakturu',
    module: 'invoicing',
    audience: 'manager',
    description: 'Šablona pro pravidelné měsíční vyúčtování bez přepisování položek.',
    whatItMeans:
      'Šablona vytvoří fakturu ve zvolený den. Bezpečný výchozí stav je koncept — před odesláním ho můžete zkontrolovat.',
    whenToUse: 'Pro nájem, paušál, servis nebo pravidelnou správu.',
    steps: [
      step('Vyberte klienta', 'Šablona vždy patří jednomu odběrateli.'),
      step('Zadejte položky a den', 'Například každý měsíc 1. den.'),
      step(
        'Sledujte další běh',
        'Kdykoli můžete šablonu pozastavit nebo vygenerovat doklad ručně.',
      ),
    ],
    tip: 'Zapněte automatické vystavení až poté, co si jeden běh ověříte jako koncept.',
    to: '/app/opakovane-faktury',
    action: 'Otevřít opakované faktury',
  },
  {
    id: 'cash-register',
    title: 'Prodávejte na pokladně',
    module: 'pos',
    audience: 'everyone',
    description: 'Rychlý prodej s účtenkou, hotovostí nebo kartou.',
    whatItMeans:
      'Pokladna vytváří dokončený prodej. Ten se propíše do tržeb a u skladových položek i do zásob.',
    whenToUse: 'Při běžném prodeji u pultu nebo při rychlém prodeji zboží.',
    steps: [
      step(
        'Vyberte nebo naskenujte produkt',
        'Můžete hledat názvem, skladovým kódem nebo čárovým kódem.',
      ),
      step('Zkontrolujte košík', 'Upravte množství dřív, než začnete platbu.'),
      step(
        'Dokončete platbu',
        'U hotovosti zadejte přijatou částku, u karty potvrďte platbu z terminálu.',
      ),
    ],
    tip: 'Když zákazník chce účtenku opravit, řešte ji podle pravidel firmy — ne novým duplicitním prodejem.',
    to: '/app/pokladna',
    action: 'Otevřít pokladnu',
  },
  {
    id: 'restaurant',
    title: 'Obsloužte stůl v restauraci',
    module: 'gastro',
    audience: 'everyone',
    description: 'Účet stolu, kuchyňský bon, platba a uzávěrka jsou propojené.',
    whatItMeans:
      'Účet je otevřená útrata jednoho stolu. Bon je požadavek, který vidí kuchyně nebo bar.',
    whenToUse: 'Při obsluze hostů u stolu, výdeji nebo rozvozu.',
    steps: [
      step('Otevřete stůl', 'Vyberte ho v seznamu, na mapě nebo ve frontě otevřených účtů.'),
      step(
        'Přidejte položky',
        'Použijte kategorii nebo hledání názvu či kódu, doplňte volby a přes Poznámka · chod zařaďte jídlo jako předkrm, hlavní chod nebo dezert.',
      ),
      step(
        'Odešlete na stanice a zaplaťte',
        'Kuchyň a bar uvidí jednotlivé chody pod oddělovači. Před platbou vás systém upozorní na neodeslané položky.',
      ),
    ],
    tip: 'Účet se obnovuje automaticky a před platbou se zkontroluje jeho aktuální stav; zrušení i sloučení vyžaduje potvrzení.',
    to: '/app/restaurace',
    action: 'Otevřít stoly a objednávky',
  },
  {
    id: 'modifiers',
    title: 'Nastavte volby k jídlům',
    module: 'gastro',
    audience: 'manager',
    description: 'Přílohy, velikosti, propečení a extra suroviny bez ručního psaní do poznámky.',
    whatItMeans:
      'Modifikátor je volba u produktu. Skupina může být povinná (například propečení) nebo volitelná (extra sýr).',
    whenToUse: 'Když má zákazník při objednávce vybírat mezi variantami.',
    steps: [
      step('Vytvořte skupinu', 'Například Příloha nebo Propečení.'),
      step('Přidejte volby', 'Každé dejte srozumitelný název a případný příplatek.'),
      step('Přiřaďte skupinu produktu', 'Pak se obsluze nabídne přímo při přidání položky.'),
    ],
    tip: 'Povinnou skupinu použijte jen tehdy, když bez volby nelze objednávku připravit.',
    to: '/app/modifikatory',
    action: 'Otevřít volby k produktům',
  },
  {
    id: 'stock',
    title: 'Udržujte sklad přesný',
    module: 'stock',
    audience: 'manager',
    description: 'Příjem, inventura a rozdíly mezi evidencí a skutečností.',
    whatItMeans:
      'Naskladnění zvýší zásobu. Inventura porovná skutečné množství s tím, co očekává systém.',
    whenToUse: 'Při dodávce zboží, pravidelné kontrole skladu nebo po zjištění rozdílu.',
    steps: [
      step('Naskladněte dodávku', 'Zapište skutečné množství a nákupní cenu.'),
      step('Proveďte inventuru', 'Zadejte fyzicky spočítané množství.'),
      step('Vyřešte rozdíly', 'Ve skladu uvidíte, zda jde o manko nebo přebytek.'),
    ],
    tip: 'Nesrovnalost nemažte — popište ji. Pohyby zásob jsou důležitá provozní historie.',
    to: '/app/naskladneni',
    action: 'Otevřít naskladnění',
  },
  {
    id: 'workforce',
    title: 'Naplánujte směny a docházku',
    module: 'attendance',
    audience: 'manager',
    description: 'Plán pro tým, skutečně odpracovaný čas a podklady pro mzdy.',
    whatItMeans: 'Směna je plán. Docházka je skutečný příchod, odchod a přestávka.',
    whenToUse: 'Před novým týdnem a při kontrole odpracovaných hodin.',
    steps: [
      step('Přidejte zaměstnance', 'Doplňte pozici a u vedení i hodinovou sazbu.'),
      step('Vytvořte a publikujte směny', 'Dokud nejsou publikované, tým je nevidí.'),
      step('Zkontrolujte docházku', 'Vyřešte chybějící odchod, přesčas nebo odchylku od plánu.'),
    ],
    tip: 'Návrh směny není oznámení týmu — vždy použijte Publikovat.',
    to: '/app/smeny',
    action: 'Otevřít plán směn',
  },
  {
    id: 'reservations',
    title: 'Spravujte rezervace',
    module: 'booking',
    audience: 'everyone',
    description: 'Kalendář termínů pro stoly, služby nebo zdroje.',
    whatItMeans:
      'Zdroj je to, co rezervujete (stůl, místnost, pracovník). Služba určuje, co zákazník objednává.',
    whenToUse: 'Při objednání termínu po telefonu, přes web nebo při jeho změně.',
    steps: [
      step(
        'Nastavte zdroje a služby',
        'Založte například stůl pro čtyři nebo hodinovou konzultaci.',
      ),
      step('Vytvořte rezervaci', 'Vyberte termín, zákazníka a potřebný zdroj.'),
      step('Aktualizujte stav', 'Potvrďte, zrušte nebo označte dokončenou rezervaci.'),
    ],
    tip: 'Před potvrzením vždy zkontrolujte čas začátku i konce — stejný zdroj nelze používat dvakrát.',
    to: '/app/rezervace',
    action: 'Otevřít rezervace',
  },
  {
    id: 'jobs',
    title: 'Dokončete zakázku od nabídky po fakturu',
    module: 'jobs',
    audience: 'everyone',
    description: 'Jedno místo pro nabídku, práci, materiál, předání a vyúčtování.',
    whatItMeans:
      'Nabídka je návrh pro klienta. Zakázka je potvrzená práce; pracovní list zachycuje skutečně provedené úkony.',
    whenToUse: 'Při servisu, řemeslné práci nebo delším projektu pro klienta.',
    steps: [
      step('Připravte nabídku', 'Vyberte klienta a položky práce či materiálu.'),
      step('Převeďte ji na zakázku', 'Získáte pracovní list a stav postupu.'),
      step(
        'Zapište práci a materiál',
        'Materiál se odečte ze skladu; po dokončení vytvořte fakturu.',
      ),
    ],
    tip: 'Fakturu vytvořte až ve chvíli, kdy je u zakázky správně vybraný klient.',
    to: '/app/zakazky',
    action: 'Otevřít zakázky',
  },
  {
    id: 'loyalty',
    title: 'Nastavte akce a věrnost',
    module: 'loyalty',
    audience: 'manager',
    description: 'Ceny pro skupiny zákazníků, slevová pravidla a věrnostní body.',
    whatItMeans:
      'Cenová hladina je jiný ceník, například VIP. Akce je pravidlo slevy. Věrnost vrací zákazníkovi body.',
    whenToUse: 'Když chcete odměnit stálé zákazníky nebo nabídnout časově omezenou cenu.',
    steps: [
      step('Vytvořte pravidlo', 'Nastavte jednoduchou akci nebo cenovou hladinu.'),
      step('Zapněte věrnost', 'Rozhodněte, jak zákazník body získává a utrácí.'),
      step('Vyberte zákazníka při prodeji', 'Systém pak může slevu a body správně připsat.'),
    ],
    tip: 'Nejdřív vyzkoušejte pravidlo na jedné položce, aby nevznikla nečekaná sleva na celý sortiment.',
    to: '/app/akce-ceny',
    action: 'Otevřít akce a ceny',
  },
  {
    id: 'reports',
    title: 'Uzavřete den a čtěte přehledy',
    module: 'reporting',
    audience: 'manager',
    description: 'Tržby, Z-reporty a provozní pohled na to, co funguje.',
    whatItMeans:
      'Uzávěrka uzavře hotový den do Z-reportu. Provozní přehled porovnává tržby, náklady, ztráty a výkon týmu.',
    whenToUse: 'Na konci směny, při účetním exportu nebo když chcete rozhodovat podle čísel.',
    steps: [
      step(
        'Zkontrolujte otevřené účty',
        'Před uzávěrkou dokončete nebo vyřešte rozpracované prodeje.',
      ),
      step('Proveďte uzávěrku', 'Zkontrolujte hotovost, kartu a vytvořte Z-report.'),
      step('Vyberte období v přehledu', 'Sledujte tržby, nejprodávanější položky a ztráty skladu.'),
    ],
    tip: 'Z-report je uzavřený historický doklad — proto si před potvrzením ověřte částky.',
    to: '/app/uzaverka',
    action: 'Otevřít uzávěrku',
  },
  {
    id: 'integrations',
    title: 'Exporty, tisk a integrace',
    module: 'integrations',
    audience: 'manager',
    description: 'Účetní soubory, pomocná aplikace pro tisk a připravená propojení.',
    whatItMeans:
      'Export vytvoří soubor pro účetní. Pomocná aplikace propojí Vystaveno s místní tiskárnou. Stav Připraveno k napojení ještě neznamená aktivní službu.',
    whenToUse: 'Při předání dat účetní, nastavování tisku nebo přípravě budoucího napojení.',
    steps: [
      step('Vyexportujte účetnictví', 'Vyberte období a stáhněte CSV nebo Pohoda XML.'),
      step('Připojte pomocnou aplikaci pro tisk', 'Jednorázový přístupový kód bezpečně uložte.'),
      step(
        'Nastavujte poskytovatele opatrně',
        'Bez smlouvy, přístupů a dokončeného propojení se platby nespouští.',
      ),
    ],
    tip: 'Přístupové klíče patří jen do zabezpečeného uložení, nikdy do poznámky.',
    to: '/app/nastaveni',
    action: 'Otevřít integrace',
  },
  {
    id: 'signing',
    title: 'Připravte podpisy dokumentů',
    module: 'verified_signing',
    audience: 'manager',
    description: 'Obálky, evidence a nastavení poskytovatele podpisu.',
    whatItMeans:
      'Podpisová obálka drží údaje o dokumentu a průběhu podpisu. BankID označené jako Připraveno k napojení zatím není ostrý podpis.',
    whenToUse: 'Když potřebujete evidovat schválení či připravit podpisový proces pro dokument.',
    steps: [
      step('Vytvořte obálku', 'Vyplňte název dokumentu a kontakt podepisujícího.'),
      step('Zkontrolujte poskytovatele', 'Použijte jen konfiguraci, která je připravená.'),
      step('Sledujte stav a evidenci', 'Uvidíte, kdy byla obálka odeslaná a jak skončila.'),
    ],
    tip: 'Neukládejte tajné klíče do poznámek; patří pouze do zabezpečeného trezoru.',
    to: '/app/podpisy',
    action: 'Otevřít podpisy',
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
