import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileCode, CheckCircle, AlertTriangle, Package, 
  Loader2, RefreshCcw, ChevronLeft, ChevronRight 
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * --------------------------------------------------------------------------
 * PredictMed ConferenciaSection - Monitor de Recebimento
 * --------------------------------------------------------------------------
 */

export default function ConferenciaSection() {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [xmlUploading, setXmlUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Queries (PAGINADAS)
  const { data: sessions } = trpc.cota.getQuoteSessions.useQuery();
  const { data: pageData, isLoading: itemsLoading, refetch: refetchItems } = trpc.cota.getQuoteItems.useQuery(
    { 
      sessionId: selectedSessionId || 0,
      page: currentPage,
      limit: itemsPerPage
    },
    { enabled: !!selectedSessionId }
  );

  // Mutations
  const processXml = trpc.cota.processNfeXml.useMutation();
  const updateArrived = trpc.cota.updateQuoteItemArrivedQuantity.useMutation();

  const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSessionId) return;

    setXmlUploading(true);
    try {
      const content = await file.text();
      const res = await processXml.mutateAsync({ 
        sessionId: selectedSessionId, 
        xmlContent: content 
      });
      
      toast.success(`Conferência completa! ${res.matchedCount} itens batidos.`);
      refetchItems();
    } catch (err: any) {
      toast.error("Erro no XML: " + err.message);
    } finally {
      setXmlUploading(false);
      e.target.value = "";
    }
  };

  const setManualFull = async (itemId: number, qty: number) => {
     try {
        await updateArrived.mutateAsync({ itemId, arrivedQuantity: qty });
        refetchItems();
        toast.success("Item atualizado!");
     } catch (e) {
        toast.error("Erro na atualização.");
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-green-600" /> Conferir Chegada
           </h2>
           <p className="text-slate-500 font-medium">Suba o XML da nota ou marque manualmente o que chegou.</p>
        </div>

        <div className="flex gap-4">
           <select 
             aria-label="Seletor de pedido"
             className="h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-sm shadow-sm ring-offset-background focus:ring-2 focus:ring-green-500"
             onChange={(e) => {
               setSelectedSessionId(Number(e.target.value));
               setCurrentPage(1); 
             }}
             value={selectedSessionId || ""}
           >
              <option value="">Selecione o pedido...</option>
              {sessions?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({new Date(s.createdAt).toLocaleDateString()})</option>
              ))}
           </select>
           
           {selectedSessionId && (
              <Button variant="outline" className="relative h-12 rounded-xl bg-white border-slate-200 font-bold px-6 shadow-sm hover:bg-slate-50 group">
                 {xmlUploading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileCode className="w-5 h-5 mr-2 text-green-600 group-hover:scale-110 transition-transform" />}
                 Ler XML (NFe)
                 <input 
                    aria-label="Input de arquivo"
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleXmlUpload}
                    accept=".xml"
                 />
              </Button>
           )}
        </div>
      </div>

      {!selectedSessionId ? (
        <Card className="p-32 text-center rounded-[3rem] border-dashed border-2 bg-slate-50/50">
           <Package className="w-20 h-20 text-slate-200 mx-auto mb-6" />
           <h3 className="text-xl font-bold text-slate-400">Escolha um pedido para começar a conferência.</h3>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-[2rem] border-none shadow-xl bg-white">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-none">
                <TableHead className="w-[100px] font-black text-slate-400 uppercase text-[10px] tracking-widest pl-8 py-6">Foto</TableHead>
                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-6">Produto</TableHead>
                <TableHead className="text-center font-black text-slate-400 uppercase text-[10px] tracking-widest py-6">Pedido</TableHead>
                <TableHead className="text-center font-black text-slate-400 uppercase text-[10px] tracking-widest py-6">Chegou</TableHead>
                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-6">Status</TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase text-[10px] tracking-widest pr-8 py-6">Ajuste</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" /></TableCell></TableRow>
              ) : pageData?.items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400 font-medium">Nenhum item encontrado.</TableCell></TableRow>
              ) : pageData?.items.map((item: any) => (
                <TableRow key={item.id} className={`hover:bg-slate-50/50 transition-colors border-slate-50 ${item.arrivedQuantity !== null ? (item.arrivedQuantity >= (item.userConfirmedQuantity || item.suggestedQuantity) ? 'bg-green-50/10' : 'bg-rose-50/10') : ''}`}>
                  <TableCell className="pl-8 py-5">
                      <div className="w-12 h-12 bg-white rounded-xl border flex items-center justify-center overflow-hidden">
                        <img alt={item.product?.name || "Produto"} src={item.product?.imageUrl || "/imagem_vazia.png"} className="max-w-[80%] max-h-[80%] object-contain" onError={e => e.currentTarget.src="/imagem_vazia.png"} title={item.product?.name} />
                      </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="font-bold text-slate-800 text-sm">{item.product?.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">{item.productCode}</div>
                  </TableCell>
                  <TableCell className="text-center font-black text-slate-900 py-5">
                    {item.userConfirmedQuantity || item.suggestedQuantity}
                  </TableCell>
                  <TableCell className="text-center py-5">
                    <span className={`text-xl font-black ${item.arrivedQuantity === null ? 'text-slate-200' : 'text-blue-600'}`}>
                      {item.arrivedQuantity ?? '0'}
                    </span>
                  </TableCell>
                  <TableCell className="py-5">
                    {item.arrivedQuantity === null ? (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 font-bold uppercase text-[9px]">Aguardando...</Badge>
                    ) : item.arrivedQuantity >= (item.userConfirmedQuantity || item.suggestedQuantity) ? (
                      <Badge className="bg-green-100 text-green-700 font-bold border-none text-[9px] uppercase">✓ Tudo Certo</Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-700 font-bold border-none text-[9px] uppercase">⚠️ Faltando ({ (item.userConfirmedQuantity || item.suggestedQuantity) - item.arrivedQuantity })</Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                         <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-green-600 hover:bg-green-100 rounded-xl" onClick={() => setManualFull(item.id, item.userConfirmedQuantity || item.suggestedQuantity)}>
                            <CheckCircle className="w-4 h-4" />
                         </Button>
                         <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-100 rounded-xl" onClick={() => setManualFull(item.id, 0)}>
                            <RefreshCcw className="w-4 h-4" />
                         </Button>
                      </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* PAGINAÇÃO CONFERÊNCIA */}
          {pageData && pageData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-8 py-6 bg-slate-50/80 border-t border-slate-100">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Página {currentPage} de {pageData.pagination.totalPages}</span>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 px-4 border-slate-200 font-bold"><ChevronLeft className="w-4 h-4 mr-2" /> Anterior</Button>
                  <Button variant="outline" size="sm" disabled={currentPage === pageData.pagination.totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 px-4 border-slate-200 font-bold">Próximo <ChevronRight className="w-4 h-4 ml-2" /></Button>
               </div>
            </div>
          )}
        </Card>
      )}

      {selectedSessionId && (
        <Alert className="bg-white border-2 border-slate-100 p-6 rounded-[2rem]">
           <AlertTriangle className="w-5 h-5 text-amber-500" />
           <AlertDescription className="text-slate-600 font-medium ml-2 text-sm italic">
             <strong>Aviso:</strong> O que você marcar como faltante agora será lembrado pela IA na próxima cotação.
           </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
