# INV-13 — konkurenční gap analýza: iDoklad a KiloMayo

**Ověřeno:** 18. 7. 2026  
**Účel:** rozhodnout, které rozdíly jsou pro Vystaveno obchodně významné a které naopak není účelné kopírovat.

## Shrnutí pro investora

Vystaveno už kombinuje fakturaci, POS/gastro, sklad, zakázky, rezervace, docházku, více firem a nově i jednoduché CRM v jednom modulárním produktu. Mezera není v počtu obrazovek, ale v několika jasných „důvodech ke změně“: bankovní automatizace a platební párování, veřejně srozumitelný ceník, hladký registrační vstup a prokazatelně živé partnerské integrace.

Nejlepší pozice není „levnější iDoklad“ ani „další gastro pokladna“. Je to společné jádro pro malé firmy, které začnou fakturací a mohou bez změny systému přidat provoz, sklad, zakázky či tým.

## Co ověřeně nabízí konkurence

| Oblast            | iDoklad                                                                           | KiloMayo                                                                    | Dopad pro Vystaveno                                                                                   |
| ----------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Rychlá fakturace  | IČO/ARES, ceník, opakované doklady, více měn a mobilní přístup                    | Není primárně fakturační produkt                                            | Vystaveno základ má; musí ho umět stejně snadno vysvětlit a ukázat na mobilu.                         |
| Banka a inkaso    | Vyšší tarif uvádí bankovní propojení, automatické párování a upomínky             | Veřejně komunikuje finanční řízení restaurace, rozsah není detailně doložen | Největší fakturační produktová mezera: nenazývat ruční `mailto:` upomínku automatizací.               |
| Sklad a provoz    | Jednoduchý sklad navázaný na faktury a ceník                                      | Pokladna, e-shop, kiosek a provozní týmová aplikace                         | Vystaveno má širší sklad/POS/gastro základ; priorita je dohledatelnost a jednoduché uvedení do praxe. |
| Integrace         | API je placená součást vyšších tarifů; poskytovatel přechází na API v3 s webhooky | Veřejný web zdůrazňuje provozní ekosystém, ne veřejný integrační kontrakt   | Vystaveno má API tokeny a webhook foundation; živé adaptery se nesmí tvrdit bez end-to-end ověření.   |
| Cenová komunikace | Veřejné tarify, limity uživatelů a jasný 60denní trial                            | Veřejný web je orientovaný na demo/provozní hodnotu                         | Sjednocený ceník a pravdivá aktivace jsou obchodní priorita INV-06.                                   |

Zdroje: [iDoklad ceník](https://www.idoklad.cz/cenik), [iDoklad faktury a sklad](https://www.idoklad.cz/faktury-a-sklad-v-jedne-aplikaci), [iDoklad API v3](https://www.idoklad.cz/blog/blizi-se-ukonceni-idoklad-api-v2-zkontrolujte-sve-integrace), [KiloMayo](https://www.kilomayo.com/), [KiloMayo beta](https://beta.kilomayo.com/).

## Doporučené priority

### 1. Prodejný základ — dokončit před rozšiřováním funkcí

1. **Jedna cena, jeden příběh a ověřené CTA** — ukončit rozpor mezi veřejným ceníkem, moduly a skutečným billingem.
2. **Registrace do první hodnoty** — zachovat e-mailové přihlášení a IČO/ARES onboarding; Google/Apple lze komunikovat až po skutečném provider setupu a integračních testech.
3. **Automatizace peněz jako samostatný milník** — bankovní feed, párování a automatické upomínky jsou cennější než další izolovaná administrativní obrazovka.

### 2. Diferenciace — držet směr, nekopírovat

- Společný klient, produkt, doklad a sklad napříč fakturací, POS a zakázkami.
- Přepínání více samostatných firem pod jedním účtem.
- Interní CRM nad existujícím klientem, bez vytváření třetího adresáře.
- Skladová dohledatelnost, šarže a inventura pro firmy, které přerostly jednoduchý sklad navázaný jen na fakturu.

### 3. Co vědomě nedělat

- Nezahajovat hromadný e-mail marketing ani komplikovanou obchodní pipeline jen proto, že máme CRM timeline.
- Neprohlašovat konkrétní platební terminál, bankovní napojení, OAuth nebo podpisový účinek za hotovou funkci bez živého provider testu.
- Nekopírovat všechny gastro specializace KiloMayo, pokud nedoplňují společné podnikatelské jádro.

## Investiční metriky pro ověření směru

- aktivace: registrace → založená firma → první doklad v jednom dni;
- retence: podíl firem, které se vrátí ve 2., 4. a 8. týdnu;
- monetizace: podíl firem se zapnutým placeným modulem a ARPA podle profilu;
- provozní hodnota: čas od návrhu k faktuře, počet úkolů po termínu, stav neuhrazených faktur;
- růst: referral/partner lead → aktivovaná firma → platící firma.

## Rozhodnutí

**Go:** pokračovat nejprve v INV-06 (sjednocení ceníku a billing reality), INV-07 (claim/promo kódy bez míchání s POS slevami) a bankovně-platební discovery jako samostatném rozhodnutí.  
**No-go:** nepřidávat „automatické“ e-maily, platby nebo OAuth jako marketingový text, dokud neexistuje ověřený produkční tok.
