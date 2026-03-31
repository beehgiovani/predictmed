import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  ImagePlus, Loader2, Sparkles, CheckCircle2, 
  AlertCircle, Camera, Search, ArrowRightCircle
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

/**
 * --------------------------------------------------------------------------
 * PredictMed SyncPhotosTool - Robô Sincronizador de Imagens (MODO TURBO 500)
 * --------------------------------------------------------------------------
 */

export default function SyncPhotosTool() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedThisRun, setSyncedThisRun] = useState(0);
  
  // Queries e Mutations
  const { data: stats, refetch: refetchStats } = trpc.data.getSyncStats.useQuery();
  const syncMutation = trpc.data.syncMissingImages.useMutation();

  const handleSync = async (autoLoop = false) => {
    setIsSyncing(true);
    try {
      const res = await syncMutation.mutateAsync();
      setSyncedThisRun(prev => prev + res.synced);
      
      toast.info(`${res.synced} novas, faltam ${res.remaining}...`, {
        description: "Continuando a varredura automática.",
        icon: <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
      });

      refetchStats();

      // Se o usuário pediu pra automatizar ou ainda tem muitos vindo
      if (res.remaining > 0 && (autoLoop || res.synced > 0)) {
         setTimeout(() => handleSync(true), 1000); // Pequena pausa pra não travar o server
      } else {
         toast.success("Varredura Finalizada!", {
            description: `Total de ${syncedThisRun + res.synced} fotos sincronizadas nesta rodada.`
         });
         setIsSyncing(false);
         setSyncedThisRun(0);
      }
    } catch (err: any) {
      toast.error("Erro na busca: " + err.message);
      setIsSyncing(false);
    }
  };

  return (
    <Card className="p-8 border-none bg-gradient-to-br from-amber-50/50 to-orange-50/50 shadow-2xl rounded-[3rem] group hover:-translate-y-2 transition-all duration-500">
      <div className="flex items-start justify-between mb-8">
         <div className="flex items-center gap-5">
            <div className="p-4 bg-white shadow-xl rounded-3xl group-hover:rotate-12 transition-transform duration-500 border border-amber-100/50">
               <Sparkles className="w-8 h-8 text-amber-500 fill-amber-500/10" />
            </div>
            <div>
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">Fotos Automáticas</h3>
               <p className="text-xs font-bold text-amber-600/80 uppercase tracking-widest mt-1 italic">Inteligência PredictMed</p>
            </div>
         </div>
         {stats && stats.missingImages > 0 && (
            <Badge className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl font-black text-[10px] border-amber-200">
               {stats.missingImages} PARA VERIFICAR
            </Badge>
         )}
      </div>

      <div className="space-y-6">
         <p className="text-slate-500 font-medium leading-relaxed text-sm">
            Seu catálogo tem produtos sem imagem. Nosso robô varre o banco de dados nacional pelo EAN e puxa a foto real de cada medicamento para você.
         </p>
         
         <div className="bg-white/40 border border-white p-6 rounded-3xl backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
               <span>Pote de Busca</span>
               <span className="text-amber-600">Lote Turbo: 500 itens</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
               <div 
                  className={`h-full bg-amber-500 transition-all duration-1000 ${isSyncing ? 'animate-pulse w-full' : 'w-0'}`} 
               />
            </div>
         </div>

         <Button 
            onClick={() => handleSync(true)} 
            disabled={isSyncing || (stats?.missingImages === 0)}
            className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs h-16 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95 group/btn"
         >
            {isSyncing ? (
               <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin text-amber-500" />
                  CAPTURANDO EM MASSA... ({syncedThisRun})
               </>
            ) : (stats?.missingImages === 0 ? (
               <>
                  <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
                  CATÁLOGO 100% COM FOTOS
               </>
            ) : (
               <>
                  <Camera className="w-5 h-5 mr-3 text-amber-500 group-hover/btn:scale-125 transition-transform" />
                  INICIAR VARREDURA AUTOMÁTICA
               </>
            ))}
         </Button>

         <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <AlertCircle className="w-4 h-4" />
            Válido apenas para remédios com EAN cadastrado.
         </div>
      </div>
    </Card>
  );
}
