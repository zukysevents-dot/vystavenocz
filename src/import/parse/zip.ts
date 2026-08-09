import { unzip } from 'fflate'

/** Jeden soubor vybalený z archivu. */
export interface ArchiveEntry {
  name: string
  bytes: Uint8Array
}

/** Servisní smetí, které do dávky faktur nepatří (macOS archivy ho přibalují vždy). */
function isJunk(path: string): boolean {
  const base = path.split('/').pop() ?? ''
  return path.startsWith('__MACOSX/') || base.startsWith('._') || base === '.DS_Store'
}

/**
 * Rozbalí ZIP na jednotlivé soubory. Účetní programy exportují dávku faktur
 * právě takhle — jeden archiv, uvnitř desítky PDF/ISDOC, často ve složkách.
 * Adresáře, prázdné položky a servisní smetí se zahazují.
 */
export async function unzipArchive(bytes: Uint8Array): Promise<ArchiveEntry[]> {
  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(bytes, (err, data) => (err ? reject(err) : resolve(data)))
  })

  return Object.entries(files)
    .filter(([path, content]) => !path.endsWith('/') && content.length > 0 && !isJunk(path))
    .map(([path, content]) => ({ name: path, bytes: content }))
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
}

/** Poznámka: ZIP i ISDOCX mají stejnou signaturu `PK` — .isdocx je ZIP s ISDOC uvnitř. */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b
}
