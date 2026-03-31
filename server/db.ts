import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema.ts";
import { InsertUser, users } from "../drizzle/schema.ts";
import { ENV } from './_core/env.ts';

let _db: any = null;
let _client: ReturnType<typeof postgres> | null = null;

// Inicializa o Drizzle só quando precisar, pra não travar tudo se o banco estiver fora.
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _client = postgres(ENV.databaseUrl, {
        ssl: 'require',
        max: 5,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      _db = drizzle(_client, { schema });
      
      // Log de conexão (só pra avisar que subiu certinho)
      if (!ENV.isProduction) {
        console.log("[Banco de Dados] Conectado ao Supabase ✅");
      }
    } catch (error) {
      if (!ENV.isProduction) {
        console.warn("[Banco de Dados] Erro ao conectar:", error);
      }
      _db = null;
    }
  }
  return _db;
}

export async function getClient() {
  await getDb(); // Garante que o client foi inicializado
  return _client;
}

// Função pra salvar ou atualizar o usuário (Sync do Auth)
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("O openId do usuário é obrigatório!");
  }

  const db = await getDb();
  if (!db) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn("[Banco de Dados] Não deu pra salvar o usuário: banco offline");
    }
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    
    // Se for o meu ID (Bruno), eu viro admin direto
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("[Banco de Dados] Erro ao sincronizar usuário:", error);
    }
    throw error;
  }
}

// Busca o usuário pelo ID único dele
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn("[Banco de Dados] Não deu pra buscar o usuário: banco offline");
    }
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Adicione mais queries do projeto aqui conforme o schema for crescendo.
