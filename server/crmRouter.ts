import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.ts";
import { getDb } from "./db.ts";
import { customers, customerAddresses, manualRuptures } from "../drizzle/schema.ts";
import { eq, ilike, or, and, desc } from "drizzle-orm";

/**
 * --------------------------------------------------------------------------
 * PredictMed CRM Router - Gestão de Clientes & Endereços (v1.0)
 * --------------------------------------------------------------------------
 */

export const crmRouter = router({
  /**
   * 🔍 BUSCA INTELIGENTE: Procura por nome ou telefone
   */
  searchCustomers: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");
      if (input.query.length < 2) return [];

      return await db.query.customers.findMany({
        where: or(
          ilike(customers.name, `%${input.query}%`),
          ilike(customers.phone, `%${input.query}%`)
        ),
        with: {
          addresses: true
        },
        limit: 10
      });
    }),

  /**
   * 💾 UPSERT CLIENTE: Cria ou atualiza o cliente e seus endereços
   */
  upsertCustomer: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string(),
      phone: z.string().optional(),
      address: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");

      let customerId = input.id;

      if (customerId) {
        // Atualiza existente
        await db.update(customers)
          .set({ name: input.name, phone: input.phone })
          .where(eq(customers.id, customerId));
      } else {
        // Cria novo
        const [newCustomer] = await db.insert(customers)
          .values({ name: input.name, phone: input.phone })
          .returning();
        customerId = newCustomer.id;
      }

      // Se enviou endereço, verifica se já existe ou adiciona
      if (input.address && customerId) {
        const existingAddress = await db.query.customerAddresses.findFirst({
          where: and(
            eq(customerAddresses.customerId, customerId),
            ilike(customerAddresses.addressText, input.address)
          )
        });

        if (!existingAddress) {
          await db.insert(customerAddresses).values({
            customerId: customerId,
            addressText: input.address,
            isMain: true
          });
        }
      }

      return { success: true, customerId };
    }),

  /**
   * 🏠 VERIFICA VIZINHANÇA: Busca outros clientes no mesmo endereço
   */
  checkNeighborhood: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");
      if (input.address.length < 5) return [];

      return await db.select({
        customerName: customers.name,
        address: customerAddresses.addressText
      })
      .from(customerAddresses)
      .leftJoin(customers, eq(customerAddresses.customerId, customers.id))
      .where(ilike(customerAddresses.addressText, `%${input.address}%`))
      .limit(5);
    }),

  /**
   * 📜 HISTÓRICO DO CLIENTE: O que esse cliente já encomendou?
   */
  getCustomerOrderHistory: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");

      return await db.select()
        .from(manualRuptures)
        .where(eq(manualRuptures.customerId, input.customerId))
        .orderBy(desc(manualRuptures.lastAskedAt));
    })
});
