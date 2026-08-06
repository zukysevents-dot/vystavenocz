# `/.well-known/` — ověření domény pro mobilní aplikace

Obsah téhle složky Vite kopíruje 1:1 do `dist/` a nginx ho servíruje vlastní `location /.well-known/`
(viz [`nginx.conf`](../../nginx.conf)) — **nikdy** přes SPA fallback. Kdyby sem požadavek spadl na
`try_files … /index.html`, ověřovač by dostal HTML místo JSON a tiše by selhal.

## `assetlinks.json` — Android App Links

Deklaruje, že aplikace `cz.vystaveno.mobile` smí zachytávat odkazy na `vystaveno.cz`.
Bez něj se `autoVerify="true"` v `AndroidManifest.xml` neověří a **redirect po přihlášení přes
Google/Apple skončí v prohlížeči místo v aplikaci** (host a cesta App Linku jsou
`vystaveno.oauthAndroidCallbackHost` / `…Path`, tedy `https://vystaveno.cz/oauth/mobile`).

### Chybí otisk podpisového klíče

`sha256_cert_fingerprints` je zatím **prázdné pole** — soubor se servíruje správně jako JSON,
ale žádná aplikace zatím není autorizovaná. Doplňte právě jednu hodnotu:

```bash
# a) vlastní release keystore (sideload / vlastní distribuce)
keytool -list -v -keystore <release.jks> -alias <alias> | grep -A1 'SHA256:'

# b) Google Play → Play Console → Setup → App signing → "SHA-256 certificate fingerprint"
#    Při Play App Signing platí TENHLE otisk, ne otisk lokálního keystoru.
```

Výsledek (formát `AA:BB:CC:…`, 32 dvojic) vložte do pole:

```json
"sha256_cert_fingerprints": ["AA:BB:CC:…"]
```

Pole smí mít víc hodnot — typicky release + Play App Signing, případně staging.
**Nevkládejte sem debug otisk vývojářského stroje.** Debug keystore má veřejně známé heslo
`android`, takže kdokoli s přístupem k tomu stroji by mohl podepsat aplikaci zachytávající
odkazy `vystaveno.cz` včetně OAuth redirectu.

### Ověření po deployi

```bash
curl -sI https://vystaveno.cz/.well-known/assetlinks.json | grep -i content-type
#   → application/json   (když vrátí text/html, servíruje se SPA a pravidlo v nginx.conf chybí)

curl -s https://vystaveno.cz/.well-known/assetlinks.json | python3 -m json.tool
```

Na zařízení:

```bash
adb shell pm verify-app-links --re-verify cz.vystaveno.mobile
adb shell pm get-app-links cz.vystaveno.mobile     # vystaveno.cz musí být "verified"
```

Google validátor: <https://developers.google.com/digital-asset-links/tools/generator>

## `apple-app-site-association` — iOS Universal Links

Zatím tu **není** a iOS ho nepotřebuje: aplikace používá vlastní schéma
(`vystaveno.oauthIosScheme` = `cz.vystaveno.mobile`) přes `ASWebAuthenticationSession`,
ne Universal Link. Kdyby se na Universal Links přecházelo, soubor patří sem —
je **bez přípony** a musí se servírovat jako `application/json` (to `default_type` v nginx řeší).
