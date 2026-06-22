// Analytika je v MVP záměrně vypnutá — žádný reálný tracker (GA/Plausible) se nenačítá.
// Cookie banner ukládá souhlas; reálná integrace se doplní sem, až bude analytika nakonfigurovaná.
export function applyAnalyticsConsent(analyticsAllowed: boolean): void {
  // no-op (MVP) — souhlas se jen uloží, žádné skripty se nenačítají.
  void analyticsAllowed
}
