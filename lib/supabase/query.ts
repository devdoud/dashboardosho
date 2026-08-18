/**
 * Helpers de construction de requêtes PostgREST, utilisables côté serveur
 * comme côté navigateur.
 */

/**
 * Échappe les métacaractères LIKE (`%`, `_`, `\`) pour qu'une saisie
 * utilisateur soit traitée comme du texte littéral et non comme un motif.
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * Construit un filtre `.or()` de type ILIKE sur plusieurs colonnes.
 *
 * La grammaire `or=(...)` de PostgREST utilise `,` `.` `(` `)` comme
 * séparateurs : interpoler la saisie brute permettait d'injecter des filtres
 * arbitraires (et cassait toute recherche contenant une virgule).
 * La valeur est donc échappée puis entourée de guillemets doubles.
 */
export function orIlike(columns: string[], search: string): string {
  const value = escapeLike(search).replace(/["\\]/g, (c) => `\\${c}`)
  return columns.map((col) => `${col}.ilike."%${value}%"`).join(',')
}
