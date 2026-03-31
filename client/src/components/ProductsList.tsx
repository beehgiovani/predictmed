import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Search, Package, Tag, Filter, CheckCircle2, 
  Ban, ShieldAlert, Zap, Layers, Beaker,
  Thermometer, HeartPulse, RefreshCw, Undo2, Pill, Sparkles, ChevronRight,
  Stethoscope, Box, CreditCard, ShoppingBag, Loader2, PackageSearch, Trash2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";

import { keepPreviousData } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
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

/**
 * --------------------------------------------------------------------------
 * PredictMed ProductsList - TURBO CACHE v7.2 (ULTRA RÁPIDO)
 * --------------------------------------------------------------------------
 */

export default function ProductsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const itemsPerPage = 30;

  const [localProducts, setLocalProducts] = useState<any[]>([]);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [showBulkBanConfirm, setShowBulkBanConfirm] = useState(false);

  // 🛡️ TRAVA DE SEGURANÇA: Impede que o Realtime sobrescreva o que você acabou de mudar
  const lastUpdatedCodes = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchTerm);
        setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const utils = trpc.useContext();
  const { data: pageData, isLoading, isFetching } = trpc.cota.getProductsWithRuptureStatus.useQuery(
    { search: debouncedSearch, page: currentPage, limit: itemsPerPage, showDiscontinued },
    { placeholderData: keepPreviousData }
  );

  useEffect(() => {
    if (pageData?.products) {
      setLocalProducts(prev => {
        const newProducts = pageData.products;
        return newProducts.map((np: any) => {
           if (lastUpdatedCodes.current.has(np.code)) {
              const existing = (prev || []).find(p => p.code === np.code);
              return existing || np;
           }
           return np;
        });
      });
    } else if (!isLoading && !isFetching) {
      setLocalProducts([]);
    }
  }, [pageData, isLoading, isFetching]);

  const updateMutation = trpc.cota.updateProduct.useMutation({
    onSuccess: (data: any) => {
       setTimeout(() => {
          lastUpdatedCodes.current.delete(data[0].code);
       }, 3000);
    }
  });

  const handleUpdate = (code: string, updates: any) => {
     lastUpdatedCodes.current.add(code);
     setLocalProducts(prev => (prev || []).map(p => p.code === code ? { ...p, ...updates } : p));
     updateMutation.mutate({ code, ...updates });
  };

  const handleBulkBan = async () => {
    if (bulkSelected.length === 0) return;
    bulkSelected.forEach(code => {
       handleUpdate(code, { isDiscontinued: true });
    });
    toast.success(`${bulkSelected.length} produtos anulados com sucesso!`);
    setBulkSelected([]);
    setShowBulkBanConfirm(false);
  };

  const getSubCategories = (mainCategory: string) => {
    if (mainCategory === 'medicamento') return ['ético', 'genérico', 'similar', 'vitaminas', 'outros'];
    if (mainCategory === 'perfumaria') return ['beleza', 'higiene', 'curativos', 'varejinho'];
    return [];
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER SLIM BLINDADO */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <div className="flex flex-col items-center justify-center pl-2 pr-6 border-r border-slate-100">
              <Checkbox 
                 checked={localProducts?.length > 0 && localProducts.every((p: any) => bulkSelected.includes(p.code))}
                 onCheckedChange={(c) => {
                    if (c) {
                       const pageCodes = localProducts.map((p: any) => p.code);
                       setBulkSelected(prev => Array.from(new Set([...prev, ...pageCodes])));
                    } else {
                       const pageCodes = localProducts.map((p: any) => p.code);
                       setBulkSelected(prev => prev.filter(code => !pageCodes.includes(code)));
                    }
                 }}
                 className="w-8 h-8 rounded-lg border-2 border-slate-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <span className="text-[9px] font-black uppercase text-slate-400 mt-1">Página</span>
           </div>
           
           {bulkSelected.length > 0 && (
               <Button onClick={() => setShowBulkBanConfirm(true)} className="h-14 px-6 rounded-2xl font-black text-xs uppercase shadow-md animate-in fade-in zoom-in bg-rose-600 hover:bg-rose-700 text-white border-none">
                  <Trash2 className="w-5 h-5 mr-2 shrink-0" /> Anular ({bulkSelected.length})
               </Button>
           )}

           <div className="relative w-full md:w-80">
              <AnimatePresence>
                 {(isFetching) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
                       <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    </motion.div>
                 )}
              </AnimatePresence>
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input 
                 placeholder="Pesquisa rápida..." 
                 value={searchTerm} 
                 onChange={(e) => setSearchTerm(e.target.value)} 
                 className="h-14 pl-14 pr-14 rounded-2xl border-none bg-slate-50 font-bold placeholder:text-slate-300 focus:bg-white transition-all shadow-inner" 
              />
           </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-6 py-2 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anulados</span>
             <Switch checked={showDiscontinued} onCheckedChange={(val) => { setShowDiscontinued(val); setCurrentPage(1); }} className="data-[state=checked]:bg-rose-500 scale-90" />
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase">Resumo</p>
             <p className="text-slate-800 font-black text-lg leading-none">{pageData?.pagination.totalCount || 0}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 min-h-[400px]">
        {isLoading && localProducts.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-20 space-y-4 opacity-40">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="font-black text-slate-400 tracking-widest text-xs uppercase">Sincronizando...</p>
           </div>
        ) : localProducts?.length > 0 ? (
          localProducts.map((p: any) => (
            <motion.div 
              layout
              key={p.code} 
              className={`flex flex-col lg:flex-row items-center justify-between p-4 px-6 rounded-2xl transition-all border ${p.isDiscontinued ? 'bg-rose-50/20 border-rose-100 opacity-60' : 'bg-white hover:border-blue-400 border-slate-100 shadow-sm'}`}
            >
              <div className="flex items-center gap-6 flex-1 w-full">
                 <Checkbox 
                    checked={bulkSelected.includes(p.code)}
                    onCheckedChange={(c) => {
                       if (c) setBulkSelected(prev => [...prev, p.code]);
                       else setBulkSelected(prev => prev.filter(code => code !== p.code));
                    }}
                    className="w-6 h-6 rounded-md border-2 border-slate-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0"
                 />
                 <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 shadow-inner">
                    <Box className="w-5 h-5 text-slate-300" />
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <Badge variant="outline" className="text-[9px] font-black tracking-widest leading-none px-2 py-0.5 border-slate-200">COD: {p.code}</Badge>
                       {p.isControlled && <Badge className="bg-slate-900 text-white text-[8px] font-black uppercase px-2 py-0.5">TARJA</Badge>}
                    </div>
                    <h4 className="font-black text-slate-800 tracking-tight text-base line-clamp-1">{p.name || "..."}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{p.manufacturer || 'LABORATÓRIO...'}</p>
                 </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 mt-4 lg:mt-0 w-full lg:w-auto">
                 <div className="flex bg-slate-50 p-1 rounded-xl shadow-inner border border-slate-100">
                    <Button 
                      onClick={() => handleUpdate(p.code, { mainCategory: 'medicamento', subCategory: 'outros' })}
                      className={`h-8 px-5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${p.mainCategory === 'medicamento' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-slate-400'}`}
                    >
                       MED
                    </Button>
                    <Button 
                      onClick={() => handleUpdate(p.code, { mainCategory: 'perfumaria', subCategory: 'beleza' })}
                      className={`h-8 px-5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${p.mainCategory === 'perfumaria' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-400'}`}
                    >
                       PERF
                    </Button>
                 </div>

                 <div className="flex gap-1">
                    {getSubCategories(p.mainCategory || 'medicamento').map(sub => (
                      <Button 
                         key={sub}
                         onClick={() => handleUpdate(p.code, { subCategory: sub })}
                         variant="outline"
                         className={`h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 transition-all ${p.subCategory === sub ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                      >
                         {sub}
                      </Button>
                    ))}
                 </div>

                 <div className="flex items-center gap-2 border-l ml-2 pl-4 border-slate-100">
                    <Switch checked={p.isControlled} onCheckedChange={(val) => handleUpdate(p.code, { isControlled: val })} className="scale-75 data-[state=checked]:bg-slate-900" />
                    <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={() => handleUpdate(p.code, { isDiscontinued: !p.isDiscontinued })}
                       className={`w-10 h-10 rounded-xl transition-all ${p.isDiscontinued ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-200 hover:text-rose-500 hover:bg-rose-50'}`}
                    >
                       <Ban className="w-5 h-5" />
                    </Button>
                 </div>
              </div>
            </motion.div>
          ))
        ) : (
           <div className="flex flex-col items-center justify-center p-20 space-y-4 opacity-50">
              <PackageSearch className="w-16 h-16 text-slate-200" />
              <div className="text-center">
                 <p className="font-black text-slate-800 uppercase tracking-widest">Nada encontrado</p>
              </div>
           </div>
        )}
      </div>

      {pageData?.pagination.totalPages && pageData.pagination.totalPages > 1 && (() => {
         const total = pageData.pagination.totalPages;
         let start = Math.max(1, currentPage - 2);
         let end = Math.min(total, start + 4);
         if (end - start < 4) { start = Math.max(1, end - 4); }
         const pages = []; for (let i = start; i <= end; i++) pages.push(i);
         return (
            <div className="flex items-center justify-center gap-2 pt-10 flex-wrap">
               <Button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} variant="outline" className="rounded-xl h-12 w-12 p-0 border-slate-200 hover:bg-slate-900 hover:text-white transition-all shadow-md">
                  <ChevronRight className="w-5 h-5 rotate-180" />
               </Button>
               {start > 1 && (
                  <>
                    <Button onClick={() => setCurrentPage(1)} variant="outline" className="rounded-xl h-12 w-12 p-0 border-slate-200 hover:bg-slate-900 hover:text-white transition-all font-bold">1</Button>
                    {start > 2 && <span className="px-2 text-slate-400">...</span>}
                  </>
               )}
               {pages.map(p => (
                  <Button key={p} onClick={() => setCurrentPage(p)} variant={currentPage === p ? "default" : "outline"} className={`rounded-xl h-12 w-12 p-0 transition-all font-bold ${currentPage === p ? 'bg-blue-600 text-white shadow-lg' : 'border-slate-200 hover:bg-slate-900 hover:text-white'}`}>{p}</Button>
               ))}
               {end < total && (
                  <>
                    {end < total - 1 && <span className="px-2 text-slate-400">...</span>}
                    <Button onClick={() => setCurrentPage(total)} variant="outline" className="rounded-xl h-12 w-12 p-0 border-slate-200 hover:bg-slate-900 hover:text-white transition-all font-bold">{total}</Button>
                  </>
               )}
               <Button disabled={currentPage === total} onClick={() => setCurrentPage(p => p + 1)} variant="outline" className="rounded-xl h-12 w-12 p-0 border-slate-200 hover:bg-slate-900 hover:text-white transition-all shadow-md">
                  <ChevronRight className="w-5 h-5" />
               </Button>
            </div>
         );
      })()}

      <AlertDialog open={showBulkBanConfirm} onOpenChange={setShowBulkBanConfirm}>
        <AlertDialogContent className="rounded-3xl border-rose-100 shadow-2xl shadow-rose-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-3">
               <Trash2 className="w-8 h-8" /> Exclusão em Massa
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-bold text-slate-600 mt-2 leading-relaxed">
               Você marcou <span className="text-slate-900 font-black text-xl">{bulkSelected.length}</span> produtos no catálogo para anulação simultânea.<br/><br/>
               Deseja rebaixar todos eles para a lista negra imediatamente?
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
