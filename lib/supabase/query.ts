/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Type-safe wrapper to await a dynamic Supabase query
 * that was built with conditional .eq()/.ilike() chains.
 * Supabase's TypeScript generics can't track the type through
 * re-assignment, so we cast here at the boundary.
 */
export async function awaitQuery<T>(query: any): Promise<{ data: T[] | null; count: number | null; error: unknown }> {
  const result = await query
  return result as { data: T[] | null; count: number | null; error: unknown }
}
