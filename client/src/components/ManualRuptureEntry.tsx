import React, { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Scan, Keyboard, History, Loader2, Zap, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ManualRuptureEntry() {
  const [ean, setEan] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [lastScanned, setLastScanned] = useState<{ name: string; time: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const logMutation = trpc.cota.logManualRupture.useMutation({
    onSuccess: (data) => {
      setLastScanned({ name: data.productName, time: new Date().toLocaleTimeString() });
      setEan("");
      setStatus({ type: 'success', message: `Registrado: ${data.productName}` });
      setTimeout(() => setStatus(null), 3000);
      if (!isCameraActive) inputRef.current?.focus();
    },
    onError: (err) => {
      setStatus({ type: 'error', message: err.message });
      setEan("");
    },
  });

  // Auto-submit quando o EAN atinge o tamanho padrão (13 ou 14 dígitos)
  useEffect(() => {
    if (ean.length >= 13 && !logMutation.isPending) {
      logMutation.mutate({ ean });
    }
  }, [ean]);

  // Scanner de Câmera
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isCameraActive) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 300, height: 300 } },
        /* verbose= */ false
      );
      scanner.render((decodedText) => {
        setEan(decodedText);
        setIsCameraActive(false);
        scanner?.clear();
      }, (err) => {
        // Ignorar erros de scan contínuo
      });
    }
    return () => {
      if (scanner) scanner.clear();
    };
  }, [isCameraActive]);

  // Sempre focar o input para leitores físicos (USB/Bluetooth)
  useEffect(() => {
    if (!isCameraActive) {
      const handleFocus = () => inputRef.current?.focus();
      window.addEventListener("click", handleFocus);
      inputRef.current?.focus();
      return () => window.removeEventListener("click", handleFocus);
    }
  }, [isCameraActive]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rupture-scanner-container max-w-4xl mx-auto p-4 md:p-0"
    >
      <Card className="scanner-main-card overflow-hidden border-none premium-shadow-lg glassmorphism !bg-white/40 backdrop-blur-3xl rounded-[2.5rem]">
        <header className="scanner-header relative p-10 md:p-14 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="scanner-title-area text-center md:text-left">
              <motion.div 
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 5 }}
                className="inline-flex items-center gap-4 bg-white/10 px-6 py-2 rounded-2xl backdrop-blur-md border border-white/10 mb-6"
              >
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <span className="text-xs font-black text-rose-100 uppercase tracking-widest leading-none">Alerta de Ruptura</span>
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                Scanner Inteligente <br/> de Venda Perdida
              </h2>
              <p className="text-slate-400 mt-6 font-semibold text-base md:text-lg max-w-md">
                Bipe o produto solicitado pelo cliente para alimentar a I.A. automaticamente.
              </p>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-6">

              <div className="flex items-center gap-3 text-emerald-400 font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 px-6 py-2 rounded-full border border-emerald-500/20">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                 Link Supabase Ativo
              </div>
            </div>
          </div>
        </header>

        <CardContent className="scanner-content-body p-10 md:p-14">
          <div className="flex flex-col gap-12">
            <AnimatePresence mode="wait">
              {!isCameraActive ? (
                <motion.div 
                  key="manual"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="w-full space-y-12"
                >
                  <div className="scanner-input-brick relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative">
                      <Keyboard className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 w-8 h-8 transition-colors group-focus-within:text-blue-500" />
                      <Input
                        ref={inputRef}
                        placeholder="Bipe com o Leitor..."
                        value={ean}
                        onChange={(e) => setEan(e.target.value)}
                        className="h-24 md:h-28 pl-24 pr-10 rounded-[2rem] border-2 border-slate-100 bg-white shadow-xl text-3xl font-black text-slate-800 placeholder:text-slate-300 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus-visible:ring-0"
                        autoFocus
                        title="Entrada de Código de Barras"
                      />
                      {logMutation.isPending && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2">
                          <Loader2 className="animate-spin text-blue-600 h-10 w-10" />
                        </div>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {status && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, y: -20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 20 }}
                        className={`p-8 rounded-[2rem] text-center text-base font-black uppercase tracking-[0.2em] shadow-lg ${status.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'}`}
                      >
                        {status.message}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-6 group hover:bg-white transition-all hover:shadow-xl">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                          <CheckCircle2 className="w-7 h-7 text-emerald-500 group-hover:text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status Periférico</p>
                          <p className="text-base font-black text-slate-700">Leitor USB Conectado</p>
                        </div>
                     </div>
                     <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-6 group hover:bg-white transition-all hover:shadow-xl text-balance">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                          <ShieldCheck className="w-7 h-7 text-emerald-500 group-hover:text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Segurança de Dados</p>
                          <p className="text-base font-black text-slate-700">IA Auto-Lookup Ativo</p>
                        </div>
                     </div>
                  </div>

                  <div className="relative flex items-center gap-10">
                     <div className="h-px bg-slate-200 flex-1" />
                     <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Alternativa Digital</span>
                     <div className="h-px bg-slate-200 flex-1" />
                  </div>

                  <Button 
                    onClick={() => setIsCameraActive(true)}
                    className="h-20 md:h-24 rounded-[2rem] bg-slate-900 hover:bg-black text-white gap-6 px-10 text-xl font-black shadow-2xl transition-all active:scale-95 group"
                    title="Ativar Câmera"
                  >
                    <Scan className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
                    Abrir Scanner Mobile
                  </Button>
                </motion.div>
              ) : (
                <motion.div 
                  key="camera"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="w-full space-y-10"
                >
                  <div className="relative rounded-[3rem] overflow-hidden border-8 border-slate-900 shadow-2xl bg-black">
                    <div id="reader" className="aspect-square md:aspect-video w-full" />
                    <div className="absolute inset-0 border-[40px] border-white/10 pointer-events-none" />
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-scan-vertical" />
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full h-20 rounded-[2rem] text-slate-500 font-black text-lg hover:bg-slate-100 transition-all uppercase tracking-widest"
                    onClick={() => setIsCameraActive(false)}
                  >
                    Cancelar e Voltar ao Leitor
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {lastScanned && (
              <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="last-scanned-success-brick !static mt-12 overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-emerald-600 to-emerald-500 p-10 md:p-14 shadow-2xl shadow-emerald-200 relative"
              >
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <Zap className="absolute top-1/2 right-20 -translate-y-1/2 w-48 h-48 text-white/5 rotate-12" />
                
                <div className="flex flex-col md:flex-row items-center justify-between relative z-10 gap-10 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="bg-white/20 p-6 rounded-3xl backdrop-blur-xl shadow-2xl border border-white/30 text-white">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-100 uppercase tracking-[0.3em] mb-3">Registro de Falta Processado</p>
                      <h4 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none">{lastScanned.name}</h4>
                    </div>
                  </div>
                  <div className="bg-black/10 px-8 py-4 rounded-2xl backdrop-blur-md">
                    <p className="text-[10px] text-emerald-100 font-black uppercase tracking-widest mb-1 opacity-60">Sincronizado às</p>
                    <p className="text-2xl font-black text-white">{lastScanned.time}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="flex justify-center flex-wrap gap-12 py-10 opacity-40">
        <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
           <History className="w-6 h-6" /> 
           Inteligência que Abastece sua Próxima Compra
        </div>
      </div>
    </motion.div>
  );
}
