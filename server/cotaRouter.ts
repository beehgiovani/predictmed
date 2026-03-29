import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.ts";
import { getDb } from "./db.ts";
import { quoteSessions, quoteItems, salesHistory, products, manualRuptures, productAdjustments } from "../drizzle/schema.ts";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { getSmartAISuggestion } from "./lib/gemini.ts";

// Essa é a função principal que faz a mágica da IA: junta o cálculo matemático, 
// o jeito que eu gosto de comprar e as vendas que a gente perdeu no balcão.
async function calculateSmartSuggestion(db: any, productCode: string, targetDays: number) {
  // 1. Base Matemática: Calcula quanto o produto gira por dia
  const history = await db.select({
    qty: salesHistory.quantity,
    start: salesHistory.startDate,
    end: salesHistory.endDate,
  }).from(salesHistory).where(eq(salesHistory.productCode, productCode));
  
  let totalDailyTurnover = 0;
  let totalDaysCounted = 0;
  for (const record of history) {
    const durationMs = new Date(record.end).getTime() - new Date(record.start).getTime();
    const durationDays = Math.max(durationMs / (1000 * 60 * 60 * 24), 0.04);
    totalDailyTurnover += record.qty / durationDays;
    totalDaysCounted++;
  }
  const avgGiro = totalDaysCounted > 0 ? (totalDailyTurnover / totalDaysCounted) : 0;

  // 2. Aprendizado: Vê se eu costumo pedir mais ou menos que a IA sugere
  const pref = await db.select().from(productAdjustments).where(eq(productAdjustments.productCode, productCode));
  const adjFactor = pref[0] ? parseFloat(pref[0].averageAdjustmentPercent) : 1.2; // Se não tiver ajuste, coloco 20% de margem por padrão

  // 3. Venda Perdida: Verifica se alguém pediu esse produto e não tinha (ruptura manual)
  const lost = await db.select().from(manualRuptures).where(and(
    eq(manualRuptures.productCode, productCode),
    eq(manualRuptures.status, 'pending')
  ));
  const lostCount = lost[0] ? lost[0].askedCount : 0;

  // 4. Pega os detalhes do produto pra IA saber com o que tá lidando
  const prod = await db.select().from(products).where(eq(products.code, productCode));
  const productName = prod[0]?.name || "Produto Desconhecido";

  // 5. Manda tudo pro "cérebro" da aplicação (Gemini) gerar a sugestão final
  const aiResult = await getSmartAISuggestion({
    productName,
    productCode,
    targetDays,
    salesSummary: `${history.length} períodos de venda registrados`,
    avgDailyTurnover: avgGiro,
    userAdjustmentFactor: adjFactor,
    lostSalesCount: lostCount,
    isCurrentlyMissing: false 
  });

  return aiResult;
}

export const cotaRouter = router({
  // Pega todas as sessões de cotação pra mostrar na lista
  getQuoteSessions: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Ops, o banco tá offline!");
      return await db.select().from(quoteSessions).orderBy(desc(quoteSessions.createdAt));
    }),

  // Puxa os itens de uma sessão específica (usado na revisão e conferência)
  getQuoteItems: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Sem conexão com o banco");

      const items = await db.select({
        id: quoteItems.id,
        quoteSessionId: quoteItems.quoteSessionId,
        productCode: quoteItems.productCode,
        salesInPeriod: quoteItems.salesInPeriod,
        suggestedQuantity: quoteItems.suggestedQuantity,
        userConfirmedQuantity: quoteItems.userConfirmedQuantity,
        arrivedQuantity: quoteItems.arrivedQuantity,
        isMissing: quoteItems.isMissing,
        priceAtTime: quoteItems.priceAtTime,
        aiReasoning: sql`'Análise baseada no giro e estoque.'` as any, 
        product: {
          name: products.name,
          imageUrl: products.imageUrl,
          ean: products.ean
        }
      })
      .from(quoteItems)
      .leftJoin(products, eq(quoteItems.productCode, products.code))
      .where(eq(quoteItems.quoteSessionId, input.sessionId));

      return items;
    }),

  // Cria uma cotação nova a partir do arquivo TXT que eu subo
  createSessionFromTxt: publicProcedure
    .input(
      z.object({
        fileContent: z.string(),
        sessionName: z.string(),
        startDate: z.string(), 
        endDate: z.string(),   
        targetDays: z.number().default(3),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Ih, o banco de dados não conectou");

      const lines = input.fileContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) throw new Error("O arquivo tá vazio, Bruno!");

      // 1. Cria o registro da sessão
      const [session] = await db.insert(quoteSessions).values({
        name: input.sessionName,
        startDate: input.startDate,
        endDate: input.endDate,
        targetDays: input.targetDays,
        status: 'revisao'
      }).returning();

      const itemsToInsert: any[] = [];
      const processedCodes = new Set<string>();

      // 2. Processa as linhas do arquivo (vendas reais do período)
      for (const line of lines) {
        if (!line.startsWith('2;')) continue;
        const fields = line.split(';');
        const code = fields[3]?.trim();
        const quantityStr = fields[2]?.trim();
        if (!code || processedCodes.has(code)) continue;

        processedCodes.add(code);
        const aiResponse = await calculateSmartSuggestion(db, code, input.targetDays);

        itemsToInsert.push({
          quoteSessionId: session.id,
          productCode: code,
          salesInPeriod: parseInt(quantityStr) || 0,
          suggestedQuantity: aiResponse.suggestedQuantity,
          userConfirmedQuantity: aiResponse.suggestedQuantity,
          isMissing: false,
          aiReasoning: aiResponse.reasoning
        });
      }

      // 3. REGRA DE RUPTURA: Se faltou na última vez, a gente traz de volta pra cotação
      const missingItems = await db.execute(sql`
        SELECT DISTINCT ON ("productCode") "productCode", "userConfirmedQuantity"
        FROM quote_items
        WHERE "isMissing" = true
        ORDER BY "productCode", id DESC
      `);

      for (const missing of (missingItems as any)) {
        if (!processedCodes.has(missing.productCode)) {
           itemsToInsert.push({
             quoteSessionId: session.id,
             productCode: missing.productCode,
             salesInPeriod: 0,
             suggestedQuantity: missing.userConfirmedQuantity || 1,
             userConfirmedQuantity: missing.userConfirmedQuantity || 1,
             isMissing: true 
           });
           processedCodes.add(missing.productCode);
        }
      }

      if (itemsToInsert.length > 0) {
        await db.insert(quoteItems).values(itemsToInsert);
      }

      return { success: true, sessionId: session.id };
    }),

  // Atualiza a quantidade que eu conferi antes de exportar
  updateQuoteItemQuantity: publicProcedure
    .input(z.object({ itemId: z.number(), newQuantity: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");

      await db.update(quoteItems)
        .set({ 
          userConfirmedQuantity: input.newQuantity,
        })
        .where(eq(quoteItems.id, input.itemId));

      return { success: true };
    }),

  // Quando o pedido chega, eu marco quanto de fato veio na caixa
  updateQuoteItemArrivedQuantity: publicProcedure
    .input(z.object({ itemId: z.number(), arrivedQuantity: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");

      const item = await db.select().from(quoteItems).where(eq(quoteItems.id, input.itemId));
      if (!item[0]) throw new Error("Ih, não achei esse item");

      const confirmed = item[0].userConfirmedQuantity || item[0].suggestedQuantity;
      const isMissing = confirmed > input.arrivedQuantity;

      await db.update(quoteItems)
        .set({ 
           arrivedQuantity: input.arrivedQuantity,
           isMissing: isMissing
        })
        .where(eq(quoteItems.id, input.itemId));

      return { success: true };
    }),

  // Puxa o resumo da sessão pra eu dar uma última olhada
  getQuoteSessionReview: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");

      const session = await db.select().from(quoteSessions).where(eq(quoteSessions.id, input.sessionId));
      if (!session[0]) throw new Error("Essa sessão sumiu!");

      const items = await db.select({
        item: quoteItems,
        productName: products.name,
        imageUrl: products.imageUrl,
        ean: products.ean
      })
      .from(quoteItems)
      .leftJoin(products, eq(quoteItems.productCode, products.code))
      .where(eq(quoteItems.quoteSessionId, input.sessionId));

      return { session: session[0], items };
    }),

  // Gera o arquivo prontinho pra eu jogar no Cotefácil
  generateCotefacilExport: publicProcedure
    .input(z.object({ sessionId: z.number(), headerCnpj: z.string().default('39455875000113') }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");

      const items = await db.select({
        item: quoteItems,
        productName: products.name,
        ean: products.ean
      })
      .from(quoteItems)
      .leftJoin(products, eq(quoteItems.productCode, products.code))
      .where(eq(quoteItems.quoteSessionId, input.sessionId));

      let txtOutput = `1;${input.headerCnpj};3.0\n`;

      items.forEach((row) => {
        const ean = row.ean || '';
        const qty = row.item.userConfirmedQuantity ?? row.item.suggestedQuantity;
        const cod = row.item.productCode;
        const nome = row.productName || 'PRODUTO';
        const empty = '';
        const price = row.item.priceAtTime || '0.00';

        txtOutput += `2;${ean};${qty};${cod};${nome};${empty};${price}\n`;
      });

      await db.update(quoteSessions)
        .set({ status: 'exportado_cotefacil' })
        .where(eq(quoteSessions.id, input.sessionId));

      return { txtFileContent: txtOutput };
    }),

  // Processa o XML da nota fiscal pra bater com o que a gente pediu
  processNfeXml: publicProcedure
    .input(z.object({ sessionId: z.number(), xmlContent: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Offline");

      const regex = new RegExp('<det\\s+nItem="(\\d+)">.*?<prod>.*?<cProd>(.*?)<\\/cProd>.*?<cEAN>(.*?)<\\/cEAN>.*?<xProd>(.*?)<\\/xProd>.*?<qCom>(.*?)<\\/qCom>.*?<\\/prod>', 'gs');
      
      let matchedIds = new Set<number>();
      let matchedCount = 0;
      let match;
      while ((match = regex.exec(input.xmlContent)) !== null) {
         const [_, nItem, cProd, cEAN, xProd, qCom] = match;
         const quantity = parseFloat(qCom);
         
         if (!cEAN || isNaN(quantity)) continue;

         const productRecord = await db.select().from(products).where(eq(products.ean, cEAN));
         
         if (productRecord[0]) {
            const code = productRecord[0].code;
            const arrivedQty = Math.floor(quantity);

            const sessionItems = await db.select().from(quoteItems).where(and(
               eq(quoteItems.quoteSessionId, input.sessionId),
               eq(quoteItems.productCode, code)
            ));

            if (sessionItems[0]) {
               const confirmed = sessionItems[0].userConfirmedQuantity || sessionItems[0].suggestedQuantity;
               await db.update(quoteItems)
                  .set({ 
                     arrivedQuantity: arrivedQty,
                     isMissing: confirmed > arrivedQty
                  })
                  .where(eq(quoteItems.id, sessionItems[0].id));
               
               matchedIds.add(sessionItems[0].id);
               matchedCount++;
            }
         } else {
            await db.insert(products).values({
               code: cProd,
               ean: cEAN,
               name: xProd,
            }).onConflictDoNothing();
         }
      }

      // REGRA DE OURO: Tudo que eu pedi e não veio na nota, eu marco como falta (zero na chegada)
      if (input.sessionId > 0) {
         await db.update(quoteItems)
            .set({ arrivedQuantity: 0, isMissing: true })
            .where(and(
               eq(quoteItems.quoteSessionId, input.sessionId),
               sql`id NOT IN (${sql.join(Array.from(matchedIds).length > 0 ? Array.from(matchedIds) : [0], ', ')})` as any
            ));
      }

      return { success: true, matchedCount };
    }),

  // Puxa o resumo de tudo que faltou nas últimas cotações
  getRuptureSummary: publicProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) return [];

        return await db.select({
           id: quoteItems.id,
           productCode: quoteItems.productCode,
           productName: products.name,
           confirmed: quoteItems.userConfirmedQuantity,
           arrived: quoteItems.arrivedQuantity,
           session: quoteSessions.name,
           date: quoteSessions.createdAt
        })
        .from(quoteItems)
        .leftJoin(products, eq(quoteItems.productCode, products.code))
        .leftJoin(quoteSessions, eq(quoteItems.quoteSessionId, quoteSessions.id))
        .where(eq(quoteItems.isMissing, true))
        .orderBy(desc(quoteSessions.createdAt));
      } catch (error) {
        // Se der ruim no banco, eu aviso aqui no log silencioso
        if (process.env.NODE_ENV !== 'production') {
           console.error("Erro no resumo de rupturas:", error);
        }
        return [];
      }
    }),

  // Lista os produtos e mostra se estão em falta no momento
  getProductsWithRuptureStatus: publicProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ input }) => {
       const db = await getDb();
       if (!db) throw new Error("Offline");

       const productsList = await db.select({
          code: products.code,
          name: products.name,
          ean: products.ean,
          price: products.price,
          imageUrl: products.imageUrl,
       })
       .from(products)
       .where(input.search ? sql`LOWER(${products.name}) LIKE ${'%' + input.search.toLowerCase() + '%'}` : undefined)
       .limit(100);

       if (productsList.length === 0) return [];

       const productCodes = productsList.map(p => p.code);
       const missingStatuses = await db.select({
          productCode: quoteItems.productCode,
          isMissing: quoteItems.isMissing,
       })
       .from(quoteItems)
       .where(inArray(quoteItems.productCode, productCodes))
       .orderBy(desc(quoteItems.id));

       const statusMap = new Map();
       for (const item of missingStatuses) {
          if (!statusMap.has(item.productCode)) {
             statusMap.set(item.productCode, item.isMissing);
          }
       }

       return productsList.map(p => ({
          ...p,
          isMissing: statusMap.get(p.code) || false
       }));
    }),

  // Registro quando alguém pede um remédio no balcão e não tem (ruptura manual)
  logManualRupture: publicProcedure
    .input(z.object({ ean: z.string() }))
    .mutation(async ({ input }) => {
       const db = await getDb();
       if (!db) throw new Error("Offline");

       const product = await db.select().from(products).where(eq(products.ean, input.ean));
       if (!product[0]) throw new Error("Esse produto nem tá no nosso catálogo ainda.");

       const existing = await db.select().from(manualRuptures).where(and(
         eq(manualRuptures.productCode, product[0].code),
         eq(manualRuptures.status, 'pending')
       ));

       if (existing[0]) {
          await db.update(manualRuptures)
            .set({ 
              askedCount: existing[0].askedCount + 1,
              lastAskedAt: new Date()
            })
            .where(eq(manualRuptures.id, existing[0].id));
       } else {
          await db.insert(manualRuptures).values({
            productCode: product[0].code,
            ean: input.ean,
            askedCount: 1,
            status: 'pending'
          });
       }

       return { success: true, productName: product[0].name };
    }),

  // Aqui a IA aprende comigo: se eu mudei a quantidade, guardo pra sugerir melhor depois
  learnFromUserAdjustment: publicProcedure
    .input(z.object({ productCode: z.string(), suggested: z.number(), confirmed: z.number() }))
    .mutation(async ({ input }) => {
       const db = await getDb();
       if (!db) throw new Error("Sem banco");

       if (input.suggested === 0 || input.confirmed === 0) return { success: false };

       const ratio = input.confirmed / input.suggested;
       
       const existing = await db.select().from(productAdjustments).where(eq(productAdjustments.productCode, input.productCode));

       if (existing[0]) {
          const currentAvg = parseFloat(existing[0].averageAdjustmentPercent ?? "1.00");
          const totalOver = existing[0].totalOverrides ?? 0;
          const newAvg = (currentAvg * totalOver + ratio) / (totalOver + 1);
          await db.update(productAdjustments)
            .set({ 
              averageAdjustmentPercent: newAvg.toFixed(2),
              lastUserQty: input.confirmed,
              totalOverrides: totalOver + 1,
              updatedAt: new Date()
            })
            .where(eq(productAdjustments.id, existing[0].id));
       } else {
          await db.insert(productAdjustments).values({
             productCode: input.productCode,
             averageAdjustmentPercent: ratio.toFixed(2),
             lastUserQty: input.confirmed,
             totalOverrides: 1
          });
       }

       return { success: true };
    }),
});
