import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, Play, ListOrdered, CheckCircle, Clock, Trash2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface QueuedFile {
  file: File;
  startDate: string;
  endDate: string;
  status: "idle" | "processing" | "success" | "error";
  message?: string;
}

export default function BulkUploadQueue() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSalesMutation = trpc.data.uploadSales.useMutation();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newEntries: QueuedFile[] = files.map((file) => {
      let defaultEnd = new Date().toISOString().slice(0, 16);
      const match = file.name.match(/(\d{8})/);
      if (match) {
        const d = match[1];
        defaultEnd = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T18:00`;
      }
      
      const startDate = new Date(new Date(defaultEnd).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

      return {
        file,
        startDate: startDate,
        endDate: defaultEnd,
        status: "idle",
      };
    });

    setQueue((prev) => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fillSequence = () => {
    if (queue.length === 0) return;
    
    const newQueue = [...queue];
    let currentStart = new Date(newQueue[0].startDate);
    let currentEnd = new Date(newQueue[0].endDate);

    for (let i = 1; i < newQueue.length; i++) {
      currentStart = new Date(currentStart.getTime() + 24 * 60 * 60 * 1000);
      currentEnd = new Date(currentEnd.getTime() + 24 * 60 * 60 * 1000);
      
      newQueue[i].startDate = currentStart.toISOString().slice(0, 16);
      newQueue[i].endDate = currentEnd.toISOString().slice(0, 16);
    }
    
    setQueue(newQueue);
    toast.info("Sequência de datas aplicada!");
  };

  const processQueue = async () => {
    setIsProcessing(true);
    
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === "success") continue;

      const updatedQueue = [...queue];
      updatedQueue[i].status = "processing";
      setQueue([...updatedQueue]);

      try {
        const content = await queue[i].file.text();
        const result = await uploadSalesMutation.mutateAsync({
          fileContent: content,
          startDate: new Date(queue[i].startDate).toISOString(),
          endDate: new Date(queue[i].endDate).toISOString(),
        });

        updatedQueue[i].status = "success";
        updatedQueue[i].message = result.message || "Processado com sucesso";
      } catch (err: any) {
        updatedQueue[i].status = "error";
        updatedQueue[i].message = err.message || "Falha no upload";
      }
      
      setQueue([...updatedQueue]);
    }
    
    setIsProcessing(false);
    toast.success("Processamento de fila concluído!");
  };

  const removeItem = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-6 border-blue-100 bg-blue-50/10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-blue-600" />
            Upload Massivo de Histórico (Fila)
          </h3>
          <p className="text-sm text-muted-foreground italic">Selecione vários arquivos e organize as datas rapidamente.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
            <PlusCircle className="w-4 h-4 mr-2" /> Selecionar Arquivos (90+)
          </Button>
          <Button variant="secondary" size="sm" onClick={fillSequence} disabled={isProcessing || queue.length < 2}>
             <Calendar className="w-4 h-4 mr-2" /> Preencher Sequência
          </Button>
          <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={processQueue} disabled={isProcessing || queue.length === 0}>
             {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />} 
             Processar Fila
          </Button>
        </div>
      </div>

      <input 
        type="file" 
        title="Upload de Arquivos de Histórico"
        multiple 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileSelect} 
        accept=".txt,.csv"
      />

      <ScrollArea className="h-[400px] border rounded-lg bg-white">
        <div className="p-4 space-y-3">
          {queue.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              Nenhum arquivo na fila. Comece selecionando seus relatórios COTAC.
            </div>
          )}
          {queue.map((item, idx) => (
            <div key={idx} className="flex flex-col md:flex-row items-center gap-4 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {item.status === 'idle' && <Badge variant="outline">Aguardando</Badge>}
                  {item.status === 'processing' && <Badge className="bg-blue-100 text-blue-700 animate-pulse">Processando...</Badge>}
                  {item.status === 'success' && <Badge className="bg-green-100 text-green-700 font-bold">✓ Concluído</Badge>}
                  {item.status === 'error' && <Badge className="bg-red-100 text-red-700">Erro: {item.message}</Badge>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                <div className="space-y-1">
                  <Label 
                    htmlFor={`start-date-${idx}`}
                    className="text-[10px] uppercase font-bold text-muted-foreground"
                  >
                    Início
                  </Label>
                  <Input 
                    id={`start-date-${idx}`}
                    type="datetime-local" 
                    title="Data de Início"
                    placeholder="Início"
                    className="h-8 text-xs min-w-[150px]"
                    value={item.startDate}
                    onChange={(e) => {
                      const newQueue = [...queue];
                      newQueue[idx].startDate = e.target.value;
                      setQueue(newQueue);
                    }}
                    disabled={isProcessing || item.status === 'success'}
                  />
                </div>
                <div className="space-y-1">
                  <Label 
                    htmlFor={`end-date-${idx}`}
                    className="text-[10px] uppercase font-bold text-muted-foreground"
                  >
                    Fim
                  </Label>
                  <Input 
                    id={`end-date-${idx}`}
                    type="datetime-local" 
                    title="Data de Fim"
                    placeholder="Fim"
                    className="h-8 text-xs min-w-[150px]"
                    value={item.endDate}
                    onChange={(e) => {
                      const newQueue = [...queue];
                      newQueue[idx].endDate = e.target.value;
                      setQueue(newQueue);
                    }}
                    disabled={isProcessing || item.status === 'success'}
                  />
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={isProcessing || item.status === 'success'}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

import { PlusCircle } from "lucide-react";
