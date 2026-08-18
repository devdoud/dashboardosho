-- ============================================================
-- Migration 006 : correction du trigger sync_order_primary_tailor
--
-- Deux défauts dans la version 004 :
--
--  1. `COALESCE(NEW.order_id, OLD.order_id)` — sur un DELETE, `NEW` n'est pas
--     assigné en PL/pgSQL. Le lire lève :
--       ERROR: record "new" is not assigned yet
--     Il faut brancher sur TG_OP.
--
--  2. Le trigger déclenchait un UPDATE sur `orders` même quand
--     `primary_tailor_id` ne changeait pas — écritures et réveils de triggers
--     inutiles. On ne réécrit désormais que sur changement réel.
--
-- Ce trigger est LA source de vérité pour `orders.primary_tailor_id` :
-- les routes API ne l'écrivent plus à la main (cf. api/admin/orders/assign).
-- ============================================================

CREATE OR REPLACE FUNCTION sync_order_primary_tailor()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id         uuid;
  v_active_tailor_id uuid;
BEGIN
  -- NEW est NULL sur DELETE, OLD est NULL sur INSERT.
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  IF v_order_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Tailleur de l'assignation active la plus récente (ni refusée, ni annulée,
  -- ni terminée). Aucune → NULL.
  SELECT tailor_id INTO v_active_tailor_id
  FROM order_assignments
  WHERE order_id = v_order_id
    AND status IN ('pending', 'accepted', 'in_progress')
  ORDER BY assigned_at DESC
  LIMIT 1;

  UPDATE orders
  SET primary_tailor_id = v_active_tailor_id,
      updated_at        = NOW()
  WHERE id = v_order_id
    AND primary_tailor_id IS DISTINCT FROM v_active_tailor_id;

  RETURN NULL;  -- valeur ignorée pour un trigger AFTER
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_order_primary_tailor ON order_assignments;
CREATE TRIGGER trg_sync_order_primary_tailor
AFTER INSERT OR UPDATE OR DELETE ON order_assignments
FOR EACH ROW
EXECUTE FUNCTION sync_order_primary_tailor();
