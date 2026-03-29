import { boolean, date, integer, numeric, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

// 1. Tabela de Usuários (Auth)
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

// 2. Tabela de Produtos (Catálogo via COTAC/XML)
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
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

// 3. Histórico de Vendas Mestre
export const salesHistory = pgTable("sales_history", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull(),
  quantity: integer("quantity").notNull(),
  startDate: timestamp("startdate").notNull(), 
  endDate: timestamp("enddate").notNull(), 
  source: varchar("source", { length: 32 }).notNull(),
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

// 4. Previsões/Sugestões
export const purchaseSuggestions = pgTable("purchase_suggestions", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull(),
  qty1Day: integer("qty1day"),
  qty2Days: integer("qty2day"),
  qty3Days: integer("qty3day"),
  qty5Days: integer("qty5day"),
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  calculatedAt: timestamp("calculatedat").defaultNow().notNull(),
});

// 5. Sessões de Cotação Diária
export const quoteSessions = pgTable("quote_sessions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: date("startdate").notNull(),
  endDate: date("enddate").notNull(),
  targetDays: integer("targetdays").notNull(),
  status: varchar("status", { length: 64 }).default('revisao').notNull(),
  createdAt: timestamp("createdat").defaultNow().notNull(),
  updatedAt: timestamp("updatedat").defaultNow().notNull(),
});

export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteSessionId: integer("quotesessionid").references(() => quoteSessions.id, { onDelete: 'cascade' }).notNull(),
  productCode: varchar("productcode", { length: 64 }).notNull(),
  salesInPeriod: integer("salesinperiod").default(0),
  suggestedQuantity: integer("suggestedquantity").notNull(),
  userConfirmedQuantity: integer("userconfirmedquantity"),
  priceAtTime: numeric("priceattime", { precision: 10, scale: 2 }),
  arrivedQuantity: integer("arrivedquantity"),
  isMissing: boolean("ismissing").default(false),
  aiReasoning: text("aireasoning"),
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

// 6. Registro de Venda Perdida (Ruptura Manual no Balcão)
export const manualRuptures = pgTable("manual_ruptures", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull(),
  ean: varchar("ean", { length: 64 }),
  askedCount: integer("askedcount").default(1).notNull(),
  lastAskedAt: timestamp("lastaskedat").defaultNow().notNull(),
  status: varchar("status", { length: 32 }).default('pending').notNull(), // pending, resolved
});

// 7. Aprendizado de IA (Ajustes Manuais do Usuário)
export const productAdjustments = pgTable("product_adjustments", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull().unique(),
  averageAdjustmentPercent: numeric("avg_adjustment", { precision: 5, scale: 2 }).default("1.00"),
  lastUserQty: integer("last_user_qty"),
  totalOverrides: integer("total_overrides").default(0),
  updatedAt: timestamp("updatedat").defaultNow().notNull(),
});

// Export Type Inferences
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type QuoteSession = typeof quoteSessions.$inferSelect;
export type InsertQuoteSession = typeof quoteSessions.$inferInsert;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = typeof quoteItems.$inferInsert;