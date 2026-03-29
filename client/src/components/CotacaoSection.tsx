import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Save, CheckCircle, FileText, PlusCircle, AlertCircle, Zap, Info } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CotacaoSection() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  
  // States para Formulário de Upload Diário
  const [sessionName, setSessionName] = useState("");
  const [targetDays, setTargetDays] = useState<number>(3);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC Mutations e Queries
  const createSessionMutation = trpc.cota.createSessionFromTxt.useMutation();
  const generateExportMutation = trpc.cota.generateCotefacilExport.useMutation();
  const updateQuantityMutation = trpc.cota.updateQuoteItemQuantity.useMutation();
  const learnMutation = trpc.cota.learnFromUserAdjustment.useMutation();

  // Puxar itens se houver sessão ativa
  const { data: sessionData, refetch } = trpc.cota.getQuoteSessionReview.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId }
  );

  const handleUploadCotacao = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!sessionName || !startDate || !endDate || targetDays < 1) {
      toast.error("Preencha todos os campos da Cotação antes de enviar o arquivo.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const content = await file.text();
      const result = await createSessionMutation.mutateAsync({
        fileContent: content,
        sessionName,
        startDate,
        endDate,
        targetDays,
      });

      if (result.success) {
        toast.success(`Cotação Gerada com Sucesso!`);
        setActiveSessionId(result.sessionId);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar TXT da Cotação");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExport = async () => {
    if (!activeSessionId) return;
    try {
      const result = await generateExportMutation.mutateAsync({ sessionId: activeSessionId });
      
      // Fazer download do Arquivo
      const blob = new Blob([result.txtFileContent], { type: "text/plain;charset=utf-8" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `COTAC_SUGERIDA_${sessionName.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Arquivo Cotefácil Exportado com Sucesso!");
      setActiveSessionId(null); // Reseta a tela ou poderia manter o histórico
      setSessionName("");
    } catch (e: any) {
      toast.error(e.message || "Erro na exportação");
    }
  };

  const updateItemQty = async (itemId: number, productCode: string, suggested: number, confirmed: number) => {
    await updateQuantityMutation.mutateAsync({ itemId, newQuantity: confirmed });
    
    // Dispara aprendizado em background se houver diferença
    if (suggested !== confirmed) {
      learnMutation.mutate({ 
        productCode, 
        suggested, 
        confirmed 
      });
    }
    
    refetch(); // Recarrega a UI
  };

  if (activeSessionId && sessionData) {
    return (
      <div className="cotacao-container">
        <div className="revision-header shadow-sm p-6 bg-white/40 rounded-[2rem] backdrop-blur-md">
          <div className="revision-title-area">
            <h2>Revisão de Cotação: {sessionData.session.name}</h2>
            <p>Analise as sugestões da I.A. Inteligente (Estoque para {sessionData.session.targetDays} dias)</p>
          </div>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 transition-all h-14 px-10 font-bold text-lg rounded-2xl group">
            <Save className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
            Salvar e Exportar Cotefácil
          </Button>
        </div>

        <Card className="revision-card">
          <div className="overflow-x-auto">
            <table className="predictive-table">
              <thead className="predictive-thead">
                <tr>
                  <th className="predictive-th">ID / EAN</th>
                  <th className="predictive-th">Produto</th>
                  <th className="predictive-th">Preço Atual</th>
                  <th className="predictive-th text-center">Vendas Base</th>
                  <th className="predictive-th text-center text-blue-600">Sugestão Preditiva</th>
                  <th className="predictive-th text-center text-green-700">Quantidade Confirmada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessionData.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic font-medium">
                      Nenhum item válido encontrado no TXT para esta cotação.
                    </td>
                  </tr>
                ) : (
                  sessionData.items.map((row) => (
                    <tr key={row.item.id} className="predictive-tr">
                      <td className="predictive-td">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-slate-400">{row.item.productCode}</span>
                          {row.ean && <span className="text-[10px] text-slate-300 font-mono tracking-tighter">{row.ean}</span>}
                        </div>
                      </td>
                      <td className="predictive-td">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-2xl border-2 border-white bg-white shadow-xl flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-500">
                            <img 
                              src={row.imageUrl || "/placeholder.png"} 
                              alt={row.productName || "Produto"}
                              className="max-w-[80%] max-h-[80%] object-contain"
                              onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 leading-tight block max-w-[320px] text-base">{row.productName}</span>
                            {row.item.isMissing && (
                              <Badge variant="destructive" className="mt-2 w-fit bg-rose-600 text-[9px] px-2.5 h-4.5 font-black uppercase tracking-wider">Falta Detectada</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="predictive-td">
                        <span className="font-black text-slate-700 text-lg">R$ {row.item.priceAtTime}</span>
                      </td>
                      <td className="predictive-td text-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm">{row.item.salesInPeriod}</span>
                      </td>
                      <td className="predictive-td ai-insight-cell">
                        <div className="flex flex-col items-center gap-1 group/ai">
                          <div className="ai-value-display">
                            <Zap className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
                            {row.item.suggestedQuantity}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="ai-insight-badge" title="Ver Insights da IA">
                                  <Info className="w-3 h-3" /> IA Insight
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[240px] text-xs glassmorphism p-4 border-blue-100 shadow-2xl">
                                <p className="font-black text-blue-700 flex items-center gap-2 mb-2">
                                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Raciocínio Preditivo
                                </p>
                                <p className="text-slate-600 leading-relaxed font-medium">
                                  {row.item.aiReasoning || "Cálculo baseado no giro diário, tendências e margem de segurança do setor farmacêutico."}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                      <td className="predictive-td confirmed-qty-cell">
                        <Input 
                          type="number" 
                          autoFocus={false}
                          className="confirmed-qty-input"
                          value={row.item.userConfirmedQuantity ?? row.item.suggestedQuantity}
                          onChange={(e) => updateItemQty(row.item.id, row.item.productCode, row.item.suggestedQuantity, parseInt(e.target.value) || 0)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="cotacao-container">
      <Alert className="bg-blue-50/50 border-blue-100 backdrop-blur-sm p-6 rounded-[1.5rem] border-2">
        <AlertCircle className="h-6 w-6 text-blue-600" />
        <AlertDescription className="text-blue-800 font-semibold pl-2">
          A Cotação Diária lê um arquivo TXT exportado do seu ERP, calcula as sugestões via Algoritmo Preditivo e te devolve o arquivo pronto para o formato do Cotefácil.
        </AlertDescription>
      </Alert>

      <Card className="upload-form-card">
        <div className="flex flex-col md:flex-row">
          <div className="ui-form-left-panel">
            <div>
              <div className="w-20 h-20 bg-white shadow-2xl rounded-3xl flex items-center justify-center mb-10 border-2 border-white animate-float">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-5xl font-black mb-6 leading-[1.1] tracking-tighter">
                Gerar Nova <br />Cotação Smart
              </h3>
              <p className="text-blue-100 font-bold text-lg max-w-[300px] leading-relaxed">
                O PredictMed analisa seu consumo histórico e sugere a compra ideal.
              </p>
            </div>
            <div className="mt-12 flex items-center gap-5 py-5 px-8 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-sm">
               <Zap className="w-8 h-8 text-amber-400 fill-amber-400" />
               <p className="text-xs font-black leading-relaxed uppercase tracking-wider">Gemini 3.1 Flash Lite Active Intelligence</p>
            </div>
          </div>

          <div className="ui-form-right-panel">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <Label htmlFor="session-name" className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] ml-1">Identificação do Pedido</Label>
                <Input 
                  id="session-name"
                  placeholder="Ex: Cotação Final de Semana" 
                  className="form-input-premium"
                  value={sessionName}
                  onChange={e => setSessionName(e.target.value)}
                />
              </div>
              
              <div className="space-y-4">
                <Label htmlFor="target-days" className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] ml-1">Duração do Estoque</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    id="target-days"
                    type="number"
                    className="form-input-premium flex-1"
                    value={targetDays}
                    onChange={e => setTargetDays(parseInt(e.target.value) || 1)}
                  />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-xl">Dias</span>
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="start-date" className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] ml-1">Início da Amostragem</Label>
                <Input 
                  id="start-date"
                  type="date"
                  className="form-input-premium"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <Label htmlFor="end-date" className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] ml-1">Fim da Amostragem</Label>
                <Input 
                  id="end-date"
                  type="date"
                  className="form-input-premium"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div 
              className="drop-zone-premium"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-[0.03] transition-opacity rounded-[3rem]" />
              <div className="p-6 bg-white shadow-2xl rounded-3xl mb-6 group-hover:-translate-y-2 transition-transform duration-500 border border-slate-50">
                <Upload className="w-10 h-10 text-blue-600" />
              </div>
              <p className="font-black text-slate-900 text-2xl tracking-tight">Subir TXT do ERP</p>
              <p className="text-slate-400 text-sm mt-2 font-medium">Selecione o arquivo de vendas exportado</p>
              
              <Button
                variant="link"
                className="mt-8 text-blue-600 font-black text-lg group-hover:underline"
                disabled={uploading}
                title={uploading ? "Aguarde..." : "Clique para processar"}
              >
                {uploading ? "Sintonizando Cérebro I.A..." : "Processar Agora"}
              </Button>
            </div>
            
            <input
               ref={fileInputRef}
               type="file"
               accept=".txt"
               onChange={handleUploadCotacao}
               disabled={uploading}
               className="hidden"
               title="Upload de arquivo"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
