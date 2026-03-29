import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { AlertCircle, TrendingDown, TrendingUp, ClipboardList, PackageSearch, Loader2, BarChart3, Zap, ShieldAlert, ChevronRight, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function ReportsSection() {
  const { data: ruptures, isLoading, error } = trpc.cota.getRuptureSummary.useQuery();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-32 space-y-4">
        <div className="relative">
          <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 relative" />
        </div>
        <p className="text-slate-400 font-bold animate-pulse tracking-widest text-xs uppercase">Sincronizando dados da farmácia...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-12 border-rose-100 bg-rose-50/20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-lg font-black text-rose-700">Ops, algo deu errado!</h3>
          <p className="text-sm text-rose-600/60 max-w-xs mx-auto">
            Não consegui carregar os dados de falta. Dá uma olhadinha se a conexão com o banco tá certinha ou se as tabelas foram criadas.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="reports-dashboard space-y-10"
    >
      {/* Branding da PredictMed */}
      <motion.div variants={itemVariants} className="reports-branding-strip glassmorphism !bg-slate-900/5 backdrop-blur-3xl border-none p-8 flex flex-col md:flex-row items-center gap-10">
        <div className="relative group overflow-hidden rounded-3xl">
          <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600/40 to-cyan-400/40 blur-xl opacity-20 group-hover:opacity-60 transition duration-700"></div>
          <img 
            src="/assets/logo_premium.png" 
            alt="PredictMed" 
            className="h-28 w-auto object-contain drop-shadow-xl transition-transform duration-700 group-hover:scale-110 relative z-10" 
          />
        </div>
        <div className="reports-title-stack text-center md:text-left flex-1">
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">O que tá acontecendo na loja</h2>
          <div className="flex flex-wrap items-center gap-4 mt-4 justify-center md:justify-start">
            <Badge variant="outline" className="border-blue-200 text-blue-600 font-black uppercase tracking-widest text-[10px] px-4 py-1.5 shadow-sm bg-white">
              Minha IA tá de olho no estoque
            </Badge>
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               Dados em Tempo Real
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid de Status (Métricas em Tempo Real) */}
      <div className="reports-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { id: 'ruptures', icon: PackageSearch, color: 'rose', metric: ruptures?.length || 0, label: 'Faltas Críticas' },
        ].map((card) => (
          <motion.div key={card.id} variants={itemVariants}>
            <Card className="report-status-card group premium-shadow border-none hover:-translate-y-1 transition-all duration-300">
              <div className={`status-pulse-urgent`} />
              <div className="p-6 relative z-10 flex flex-col h-full bg-white/70 backdrop-blur-sm rounded-3xl m-1 border-2 border-white/50">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-${card.color}-100 flex items-center justify-center shadow-inner`}>
                    <card.icon className={`w-7 h-7 text-${card.color}-600`} />
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="text-[2.5rem] leading-none mb-1 font-black text-slate-800 tracking-tight">{card.metric}</div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-snug">{card.label}</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Área de Inteligência e Prioridades */}
      <div className="reports-priority-area grid lg:grid-cols-2 gap-10">
        <motion.div variants={itemVariants} className="priority-section-wrapper h-full">
          <div className="priority-header-brick backdrop-blur-md !bg-white/80 border-b border-rose-100 flex items-center justify-between pr-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Produtos que faltaram</h3>
            </div>
            <Badge className="bg-rose-100 text-rose-600 border-none font-black">{ruptures?.length || 0}</Badge>
          </div>
          <Card className="priority-list-card glassmorphism border-none !bg-white/40 overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
              {ruptures && ruptures.length > 0 ? (
                <div className="divide-y divide-slate-100/50">
                  {ruptures.map((item: any) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ x: 5 }}
                      className="priority-list-item group p-6 flex items-center justify-between transition-colors hover:bg-white/60"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-400 transition-colors">
                          <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="priority-item-name block text-base font-black text-slate-700 group-hover:text-slate-900">{item.productName}</span>
                          <span className="priority-item-sub text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1 block">
                            CÓD: {item.productCode} • {item.session}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <div className="text-lg font-black text-rose-600">-{item.confirmed - (item.arrived || 0)}</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase leading-none">Faltou</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-rose-400 transition-colors" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <TrendingUp className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-slate-800">Tudo certo no estoque!</h4>
                    <p className="text-sm text-slate-400 font-medium italic">Boa! Não achei nenhuma falta por aqui hoje.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="priority-section-wrapper h-full">
          <div className="priority-header-brick !bg-slate-900 border-none shadow-xl flex items-center justify-between pr-6">
            <div className="flex items-center gap-4 text-white">
              <div className="p-2 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Produtos que mais saem (Curva A)</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Ranking da IA</span>
            </div>
          </div>
          <Card className="priority-list-card glassmorphism border-none !bg-slate-900/5 overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto w-full h-full flex items-center justify-center min-h-[300px]">
              <div className="p-10 text-center space-y-5 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-slate-900/5 rounded-full flex items-center justify-center mx-auto shadow-inner border border-slate-900/10 backdrop-blur-sm">
                  <Database className="w-10 h-10 text-slate-400/80 drop-shadow-sm" />
                </div>
                <div className="space-y-2 max-w-[280px] mx-auto">
                  <h4 className="text-xl font-black text-slate-700 tracking-tight">Ainda não tenho dados pra isso</h4>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Sobe o relatório de vendas que eu te mostro quais produtos são o seu "carro-chefe" e como a IA pode ajudar.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
