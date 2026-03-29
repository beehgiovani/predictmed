import { boolean, date, integer, numeric, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

// 1. Tabela de Usuários - pra gente saber quem tá acessando o sistema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openid", { length: 64 }).notNull().unique(), // ID único que vem do provedor de login
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginmethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(), // Define se é usuário comum ou admin
  createdAt: timestamp("createdat").defaultNow().notNull(),
  updatedAt: timestamp("updatedat").defaultNow().notNull(),
  lastSignedIn: timestamp("lastsignedin").defaultNow().notNull(),
});

// 2. Nosso catálogo de produtos oficial, alimentado pelo COTAC ou XMLs
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  ean: varchar("ean", { length: 64 }), // Código de barras
  code: varchar("code", { length: 64 }).notNull().unique(), // Código interno do sistema da farmácia
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  isPerfumery: boolean("isperfumery").default(false).notNull(), // Filtro pra ignorar perfumaria se quiser
  isControlled: boolean("iscontrolled").default(false).notNull(), // Medicamentos de controle especial
  isHighTurnover: boolean("ishighturnover").default(false).notNull(), 
  isDiscontinued: boolean("isdiscontinued").default(false).notNull(), 
  imageUrl: text("imageurl"), 
  lastImageSync: timestamp("lastimagesync"), 
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

// 3. Aqui guardamos todo o histórico de vendas pra IA entender o movimento
export const salesHistory = pgTable("sales_history", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull(),
  quantity: integer("quantity").notNull(),
  startDate: timestamp("startdate").notNull(), // Início do período da venda
  endDate: timestamp("enddate").notNull(), // Fim do período
  source: varchar("source", { length: 32 }).notNull(), // De onde veio esse dado (ex: manual, xml)
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

// 4. Sugestões de compra que a IA gera
export const purchaseSuggestions = pgTable("purchase_suggestions", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull(),
  qty1Day: integer("qty1day"),
  qty2Days: integer("qty2day"),
  qty3Days: integer("qty3day"),
  qty5Days: integer("qty5day"),
  confidence: numeric("confidence", { precision: 5, scale: 2 }), // Grau de certeza da sugestão
  calculatedAt: timestamp("calculatedat").defaultNow().notNull(),
});

// 5. Sessões de Cotação - agrupam os itens que o Bruno tá cotando no momento
export const quoteSessions = pgTable("quote_sessions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: date("startdate").notNull(),
  endDate: date("enddate").notNull(),
  targetDays: integer("targetdays").notNull(), // Pra quantos dias a gente quer estoque?
  status: varchar("status", { length: 64 }).default('revisao').notNull(),
  createdAt: timestamp("createdat").defaultNow().notNull(),
  updatedAt: timestamp("updatedat").defaultNow().notNull(),
});

// Itens individuais dentro de cada cotação
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteSessionId: integer("quotesessionid").references(() => quoteSessions.id, { onDelete: 'cascade' }).notNull(),
  productCode: varchar("productcode", { length: 64 }).notNull(),
  salesInPeriod: integer("salesinperiod").default(0),
  suggestedQuantity: integer("suggestedquantity").notNull(), // O que a IA sugeriu
  userConfirmedQuantity: integer("userconfirmedquantity"), // O que o confirmou de fato
  priceAtTime: numeric("priceattime", { precision: 10, scale: 2 }),
  arrivedQuantity: integer("arrivedquantity"),
  isMissing: boolean("ismissing").default(false), // Marcar se o produto tá em falta
  aiReasoning: text("aireasoning"), // O "porquê" da IA ter sugerido essa quantidade
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

// 6. Registro de quando falta produto no balcão e o vendedor avisa
export const manualRuptures = pgTable("manual_ruptures", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull(),
  ean: varchar("ean", { length: 64 }),
  askedCount: integer("askedcount").default(1).notNull(), // Quantas vezes pediram esse item?
  lastAskedAt: timestamp("lastaskedat").defaultNow().notNull(),
  status: varchar("status", { length: 32 }).default('pending').notNull(),
});

// 7. Ajustes que a gente faz pra IA aprender com o nosso jeito
export const productAdjustments = pgTable("product_adjustments", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull().unique(),
  averageAdjustmentPercent: numeric("avg_adjustment", { precision: 5, scale: 2 }).default("1.00"), // Minha margem de segurança
  lastUserQty: integer("last_user_qty"),
  totalOverrides: integer("total_overrides").default(0),
  updatedAt: timestamp("updatedat").defaultNow().notNull(),
});

// 8. Lista Negra - Produtos que o Bruno não quer que a IA sugira NUNCA mais (ex: perfumaria externa)
export const productBlacklist = pgTable("product_blacklist", {
  id: serial("id").primaryKey(),
  productCode: varchar("productcode", { length: 64 }).notNull().unique(),
  productName: text("productname"),
  reason: text("reason"),
  createdAt: timestamp("createdat").defaultNow().notNull(),
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

export type BlacklistedProduct = typeof productBlacklist.$inferSelect;
export type InsertBlacklistedProduct = typeof productBlacklist.$inferInsert;