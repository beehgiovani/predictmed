CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"address_text" text NOT NULL,
	"is_main" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_ruptures" (
	"id" serial PRIMARY KEY NOT NULL,
	"productcode" varchar(64) NOT NULL,
	"ean" varchar(64),
	"askedcount" integer DEFAULT 1 NOT NULL,
	"customername" text,
	"customer_id" integer,
	"contact" text,
	"ispaid" boolean DEFAULT false,
	"isspecialorder" boolean DEFAULT false,
	"lastaskedat" timestamp DEFAULT now() NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"productcode" varchar(64) NOT NULL,
	"avg_adjustment" numeric(5, 2) DEFAULT '1.00',
	"last_user_qty" integer,
	"total_overrides" integer DEFAULT 0,
	"updatedat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_adjustments_productcode_unique" UNIQUE("productcode")
);
--> statement-breakpoint
CREATE TABLE "product_blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"productcode" varchar(64) NOT NULL,
	"productname" text,
	"reason" text,
	"createdat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_blacklist_productcode_unique" UNIQUE("productcode")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"ean" varchar(64),
	"code" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2),
	"manufacturer" varchar(255),
	"isperfumery" boolean DEFAULT false NOT NULL,
	"iscontrolled" boolean DEFAULT false NOT NULL,
	"ishighturnover" boolean DEFAULT false NOT NULL,
	"isdiscontinued" boolean DEFAULT false NOT NULL,
	"imageurl" text,
	"lastimagesync" timestamp,
	"main_category" text DEFAULT 'medicamento',
	"sub_category" text,
	"createdat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_session_id" integer NOT NULL,
	"product_code" varchar(64) NOT NULL,
	"sales_in_period" integer DEFAULT 0,
	"suggested_quantity" integer NOT NULL,
	"user_confirmed_quantity" integer,
	"shelf_quantity" integer,
	"price_at_time" numeric(10, 2),
	"arrived_quantity" integer,
	"is_missing" boolean DEFAULT false,
	"ai_reasoning" text
);
--> statement-breakpoint
CREATE TABLE "quote_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"target_days" integer NOT NULL,
	"status" varchar(64) DEFAULT 'revisao' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"productcode" varchar(64) NOT NULL,
	"quantity" integer NOT NULL,
	"startdate" timestamp NOT NULL,
	"enddate" timestamp NOT NULL,
	"source" varchar(32) NOT NULL,
	"createdat" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openid" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginmethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL,
	"lastsignedin" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openid_unique" UNIQUE("openid")
);
--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_ruptures" ADD CONSTRAINT "manual_ruptures_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_session_id_quote_sessions_id_fk" FOREIGN KEY ("quote_session_id") REFERENCES "public"."quote_sessions"("id") ON DELETE cascade ON UPDATE no action;