import { useState } from "react";
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
import SyncPhotosTool from "@/components/SyncPhotosTool";
import ManualRuptureEntry from "@/components/ManualRuptureEntry";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, FileText, ClipboardList, Package, Zap, BarChart3, ShieldAlert, AlertCircle, CheckCircle2, Upload, TrendingUp, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      alert("Sistema limpo com sucesso! Você já pode subir os dados oficiais.");
      window.location.reload();
    }
  });

  return (
    <div className="premium-layout min-h-screen bg-slate-50/50">
      {/* Premium Header Branded */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="w-full flex items-center justify-between gap-4 px-4 md:px-8 lg:px-12 h-14 md:h-20">
          <div className="flex items-center gap-4 md:gap-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center h-9 md:h-14"
            >
              <img 
                src="/assets/logo_premium.png" 
                alt="PredictMed Premium" 
                className="h-full w-auto object-contain"
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
                Online &amp; Sincronizado
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

      {/* Navigation — Desktop apenas (Mobile usa BottomNav) */}
      <nav className="hidden md:block sticky top-20 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/40 shadow-sm">
        <div className="w-full px-6 py-3">
          <div className="nav-tabs-list">
            {[
              { id: "dashboard", icon: LayoutDashboard, label: "Painel Estratégico" },
              { id: "cota", icon: FileText, label: "Cotação Preditiva" },
              { id: "rupture", icon: ShieldAlert, label: "Scanner de Ruptura" },
              { id: "conferencia", icon: ClipboardList, label: "Conferência Smart" },
              { id: "reports", icon: BarChart3, label: "Insights & Relatórios" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-state={activeTab === tab.id ? "active" : "inactive"}
                className="nav-tab-trigger group"
              >
                <tab.icon className={`w-5 h-5 shrink-0 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Premium Content Area */}
      <main className="premium-main-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* TabsList secundário removido - usando nav-tab-trigger no header */}

        {/* 📚 ABA COTAÇÃO */}
          <TabsContent value="cota" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CotacaoSection />
          </TabsContent>

        {/* 📊 ABA REPORTS */}
          <TabsContent value="reports" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
               <div className="h-10 w-1.5 bg-blue-600 rounded-full" />
               <h2 className="text-2xl font-black text-slate-800">Relatórios de Desempenho</h2>
            </div>
            <ReportsSection />
          </TabsContent>

        {/* 🚨 ABA RUPTURA: Onde o vendedor registra o que faltou */}
        <TabsContent value="rupture" className="space-y-6">
          <ManualRuptureEntry />
        </TabsContent>

        {/* 📦 ABA CONFERÊNCIA: Conferência de Pedidos vs XML */}
        <TabsContent value="conferencia" className="space-y-4">
          <Card className="p-12 text-center space-y-6 border-2 border-dashed border-muted-foreground/20 text-balance animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-sm border border-green-100">
              <Upload className="w-10 h-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">Módulo de Conferência Smart</h3>
              <p className="max-w-md mx-auto text-muted-foreground font-medium leading-relaxed">
                Bata o que você pediu contra o XML (NFe) do fornecedor. O sistema detecta faltas e as repõe na sugestão de amanhã automaticamente.
              </p>
            </div>
            <div className="flex justify-center gap-4">
               <Badge variant="secondary" className="px-6 py-2 text-sm font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border-none">
                  Status: Engenharia em Progresso
               </Badge>
            </div>
          </Card>
        </TabsContent>

        {/* ⚙️ ABA PAINEL ESTRATÉGICO: Técnico e Catálogo */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6 text-balance animate-in fade-in duration-700">
            <div className="md:col-span-2 space-y-6">
              <Alert className="bg-amber-50 border-amber-200 rounded-2xl shadow-sm">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800 font-medium">
                  <strong>Área Técnica:</strong> Use para atualizar o catálogo COTAC ou processar filas massivas de histórico.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-2 gap-6 items-start">
                 <FileUploadSection />
                 <SyncPhotosTool />
              </div>
              <div className="mt-8">
                <BulkUploadQueue />
              </div>
            </div>
            
            <div className="space-y-6">
              <Card className="p-8 rounded-3xl border-rose-100 bg-rose-50/20 premium-shadow">
                <h3 className="text-lg font-black mb-4 flex items-center gap-3 text-rose-600">
                   <AlertCircle className="w-6 h-6" />
                   Zona de Perigo
                </h3>
                <p className="text-sm text-rose-800/60 mb-6 font-medium leading-snug">
                  Apaga o histórico de vendas (90 dias), todas as cotações e o aprendizado da IA. **Mantém o catálogo de produtos.**
                </p>
                <Button 
                  variant="destructive" 
                  size="lg" 
                  className="w-full rounded-2xl font-bold shadow-lg shadow-rose-200 hover:shadow-xl transition-all active:scale-95"
                  onClick={() => {
                    if (confirm("TEM CERTEZA? Isso vai apagar todo o histórico de vendas e cotações de teste. Esta ação não pode ser desfeita.")) {
                      resetMutation.mutate();
                    }
                  }}
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? "Limpando..." : "Resetar p/ Produção"}
                </Button>
              </Card>

              <Card className="p-8 rounded-3xl premium-shadow border-slate-100">
                <h3 className="text-lg font-black mb-6 flex items-center gap-3 text-slate-800">
                   <Database className="w-6 h-6 text-blue-600" />
                   Histórico de Atividade
                </h3>
                <div className="space-y-5">
                  {uploadHistory.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-sm text-slate-400 font-medium italic">Nenhuma atividade recente.</p>
                    </div>
                  ) : (
                    uploadHistory.slice(0, 5).map((u) => (
                      <div key={u.id} className="group p-3 rounded-xl hover:bg-slate-50 transition-colors border-l-4 border-transparent hover:border-blue-500">
                         <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{u.filename}</span>
                            <Badge variant={u.status === 'success' ? 'default' : 'destructive'} className="text-[10px] h-5">
                               {u.status === 'success' ? 'SUCESSO' : 'ERRO'}
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
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Catálogo Mestre de Produtos</h3>
             </div>
             <ProductsList />
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  </div>
);
}
