export type FaqEntry = { q: string; a: string }

export const faqs: FaqEntry[] = [
  {
    q: 'Kolik Vystaveno.cz stojí?',
    a: '100 Kč měsíčně při ročním tarifu (účtováno 1 200 Kč/rok), nebo 159 Kč měsíčně při měsíčním tarifu. Cena je konečná — provozovatel je neplátce DPH, takže žádné překvapení na faktuře. V obou případech máte neomezený počet faktur, klientů, AI asistenta i QR platby. Nejprve 14 dní zdarma bez karty.',
  },
  {
    q: 'Jsou v ceně skryté limity nebo poplatky za uživatele?',
    a: 'Ne. V ceně máte neomezený počet vystavených faktur, klientů, dobropisů, opakovaných faktur i šablon. Žádný poplatek za AI dotazy, QR kódy, e-mailové odesílání ani export do účetnictví. Jediná cena je ta v ceníku.',
  },
  {
    q: 'Jsou faktury z Vystaveno.cz plnohodnotné podle českého práva?',
    a: 'Ano. Každá faktura obsahuje všechny zákonné náležitosti dle §29 zákona o DPH a §11 zákona o účetnictví — IČO, DIČ, číslo faktury, DUZP, datum vystavení a splatnosti, sazbu a výši DPH, identifikaci dodavatele i odběratele.',
  },
  {
    q: 'Jak funguje AI asistent?',
    a: 'Stačí napsat česky, co chcete změnit: „změň splatnost na 30 dní“, „přidej slevu 10 %“, „přepiš první položku na konzultaci 5 hodin“. AI rozumí přirozenému jazyku a faktura se okamžitě upraví. Můžete také generovat celé faktury z popisu zakázky.',
  },
  {
    q: 'Funguje QR platba se všemi českými bankami?',
    a: 'Ano. Používáme oficiální standard QR Platba podle České bankovní asociace. Funguje s Air Bank, ČSOB, Komerční bankou, Raiffeisenbank, Fio, Moneta, mBank, Equa bank, Revolutem a všemi dalšími.',
  },
  {
    q: 'Mohu vystavovat faktury jako neplátce DPH?',
    a: 'Samozřejmě. Při registraci si zvolíte režim — neplátce DPH, plátce DPH, identifikovaná osoba. Šablona faktury se přizpůsobí. Přechod mezi režimy je kdykoliv jedním kliknutím.',
  },
  {
    q: 'Umí Vystaveno dobropisy (opravné daňové doklady)?',
    a: 'Ano. U každé vystavené faktury najdete v menu akci „Vytvořit dobropis“ — otevře se editor s předvyplněným klientem, odkazem na původní fakturu a položkami se zápornými množstvími. Dobropisy mají vlastní číselnou řadu s prefixem OD- (např. OD-2026-0001), takže v účetnictví je odlišíte na první pohled. V seznamu faktur jsou označené badgem „Dobropis“.',
  },
  {
    q: 'Co se stane, když zavřu tab uprostřed vystavování faktury?',
    a: 'Nic se neztratí. Každých 30 sekund automaticky ukládáme rozpracovaný koncept na pozadí — i bez kliknutí na „Uložit“. Když se vrátíte, najdete fakturu v seznamu jako Koncept přesně tam, kde jste přestali. Funguje to i při výpadku internetu nebo havárii prohlížeče.',
  },
  {
    q: 'Můžu uložit rozpracovaný koncept bez vyplněného klienta?',
    a: 'Ano. Pro uložení konceptu stačí jediné — číslo faktury (které vyplníme za vás). Klient, popis položek i částky můžete doplnit kdykoliv později. Přísnou kontrolu (povinný odběratel, popis položky atd.) spustíme až ve chvíli, kdy kliknete na „Vystavit“. Pro koncepty necháváme volnost.',
  },
  {
    q: 'Kolik faktur mohu vystavit?',
    a: 'Neomezeně. Žádné skryté limity podle počtu faktur, klientů ani uživatelů. Tarif Pro zahrnuje vše bez omezení.',
  },
  {
    q: 'Mohu data exportovat pro účetní?',
    a: 'Ano — ISDOC, XML, CSV i PDF. Vaše účetní si data jednoduše stáhne nebo jí udělíte přístup do dashboardu (zdarma, bez dalšího uživatelského poplatku).',
  },
  {
    q: 'Jak funguje 14denní zkušební doba?',
    a: 'Bez platební karty. Zaregistrujete se jen pomocí e-mailu a IČO, 14 dní používáte plnou verzi včetně AI asistenta a QR plateb. Po skončení můžete aktivovat tarif za 100 Kč měsíčně (roční), 159 Kč měsíčně (měsíční), nebo účet jen archivovat — data nikam nezmizí.',
  },
  {
    q: 'Mohu kdykoliv zrušit?',
    a: 'Ano, jedním kliknutím v nastavení. Žádné výpovědní lhůty, žádné storno poplatky. Při ročním tarifu vrátíme alikvotní část částky.',
  },
]
