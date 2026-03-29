-- =====================================================================
-- PREDICTMED - OFFICIAL UNIFIED SCHEMA (SINGLE SOURCE OF TRUTH)
-- =====================================================================
-- Data de Criação/Atualização: 2026-03-29
-- Este script contém TODA a estrutura atual oficial, e pode ser rodado
-- múltiplas vezes no Supabase com segurança (possui IF NOT EXISTS).
-- =====================================================================

-- 🔹 Tipos (Enums)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
        CREATE TYPE public.role AS ENUM ('user', 'admin');
    END IF;
END
$$;

-- 🔹 1. Usuários (Autenticação / Acessos)
CREATE TABLE IF NOT EXISTS public.users (
  id serial not null,
  openid character varying(64) not null,
  name text null,
  email character varying(320) null,
  loginmethod character varying(64) null,
  role public.role not null default 'user'::role,
  createdat timestamp without time zone not null default now(),
  updatedat timestamp without time zone not null default now(),
  lastsignedin timestamp without time zone not null default now(),
  constraint users_pkey primary key (id),
  constraint users_openid_key unique (openid)
) TABLESPACE pg_default;

-- 🔹 2. Produtos (Catálogo Principal)
CREATE TABLE IF NOT EXISTS public.products (
  id serial not null,
  code character varying(64) not null,
  ean character varying(64) null,
  name text not null,
  price numeric(10, 2) null default 0,
  manufacturer character varying(255) null,
  isperfumery boolean not null default false,
  iscontrolled boolean not null default false,
  ishighturnover boolean not null default false,
  isdiscontinued boolean not null default false,
  imageurl text null,
  lastimagesync timestamp without time zone null,
  createdat timestamp without time zone not null default now(),
  constraint products_pkey primary key (id),
  constraint products_code_key unique (code)
) TABLESPACE pg_default;

-- 🔹 3. Histórico de Vendas Mestre
CREATE TABLE IF NOT EXISTS public.sales_history (
  id serial not null,
  productcode character varying(64) not null,
  quantity integer not null,
  startdate timestamp without time zone not null,
  enddate timestamp without time zone not null,
  source character varying(32) not null,
  createdat timestamp without time zone not null default now(),
  constraint sales_history_pkey primary key (id)
) TABLESPACE pg_default;

-- 🔹 4. Previsões/Sugestões Diárias
CREATE TABLE IF NOT EXISTS public.purchase_suggestions (
  id serial not null,
  productcode character varying(64) not null,
  qty1day integer null,
  qty2day integer null,
  qty3day integer null,
  qty5day integer null,
  confidence numeric(5, 2) null,
  calculatedat timestamp with time zone not null default now(),
  constraint purchase_suggestions_pkey primary key (id)
) TABLESPACE pg_default;

-- 🔹 5. Sessões de Cotação
CREATE TABLE IF NOT EXISTS public.quote_sessions (
  id serial not null,
  name character varying(255) not null,
  startdate date not null,
  enddate date not null,
  targetdays integer not null,
  status character varying(64) not null default 'revisao'::character varying,
  createdat timestamp without time zone not null default now(),
  updatedat timestamp without time zone not null default now(),
  constraint quote_sessions_pkey primary key (id)
) TABLESPACE pg_default;

-- 🔹 6. Itens Registrados em Sessões de Cotação
CREATE TABLE IF NOT EXISTS public.quote_items (
  id serial not null,
  quotesessionid integer not null,
  productcode character varying(64) not null,
  salesinperiod integer null default 0,
  priceattime numeric(10, 2) null,
  suggestedquantity integer not null,
  userconfirmedquantity integer null,
  arrivedquantity integer null default 0,
  ismissing boolean null default false,
  aireasoning text null,
  createdat timestamp without time zone not null default now(),
  constraint quote_items_pkey primary key (id),
  constraint quote_items_quotesessionid_fkey foreign KEY (quotesessionid) references quote_sessions (id) on delete CASCADE
) TABLESPACE pg_default;

-- Índice veloz para cruzar itens com relatório de rupturas
CREATE INDEX IF NOT EXISTS idx_quote_items_product on public.quote_items using btree (productcode) TABLESPACE pg_default;

-- 🔹 7. Histórico e Registro de Ruptura (Scanner Manual)
CREATE TABLE IF NOT EXISTS public.manual_ruptures (
  id serial not null,
  productcode character varying(64) not null,
  ean character varying(64) null,
  askedcount integer not null default 1,
  lastaskedat timestamp without time zone not null default now(),
  status character varying(32) not null default 'pending'::character varying,
  constraint manual_ruptures_pkey primary key (id)
) TABLESPACE pg_default;

-- 🔹 8. IA de Ajustes Comportamentais do Usuário
CREATE TABLE IF NOT EXISTS public.product_adjustments (
  id serial not null,
  productcode character varying(64) not null,
  avg_adjustment numeric(5, 2) null default 1.00,
  last_user_qty integer null,
  total_overrides integer null default 0,
  updatedat timestamp without time zone not null default now(),
  constraint product_adjustments_pkey primary key (id),
  constraint product_adjustments_productcode_key unique (productcode)
) TABLESPACE pg_default;

-- 🔹 9. Lista Negra de Produtos (Banimento Permanente)
CREATE TABLE IF NOT EXISTS public.product_blacklist (
  id serial not null,
  productcode character varying(64) not null,
  productname text null,
  reason text null,
  createdat timestamp without time zone not null default now(),
  constraint product_blacklist_pkey primary key (id),
  constraint product_blacklist_productcode_key unique (productcode)
) TABLESPACE pg_default;

COMMENT ON TABLE public.product_blacklist IS 'Produtos banidos das sugestões de IA - Criado por solicitação de Bruno em 2026-03-29';
