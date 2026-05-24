-- Migration 003 : Ajout du champ customer_note sur orders
-- Le client peut laisser une note libre au moment de passer commande.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_note text;

COMMENT ON COLUMN public.orders.customer_note IS
  'Note libre laissée par le client au moment de la commande (instructions spéciales, préférences, etc.)';
