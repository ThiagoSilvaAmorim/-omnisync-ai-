-- 001_supplier_catalog.sql
-- Migra a base OSM (tabela suppliers) para o schema de catálogo do
-- provedor /fornecedores e cria a tabela products.
-- Idempotente: pode ser reexecutada sem erro.
-- Executar com: npx prisma db execute --file backend/prisma/sql/001_supplier_catalog.sql

BEGIN;

-- ===== 1. suppliers: renomear colunas legadas (apenas na primeira execução) =====
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'nome') THEN
    ALTER TABLE suppliers RENAME COLUMN "nome" TO "name";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'cidade') THEN
    ALTER TABLE suppliers RENAME COLUMN "cidade" TO "city";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'categoria') THEN
    ALTER TABLE suppliers RENAME COLUMN "categoria" TO "niche";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'site') THEN
    ALTER TABLE suppliers RENAME COLUMN "site" TO "site_url";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'osmId') THEN
    ALTER TABLE suppliers RENAME COLUMN "osmId" TO "osm_id";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'createdAt') THEN
    ALTER TABLE suppliers RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

-- ===== 2. suppliers: novas colunas do catálogo =====
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "cover_images" text[];
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "product_count" integer;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "marketplaces" text[];
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "accepts_dropshipping" boolean;

UPDATE suppliers SET "cover_images" = ARRAY[]::TEXT[] WHERE "cover_images" IS NULL;
UPDATE suppliers SET "product_count" = 0 WHERE "product_count" IS NULL;
UPDATE suppliers SET "marketplaces" = ARRAY[]::TEXT[] WHERE "marketplaces" IS NULL;
UPDATE suppliers SET "accepts_dropshipping" = true WHERE "accepts_dropshipping" IS NULL;

ALTER TABLE suppliers ALTER COLUMN "cover_images" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE suppliers ALTER COLUMN "product_count" SET DEFAULT 0;
ALTER TABLE suppliers ALTER COLUMN "marketplaces" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE suppliers ALTER COLUMN "accepts_dropshipping" SET DEFAULT true;
ALTER TABLE suppliers ALTER COLUMN "cover_images" SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN "product_count" SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN "marketplaces" SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN "accepts_dropshipping" SET NOT NULL;

-- ===== 3. suppliers: backfill de valores =====
UPDATE suppliers SET "name" = 'Fornecedor sem nome' WHERE "name" IS NULL OR btrim("name") = '';
UPDATE suppliers SET "name" = btrim("name");
UPDATE suppliers SET "city" = 'Não informada' WHERE "city" IS NULL OR btrim("city") = '';
UPDATE suppliers SET "uf" = upper(btrim(coalesce("uf", ''))) WHERE "uf" IS NOT NULL;

-- slug: slugify(nome); colisões ganham sufixo -2, -3... (nome-<hash> se restar colisão)
UPDATE suppliers SET "slug" = btrim(lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')), '-');
UPDATE suppliers SET "slug" = 'fornecedor-' || substr(md5(id::text), 1, 8) WHERE "slug" IS NULL OR "slug" = '';

WITH dups AS (
  SELECT id, row_number() OVER (PARTITION BY "slug" ORDER BY "created_at", id) AS rn
  FROM suppliers
)
UPDATE suppliers s SET "slug" = s."slug" || '-' || d.rn
FROM dups d WHERE s.id = d.id AND d.rn > 1;

WITH dups AS (
  SELECT id, "slug", row_number() OVER (PARTITION BY "slug" ORDER BY "created_at", id) AS rn
  FROM suppliers
)
UPDATE suppliers s SET "slug" = s."slug" || '-' || substr(md5(s.id::text), 1, 6)
FROM dups d WHERE s.id = d.id AND d.rn > 1;

-- ===== 4. suppliers: id int -> uuid =====
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'id' AND data_type = 'integer') THEN
    ALTER TABLE suppliers ADD COLUMN "id_uuid" uuid NOT NULL DEFAULT gen_random_uuid();
    UPDATE suppliers SET "id_uuid" = gen_random_uuid();
    ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS "suppliers_pkey";
    ALTER TABLE suppliers DROP COLUMN "id";
    ALTER TABLE suppliers RENAME COLUMN "id_uuid" TO "id";
    ALTER TABLE suppliers ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");
    ALTER TABLE suppliers ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
    DROP SEQUENCE IF EXISTS "suppliers_id_seq";
  END IF;
END $$;

-- ===== 5. suppliers: tipos e constraints finais =====
ALTER TABLE suppliers ALTER COLUMN "uf" TYPE char(2) USING upper(left("uf", 2));
UPDATE suppliers SET "uf" = '  ' WHERE "uf" IS NULL OR "uf" = '';
ALTER TABLE suppliers ALTER COLUMN "uf" SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN "city" SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN "created_at" TYPE timestamp(3);
ALTER TABLE suppliers ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE suppliers ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN "fonte" SET DEFAULT 'osm';
ALTER TABLE suppliers ALTER COLUMN "fonte" SET NOT NULL;

-- ===== 6. suppliers: índices do catálogo =====
DROP INDEX IF EXISTS "suppliers_uf_cidade_idx";
DROP INDEX IF EXISTS "suppliers_nome_idx";
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS "suppliers_osmId_key";
DROP INDEX IF EXISTS "suppliers_osmId_key";
DROP INDEX IF EXISTS "suppliers_osm_id_key";
DROP INDEX IF EXISTS "suppliers_slug_key";
DROP INDEX IF EXISTS "suppliers_uf_idx";
DROP INDEX IF EXISTS "suppliers_niche_idx";
ALTER TABLE suppliers ADD CONSTRAINT "suppliers_osm_id_key" UNIQUE ("osm_id");
ALTER TABLE suppliers ADD CONSTRAINT "suppliers_slug_key" UNIQUE ("slug");
CREATE INDEX "suppliers_uf_idx" ON "suppliers" ("uf");
CREATE INDEX "suppliers_niche_idx" ON "suppliers" ("niche");

-- ===== 7. products (catálogo) =====
CREATE TABLE IF NOT EXISTS "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplier_id" uuid NOT NULL,
  "name" text NOT NULL,
  "image_url" text,
  "cost_price" double precision,
  "sku" text,
  "niche" text,
  CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id")
    REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "products_supplier_id_sku_key" UNIQUE ("supplier_id", "sku")
);
CREATE INDEX IF NOT EXISTS "products_supplier_id_idx" ON "products" ("supplier_id");
CREATE INDEX IF NOT EXISTS "products_niche_idx" ON "products" ("niche");

-- ===== 8. trigger: product_count sincronizado com products =====
CREATE OR REPLACE FUNCTION "sync_supplier_product_count"() RETURNS trigger AS $fn$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE suppliers SET "product_count" = "product_count" - 1 WHERE "id" = OLD."supplier_id";
    RETURN OLD;
  END IF;
  IF (TG_OP = 'UPDATE' AND NEW."supplier_id" IS DISTINCT FROM OLD."supplier_id") THEN
    UPDATE suppliers SET "product_count" = "product_count" - 1 WHERE "id" = OLD."supplier_id";
    UPDATE suppliers SET "product_count" = "product_count" + 1 WHERE "id" = NEW."supplier_id";
    RETURN NEW;
  END IF;
  UPDATE suppliers SET "product_count" = "product_count" + 1 WHERE "id" = NEW."supplier_id";
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_products_count" ON "products";
CREATE TRIGGER "trg_products_count"
  AFTER INSERT OR UPDATE OR DELETE ON "products"
  FOR EACH ROW EXECUTE FUNCTION "sync_supplier_product_count"();

-- ===== 9. seed de demonstração (roda uma vez; sku prefixo DEMO-) =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "products" WHERE "sku" LIKE 'DEMO-%') THEN
    INSERT INTO "products" ("supplier_id", "name", "sku", "cost_price", "niche")
    SELECT s."id", v."name", v."sku", v."cost", coalesce(s."niche", 'geral')
    FROM (VALUES
      (1,  'Fone Bluetooth TWS',            'DEMO-FONE-001',    45.90),
      (2,  'Fone Bluetooth TWS',            'DEMO-FONE-002',    52.00),
      (3,  'Caneca Térmica 350ml',          'DEMO-CANECA-001',  18.50),
      (4,  'Caneca Térmica 350ml',          'DEMO-CANECA-002',  21.90),
      (5,  'Camiseta Dry Fit',              'DEMO-CAMI-001',    22.00),
      (6,  'Camiseta Dry Fit',              'DEMO-CAMI-002',    25.50),
      (7,  'Kit 4 Cabos USB-C',             'DEMO-CABO-001',    29.90),
      (8,  'Kit 4 Cabos USB-C',             'DEMO-CABO-002',    34.90),
      (9,  'Luminária de Mesa LED',         'DEMO-LUMI-001',    67.00),
      (10, 'Organizador de Guarda-Roupa',   'DEMO-ORG-001',    39.90),
      (11, 'Tênis Casual Masculino',        'DEMO-TENIS-001',   89.00),
      (12, 'Tênis Casual Masculino',        'DEMO-TENIS-002',   95.00),
      (13, 'Fone Bluetooth TWS',            'DEMO-FONE-003',    48.00),
      (14, 'Caneca Térmica 350ml',          'DEMO-CANECA-003',  19.90),
      (15, 'Mochila Escolar 6 Bolsos',      'DEMO-MOCHILA-001', 54.00),
      (16, 'Ventilador de Mesa 40cm',       'DEMO-VENT-001',    72.00)
    ) AS v(rn, "name", "sku", "cost")
    JOIN (
      SELECT "id", "niche", row_number() OVER (ORDER BY "name", "id") AS rn
      FROM suppliers
    ) s ON s.rn = v.rn;
  END IF;

  -- selos de marketplace em alguns fornecedores (demonstração das badges do card)
  UPDATE suppliers SET "marketplaces" = ARRAY['mercadolivre', 'shopee']
  WHERE "id" IN (SELECT "id" FROM (SELECT "id", row_number() OVER (ORDER BY "name", "id") rn FROM suppliers) t WHERE t.rn IN (1, 4, 7, 13));
  UPDATE suppliers SET "marketplaces" = ARRAY['tiktok', 'mercadolivre']
  WHERE "id" IN (SELECT "id" FROM (SELECT "id", row_number() OVER (ORDER BY "name", "id") rn FROM suppliers) t WHERE t.rn IN (2, 9));
  UPDATE suppliers SET "marketplaces" = ARRAY['shopee']
  WHERE "id" IN (SELECT "id" FROM (SELECT "id", row_number() OVER (ORDER BY "name", "id") rn FROM suppliers) t WHERE t.rn IN (5, 11, 15));
END $$;

-- recálculo de product_count (idempotente; o trigger já cuida do caso normal)
UPDATE suppliers s SET "product_count" = COALESCE((
  SELECT count(*) FROM products p WHERE p."supplier_id" = s."id"
), 0);

-- ===== 10. índice em lower(name) (não representável no schema Prisma; recriar após db push) =====
DROP INDEX IF EXISTS "suppliers_name_lower_idx";
CREATE INDEX "suppliers_name_lower_idx" ON "suppliers" (lower("name"));

COMMIT;
