# Osho Admin — Dashboard

Interface d'administration de la boutique Osho (mode africaine sur mesure) :
commandes, catalogue, tailleurs, utilisateurs, paiements, avis et notifications push.

Next.js 16 (App Router) · React 19 · Supabase · Tailwind CSS 4 · TypeScript strict.

## Démarrage

```bash
npm install
cp .env.local.example .env.local   # puis renseigner les valeurs
npm run dev
```

L'application est servie sur http://localhost:3000. La racine `/` est une
landing page publique ; le dashboard vit sous `/dashboard` et exige un compte
avec le rôle `admin`.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publiable — exposée au navigateur |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète, **serveur uniquement**. Contourne RLS. |
| `SUPER_ADMIN_EMAIL` | Seul compte autorisé à promouvoir/rétrograder un admin. Sans elle, personne ne peut créer d'administrateur. |
| `SESSION_SECRET` | *Optionnel.* Signe le cookie d'activité. À défaut, `SUPABASE_SERVICE_ROLE_KEY` sert de secret. Le changer révoque toutes les sessions. |

## Migrations

Les fichiers de `migrations/` s'appliquent **dans l'ordre numérique**, via le
SQL Editor de Supabase ou `supabase db push`.

| Fichier | Contenu |
|---|---|
| `001_user_roles.sql` | Table `user_roles`, fonction `is_admin()` |
| `002_storage_products.sql` | Bucket `products` |
| `003_order_customer_note.sql` | Colonne `orders.customer_note` |
| `004_sync_order_tailor_trigger.sql` | Trigger de synchro du tailleur principal |
| `005_fix_user_roles_rls.sql` | Corrige la récursion infinie des policies de 001 |
| `006_fix_sync_order_tailor_trigger.sql` | Corrige le trigger de 004 (plantait sur DELETE) |
| `007_storage_buckets.sql` | Bucket `categories`, alignement des limites de taille |
| `008_rls_business_tables.sql` | Socle RLS des tables métier — **à relire avant production** |

Après la première migration, promouvoir un compte en admin :

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<UUID_DU_COMPTE>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

## Architecture

```
app/(auth)/login        Écran de connexion
app/(dashboard)/*       Pages d'administration (protégées)
app/api/admin/*         Routes serveur en service_role, derrière guardAdmin()
app/api/auth/callback   Échange du code OAuth contre une session
proxy.ts                Contrôle d'accès en amont (ex-middleware)
lib/supabase/admin.ts   adminClient(), guardAdmin(), helpers de pagination
lib/session.ts          Bornes de session + cookie d'activite signe
lib/rate-limit.ts       Quotas de debit par admin
lib/validation.ts       Schémas zod des corps de requête
types/database.ts       Types de la base + helpers Insertable/Updatable
```

### Accès aux données

Une seule règle : **toute lecture ou écriture de donnée sensible passe par
`/api/admin/*`**, qui vérifie `guardAdmin()` (admin + quota) puis utilise la
clé service_role.
Le navigateur ne lit directement, avec la clé anon, que les tables de catalogue
(`products`, `categories`), publiques par nature.

`orders`, `payment_attempts`, `addresses` et `fcm_tokens` ne doivent jamais être
interrogées depuis un composant client.

### Limites

Toutes les constantes sont regroupées et commentées à leur point d'usage.

| Limite | Valeur | Où |
|---|---|---|
| Session — durée absolue | 8 h depuis la connexion | `lib/session.ts` |
| Session — inactivité | 15 min entre deux requêtes | `lib/session.ts` |
| Débit API — lectures | 120 req/min par admin | `lib/rate-limit.ts` |
| Débit API — écritures | 30 req/min par admin | `lib/rate-limit.ts` |
| Débit API — upload | 10 req/min par admin | `lib/rate-limit.ts` |
| Débit API — notifications | 3 req/min par admin | `lib/rate-limit.ts` |
| Campagne push — destinataires | 5 000 max par envoi | `api/admin/notifications` |
| Campagne push — fréquence | 1 campagne / 60 s | `api/admin/notifications` |
| Campagne push — concurrence | 25 envois simultanés | `api/admin/notifications` |
| Pagination | page ≤ 5 000 | `lib/supabase/admin.ts` |
| Comptes chargés en mémoire | 10 000 max | `lib/supabase/admin.ts` |

La session est bornée par un cookie d'activité signé (HMAC-SHA256) : le
modifier sans le secret serveur invalide la signature et ferme la session.
Dépasser l'une des deux bornes purge les cookies `sb-*` et renvoie vers
`/login`. L'écran de connexion affiche un message générique — les durées ne sont
volontairement pas divulguées côté client.

Le compteur de débit est **en mémoire, par instance** : sur un déploiement
multi-instance la limite effective est `quota × nombre d'instances`. C'est un
garde-fou contre les emballements, pas une défense contre un attaquant
déterminé — pour une limite stricte, remplacer `hit()` dans `lib/rate-limit.ts`
par un compteur partagé (Upstash Redis, Supabase…).

### Rôles

- **admin** — accès complet au dashboard.
- **super admin** — l'admin dont l'email vaut `SUPER_ADMIN_EMAIL` ; seul à
  pouvoir créer ou modifier d'autres admins, et invisible pour eux.
- **tailor** — pas d'accès au dashboard ; reçoit les assignations de commandes.
- **client** — aucune ligne dans `user_roles` (rôle nul).

### Tailleur principal d'une commande

`orders.primary_tailor_id` est maintenu **exclusivement** par le trigger
`sync_order_primary_tailor` (migration 006), qui reflète l'assignation active la
plus récente. Les routes API ne l'écrivent pas : le faire créait des écritures
concurrentes. Une commande terminée n'a plus d'assignation active, donc plus de
tailleur principal — l'affichage retombe alors sur l'historique des assignations
(`pickTailorId` dans `app/api/admin/orders/route.ts`).

## Scripts

```bash
npm run dev     # serveur de développement
npm run build   # build de production (typecheck inclus)
npm run start   # sert le build
npm run lint    # ESLint
```

`npm run build` échoue en cas d'erreur TypeScript — c'est voulu, ne pas
réactiver `typescript.ignoreBuildErrors`.
