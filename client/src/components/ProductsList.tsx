import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, PackageX, ShoppingCart, AlertTriangle, Loader2, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/use-debounce";

export default function ProductsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data: products, isLoading } = trpc.cota.getProductsWithRuptureStatus.useQuery({
    search: debouncedSearch
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">Meus Produtos</h2>
           <p className="text-sm text-slate-500">Dá uma olhada no que tem na prateleira e o que tá fazendo falta.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Procurar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-inner"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      ) : products?.length === 0 ? (
        <Card className="p-20 text-center flex flex-col items-center gap-4 bg-slate-50 border-dashed border-2">
           <PackageX className="w-12 h-12 text-slate-300" />
           <p className="text-slate-500 font-medium">Não achei nada por aqui com esse nome.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-200 shadow-xl rounded-xl">
          <div className="overflow-x-auto">
            
            {/* --- CELULAR: Visão em Cards --- */}
            <div className="md:hidden grid grid-cols-1 gap-4 p-3 bg-slate-50/50">
              {products?.map((product) => (
                <Card 
                  key={product.code} 
                  className={`flex flex-col gap-3 p-4 shadow-sm border-slate-200/60 ${product.isMissing ? 'border-l-4 border-l-red-500 bg-red-50/20 shadow-red-100' : 'hover:shadow-md transition-all'}`}
                >
                  <div className="flex items-start gap-3 relative">
                    {/* Foto */}
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="w-14 h-14 object-contain rounded-xl border bg-white shadow-sm shrink-0" />
                    ) : (
                      <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 shadow-inner">
                        <ImageIcon className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0 pr-12">
                      <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{product.name}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono text-slate-500 bg-white shadow-sm">{product.code}</Badge>
                        {product.ean && <span className="text-[9px] text-slate-400 font-mono">Barras: {product.ean}</span>}
                      </div>

                      {product.isMissing && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                          <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">🚨 Tá em Falta!</span>
                        </div>
                      )}
                    </div>

                    {/* Preço (Canto Superior Direito) */}
                    <div className="absolute top-0 right-0 text-right">
                      <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-bl-xl rounded-tr-lg border border-slate-200">
                        {parseFloat(product.price || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex justify-end items-center mt-1 pt-3 border-t border-slate-100">
                    <Button size="sm" variant={product.isMissing ? "destructive" : "outline"} className="h-9 w-full sm:w-auto text-xs font-black tracking-wide shadow-sm">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {product.isMissing ? "PEDIR AGORA" : "Ver Estoque"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* --- DESKTOP: Tabela de Dados --- */}
            <div className="hidden md:block w-full overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-slate-900">
                  <TableRow className="hover:bg-slate-900 border-none">
                    <TableHead className="w-16"></TableHead>
                    <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">Nome do Produto</TableHead>
                    <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">Cód / Barras</TableHead>
                    <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-wider text-right">Preço no Sistema</TableHead>
                    <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-wider text-right">O que fazer?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((product) => (
                    <TableRow key={product.code} className={`hover:bg-blue-50/30 transition-colors ${product.isMissing ? 'bg-red-50/30 border-l-4 border-l-red-500' : ''}`}>
                      <TableCell>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-10 h-10 object-contain rounded border bg-white" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded border flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{product.name}</span>
                            {product.isMissing && (
                              <div className="flex items-center gap-1.5 mt-1">
                                  <AlertTriangle className="w-3 h-3 text-red-600 animate-bounce" />
                                  <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter">🚨 TÁ EM FALTA!</span>
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                            <Badge variant="outline" className="text-[10px] w-fit font-mono">{product.code}</Badge>
                            {product.ean && <span className="text-[9px] text-slate-500 font-mono ml-1">{product.ean}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-700">
                        {parseFloat(product.price || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={product.isMissing ? "destructive" : "outline"} className="h-8 text-xs font-bold gap-2">
                            <ShoppingCart className="w-3 h-3" />
                            {product.isMissing ? "Pedir Urgente" : "Pedir"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      )}

      {/* ℹ️ Legenda */}
      <div className="flex gap-6 p-4 bg-slate-50 border rounded-lg text-xs text-slate-600">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-50 border-l-2 border-red-500 rounded"></div>
            <span>Esse item não chegou como deveria (falta detectada).</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-900 rounded"></div>
            <span>Produtos cadastrados no PredictMed.</span>
         </div>
      </div>
    </div>
  );
}
