import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCode, CheckCircle, AlertTriangle, Package, Loader2, RefreshCcw, Camera } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ConferenciaSection() {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [xmlUploading, setXmlUploading] = useState(false);

  // Queries
  const { data: sessions } = trpc.cota.getQuoteSessions.useQuery();
  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = trpc.cota.getQuoteItems.useQuery(
    { sessionId: selectedSessionId || 0 },
    { enabled: !!selectedSessionId }
  );

  // Mutations
  const processXml = trpc.cota.processNfeXml.useMutation();
  const updateArrived = trpc.cota.updateQuoteItemQuantity.useMutation();

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
      
      toast.success(`Tudo certo! Conferi ${res.matchedCount} produtos pelo XML.`);
      refetchItems();
    } catch (err: any) {
      toast.error("Tive um problema na leitura desse XML: " + err.message);
    } finally {
      setXmlUploading(false);
      e.target.value = "";
    }
  };

  const setManualFull = async (itemId: number, qty: number) => {
     try {
        await updateArrived.mutateAsync({ itemId, newQuantity: qty });
        refetchItems();
        toast.success("Item marcado como recebido!");
     } catch (e) {
        toast.error("Erro ao atualizar o item.");
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Package className="w-6 h-6 text-green-600" />
              Conferir o que Chegou
           </h2>
           <p className="text-muted-foreground italic">Compare o que você pediu com o XML da nota ou marque manualmente o que chegou na prateleira.</p>
        </div>

        <div className="flex gap-2">
           <select 
             title="Selecionar Pedido"
             className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
             onChange={(e) => setSelectedSessionId(Number(e.target.value))}
             value={selectedSessionId || ""}
           >
              <option value="">Escolha um pedido para conferir...</option>
              {sessions?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({new Date(s.createdAt).toLocaleDateString()})</option>
              ))}
           </select>
           
           {selectedSessionId && (
              <Button variant="outline" className="relative cursor-pointer" disabled={xmlUploading}>
                 {xmlUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCode className="w-4 h-4 mr-2" />}
                 Ler Nota Fiscal (XML)
                 <input 
                    type="file" 
                    title="Upload XML NFe"
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleXmlUpload}
                    accept=".xml"
                 />
              </Button>
           )}
        </div>
      </div>

      {!selectedSessionId ? (
        <Card className="p-20 text-center bg-slate-50/50 border-dashed">
           <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
           <h3 className="text-lg font-medium text-muted-foreground">Escolha lá em cima qual pedido você quer conferir agora.</h3>
        </Card>
      ) : (
        <Card className="overflow-hidden border-green-100 shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[80px]">Foto</TableHead>
                <TableHead>Produto / Código</TableHead>
                <TableHead className="text-center">Pedido (IA)</TableHead>
                <TableHead className="text-center">Contagem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ajustar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10">Buscando a lista...</TableCell></TableRow>
              ) : items?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10">Não achei nenhum produto nesse pedido.</TableCell></TableRow>
              ) : (items as any[])?.map((item: any) => (
                <TableRow key={item.id} className={item.arrivedQuantity !== null ? (item.arrivedQuantity >= (item.userConfirmedQuantity || item.suggestedQuantity) ? 'bg-green-50/30' : 'bg-red-50/30') : ''}>
                  <TableCell>
                     <img 
                       src={item.product?.imageUrl || "/placeholder.png"} 
                       alt={item.product?.name} 
                       className="w-10 h-10 object-contain rounded border bg-white" 
                     />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.product?.name}</div>
                    <div className="text-xs text-muted-foreground">{item.productCode}</div>
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {item.userConfirmedQuantity || item.suggestedQuantity}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                       <span className={`text-lg font-bold ${item.arrivedQuantity === null ? 'text-slate-300' : 'text-blue-600'}`}>
                          {item.arrivedQuantity ?? '0'}
                       </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.arrivedQuantity === null ? (
                      <Badge variant="outline">Ainda não chegou</Badge>
                    ) : item.arrivedQuantity >= (item.userConfirmedQuantity || item.suggestedQuantity) ? (
                      <Badge className="bg-green-100 text-green-700">✓ Tudo Certinho</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">⚠️ Faltando ({ (item.userConfirmedQuantity || item.suggestedQuantity) - item.arrivedQuantity })</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                     <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          title="Confirmar tudo chegou"
                          className="h-8 text-green-600 hover:bg-green-50"
                          onClick={() => setManualFull(item.id, item.userConfirmedQuantity || item.suggestedQuantity)}
                        >
                           <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          title="Zerar chegada"
                          className="h-8 text-red-600 hover:bg-red-50"
                          onClick={() => setManualFull(item.id, 0)}
                        >
                           <RefreshCcw className="w-4 h-4" />
                        </Button>
                     </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {selectedSessionId && (
        <Alert className="bg-blue-50 border-blue-200">
           <AlertTriangle className="w-4 h-4 text-blue-600" />
           <AlertDescription className="text-blue-800 text-xs">
              <strong>Dica do PredictMed:</strong> O que estiver faltando hoje eu já anoto pra te lembrar de comprar na próxima vez!
           </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
