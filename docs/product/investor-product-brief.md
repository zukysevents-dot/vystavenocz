# Vystaveno — srozumitelný produktový přehled pro investora

Tento dokument vysvětluje hotové produktové části bez technického žargonu. U každé nové oblasti držíme stejnou strukturu: **problém, přínos, způsob použití, kontrolní hranice a měřitelnost**.

Aktuální rozhodovací srovnání trhu je v [gap analýze iDoklad a KiloMayo](./investor-competitive-gap-analysis.md).
Rozhodnutí k Viva Payments je v [ověřeném go/no-go podkladu](./viva-payments-go-no-go.md).

## Online úhrada faktur přes Viva

### Jaký problém řeší

Odběratel faktury často musí ručně přepisovat platební údaje a vystavitel pak sleduje platbu mimo systém. To prodlužuje inkaso a zvyšuje riziko chybného ručního označení faktury.

### Co je hotové

Klientský portál u každé vlastní viditelné faktury nabídne bezpečné PDF a u neuhrazené faktury platbu na hostované stránce Viva Smart Checkout. Vystaveno nepracuje s číslem platební karty. Po oznámení platby si backend údaje ještě ověří přímo u Viva a teprve pak idempotentně zaeviduje úhradu faktury.

### Kontrolní hranice

Redirect není platba. Bez sandboxových nebo produkčních přístupů Viva je funkce bezpečně vypnutá a neukazuje falešný úspěch. Produkční spuštění vyžaduje ověřit Viva účet, zdroj plateb, callback a úspěšný i neúspěšný test.

### Co lze měřit po nasazení

- podíl faktur zaplacených online;
- čas od vystavení k úhradě;
- úspěšnost založení checkoutu a ověření plateb;
- podíl neúspěšných či opakovaných platebních oznámení.

## Akviziční nabídky a partnerské kódy

### Jaký problém řeší

Partnerský kanál a cílené nabídky potřebují dohledatelně spojit nový účet s konkrétní kampaní, aniž by obchodník ručně přepisoval tabulky nebo aplikace předčasně slibovala aktivní tarif.

### Co je hotové

Majitel firmy vloží kód v Nastavení. Systém zaznamená jednorázový nárok, kampaň, variantu a verzi podmínek. Kód se neukládá v čitelné podobě a opakovaný požadavek nevytvoří druhý nárok.

### Kontrolní hranice

Jde o bezpečnou evidenci nároku, ne o billing. Tarif, kredit nebo bezplatné období se nezapne bez skutečného ověření v systému předplatného. To chrání důvěru zákazníka i finanční pravdivost reportingu.

### Co lze měřit po napojení billingové vrstvy

- počet uplatnění podle kampaně a varianty;
- podíl ověřených a skutečně aktivovaných nároků;
- konverze partnera či kanálu na aktivní předplatné;
- výše a doba čerpaných benefitů.

## CRM MVP — od kontaktu k dalšímu kroku

### Jaký problém řeší

Malé firmy často vedou komunikaci se zákazníky v e-mailech, telefonu a paměti jednotlivých lidí. Když je kolega pryč nebo zákazník zavolá po několika týdnech, není jasné, co bylo domluveno ani kdo má udělat další krok.

### Co zákazník dostane

Vystaveno propojí existující adresář klientů s interní časovou osou a úkoly. U každého klienta lze zaznamenat poznámku, telefonát, e-mail nebo schůzku, vytvořit následný úkol a po dokončení jej uzavřít. Na jednom místě je vidět, co se stalo a co je otevřené.

### Jak se to ovládá

Vedoucí otevře Finance → CRM, vybere klienta, zapíše krátkou aktivitu a případně založí úkol s termínem a prioritou. Hotový úkol jedním klikem dokončí. Detailní postup je v kapitole 12.2 kompletního uživatelského manuálu.

### Proč je to bezpečné a důvěryhodné

CRM používá stejná firemní oprávnění jako fakturace. Data jedné firmy nejsou viditelná jiné firmě. Poznámky jsou interní, klient je neuvidí v portálu a systém je sám nikam nerozesílá. Důležité změny jsou auditované, zatímco obsah poznámek se do auditu nekopíruje.

### Hranice současného MVP

Nejde o marketingový automat ani o složitý obchodní systém: MVP neobsahuje hromadné kampaně, prodejní pipeline, scoring kontaktů ani automaticky posílané zprávy. Tím zůstává rychlé na pochopení a užitečné pro každodenní follow-up.

### Co lze měřit po nasazení

- počet otevřených úkolů a úkolů po termínu;
- podíl klientů s poslední aktivitou;
- čas od první komunikace k nabídce nebo faktuře;
- počet ztracených follow-upů před a po nasazení.

## Pravidlo pro další produktové bloky

Každá další položka roadmapy dostane před dokončením obdobnou kapitolu do tohoto dokumentu i krokový návod do kompletního uživatelského manuálu. Technický kontrakt zůstává oddělený v `docs/backend/`, aby běžný uživatel nemusel číst implementační detaily.
