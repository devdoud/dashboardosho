import { z } from 'zod'
import { NextResponse } from 'next/server'

/**
 * Schémas de validation des corps de requête des routes admin.
 *
 * Les routes passaient auparavant le body brut à `insert()` / `update()`
 * (mass assignment) : n'importe quelle colonne pouvait être écrite, y compris
 * `id` ou `created_at`. Chaque route valide désormais explicitement sa charge utile.
 */

// ─── Primitives ───────────────────────────────────────────────────────────────

const uuid = z.string().uuid()

/** Texte multilingue stocké en JSON — accepte la forme string héritée. */
const i18n = z.union([
  z.string(),
  z.object({ fr: z.string().optional(), en: z.string().optional() }).passthrough(),
])

const i18nArray = z.array(i18n)

export const orderStatusSchema = z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
export const paymentStatusSchema = z.enum(['pending', 'paid', 'failed', 'refunded'])
export const paymentAttemptStatusSchema = z.enum(['pending', 'processing', 'succeeded', 'failed', 'cancelled'])
export const userRoleSchema = z.enum(['admin', 'tailor', 'customer'])

/** Valide un paramètre de filtre `?status=` qui accepte aussi `all`. */
export function parseFilter<T extends string>(
  raw: string | null,
  schema: z.ZodType<T>,
): T | null {
  if (!raw || raw === 'all') return null
  const parsed = schema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

// ─── Produits ─────────────────────────────────────────────────────────────────

const productFields = {
  name:               i18n,
  description:        i18n.nullish(),
  traditional_origin: i18n.nullish(),
  price:              z.number().nonnegative(),
  sku:                z.string().min(1).max(64),
  thumbnail:          z.string().url().nullish(),
  images:             z.array(z.string().url()).nullish(),
  category_id:        uuid.nullish(),
  is_featured:        z.boolean().nullish(),
  is_traditional:     z.boolean().nullish(),
  difficulty:         z.enum(['easy', 'medium', 'hard']).nullish(),
  estimated_days:     z.number().int().nonnegative().nullish(),
  tags:               i18nArray.nullish(),
  perfect_for:        i18nArray.nullish(),
  fabric:             z.string().nullish(),
  embroidery:         z.string().nullish(),
  accessory:          z.string().nullish(),
  fabric_options:     z.array(z.record(z.unknown())).nullish(),
  embroidery_options: z.array(z.record(z.unknown())).nullish(),
  finish_options:     z.array(z.record(z.unknown())).nullish(),
}

export const productInsertSchema = z.object(productFields).strict()

export const productPatchSchema = z
  .object({ id: uuid, ...productFields })
  .partial()
  .required({ id: true })
  .strict()

// ─── Catégories ───────────────────────────────────────────────────────────────

const categoryFields = {
  name:  i18n,
  slug:  z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'slug invalide'),
  type:  z.enum(['homme', 'femme', 'enfant']),
  style: z.enum(['traditionnel', 'moderne', 'mixte']),
  image: z.string().url().nullish(),
}

export const categoryInsertSchema = z.object(categoryFields).strict()

export const categoryPatchSchema = z
  .object({ id: uuid, ...categoryFields })
  .partial()
  .required({ id: true })
  .strict()

// ─── Commandes ────────────────────────────────────────────────────────────────

export const orderPatchSchema = z
  .object({
    id:                uuid,
    status:            orderStatusSchema.optional(),
    payment_status:    paymentStatusSchema.optional(),
    primary_tailor_id: uuid.nullable().optional(),
  })
  .strict()

export const orderAssignSchema = z
  .object({
    orderId:       uuid,
    tailorId:      uuid,
    notes:         z.string().max(2000).nullish(),
    currentStatus: orderStatusSchema.optional(),
  })
  .strict()

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

export const userPatchSchema = z
  .object({
    userId:    uuid,
    role:      userRoleSchema.nullable().optional(),
    full_name: z.string().max(200).optional(),
    phone:     z.string().max(40).optional(),
    city:      z.string().max(120).optional(),
  })
  .strict()

// ─── Tailleurs ────────────────────────────────────────────────────────────────

export const promoteTailorSchema = z.object({ email: z.string().email() }).strict()

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationSchema = z
  .object({
    target: z.enum(['user', 'all_customers', 'all_tailors', 'all_users']),
    userId: uuid.optional(),
    title:  z.string().trim().min(1).max(200),
    body:   z.string().trim().min(1).max(1000),
    data:   z.record(z.string()).default({}),
  })
  .strict()
  .refine((v) => v.target !== 'user' || !!v.userId, {
    message: 'userId requis pour une notification individuelle',
    path: ['userId'],
  })

// ─── Helper de route ──────────────────────────────────────────────────────────

/**
 * Parse et valide le corps JSON d'une requête.
 * Retourne soit `{ data }`, soit `{ response }` — une 400 prête à être renvoyée.
 */
export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<{ data: z.infer<S>; response?: never } | { data?: never; response: NextResponse }> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { response: NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }) }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue?.path.join('.')
    return {
      response: NextResponse.json(
        { error: where ? `${where}: ${issue.message}` : issue?.message ?? 'Requête invalide' },
        { status: 400 },
      ),
    }
  }

  return { data: parsed.data }
}
