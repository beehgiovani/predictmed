import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function SyncPhotosTool() {
  const [isSyncing, setIsSyncing] = useState(false);
  const syncMutation = trpc.data.syncMissingImages.useMutation();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncMutation.mutateAsync();
      toast.success(`Sincronização Finalizada! ${res.synced} fotos recuperadas.`);
    } catch (err: any) {
      toast.error(err.message || "Falha na sincronização");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="p-6 border-amber-100 bg-amber-50/20 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-4 mb-4">
         <div className="p-3 bg-amber-100 rounded-full">
            <Sparkles className="w-6 h-6 text-amber-600" />
         </div>
         <div>
            <h3 className="text-lg font-bold text-slate-900">Enriquecimento Visual I.A.</h3>
            <p className="text-xs text-slate-500 italic">Busca automática de fotos via EAN para o catálogo.</p>
         </div>
      </div>

      <div className="space-y-4">
         <p className="text-xs text-slate-600 leading-relaxed">
            Seus produtos importados sem EAN ou de backups antigos podem estar sem imagem. 
            Esta ferramenta varre o banco e tenta recuperar a foto real de cada medicamento via banco de dados nacional.
         </p>
         
         <Button 
            onClick={handleSync} 
            disabled={isSyncing}
            className="w-full bg-amber-600 hover:bg-amber-700 font-bold uppercase tracking-wider text-xs h-11 transition-all"
         >
            {isSyncing ? (
               <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando Galeria...
               </>
            ) : (
               <>
                  <ImagePlus className="w-4 h-4 mr-2" />
                  Sincronizar Fotos Faltantes
               </>
            )}
         </Button>

         <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Válido para itens com código de barras (EAN-13)
         </div>
      </div>
    </Card>
  );
}
