import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.ts";
import { getDb } from "./db.ts";
import { quoteSessions, quoteItems, salesHistory, products, manualRuptures, productAdjustments, productBlacklist } from "../drizzle/schema.ts";
import { eq, desc, and, sql, inArray, or, ilike } from "drizzle-orm";

/**
 * --------------------------------------------------------------------------
 * PredictMed Cota Router - Cérebro das Compras (VERSÃO FINAL v8.1)
 * --------------------------------------------------------------------------
 */

export const cotaRouter = router({
  getQuoteSessions: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Offline");
      return await db.select().from(quoteSessions).orderBy(desc(quoteSessions.createdAt));
    }),

  getQuoteSessionReview: publicProcedure
    .input(z.object({ sessionId: z.number(), page: z.number().default(1), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");
      const sessionRes = await db.select().from(quoteSessions).where(eq(quoteSessions.id, input.sessionId));
      if (!sessionRes[0]) throw new Error("Sessão não encontrada.");
      const countRes = await db.select({ count: sql`count(*)` }).from(quoteItems).where(eq(quoteItems.quoteSessionId, input.sessionId));
      const totalCount = Number(countRes[0]?.count || 0);
      const items = await db.select({ item: quoteItems, product: products })
        .from(quoteItems).leftJoin(products, eq(quoteItems.productCode, products.code))
        .where(eq(quoteItems.quoteSessionId, input.sessionId)).limit(input.limit).offset((input.page - 1) * input.limit).orderBy(desc(quoteItems.id));
      return { 
        session: sessionRes[0], items,
        pagination: { totalCount, totalPages: Math.ceil(totalCount / input.limit), currentPage: input.page }
      };
    }),

  getQuoteItems: publicProcedure
    .input(z.object({ sessionId: z.number(), page: z.number().default(1), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");
      const countRes = await db.select({ count: sql`count(*)` }).from(quoteItems).where(eq(quoteItems.quoteSessionId, input.sessionId));
      const totalCount = Number(countRes[0]?.count || 0);
      const items = await db.query.quoteItems.findMany({
        where: eq(quoteItems.quoteSessionId, input.sessionId), with: { product: true },
        limit: input.limit, offset: (input.page - 1) * input.limit, orderBy: desc(quoteItems.id)
      });
      return { items, pagination: { totalCount, totalPages: Math.ceil(totalCount / input.limit), currentPage: input.page } };
    }),

  createSessionFromTxt: publicProcedure
    .input(z.object({ fileContent: z.string(), sessionName: z.string(), startDate: z.string(), endDate: z.string(), targetDays: z.number().default(3) }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Offline");
        const lines = input.fileContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const [session] = await db.insert(quoteSessions).values({ name: input.sessionName, startDate: new Date(input.startDate), endDate: new Date(input.endDate), targetDays: input.targetDays, status: 'revisao' }).returning();
        
        const [blacklist, discontinued] = await Promise.all([
          db.select({ code: productBlacklist.productCode }).from(productBlacklist),
          db.select({ code: products.code }).from(products).where(eq(products.isDiscontinued, true))
        ]);
        const ignoredSet = new Set([...blacklist.map((b: any) => b.code), ...discontinued.map((d: any) => d.code)]);
        const codesInFile = new Set<string>(); const fileRows: any[] = [];
        const reportDays = Math.max((new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / 86400000, 1);
        
        for (const line of lines) {
          if (!line.startsWith('2;')) continue;
          const f = line.split(';'); const code = f[3]?.trim();
          if (!code || codesInFile.has(code) || ignoredSet.has(code)) continue;
          codesInFile.add(code); fileRows.push({ code, name: f[4]?.trim() || "PR", ean: f[1]?.trim() || null, salesInPeriod: parseInt(f[2]) || 0, price: f[6] || "0.00" });
        }
        const codesArr = Array.from(codesInFile);
        if (codesArr.length === 0) return { success: true, sessionId: session.id };
        
        const productInserts = fileRows.map(r => ({ code: r.code, name: r.name || 'Produto Não Identificado', ean: r.ean || "", price: r.price || "0" }));
        for (let i = 0; i < productInserts.length; i += 1000) {
            await db.insert(products).values(productInserts.slice(i, i + 1000)).onConflictDoNothing();
        }
        
        const historyToInsert = fileRows.map(row => ({ productCode: row.code, quantity: row.salesInPeriod, startDate: new Date(input.startDate), endDate: new Date(input.endDate), source: 'relatorio_diario' }));
        const insertedHistory = await db.insert(salesHistory).values(historyToInsert).onConflictDoNothing().returning();
        
        const updatesProds = insertedHistory.map((hist: any) => db.update(products)
           .set({ expectedStock: sql`expected_stock - ${hist.quantity}` })
           .where(and(eq(products.code, hist.productCode), sql`expected_stock IS NOT NULL`)));
           
        for (let i = 0; i < updatesProds.length; i += 200) {
           await Promise.all(updatesProds.slice(i, i + 200));
        }
        
        const [allHist, adjs, allRupts, prods] = await Promise.all([
          db.select().from(salesHistory).where(inArray(salesHistory.productCode, codesArr)),
          db.select().from(productAdjustments).where(inArray(productAdjustments.productCode, codesArr)),
          db.select().from(manualRuptures).where(eq(manualRuptures.status, 'pending')),
          db.select().from(products).where(inArray(products.code, codesArr))
        ]);
        
        const hMap = new Map(); allHist.forEach((h: any) => { const l = hMap.get(h.productCode) || []; l.push(h); hMap.set(h.productCode, l); });
        const aMap = new Map(); adjs.forEach((a: any) => aMap.set(a.productCode, parseFloat(a.averageAdjustmentPercent || "1.20")));
        const pMap = new Map(); prods.forEach((p: any) => pMap.set(p.code, p.expectedStock));
        
        const rMap = new Map();
        const sOrders = (allRupts as any[]).filter(r => r.isSpecialOrder);
        (allRupts as any[]).filter(r => !r.isSpecialOrder).forEach((r: any) => rMap.set(r.productCode, (rMap.get(r.productCode) || 0) + r.askedCount));

        const itemsToInsert: any[] = [];
        const handledCodesInReview = new Set<string>();

        // Lógica Sazonal Automática: Sexta = 4 dias, resto = 1.
        const endDateObj = new Date(input.endDate);
        const currentMonth = endDateObj.getMonth() + 1;
        const currentDay = endDateObj.getDate();
        let autoTargetDays = endDateObj.getDay() === 5 ? 4 : 1; 
        let holidayTag = '';
        if (currentMonth === 1 && currentDay >= 13 && currentDay <= 15) { autoTargetDays++; holidayTag = ' (+ S.Amaro Guarujá)'; }
        if (currentMonth === 9 && currentDay >= 1 && currentDay <= 3) { autoTargetDays++; holidayTag = ' (+ Emanc. Guarujá)'; }
        if (currentMonth === 12 && currentDay >= 24) { autoTargetDays++; holidayTag = ' (+ Natal/AnoNovo)'; }

        // Salvamos no banco o targetDays calculado, pra sobrescrever o default da interface
        await db.update(quoteSessions).set({ targetDays: autoTargetDays }).where(eq(quoteSessions.id, session.id));

        for (const row of fileRows) {
          const history = hMap.get(row.code) || []; const adj = aMap.get(row.code) || 1.2; 
          const lostInput = rMap.get(row.code) || 0;
          const specials = sOrders.filter((s: any) => s.productCode === row.code);
          const expStock = pMap.get(row.code);
          
          let totalTurn = 0, totalDaysCount = 0;
          history.forEach((h: any) => {
            const d = Math.max((new Date(h.endDate).getTime() - new Date(h.startDate).getTime()) / 86400000, 0.1);
            totalTurn += h.quantity / d; totalDaysCount++;
          });
          const giro = totalDaysCount > 0 ? (totalTurn / totalDaysCount) : (row.salesInPeriod / reportDays);
          
          let baseSuggestion = Math.ceil((giro * autoTargetDays * adj) + lostInput + (specials.length));
          
          if (expStock !== undefined && expStock !== null) {
              baseSuggestion = Math.max(baseSuggestion - expStock, 0); 
          } else {
              baseSuggestion = Math.max(baseSuggestion, 1); // fallback clássico
          }
          
          let reasoning = specials.length > 0 ? `ENCOMENDA VIP` : `Giro (${autoTargetDays}d)${holidayTag}`;
          if (expStock !== undefined && expStock !== null) reasoning += ` | -${expStock} Estq`;
          
          itemsToInsert.push({ quoteSessionId: session.id, productCode: row.code, salesInPeriod: row.salesInPeriod, suggestedQuantity: baseSuggestion, userConfirmedQuantity: baseSuggestion, priceAtTime: row.price, isMissing: false, aiReasoning: reasoning, shelfQuantity: expStock });
          handledCodesInReview.add(row.code);
        }

        for (const s of (sOrders as any[])) {
          if (!handledCodesInReview.has(s.productCode)) {
             itemsToInsert.push({ 
               quoteSessionId: session.id, productCode: s.productCode, salesInPeriod: 0, 
               suggestedQuantity: s.askedCount || 1, userConfirmedQuantity: s.askedCount || 1, 
               priceAtTime: "0.00", isMissing: false, 
               aiReasoning: `ENCOMENDA: ${s.customerName || 'Cliente VIP'}` 
             });
             handledCodesInReview.add(s.productCode);
          }
        }

        for (let i = 0; i < itemsToInsert.length; i += 1000) await db.insert(quoteItems).values(itemsToInsert.slice(i, i + 1000));
        return { success: true, sessionId: session.id };
      } catch (err: any) {
        console.error("Falha Crítica ao processar Cotac TXT:", err);
        throw new Error(`Erro no motor de cotação: ${err.message}`);
      }
    }),

  processNfeXml: publicProcedure
    .input(z.object({ sessionId: z.number(), xmlContent: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Offline!");
      const regex = /<det\s+nItem="\d+">[\s\S]*?<prod>[\s\S]*?<cProd>(.*?)<\/cProd>[\s\S]*?<cEAN>(.*?)<\/cEAN>[\s\S]*?<xProd>(.*?)<\/xProd>[\s\S]*?<qCom>(.*?)<\/qCom>/g;
      let match, count = 0, matchIds: number[] = [];
      const prodUpdates: any[] = [];
      while ((match = regex.exec(input.xmlContent)) !== null) {
        const [_, cProd, cEAN, xProd, qCom] = match; const qty = Math.floor(parseFloat(qCom));
        const [prodRec] = await db.select().from(products).where(eq(products.ean, cEAN));
        if (prodRec) {
          const [sItem] = await db.select().from(quoteItems).where(and(eq(quoteItems.quoteSessionId, input.sessionId), eq(quoteItems.productCode, prodRec.code)));
          if (sItem) {
             await db.update(quoteItems).set({ arrivedQuantity: qty, isMissing: (sItem.userConfirmedQuantity || sItem.suggestedQuantity) > qty }).where(eq(quoteItems.id, sItem.id));
             matchIds.push(sItem.id); count++;
             prodUpdates.push(db.update(products).set({ expectedStock: sql`expected_stock + ${qty}` }).where(and(eq(products.code, prodRec.code), sql`expected_stock IS NOT NULL`)));
          }
        }
      }
      
      for(let i=0; i < prodUpdates.length; i+=200) await Promise.all(prodUpdates.slice(i, i+200));

      if (input.sessionId > 0 && matchIds.length > 0) {
        await db.update(quoteItems).set({ arrivedQuantity: 0, isMissing: true }).where(and(eq(quoteItems.quoteSessionId, input.sessionId), sql`id NOT IN (${sql.join(matchIds, ', ')})` as any));
      }
      return { success: true, matchedCount: count };
    }),

  updateQuoteItemArrivedQuantity: publicProcedure
    .input(z.object({ itemId: z.number(), arrivedQuantity: z.number() }))
    .mutation(async ({ input }) => {
       const db = await getDb(); if (!db) throw new Error("Offline!");
       const [item] = await db.select().from(quoteItems).where(eq(quoteItems.id, input.itemId));
       if (!item) throw new Error("Item não encontrado!");
       const target = item.userConfirmedQuantity || item.suggestedQuantity;
       return await db.update(quoteItems).set({ arrivedQuantity: input.arrivedQuantity, isMissing: target > input.arrivedQuantity }).where(eq(quoteItems.id, input.itemId)).returning();
    }),

  getProductsWithRuptureStatus: publicProcedure
    .input(z.object({ search: z.string().optional(), page: z.number().default(1), limit: z.number().default(50), showDiscontinued: z.boolean().default(false) }))
    .query(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Offline");
      const offset = (input.page - 1) * input.limit;
      const conditions = [input.showDiscontinued ? eq(products.isDiscontinued, true) : eq(products.isDiscontinued, false)];
      if (input.search) conditions.push(or(ilike(products.name, `%${input.search}%`), eq(products.code, input.search), eq(products.ean, input.search))!);
      
      const [items, totalRes] = await Promise.all([
        db.query.products.findMany({ where: conditions.length > 0 ? and(...conditions) : undefined, limit: input.limit, offset, orderBy: [products.name] }),
        db.select({ count: sql`count(*)` }).from(products).where(conditions.length > 0 ? and(...conditions) : undefined)
      ]);
      const totalCount = Number(totalRes[0]?.count || 0);
      return { products: items, pagination: { totalCount, totalPages: Math.ceil(totalCount / input.limit), currentPage: input.page } };
    }),

  updateProduct: publicProcedure.input(z.object({ 
       code: z.string(), 
       name: z.string().optional(),
       isControlled: z.boolean().optional(),
       isDiscontinued: z.boolean().optional(),
       mainCategory: z.string().optional().nullable(),
       subCategory: z.string().optional().nullable()
    }))
    .mutation(async ({ input }) => { 
       const db = await getDb(); 
       const updates: any = {};
       
       if (input.name !== undefined) updates.name = input.name;
       if (input.isControlled !== undefined) updates.isControlled = input.isControlled;
       if (input.isDiscontinued !== undefined) updates.isDiscontinued = input.isDiscontinued;
       if (input.mainCategory !== undefined) updates.mainCategory = input.mainCategory;
       if (input.subCategory !== undefined) updates.subCategory = input.subCategory;

       if (input.mainCategory === 'perfumaria') updates.isPerfumery = true;
       if (input.mainCategory === 'medicamento') updates.isPerfumery = false;

       if (input.isDiscontinued === true) {
          await db.insert(productBlacklist).values({ productCode: input.code, productName: input.name || "Produto Banido" }).onConflictDoNothing();
       } else if (input.isDiscontinued === false) {
          await db.delete(productBlacklist).where(eq(productBlacklist.productCode, input.code));
       }

       return await db.update(products).set(updates).where(eq(products.code, input.code)).returning(); 
    }),

  updateQuoteItemQuantity: publicProcedure.input(z.object({ itemId: z.number(), newQuantity: z.number() })).mutation(async ({ input }) => { const db = await getDb(); await db.update(quoteItems).set({ userConfirmedQuantity: input.newQuantity }).where(eq(quoteItems.id, input.itemId)); return { success: true }; }),
  
  updateQuoteItemShelfQuantity: publicProcedure.input(z.object({ itemId: z.number(), shelfQuantity: z.number().nullable() })).mutation(async ({ input }) => { 
     const db = await getDb(); 
     const [item] = await db.select().from(quoteItems).where(eq(quoteItems.id, input.itemId));
     if (!item) throw new Error("Item não encontrado!");
     const newQty = Math.max(item.suggestedQuantity - (input.shelfQuantity || 0), 0);
     
     await db.update(quoteItems).set({ shelfQuantity: input.shelfQuantity, userConfirmedQuantity: newQty }).where(eq(quoteItems.id, input.itemId)); 
     
     if (input.shelfQuantity !== null) {
        await db.update(products).set({ expectedStock: input.shelfQuantity, stockLastUpdated: new Date() }).where(eq(products.code, item.productCode));
     }

     return { success: true, newQty }; 
  }),
  
  deleteQuoteItem: publicProcedure.input(z.object({ itemId: z.number() })).mutation(async ({ input }) => { const db = await getDb(); await db.delete(quoteItems).where(eq(quoteItems.id, input.itemId)); return { success: true }; }),
  
  generateCotefacilExport: publicProcedure.input(z.object({ sessionId: z.number(), headerCnpj: z.string().default('39455875000113') })).mutation(async ({ input }) => {
    const db = await getDb(); const items = await db.select({ item: quoteItems, name: products.name, ean: products.ean }).from(quoteItems).leftJoin(products, eq(quoteItems.productCode, products.code)).where(eq(quoteItems.quoteSessionId, input.sessionId));
    let txt = `1;${input.headerCnpj};3.0\n`; items.forEach((r: any) => { txt += `2;${r.ean || ''};${r.item.userConfirmedQuantity ?? r.item.suggestedQuantity};${r.item.productCode};${r.name || 'PRODUTO'};;${r.item.priceAtTime || '0.01'}\n`; });
    txt += `9;${items.length + 2}\n`;
    await db.update(quoteSessions).set({ status: 'exportado_cotefacil' }).where(eq(quoteSessions.id, input.sessionId)); return { txtFileContent: txt };
  }),

  finishSessionManually: publicProcedure.input(z.object({ sessionId: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    await db.update(quoteSessions).set({ status: 'fechado_manualmente' }).where(eq(quoteSessions.id, input.sessionId));
    return { success: true };
  }),

  // LISTA NEGRA
  getBlacklist: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Offline!");
    return await db.select().from(productBlacklist).orderBy(desc(productBlacklist.createdAt));
  }),

  addToBlacklist: publicProcedure.input(z.object({ productCode: z.string(), productName: z.string().optional() })).mutation(async ({ input }) => {
     const db = await getDb();
     await db.insert(productBlacklist).values({ productCode: input.productCode, productName: input.productName }).onConflictDoUpdate({ target: productBlacklist.productCode, set: { productName: input.productName } });
     await db.delete(quoteItems).where(eq(quoteItems.productCode, input.productCode)); return { success: true };
  }),

  removeFromBlacklist: publicProcedure.input(z.object({ productCode: z.string() })).mutation(async ({ input }) => {
     const db = await getDb();
     await db.delete(productBlacklist).where(eq(productBlacklist.productCode, input.productCode));
     return { success: true };
  }),

  logManualRupture: publicProcedure.input(z.object({ 
     ean: z.string(),
     customerId: z.number().optional(),
     customerName: z.string().optional(),
     contact: z.string().optional(),
     isPaid: z.boolean().optional(),
     isSpecialOrder: z.boolean().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb(); const [product] = await db.select().from(products).where(eq(products.ean, input.ean));
    if (!product) throw new Error("Produto não cadastrado.");
    
    if (input.isSpecialOrder) {
       await db.insert(manualRuptures).values({ 
          productCode: product.code, ean: input.ean, askedCount: 1, 
          customerId: input.customerId,
          customerName: input.customerName, contact: input.contact, 
          isPaid: input.isPaid, isSpecialOrder: true, status: 'pending' 
       });
    } else {
       const existing = await db.select().from(manualRuptures).where(and(eq(manualRuptures.productCode, product.code), eq(manualRuptures.status, 'pending'), eq(manualRuptures.isSpecialOrder, false)));
       if (existing[0]) { await db.update(manualRuptures).set({ askedCount: (existing[0].askedCount || 0) + 1, lastAskedAt: new Date() }).where(eq(manualRuptures.id, existing[0].id)); }
       else { await db.insert(manualRuptures).values({ productCode: product.code, ean: input.ean, askedCount: 1, status: 'pending' }); }
    }
    return { success: true, productName: product.name };
  }),

  updateOrderStatus: publicProcedure.input(z.object({ id: z.number(), status: z.string() })).mutation(async ({ input }) => {
     const db = await getDb();
     await db.update(manualRuptures).set({ status: input.status }).where(eq(manualRuptures.id, input.id));
     return { success: true };
  }),

  /**
   * 📉 RESUMO DE RUPTURAS - VERSÃO DETALHADA v8.1
   */
  getRuptureSummary: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Offline!");
    try {
      // 1. Busca os detalhes individuais para a lista (com Hora)
      const list = await db.select({
        id: manualRuptures.id,
        productCode: manualRuptures.productCode,
        productName: products.name,
        lastAskedAt: manualRuptures.lastAskedAt,
        askedCount: manualRuptures.askedCount,
        isSpecialOrder: manualRuptures.isSpecialOrder
      })
      .from(manualRuptures)
      .leftJoin(products, eq(manualRuptures.productCode, products.code))
      .where(eq(manualRuptures.status, 'pending'))
      .orderBy(desc(manualRuptures.lastAskedAt));

      // 2. Busca contagem por categoria para o gráfico
      const stats = await db.select({
        subCategory: products.subCategory,
        count: sql<number>`count(*)`
      })
      .from(manualRuptures)
      .leftJoin(products, eq(manualRuptures.productCode, products.code))
      .where(eq(manualRuptures.status, 'pending'))
      .groupBy(products.subCategory);

      return { 
        stats: stats.map((s: any) => ({ label: s.subCategory || 'Sem Categoria', value: Number(s.count) })),
        list: list.map((l: any) => ({ ...l, timeDisplay: new Date(l.lastAskedAt).toLocaleTimeString() }))
      };
    } catch (e) {
      console.error("Erro no resumo:", e);
      return { stats: [], list: [] };
    }
  }),

  getSpecialOrders: publicProcedure.query(async () => {
     const db = await getDb();
     if (!db) throw new Error("Offline!");
     try {
       return await db.select({
          id: manualRuptures.id,
          productCode: manualRuptures.productCode,
          productName: products.name,
          customerName: manualRuptures.customerName,
          contact: manualRuptures.contact,
          isPaid: manualRuptures.isPaid,
          status: manualRuptures.status,
          lastAskedAt: manualRuptures.lastAskedAt
       })
       .from(manualRuptures)
       .leftJoin(products, eq(manualRuptures.productCode, products.code))
       .where(eq(manualRuptures.isSpecialOrder, true))
       .orderBy(desc(manualRuptures.lastAskedAt));
     } catch (e) {
       console.error("Erro ao buscar encomendas:", e);
       return [];
     }
  }),
});
