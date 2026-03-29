import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ShieldX, Trash2, RefreshCcw, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BlacklistManager() {
  const [search, setSearch] = useState("");
  const { data: blacklist, isLoading, refetch } = trpc.cota.getBlacklist.useQuery();
  const removeMutation = trpc.cota.removeFromBlacklist.useMutation();

  const handleRemove = async (productCode: string) => {
    try {
      await removeMutation.mutateAsync({ productCode });
      toast.success("Produto removido da lista negra. Ele poderá aparecer nas próximas sugestões.");
      refetch();
    } catch (e) {
      toast.error("Erro ao remover produto da lista.");
    }
  };

  const filtered = blacklist?.filter(p => 
    p.productCode.includes(search) || 
    (p.productName?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
           <h2 className="text-2xl font-black flex items-center gap-3 text-slate-800">
              <ShieldX className="w-8 h-8 text-rose-600" />
              Lista Negra de Produtos
           </h2>
           <p className="text-muted-foreground font-medium italic">Produtos nesta lista serão ignorados pela IA em todas as futuras sugestões de compra.</p>
        </div>

        <div className="relative w-full md:w-72">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <Input 
             placeholder="Buscar na lista..." 
             className="pl-10 h-11 rounded-xl border-slate-200 focus:ring-rose-500"
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
        </div>
      </div>

      <Card className="overflow-hidden rounded-[2rem] border-slate-100 shadow-xl">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-100">
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-8">Código</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Produto</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Motivo</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right pr-8">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={4} className="h-32 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-200" />
                    Buscando lista...
                 </TableCell>
               </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-slate-400 font-medium italic">
                  Nenhum produto proibido encontrado.
                </TableCell>
              </TableRow>
            ) : filtered?.map((item) => (
              <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                <TableCell className="font-mono text-xs font-bold text-slate-400 pl-8">{item.productCode}</TableCell>
                <TableCell className="font-bold text-slate-700">{item.productName || 'Não identificado'}</TableCell>
                <TableCell className="text-slate-500 text-sm font-medium italic">{item.reason}</TableCell>
                <TableCell className="text-right pr-8">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 gap-2 text-blue-600 hover:bg-blue-50 font-bold rounded-xl px-4"
                    onClick={() => handleRemove(item.productCode)}
                    disabled={removeMutation.isPending}
                  >
                    <RefreshCcw className={`w-4 h-4 ${removeMutation.isPending ? 'animate-spin' : ''}`} />
                    Permitir Novamente
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex items-start gap-4">
         <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <ShieldX className="w-5 h-5 text-rose-500" />
         </div>
         <p className="text-xs text-rose-800 leading-relaxed font-medium">
           <strong>Dica do PredictMed:</strong> Use esta área para gerenciar produtos que "sujam" sua cotação, como perfumaria externa ou itens que você parou de trabalhar. Se banir sem querer, é só clicar em "Permitir Novamente".
         </p>
      </div>
    </div>
  );
}
