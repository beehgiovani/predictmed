import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import FileUploadSection from "@/components/FileUploadSection";
import ProductsList from "@/components/ProductsList";
import CotacaoSection from "@/components/CotacaoSection";
import ReportsSection from "@/components/ReportsSection";
import BulkUploadQueue from "@/components/BulkUploadQueue";
import ConferenciaSection from "@/components/ConferenciaSection";
import ManualRuptureEntry from "@/components/ManualRuptureEntry";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, FileText, ClipboardList, Package, Zap, BarChart3, ShieldAlert, AlertCircle, CheckCircle2, Upload, TrendingUp, Database, ShieldX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [uploadHistory, setUploadHistory] = useState<Array<{
    id: string;
    type: "cotac" | "pedido" | "xml";
    filename: string;
    date: Date;
    status: "success" | "error";
    message: string;
    recordsProcessed?: number;
  }>>([]);
  
  const [activeTab, setActiveTab] = useState("cota");
  const utils = trpc.useContext();

  // 🛰️ RADAR GLOBAL REALTIME: SINCRONIZA TUDO AO VIVO
  useEffect(() => {
    const channel = supabase
      .channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
         console.log("🔄 Sincronização Global:", payload.table);
         // Atualiza apenas as queries que fazem sentido para a tabela que mudou
         if (payload.table === 'products') utils.cota.getProductsWithRuptureStatus.invalidate();
         if (payload.table === 'quote_items' || payload.table === 'quote_sessions') {
            utils.cota.getQuoteSessions.invalidate();
            utils.cota.getQuoteSessionReview.invalidate();
         }
         if (payload.table === 'manual_ruptures') {
            utils.cota.getSpecialOrders.invalidate();
            utils.cota.getRuptureSummary.invalidate();
         }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [utils]);

  const handleUploadSuccess = (type: "cotac" | "pedido" | "xml", filename: string, message: string, recordsProcessed?: number) => {
    setUploadHistory((prev) => [
      {
        id: `${Date.now()}`,
        type,
        filename,
        date: new Date(),
        status: "success",
        message,
        recordsProcessed,
      },
      ...prev,
    ]);
  };

  const resetMutation = trpc.data.resetForProduction.useMutation({
    onSuccess: () => {
      alert("Pronto! Limpei tudo. Agora você pode subir os dados reais da sua farmácia.");
      window.location.reload();
    }
  });

  return (
    <div className="premium-layout min-h-screen bg-slate-50/50">
      {/* Cabeçalho Premium */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="w-full flex items-center justify-between gap-4 px-4 md:px-8 lg:px-12 h-14 md:h-20">
          <div className="flex items-center gap-4 md:gap-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center h-7 md:h-14"
            >
              <img 
                src="/assets/logo_premium.png" 
                alt="PredictMed Premium" 
                className="h-full w-auto object-contain max-w-[120px] md:max-w-none"
              />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:flex items-center gap-3 border-l-2 border-slate-200/60 pl-8"
            >
              <div className="brand-status-badge brand-status-online">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                No Ar &amp; Sincronizado
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              className="px-4 md:px-6 h-9 md:h-11 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 text-sm transition-all active:scale-95"
              onClick={() => {}}
            >
              <LogOut className="w-4 h-4 mr-2 text-slate-400" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Navegação - Menu Principal Slim */}
      <nav className="sticky top-14 md:top-20 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/40 shadow-sm overflow-x-auto no-scrollbar">
        <div className="w-full min-w-max px-4 py-1.5 md:px-6 md:py-2">
          <div className="flex items-center gap-2 md:gap-4 flex-nowrap">
            {[
              { id: "dashboard", icon: Package, label: "Catálogo" },
              { id: "cota", icon: FileText, label: "Sugestão" },
              { id: "rupture", icon: ShieldAlert, label: "Faltas / VIP" },
              { id: "conferencia", icon: ClipboardList, label: "Conferência" },
              { id: "reports", icon: BarChart3, label: "Desempenho" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-xl md:rounded-2xl transition-all duration-300 font-black uppercase tracking-widest text-[9px] md:text-[11px]",
                  activeTab === tab.id 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                <tab.icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4", activeTab === tab.id ? "animate-pulse" : "")} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="premium-main-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">

        {/* 📚 ABA COTAÇÃO */}
          <TabsContent value="cota" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CotacaoSection />
          </TabsContent>

        {/* 📊 ABA REPORTS */}
          <TabsContent value="reports" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
               <div className="h-10 w-1.5 bg-blue-600 rounded-full" />
               <h2 className="text-2xl font-black text-slate-800">Como anda a Farmácia</h2>
            </div>
            <ReportsSection />
          </TabsContent>

        {/* 🚨 ABA RUPTURA: Onde o vendedor registra o que faltou */}
        <TabsContent value="rupture" className="space-y-6">
          <ManualRuptureEntry />
        </TabsContent>

        {/* 📦 ABA CONFERÊNCIA: Conferência de Pedidos vs XML */}
        <TabsContent value="conferencia" className="space-y-4">
          <ConferenciaSection />
        </TabsContent>

        {/* ⚙️ ABA CONFIGURAÇÕES E CATÁLOGO */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6 text-balance animate-in fade-in duration-700">
            <div className="md:col-span-2 space-y-6">
              <Alert className="bg-amber-50 border-amber-200 rounded-2xl shadow-sm">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800 font-medium">
                  <strong>Trabalho Pesado:</strong> Use esta área para subir o catálogo do COTAC ou processar grandes arquivos de vendas.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-1 gap-6 items-start">
                 <FileUploadSection />
              </div>
              <div className="mt-8">
                <BulkUploadQueue />
              </div>
            </div>
            
            <div className="space-y-6">
              <Card className="p-8 rounded-3xl border-rose-100 bg-rose-50/20 premium-shadow">
                <h3 className="text-lg font-black mb-4 flex items-center gap-3 text-rose-600">
                   <AlertCircle className="w-6 h-6" />
                   Atenção: Limpeza Geral
                </h3>
                <p className="text-sm text-rose-800/60 mb-6 font-medium leading-snug">
                  Isso apaga o histórico de vendas e o que a IA aprendeu nos testes. **Seus produtos cadastrados não mudam.**
                </p>
                <Button 
                  variant="destructive" 
                  size="lg" 
                  className="w-full rounded-2xl font-bold shadow-lg shadow-rose-200 hover:shadow-xl transition-all active:scale-95"
                  onClick={() => {
                    if (confirm("CERTEZA DISSO? Vou apagar todos os dados de vendas e cotações de teste. Não tem como desfazer depois.")) {
                      resetMutation.mutate();
                    }
                  }}
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? "Limpando tudo..." : "Limpar para começar do zero"}
                </Button>
              </Card>

              <Card className="p-8 rounded-3xl premium-shadow border-slate-100">
                <h3 className="text-lg font-black mb-6 flex items-center gap-3 text-slate-800">
                   <Database className="w-6 h-6 text-blue-600" />
                   O que foi feito recentemente
                </h3>
                <div className="space-y-5">
                  {uploadHistory.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-sm text-slate-400 font-medium italic">Ainda não fiz nada por aqui.</p>
                    </div>
                  ) : (
                    uploadHistory.slice(0, 5).map((u) => (
                      <div key={u.id} className="group p-3 rounded-xl hover:bg-slate-50 transition-colors border-l-4 border-transparent hover:border-blue-500">
                         <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{u.filename}</span>
                            <Badge variant={u.status === 'success' ? 'default' : 'destructive'} className="text-[10px] h-5">
                               {u.status === 'success' ? 'PRONTO' : 'ERRO'}
                            </Badge>
                         </div>
                         <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{u.date.toLocaleDateString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>

          <Card className="p-8 rounded-3xl premium-shadow border-slate-100">
             <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-slate-900 rounded-2xl shadow-lg">
                   <Package className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Lista Mestra de Produtos</h3>
             </div>
             <ProductsList />
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  </div>
);
}
