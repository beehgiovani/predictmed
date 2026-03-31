import { boolean, date, integer, numeric, pgEnum, pgTable, serial, text, timestamp, varchar, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["user", "admin"]);

// 1. Tabela de Usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openid", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginmethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdat").defaultNow().notNull(),
  updatedAt: timestamp("updatedat").defaultNow().notNull(),
  lastSignedIn: timestamp("lastsignedin").defaultNow().notNull(),
});

// 2. Catálogo de Produtos
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  ean: varchar("ean", { length: 64 }),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  isPerfumery: boolean("isperfumery").default(false).notNull(),
  isControlled: boolean("iscontrolled").default(false).notNull(),
  isHighTurnover: boolean("ishighturnover").default(false).notNull(), 
  isDiscontinued: boolean("isdiscontinued").default(false).notNull(), 
  imageUrl: text("imageurl"), 
  lastImageSync: timestamp("lastimagesync"), 
  mainCategory: text("main_category").default("medicamento"),
  subCategory: text("sub_category"),
  expectedStock: integer("expected_stock"),
  stockLastUpdated: timestamp("stock_last_updated"),
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

// 3. Histórico de Vendas
export const salesHistory = pgTable("sales_history", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull(),
  quantity: integer("quantity").notNull(),
  startDate: timestamp("startdate").notNull(),
  endDate: timestamp("enddate").notNull(),
  source: varchar("source", { length: 32 }).notNull(),
  createdAt: timestamp("createdat").defaultNow().notNull(),
}, (t) => ({
  unq: unique("sales_history_unq_period").on(t.productCode, t.startDate, t.endDate)
}));

// 5. Sessões de Cotação
export const quoteSessions = pgTable("quote_sessions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: timestamp("start_date").notNull(), 
  endDate: timestamp("end_date").notNull(),     
  targetDays: integer("target_days").notNull(), 
  status: varchar("status", { length: 64 }).default('revisao').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Itens individuais dentro de cada cotação
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteSessionId: integer("quote_session_id").references(() => quoteSessions.id, { onDelete: 'cascade' }).notNull(),
  productCode: varchar("product_code", { length: 64 }).notNull(),
  salesInPeriod: integer("sales_in_period").default(0),
  suggestedQuantity: integer("suggested_quantity").notNull(),
  userConfirmedQuantity: integer("user_confirmed_quantity"),
  shelfQuantity: integer("shelf_quantity"),
  priceAtTime: numeric("price_at_time", { precision: 10, scale: 2 }),
  arrivedQuantity: integer("arrived_quantity"),
  isMissing: boolean("is_missing").default(false),
  aiReasoning: text("ai_reasoning"),
});

// 8. Lista Negra
export const productBlacklist = pgTable("product_blacklist", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull().unique(),
  productName: text("productname"),
  reason: text("reason"),
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

/**
 * 👥 CRM - CADASTRO DE CLIENTES & ENDEREÇOS (v4.0)
 */

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerAddresses = pgTable("customer_addresses", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  addressText: text("address_text").notNull(),
  isMain: boolean("is_main").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Registro de quando falta produto no balcão e encomendas
export const manualRuptures = pgTable("manual_ruptures", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull(),
  ean: varchar("ean", { length: 64 }),
  askedCount: integer("askedcount").default(1).notNull(), 
  customerName: text("customername"), 
  customerId: integer("customer_id").references(() => customers.id), 
  contact: text("contact"), 
  isPaid: boolean("ispaid").default(false), 
  isSpecialOrder: boolean("isspecialorder").default(false), 
  lastAskedAt: timestamp("lastaskedat").defaultNow().notNull(),
  status: varchar("status", { length: 32 }).default('pending').notNull(),
});

/**
 * 🔗 RELAÇÕES INTELIGENTES (v4.0)
 */

export const customerRelations = relations(customers, ({ many }) => ({
   addresses: many(customerAddresses),
   ruptures: many(manualRuptures),
}));

export const customerAddressRelations = relations(customerAddresses, ({ one }) => ({
   customer: one(customers, { fields: [customerAddresses.customerId], references: [customers.id] }),
}));

export const manualRuptureRelations = relations(manualRuptures, ({ one }) => ({
   customer: one(customers, { fields: [manualRuptures.customerId], references: [customers.id] }),
   product: one(products, { fields: [manualRuptures.productCode], references: [products.code] }),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  product: one(products, { fields: [quoteItems.productCode], references: [products.code] }),
  session: one(quoteSessions, { fields: [quoteItems.quoteSessionId], references: [quoteSessions.id] }),
}));

// 7. Ajustes do Bruno
export const productAdjustments = pgTable("product_adjustments", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull().unique(),
  averageAdjustmentPercent: numeric("avg_adjustment", { precision: 5, scale: 2 }).default("1.00"),
  lastUserQty: integer("last_user_qty"),
  totalOverrides: integer("total_overrides").default(0),
  updatedAt: timestamp("updatedat").defaultNow().notNull(),
});

// Tipos
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type ManualRupture = typeof manualRuptures.$inferSelect;