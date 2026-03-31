import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Upload, Save, FileText, Info, Trash2, Ban, ChevronLeft, ChevronRight, 
  Droplets, Stethoscope, Pill, Zap, Sparkles, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { keepPreviousData } from "@tanstack/react-query";

/**
 * --------------------------------------------------------------------------
 * PredictMed CotacaoSection - Interface de Compra Inteligente v3.6
 * --------------------------------------------------------------------------
 */

export default function CotacaoSection() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [itemToBan, setItemToBan] = useState<{ id: number, code: string, name: string } | null>(null);
  
  const [sessionName, setSessionName] = useState("");
  const [targetDays, setTargetDays] = useState<number>(3);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useContext();
  const createSessionMutation = trpc.cota.createSessionFromTxt.useMutation();
  const generateExportMutation = trpc.cota.generateCotefacilExport.useMutation();
  const updateQuantityMutation = trpc.cota.updateQuoteItemQuantity.useMutation();
  const updateShelfMutation = trpc.cota.updateQuoteItemShelfQuantity.useMutation();
  const updateProductMutation = trpc.cota.updateProduct.useMutation();
  const deleteItemMutation = trpc.cota.deleteQuoteItem.useMutation();
  const finishManualMutation = trpc.cota.finishSessionManually.useMutation();

  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [bulkSelected, setBulkSelected] = useState<{id: number, code: string}[]>([]);
  const [showBulkBanConfirm, setShowBulkBanConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9999;
  
  const { data: sessionData, refetch } = trpc.cota.getQuoteSessionReview.useQuery(
    { sessionId: activeSessionId!, page: currentPage, limit: itemsPerPage },
    { enabled: !!activeSessionId, placeholderData: keepPreviousData }
  );

  const handleBulkBan = async () => {
    if (bulkSelected.length === 0) return;
    const idsToBan = bulkSelected.map(b => b.id);
    setRemovedIds(prev => [...prev, ...idsToBan]);
    await Promise.all(bulkSelected.map(item => {
      updateProductMutation.mutateAsync({ code: item.code, isDiscontinued: true });
      return deleteItemMutation.mutateAsync({ itemId: item.id });
    }));
    toast.success(`${bulkSelected.length} produtos anulados com sucesso!`);
    setBulkSelected([]);
    setShowBulkBanConfirm(false);
  };

  const handleUploadCotacao = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!sessionName || !startDate || !endDate || targetDays < 1) {
      toast.error("Preencha todos os campos antes de subir o arquivo.");
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
        toast.success(`Cotação pronta para revisão!`);
        setActiveSessionId(result.sessionId);
        setCurrentPage(1); 
        setRemovedIds([]); 
      }
    } catch (err: any) {
      toast.error(err.message || "Problema ao ler o arquivo TXT.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExport = async () => {
    if (!activeSessionId) return;
    try {
      const result = await generateExportMutation.mutateAsync({ sessionId: activeSessionId });
      const blob = new Blob([result.txtFileContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PEDIDO_SUGERIDO_${sessionName.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Pedido exportado para Cotefácil!");
      setActiveSessionId(null); 
    } catch (e: any) {
      toast.error("Erro na exportação.");
    }
  };

  const handleManualFinish = async () => {
    if (!activeSessionId) return;
    try {
      await finishManualMutation.mutateAsync({ sessionId: activeSessionId });
      toast.success("Cotação finalizada! Cérebro abastecido com as novas confirmações.");
      setActiveSessionId(null);
    } catch (e: any) {
      toast.error("Erro ao fechar a cotação internamente.");
    }
  };

  const updateItemQty = (itemId: number, confirmed: number) => {
    utils.cota.getQuoteSessionReview.setData(
      { sessionId: activeSessionId!, page: currentPage, limit: itemsPerPage },
      (old: any) => {
         if (!old) return old;
         return { ...old, items: old.items.map((it: any) => it.item.id === itemId ? { ...it, item: { ...it.item, userConfirmedQuantity: confirmed } } : it) };
      }
    );
    updateQuantityMutation.mutate({ itemId, newQuantity: confirmed });
  };

  const updateShelfQty = (itemId: number, shelfQtyStr: string) => {
     let shelfQty = shelfQtyStr === "" ? null : parseInt(shelfQtyStr);
     if (isNaN(shelfQty as number) && shelfQtyStr !== "") return;
     utils.cota.getQuoteSessionReview.setData(
        { sessionId: activeSessionId!, page: currentPage, limit: itemsPerPage },
        (old: any) => {
           if (!old) return old;
           return { ...old, items: old.items.map((it: any) => {
              if (it.item.id === itemId) {
                 const newConfirmed = Math.max(it.item.suggestedQuantity - (shelfQty || 0), 0);
                 return { ...it, item: { ...it.item, shelfQuantity: shelfQty, userConfirmedQuantity: newConfirmed } };
              }
              return it;
           })};
        }
     );
     updateShelfMutation.mutate({ itemId, shelfQuantity: shelfQty as number | null });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, currentField: 'prateleira' | 'confirmar') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentField === 'prateleira') {
        const nextEl = document.getElementById(`confirmar-${rowIndex}`);
        if (nextEl) nextEl.focus();
      } else {
        const nextEl = document.getElementById(`prateleira-${rowIndex + 1}`);
        if (nextEl) {
           nextEl.focus();
           nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  const classifyFromReview = (code: string, updates: any, itemId?: number) => {
     updateProductMutation.mutate({ code, ...updates });
     if (updates.isDiscontinued && itemId) {
        setRemovedIds(prev => [...prev, itemId]);
        deleteItemMutation.mutate({ itemId });
     }
     toast.success("Catálogo atualizado.");
     refetch();
  };

  const CATEGORY_MAP: Record<string, string[]> = {
    medicamento: ["ético", "genérico", "similar", "vitaminas", "outros"],
    perfumaria: ["primeiros socorros", "beleza", "higiene", "varejinho", "outros"]
  };

  if (activeSessionId && sessionData) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 p-8 rounded-[2.5rem] border shadow-2xl backdrop-blur-xl">
           <div className="space-y-1 text-center md:text-left">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Revisão Estratégica</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Analisando {sessionData.session.name}</p>
           </div>
           <div className="flex flex-col md:flex-row items-center gap-4">
              {bulkSelected.length > 0 && (
                <Button onClick={() => setShowBulkBanConfirm(true)} className="h-16 px-8 rounded-3xl font-black text-xs uppercase shadow-xl animate-in fade-in zoom-in bg-rose-600 hover:bg-rose-700 text-white border-none">
                   <Trash2 className="w-5 h-5 mr-2" /> Anular Seleção ({bulkSelected.length})
                </Button>
              )}
              <Button onClick={handleManualFinish} variant="outline" className="h-16 px-8 text-slate-500 hover:text-slate-900 font-black text-sm uppercase rounded-3xl group border-2 border-slate-200 hover:border-slate-300 bg-white shadow-sm">
                 <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500" /> Confirmar Pedido (Manual)
              </Button>
              <Button onClick={handleExport} className="h-16 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black text-[13px] uppercase rounded-3xl shadow-xl group">
                 <Save className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                 Gerar TXT Cotefácil
              </Button>
           </div>
        </div>

        <Card className="overflow-hidden bg-white border-2 border-slate-100 rounded-[3rem] shadow-2xl">
           <Table>
              <TableHeader className="bg-slate-900 h-16">
                 <TableRow className="border-none hover:bg-slate-900">
                    <TableHead className="w-12 text-center pl-6">
                       <Checkbox 
                          checked={sessionData.items.filter((r: any) => !removedIds.includes(r.item.id)).length > 0 && sessionData.items.filter((r: any) => !removedIds.includes(r.item.id)).every((r: any) => bulkSelected.some(b => b.id === r.item.id))}
                          onCheckedChange={(checked) => {
                             if (checked) {
                                const newSels = sessionData.items.filter((r: any) => !removedIds.includes(r.item.id)).map((r: any) => ({id: r.item.id, code: r.item.productCode}));
                                setBulkSelected(prev => {
                                   const map = new Map(prev.map(p => [p.id, p]));
                                   newSels.forEach((s: any) => map.set(s.id, s));
                                   return Array.from(map.values());
                                });
                             } else {
                                const currentIds = sessionData.items.map((r: any) => r.item.id);
                                setBulkSelected(prev => prev.filter(p => !currentIds.includes(p.id)));
                             }
                          }}
                          className="border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white data-[state=checked]:border-blue-500 rounded" 
                       />
                    </TableHead>
                    <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] pt-4 pl-4 pb-4">Produto / Classificação</TableHead>
                    <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] text-center pt-4 pb-4">Giro Histórico</TableHead>
                    <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] text-center pt-4 pb-4">Sugestão IA</TableHead>
                    <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] text-center pt-4 pb-4">Estoque C/ IA</TableHead>
                    <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] text-center pt-4 pb-4">Confirmar Pedido</TableHead>
                    <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] text-right pr-10">Ação</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                 {sessionData.items.filter((r: any) => !removedIds.includes(r.item.id)).map((row: any, index: number) => (
                    <TableRow key={row.item.id} className="h-[120px] hover:bg-slate-50 transition-colors">
                       <TableCell className="w-12 text-center pl-6 pr-0">
                          <Checkbox 
                             checked={bulkSelected.some(b => b.id === row.item.id)}
                             onCheckedChange={(c) => {
                                if (c) setBulkSelected(p => [...p, {id: row.item.id, code: row.item.productCode}]);
                                else setBulkSelected(p => p.filter(b => b.id !== row.item.id));
                             }}
                             className="w-6 h-6 rounded-lg border-2 border-slate-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                       </TableCell>
                       <TableCell className="pl-4">
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 bg-white rounded-2xl border flex items-center justify-center shrink-0 shadow-sm relative group">
                                <img src={row.product?.imageUrl || "/imagem_vazia.png"} alt={row.product?.name} className="max-w-[85%] max-h-[85%] object-contain" />
                                {row.product?.isControlled && <div className="absolute inset-x-0 bottom-0 h-1 bg-black rounded-b-xl" />}
                             </div>
                             <div className="flex flex-col gap-2 min-w-0">
                                <span className="font-bold text-slate-800 truncate block max-w-[250px]">{row.product?.name || "Produto Novo"}</span>
                                <div className="flex flex-col gap-1">
                                   <ToggleGroup 
                                      type="single" 
                                      value={row.product?.mainCategory || 'medicamento'} 
                                      onValueChange={(val) => classifyFromReview(row.item.productCode, { mainCategory: val, subCategory: null })}
                                      className="scale-[0.7] origin-left bg-slate-50 rounded-lg p-0.5 border w-fit"
                                   >
                                      <ToggleGroupItem value="medicamento" className="bg-white data-[state=on]:bg-blue-600 data-[state=on]:text-white font-black text-[9px] px-3"><Pill className="w-2.5 h-2.5 mr-1" /> MED</ToggleGroupItem>
                                      <ToggleGroupItem value="perfumaria" className="bg-white data-[state=on]:bg-rose-500 data-[state=on]:text-white font-black text-[9px] px-3"><Sparkles className="w-2.5 h-2.5 mr-1" /> PERF</ToggleGroupItem>
                                   </ToggleGroup>
                                   
                                   <div className="flex flex-wrap gap-1 max-w-[280px]">
                                      {CATEGORY_MAP[row.product?.mainCategory || 'medicamento'].map(sub => (
                                         <button 
                                            key={sub} 
                                            onClick={() => classifyFromReview(row.item.productCode, { subCategory: sub })}
                                            className={`text-[7px] font-black uppercase px-2 py-0.5 rounded border transition-all ${row.product?.subCategory === sub ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                                         >
                                            {sub}
                                         </button>
                                      ))}
                                   </div>
                                </div>
                             </div>
                          </div>
                       </TableCell>
                       <TableCell className="text-center">
                          <div className="flex flex-col">
                             <span className="font-black text-slate-700 text-lg">{row.item.salesInPeriod}</span>
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Vendido</span>
                          </div>
                       </TableCell>
                       <TableCell className="text-center">
                          <Badge className="bg-blue-100/50 text-blue-700 font-black text-xl px-4 py-1 rounded-xl border-2 border-blue-200 shadow-sm">{row.item.suggestedQuantity}</Badge>
                       </TableCell>
                       <TableCell className="text-center">
                          <Input 
                             id={`prateleira-${index}`}
                             type="number" 
                             className="w-20 mx-auto h-12 text-center font-black text-xl border-2 border-slate-100 focus:border-amber-400 rounded-2xl bg-amber-50/30 shadow-inner placeholder:text-slate-300 placeholder:text-[9px] placeholder:tracking-tighter"
                             placeholder="ESTQ IA"
                             value={row.item.shelfQuantity ?? ""}
                             onChange={(e) => updateShelfQty(row.item.id, e.target.value)}
                             onKeyDown={(e) => handleKeyDown(e, index, 'prateleira')}
                          />
                       </TableCell>
                       <TableCell className="text-center">
                          <Input 
                             id={`confirmar-${index}`}
                             type="number" 
                             className="w-24 mx-auto h-12 text-center font-black text-2xl border-2 border-slate-100 focus:border-green-500 rounded-2xl bg-white shadow-inner"
                             value={row.item.userConfirmedQuantity ?? row.item.suggestedQuantity}
                             onChange={(e) => updateItemQty(row.item.id, parseInt(e.target.value) || 0)}
                             onKeyDown={(e) => handleKeyDown(e, index, 'confirmar')}
                          />
                       </TableCell>
                       <TableCell className="text-right pr-10">
                          <div className="flex justify-end gap-2">
                             <Button variant="ghost" size="icon" onClick={() => setItemToBan({ id: row.item.id, code: row.item.productCode, name: row.product?.name || "Produto" })} className="hover:bg-rose-50 hover:text-rose-600 rounded-xl h-12 w-12 text-slate-200">
                                <Ban className="w-5 h-5" />
                             </Button>
                          </div>
                       </TableCell>
                    </TableRow>
                 ))}
              </TableBody>
           </Table>

           {sessionData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-10 py-6 bg-slate-50 border-t border-slate-100">
                 <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Acessando Página {currentPage} de {sessionData.pagination.totalPages}</span>
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="h-12 px-6 rounded-xl font-black text-xs uppercase">Anterior</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === sessionData.pagination.totalPages} className="h-12 px-6 rounded-xl font-black text-xs uppercase">Próximo</Button>
                 </div>
              </div>
           )}
        </Card>

        <AlertDialog open={!!itemToBan} onOpenChange={(open) => !open && setItemToBan(null)}>
           <AlertDialogContent className="rounded-3xl border-rose-100 shadow-2xl shadow-rose-200">
             <AlertDialogHeader>
               <AlertDialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-3">
                  <Ban className="w-8 h-8" /> Confirmar Exclusão
               </AlertDialogTitle>
               <AlertDialogDescription className="text-base font-bold text-slate-600 mt-2 leading-relaxed">
                  Você está prestes a ANULAR o produto <br/> <span className="text-slate-900 font-black text-xl">"{itemToBan?.name}"</span>.<br/><br/>
                  Ele será retirado da sugestão e também escondido de todas as análises de GIRO futuras.
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter className="mt-6 gap-3">
               <AlertDialogCancel className="h-14 px-8 rounded-2xl font-black uppercase text-xs border-2 text-slate-500 hover:bg-slate-50">Cancelar</AlertDialogCancel>
               <AlertDialogAction 
                  onClick={() => { if (itemToBan) classifyFromReview(itemToBan.code, { isDiscontinued: true }, itemToBan.id); }} 
                  className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs shadow-xl border-none"
               >
                  Sim, Anular Produto
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>

         <AlertDialog open={showBulkBanConfirm} onOpenChange={setShowBulkBanConfirm}>
           <AlertDialogContent className="rounded-3xl border-rose-100 shadow-2xl shadow-rose-200">
             <AlertDialogHeader>
               <AlertDialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-3">
                  <Trash2 className="w-8 h-8" /> Exclusão em Massa
               </AlertDialogTitle>
               <AlertDialogDescription className="text-base font-bold text-slate-600 mt-2 leading-relaxed">
                  Você marcou <span className="text-slate-900 font-black text-xl">{bulkSelected.length}</span> produtos para anulação simultânea.<br/><br/>
                  Todos eles serão banidos das próximas análises de inteligência e varridos deste relatório. Deseja prosseguir com a limpa?
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter className="mt-6 gap-3">
               <AlertDialogCancel className="h-14 px-8 rounded-2xl font-black uppercase text-xs border-2 text-slate-500 hover:bg-slate-50">Cancelar</AlertDialogCancel>
               <AlertDialogAction 
                  onClick={handleBulkBan} 
                  className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs shadow-xl border-none"
               >
                  Sim, Excluir Todos
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>

      </div>
    );
  }

  return (
    <div className="cotacao-container space-y-8 max-w-[1200px] mx-auto">
      <Alert className="bg-indigo-600 border-none rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-200 animate-in slide-in-from-top-full duration-700">
        <Pill className="h-10 w-10 text-white mb-4" />
        <AlertDescription className="text-white font-black text-4xl leading-tight tracking-tighter">
           Pronto para o próximo pedido? <br />
           Suba o relatório de vendas agora.
        </AlertDescription>
      </Alert>

      <Card className="p-12 rounded-[3.5rem] shadow-2xl border-none bg-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
           <Zap className="w-64 h-64 text-slate-900" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
          <div className="space-y-10 text-center lg:text-left">
             <h2 className="text-5xl font-black text-slate-900 leading-tight tracking-tighter">Cérebro PredictMed <span className="text-blue-600 italic">v3.6</span></h2>
             
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Estoque (Dias)</Label>
                      <Input type="number" value={targetDays} onChange={e => setTargetDays(Number(e.target.value))} className="h-16 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-2xl" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Nome do Pedido</Label>
                      <Input value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Ex: Cotação de Segunda" className="h-16 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-xl" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Data Inicial</Label>
                      <Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-16 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" />Data/Hora Final do TXT</label>
                      <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-16 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black" />
                   </div>
                </div>
             </div>
          </div>

          <div 
            className="bg-slate-900 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-600 transition-all duration-500 shadow-2xl group/btn"
            onClick={() => fileInputRef.current?.click()}
          >
             <div className="relative z-10 py-6">
                <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto backdrop-blur-md group-hover/btn:scale-125 transition-transform duration-500">
                   <Upload className="w-10 h-20 text-white" />
                </div>
                <h3 className="text-3xl font-black text-white leading-tight mb-2">Processar TXT</h3>
                <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">{uploading ? "CALCULANDO INTELIGÊNCIA..." : "ANEXAR RELATÓRIO DO SISTEMA"}</p>
             </div>
             <input aria-label="Input de arquivo" ref={fileInputRef} type="file" accept=".txt" onChange={handleUploadCotacao} className="hidden" />
          </div>
        </div>
      </Card>
    </div>
  );
}
