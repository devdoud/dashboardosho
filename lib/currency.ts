/**
 * Les prix sont établis en FCFA à l'atelier et débités en dollars.
 *
 * Le taux n'est pas codé en dur : il doit être celui que l'app applique au
 * paiement. Il se règle par la variable d'environnement serveur `XOF_PER_USD`
 * (ex. 600 pour 1 $ = 600 FCFA). Sans taux, on n'affiche pas de prix en
 * dollars plutôt que d'en inventer un.
 */
export function getXofPerUsd(): number | null {
  const raw = process.env.XOF_PER_USD
  const rate = raw ? Number(raw) : NaN
  return Number.isFinite(rate) && rate > 0 ? rate : null
}

export function formatUsdFromXof(amountXof: number | null | undefined, rate: number | null): string | null {
  if (!rate || amountXof == null || !Number.isFinite(amountXof)) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountXof / rate)
}
