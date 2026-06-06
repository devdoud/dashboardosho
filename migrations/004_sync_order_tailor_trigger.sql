-- Déclencheur pour synchroniser automatiquement le tailleur principal sur une commande
-- lors des mises à jour des assignations (y compris les refus depuis l'application mobile)

CREATE OR REPLACE FUNCTION sync_order_primary_tailor()
RETURNS TRIGGER AS $$
DECLARE
  v_active_tailor_id UUID;
BEGIN
  -- Récupérer l'ID du tailleur de la dernière assignation active (non refusée/annulée/terminée)
  SELECT tailor_id INTO v_active_tailor_id
  FROM order_assignments
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    AND status IN ('pending', 'accepted', 'in_progress')
  ORDER BY assigned_at DESC
  LIMIT 1;

  -- Mettre à jour la table orders
  UPDATE orders
  SET primary_tailor_id = v_active_tailor_id,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enregistrer le déclencheur
DROP TRIGGER IF EXISTS trg_sync_order_primary_tailor ON order_assignments;
CREATE TRIGGER trg_sync_order_primary_tailor
AFTER INSERT OR UPDATE OR DELETE ON order_assignments
FOR EACH ROW
EXECUTE FUNCTION sync_order_primary_tailor();
