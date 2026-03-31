import React, { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  AlertCircle, CheckCircle2, Scan, Keyboard, History, 
  Loader2, Zap, ShieldCheck, UserCircle2, Phone, CreditCard, ShoppingBasket,
  Search, UserPlus, MapPin, Info, PackageCheck, Clock, Check, X, Truck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

/**
 * --------------------------------------------------------------------------
 * ManualRuptureEntry - FALTAS & GESTÃO REALTIME v6.0 (CONEXÃO VIVA)
 * --------------------------------------------------------------------------
 */

export default function ManualRuptureEntry() {
  const [ean, setEan] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [isSpecialOrder, setIsSpecialOrder] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'entry' | 'orders'>('entry');

  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useContext();

  // 🛰️ RADAR REALTIME: ESCUTA MUDANÇAS NO BANCO
  useEffect(() => {
    const channel = supabase
      .channel('ruptures-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_ruptures' }, () => {
         console.log("🚀 Sincronização Realtime detectada!");
         utils.cota.getSpecialOrders.invalidate();
         utils.cota.getRuptureSummary.invalidate();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [utils]);

  const { data: searchResults } = trpc.crm.searchCustomers.useQuery({ query: customerSearch }, { enabled: customerSearch.length >= 2 });
  const { data: ordersData, refetch: refetchOrders } = trpc.cota.getSpecialOrders.useQuery();

  const logMutation = trpc.cota.logManualRupture.useMutation({
    onSuccess: () => {
      resetForm();
      setStatus({ type: 'success', message: `Pedido registrado com sucesso!` });
      setTimeout(() => setStatus(null), 3000);
      if (!isCameraActive) inputRef.current?.focus();
    },
    onError: (err) => { setStatus({ type: 'error', message: err.message }); setEan(""); },
  });

  const upsertCustomerMutation = trpc.crm.upsertCustomer.useMutation();
  const updateOrderStatus = trpc.cota.updateOrderStatus.useMutation();

  const resetForm = () => {
    setEan(""); setCustomerName(""); setContact(""); setAddress("");
    setIsSpecialOrder(false); setIsPaid(false); setSelectedCustomerId(null); setCustomerSearch("");
  };

  const handleSubmitVIP = async () => {
    if (ean.length < 3) return;
    try {
      let customerId: number | undefined = selectedCustomerId || undefined;
      if (!customerId && customerName) {
         const resp = await upsertCustomerMutation.mutateAsync({ name: customerName, phone: contact, address: address });
         customerId = resp.customerId;
      }
      logMutation.mutate({ ean, customerId, customerName, contact, isPaid, isSpecialOrder: true });
    } catch (e) {
      setStatus({ type: 'error', message: "Erro ao salvar cliente." });
    }
  };

  const selectCustomer = (c: any) => {
    setSelectedCustomerId(c.id); setCustomerName(c.name); setContact(c.phone || "");
    if (c.addresses?.[0]) setAddress(c.addresses[0].addressText);
    setCustomerSearch(""); setShowCustomerSearch(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* SELETOR DE MODO SLIM */}
      <div className="flex bg-white/80 backdrop-blur-md p-2 rounded-[2rem] shadow-sm border border-slate-100 max-w-sm mx-auto md:mx-0">
        <Button 
          onClick={() => setActiveSubTab('entry')}
          className={`flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeSubTab === 'entry' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
        >
           Novo Registro
        </Button>
        <Button 
          onClick={() => setActiveSubTab('orders')}
          className={`flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeSubTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
        >
           Gestão VIP Realtime
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'entry' ? (
          <motion.div key="entry" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-8">
            <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white/70 backdrop-blur-3xl">
              <header className="p-10 md:p-14 bg-slate-900 overflow-hidden relative">
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-transparent" />
                 <div className="relative flex items-center justify-between">
                    <div>
                       <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">Balanço de Faltas</h2>
                       <p className="text-blue-300/60 font-medium mt-2 tracking-widest text-[10px] uppercase">Conexão Viva com o Gerente</p>
                    </div>
                    <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" />
                 </div>
              </header>

              <CardContent className="p-10 md:p-14 space-y-10">
                 <div className="flex items-center justify-between p-6 bg-slate-100/30 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4"><UserCircle2 className="w-6 h-6 text-blue-600" /><span className="font-black text-slate-800 uppercase tracking-widest text-[10px]">É Encomenda VIP?</span></div>
                    <Switch checked={isSpecialOrder} onCheckedChange={setIsSpecialOrder} className="data-[state=checked]:bg-blue-600" />
                 </div>

                 <AnimatePresence>
                    {isSpecialOrder ? (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-6 overflow-hidden">
                        <div className="relative">
                           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                           <Input placeholder="Buscar Cliente (Nome ou Telefone)..." value={customerSearch} onChange={e => {setCustomerSearch(e.target.value); setShowCustomerSearch(true);}} className="h-16 pl-16 rounded-2xl bg-white border-2 border-slate-100 font-bold" />
                           {showCustomerSearch && searchResults && searchResults.length > 0 && (
                             <Card className="absolute z-50 w-full mt-2 rounded-2xl shadow-2xl border-blue-50 p-2">
                                {searchResults.map((c: any) => (
                                   <button key={c.id} onClick={() => selectCustomer(c)} className="w-full p-4 text-left hover:bg-blue-50 flex items-center justify-between border-b rounded-xl last:border-b-0">
                                      <div><p className="font-bold">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p></div>
                                      <Badge variant="outline" className="border-emerald-200 text-emerald-600">CLIENTE VIP</Badge>
                                   </button>
                                ))}
                             </Card>
                           )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <Input placeholder="Nome Completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-14 rounded-xl border-slate-100 font-bold" />
                           <Input placeholder="Telefone / Contato" value={contact} onChange={e => setContact(e.target.value)} className="h-14 rounded-xl border-slate-100 font-bold" />
                        </div>
                        <Input placeholder="Endereço para Entrega (Opcional)" value={address} onChange={e => setAddress(e.target.value)} className="h-14 rounded-xl border-slate-100 font-bold" />
                        <div className="flex items-center justify-between p-4 px-8 bg-blue-50/50 rounded-xl border border-blue-100/50">
                           <span className="font-black text-[10px] uppercase text-blue-900 tracking-widest">Produto já está pago?</span>
                           <Switch checked={isPaid} onCheckedChange={setIsPaid} className="data-[state=checked]:bg-blue-600" />
                        </div>
                      </motion.div>
                    ) : null}
                 </AnimatePresence>

                 <div className="relative">
                    <Keyboard className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-slate-300" />
                    <Input ref={inputRef} placeholder="Bipe o EAN aqui..." value={ean} onChange={e => setEan(e.target.value)} className="h-24 pl-20 rounded-[2rem] border-4 border-slate-100 text-3xl font-black text-slate-800 focus:border-blue-600 shadow-inner" autoFocus />
                 </div>

                 {isSpecialOrder && (
                   <Button onClick={handleSubmitVIP} disabled={logMutation.isPending || ean.length < 3 || !customerName} className="w-full h-20 rounded-[2rem] bg-blue-600 text-white text-xl font-black shadow-2xl shadow-blue-500/30 hover:scale-[1.01] transition-all">
                      {logMutation.isPending ? "ENVIANDO AO GERENTE..." : "GRAVAR ENCOMENDA VIP"}
                   </Button>
                 )}

                 {status && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-2xl text-center font-black uppercase text-xs tracking-widest ${status.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {status.message}
                    </motion.div>
                 )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {ordersData?.map((o: any) => (
                    <motion.div key={o.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-xl bg-white hover:shadow-2xl transition-all h-full flex flex-col">
                         <div className={`h-3 bg-gradient-to-r ${o.status === 'delivered' ? 'from-emerald-500 to-teal-400' : o.isPaid ? 'from-blue-600 to-indigo-400' : 'from-rose-500 to-orange-400'}`} />
                         <CardContent className="p-8 space-y-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start">
                               <div>
                                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Cliente VIP</p>
                                  <h4 className="font-black text-lg text-slate-800 leading-none">{o.customerName || 'Identificando...'}</h4>
                                  <p className="text-[10px] font-bold text-blue-600 mt-1">{o.contact || 'S/ Telefone'}</p>
                               </div>
                               <Badge className={`rounded-xl px-4 py-1 text-[9px] font-black tracking-widest ${o.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                  {o.isPaid ? 'PAGO' : 'ÃO PAGO'}
                               </Badge>
                            </div>

                            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 flex-1">
                               <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Produto da Encomenda</p>
                               <p className="font-black text-slate-700 leading-tight text-sm line-clamp-3">{o.productName || 'Carregando Nome...'}</p>
                               <p className="text-[8px] font-bold text-slate-400 uppercase mt-4">{new Date(o.lastAskedAt).toLocaleString()}</p>
                            </div>

                            <div className="pt-2">
                               {o.status === 'pending' && (
                                 <Button 
                                   onClick={() => updateOrderStatus.mutate({ id: o.id, status: 'delivered' })} 
                                   className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-[10px] tracking-widest hover:bg-emerald-600 transition-colors"
                                 >
                                    <Truck className="w-4 h-4 mr-3" /> MARCAR COMO ENTREGUE
                                 </Button>
                               )}
                               {o.status === 'delivered' && (
                                 <div className="w-full h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 font-black text-[10px] tracking-widest flex items-center justify-center gap-3 border-2 border-emerald-100">
                                    <PackageCheck className="w-6 h-6" /> ENCOMENDA FINALIZADA
                                 </div>
                               )}
                            </div>
                         </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
             </div>
             {(!ordersData || ordersData.length === 0) && (
               <div className="p-32 text-center flex flex-col items-center justify-center space-y-6">
                  <ShoppingBasket className="w-20 h-20 text-slate-100" />
                  <p className="font-black text-slate-300 tracking-[0.2em] text-sm uppercase">Aguardando Encomendas VIP...</p>
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
