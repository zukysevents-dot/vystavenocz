import type { ParsedImportedInvoice } from './types'

/**
 * Co brání uložení dokladu na serveru.
 *
 * `POST /invoices/import` vyžaduje číslo, datum vystavení, jméno odběratele a
 * aspoň jednu položku. Z PDF se ale některé z těch polí přečíst nemusí — a bez
 * téhle kontroly by uživatel dostal technickou chybu z validace až po odeslání.
 * Radši mu rovnou v náhledu řekneme, proč doklad uložit nejde.
 *
 * Není to duplikát serverové validace: server zůstává jediná autorita, tohle
 * jen překládá jeho povinná pole do srozumitelné hlášky předem.
 */
export function blockingIssues(parsed: ParsedImportedInvoice): string[] {
  const issues: string[] = []
  const input = parsed.input

  if (!input.invoiceNumber?.trim()) issues.push('chybí číslo faktury')
  if (!input.issueDate?.trim()) issues.push('chybí datum vystavení')
  if (!input.clientSnapshot.name?.trim()) issues.push('chybí název odběratele')
  if (!input.items.length) issues.push('doklad nemá žádnou položku')

  return issues
}

/** Doklad, který server odmítne — v náhledu se nesmí dát vybrat k importu. */
export function isBlocked(parsed: ParsedImportedInvoice): boolean {
  return blockingIssues(parsed).length > 0
}
