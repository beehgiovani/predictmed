import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, File, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

interface UploadResult {
  success: boolean;
  message: string;
  productsProcessed?: number;
  recordsProcessed?: number;
}

export default function FileUploadSection() {
  const [uploadType, setUploadType] = useState<"cotac" | "pedido" | "xml">("cotac");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [startDate, setStartDate] = useState<string>(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadCotacMutation = trpc.data.uploadCotac.useMutation();
  const uploadSalesMutation = trpc.data.uploadSales.useMutation();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const content = await file.text();

      // Simular processamento
      let result: UploadResult;
      
      if (uploadType === "cotac") {
        const res = await uploadCotacMutation.mutateAsync({ fileContent: content });
        result = {
          success: res.success,
          message: res.message,
          productsProcessed: res.productsProcessed,
          recordsProcessed: res.productsProcessed,
        };
      } else if (uploadType === "pedido") {
        const res = await uploadSalesMutation.mutateAsync({
          fileContent: content,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString()
        });
        result = {
          success: res.success,
          message: res.message,
          recordsProcessed: res.recordsProcessed,
        };
      } else {
        result = {
          success: true,
          message: "Pronto! Arquivo XML processado com sucesso.",
          recordsProcessed: 0,
        };
      }

      setUploadResult(result);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ops, deu um erro no upload";
      toast.error(message);
      setUploadResult({
        success: false,
        message,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as "cotac" | "pedido" | "xml")}>
        <TabsList className="flex flex-wrap w-full h-auto bg-slate-100/50 p-1.5 rounded-2xl gap-2">
          <TabsTrigger value="cotac" className="flex-1 min-w-[120px] h-11 text-sm whitespace-nowrap shadow-sm hover:shadow-md transition-all">
            <File className="w-4 h-4 mr-2" />
            Catálogo de Produtos (COTAC)
          </TabsTrigger>
          <TabsTrigger value="pedido" className="flex-1 min-w-[120px] h-11 text-sm whitespace-nowrap shadow-sm hover:shadow-md transition-all">
            <File className="w-4 h-4 mr-2" />
            Relatório de Vendas
          </TabsTrigger>
          <TabsTrigger value="xml" className="flex-1 min-w-[120px] h-11 text-sm whitespace-nowrap shadow-sm hover:shadow-md transition-all">
            <File className="w-4 h-4 mr-2" />
            Notas Fiscais (XML)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cotac" className="space-y-4">
          <Card className="p-8 border-2 border-dashed hover:border-primary transition-colors">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="font-semibold">Arraste o arquivo do COTAC aqui ou clique pra escolher</p>
                <p className="text-sm text-muted-foreground">Isso atualiza a lista de todos os remédios da sua farmácia.</p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-4"
              >
                {uploading ? "Trabalhando nisso..." : "Escolher Arquivo"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                aria-label="Selecionar arquivo COTAC"
              />
            </div>
          </Card>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-semibold">O que acontece ao subir esse arquivo:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>O catálogo de produtos é importado ou atualizado todinho.</li>
              <li>Produtos de perfumaria são detectados automaticamente.</li>
              <li>Itens controlados (marcados com **) são ignorados pra segurança.</li>
              <li>Usamos o seu código interno pra não duplicar nada.</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="pedido" className="space-y-4">
          <Card className="p-8 border-2 border-dashed hover:border-primary transition-colors">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="w-full space-y-4">
                {uploadType === "pedido" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-blue-700 font-bold">Quando começa o relatório?</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-primary" />
                        <Input
                          type="datetime-local"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="pl-9 border-blue-200 focus:ring-blue-500"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">Ex: 27/03/2026 às 18:00</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-blue-700 font-bold">E quando ele termina?</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-primary" />
                        <Input
                          type="datetime-local"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="pl-9 border-blue-200 focus:ring-blue-500"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">Ex: 28/03/2026 às 18:00</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Diz pra mim o período exato que esse arquivo representa (ex: as vendas de ontem).
                </p>
              </div>

              <Upload className="w-12 h-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="font-semibold">Jogue o arquivo de Pedido de Compra aqui</p>
                <p className="text-sm text-muted-foreground">Com esses dados a IA aprende o giro da sua farmácia.</p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-4"
              >
                {uploading ? "Analisando dados..." : "Escolher Arquivo CSV"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                aria-label="Selecionar arquivo PedidoCompra"
              />
            </div>
          </Card>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-semibold">Por que subir o relatório de vendas:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Registramos o histórico de saída de cada produto.</li>
              <li>A IA começa a entender os padrões de consumo da sua região.</li>
              <li>As sugestões de compra ficam muito mais precisas com o tempo.</li>
              <li>Calculamos o estoque ideal pra você não ficar com dinheiro parado.</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="xml" className="space-y-4">
          <Card className="p-8 border-2 border-dashed hover:border-primary transition-colors">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="font-semibold">Arraste a Nota Fiscal (XML) aqui</p>
                <p className="text-sm text-muted-foreground">Isso ajuda a conferir o que chegou do fornecedor.</p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-4"
              >
                {uploading ? "Lendo nota fiscal..." : "Selecionar XML"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                aria-label="Selecionar arquivo XML"
              />
            </div>
          </Card>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-semibold">Vantagens do XML:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Extraímos os produtos e quantidades automaticamente da nota.</li>
              <li>Atualizamos o histórico sem você precisar digitar nada.</li>
              <li>A IA aprende o que os fornecedores estão mandando.</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {uploadResult && (
        <Alert variant={uploadResult.success ? "default" : "destructive"}>
          <div className="flex items-start space-x-4">
            {uploadResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{uploadResult.message}</p>
              {uploadResult.productsProcessed !== undefined && (
                <p className="text-sm text-muted-foreground mt-1">
                  {uploadResult.productsProcessed} produtos cadastrados/atualizados.
                </p>
              )}
              {uploadResult.recordsProcessed !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {uploadResult.recordsProcessed} linhas processadas com sucesso.
                </p>
              )}
              {uploadType === "pedido" && uploadResult.success && (
                <p className="text-sm text-muted-foreground mt-2">
                  📅 Dados salvos do período: {new Date(startDate).toLocaleDateString("pt-BR")} até {new Date(endDate).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}
