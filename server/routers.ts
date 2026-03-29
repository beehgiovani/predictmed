import { COOKIE_NAME } from "@shared/const.ts";
import { getSessionCookieOptions } from "./_core/cookies.ts";
import { systemRouter } from "./_core/systemRouter.ts";
import { publicProcedure, router } from "./_core/trpc.ts";
import { dataRouter } from "./dataRouter.ts";
import { cotaRouter } from "./cotaRouter.ts";

export const appRouter = router({
    // Se precisar usar socket.io, veja como registrar a rota em server/_core/index.ts. 
    // Todas as APIs devem começar com '/api/' pro gateway rotear certinho.
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  data: dataRouter,
  cota: cotaRouter,
});

export type AppRouter = typeof appRouter;
