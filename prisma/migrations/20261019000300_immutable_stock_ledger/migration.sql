BEGIN;
CREATE FUNCTION protect_stock_movement() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'StockMovement is immutable; append a correcting movement' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER stock_movement_immutable BEFORE UPDATE OR DELETE ON "StockMovement"
FOR EACH ROW EXECUTE FUNCTION protect_stock_movement();

CREATE FUNCTION validate_stock_transfer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  entries integer; incoming integer; outgoing integer; products integer; warehouses integer; delta numeric;
BEGIN
  IF NEW."transferId" IS NULL THEN RETURN NULL; END IF;
  SELECT count(*), count(*) FILTER (WHERE m.type = 'TRANSFER_IN'), count(*) FILTER (WHERE m.type = 'TRANSFER_OUT'),
    count(DISTINCT s."productId"), count(DISTINCT s."warehouseId"), sum(m.quantity)
  INTO entries, incoming, outgoing, products, warehouses, delta
  FROM "StockMovement" m JOIN "StockItem" s ON s.id = m."stockItemId" AND s."workspaceId" = m."workspaceId"
  WHERE m."workspaceId" = NEW."workspaceId" AND m."transferId" = NEW."transferId";
  IF entries <> 2 OR incoming <> 1 OR outgoing <> 1 OR products <> 1 OR warehouses <> 2 OR delta <> 0 THEN
    RAISE EXCEPTION 'A transfer requires equal opposite entries for one product in two warehouses' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER stock_transfer_pair AFTER INSERT ON "StockMovement"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_stock_transfer();
COMMIT;
