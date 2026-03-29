# 📱 Guia Prático - PredictMed Gestor de Pedidos

## Para Usuários Sem Conhecimento Técnico

### O Que É Esta Aplicação?

Uma ferramenta que **analisa automaticamente o histórico de vendas da sua farmácia** e **sugere quantidades de compra** para cada medicamento, baseado em padrões reais de consumo.

**Benefícios:**
- ✅ Nunca mais falta medicamento em falta
- ✅ Evita comprar em excesso
- ✅ Economiza tempo na gestão de pedidos
- ✅ Aprende com cada novo upload

---

## 🚀 Como Usar (3 Passos Simples)

### PASSO 1: Importe o Catálogo (COTAC)

1. Acesse a aplicação
2. Clique na aba **"Upload"**
3. Selecione a aba **"COTAC (Catálogo)"**
4. Clique em **"Selecionar Arquivo"**
5. Escolha o arquivo `COTAC_YYYYMMDD_HHMMSS.txt` do seu computador
6. Aguarde a mensagem de sucesso

**O que acontece:**
- Todos os medicamentos são importados
- Medicamentos de perfumaria são removidos automaticamente
- Medicamentos controlados são removidos automaticamente
- Pronto para o próximo passo!

---

### PASSO 2: Importe o Histórico de Vendas (PedidoCompra)

1. Clique na aba **"Upload"** (se não estiver lá)
2. Selecione a aba **"PedidoCompra (CSV)"**
3. **IMPORTANTE:** Selecione a data/período do arquivo
   - Exemplo: Se o arquivo é de Janeiro/2026, selecione 01/01/2026
4. Clique em **"Selecionar Arquivo"**
5. Escolha o arquivo `PedidoCompra.csv`
6. Aguarde a mensagem de sucesso

**O que acontece:**
- O histórico de vendas é registrado
- O sistema aprende com esses dados
- Sugestões começam a aparecer

**Repita este passo para cada período:**
- Se você tem histórico de Janeiro, Fevereiro e Março
- Faça upload 3 vezes (uma para cada mês)
- Cada upload melhora as sugestões!

---

### PASSO 3: Veja as Sugestões

1. Clique na aba **"Produtos"**
2. Você verá uma tabela com todos os medicamentos
3. As colunas **"1 dia", "2 dias", "3 dias", "4 dias", "5 dias"** mostram quantidades sugeridas
4. A coluna **"Confiança"** mostra o nível de certeza (quanto maior, melhor)

**Como ler a tabela:**
- **Código**: Identificador único do medicamento
- **Nome**: Nome completo do medicamento
- **Preço**: Preço unitário
- **1 dia**: Quantos comprar se quer estoque para 1 dia
- **2 dias**: Quantos comprar se quer estoque para 2 dias
- **Confiança**: 30% = pouco confiável, 90% = muito confiável

---

## 📊 Exemplo Prático

**Cenário:** Farmácia vende em média 5 unidades de Dipirona por dia

| Coluna | Valor | O que significa |
|--------|-------|-----------------|
| Nome | Dipirona 500mg | Nome do medicamento |
| 1 dia | 5 | Compre 5 unidades para ter estoque de 1 dia |
| 2 dias | 10 | Compre 10 unidades para ter estoque de 2 dias |
| 3 dias | 15 | Compre 15 unidades para ter estoque de 3 dias |
| 5 dias | 25 | Compre 25 unidades para ter estoque de 5 dias |
| Confiança | 90% | Muito confiável (muitos dados) |

---

## ❓ Dúvidas Frequentes

### P: O que é "Confiança"?
**R:** É o nível de certeza da sugestão. Quanto mais dados (uploads), maior a confiança. Começa em 30% e pode chegar a 90%.

### P: Por que as sugestões mostram "--"?
**R:** Significa que ainda não há dados suficientes. Faça upload do PedidoCompra para que as sugestões apareçam.

### P: Preciso fazer upload toda vez?
**R:** Sim! Cada novo upload de histórico melhora as sugestões. Quanto mais dados, melhor o algoritmo funciona.

### P: Posso fazer upload de vários meses de uma vez?
**R:** Não. Faça upload de um arquivo por vez, especificando a data de cada um. Assim o sistema entende melhor os padrões.

### P: As sugestões aparecem imediatamente?
**R:** Sim! Após o upload, clique na aba "Produtos" e as sugestões já estarão lá.

### P: Posso mudar a data depois?
**R:** Não. Se errar a data, faça upload novamente com a data correta.

### P: O sistema aprende com o tempo?
**R:** Sim! Cada novo upload melhora as sugestões. Quanto mais histórico, melhor.

---

## 🎯 Dicas Importantes

### ✅ Faça Assim:
- Importe o COTAC primeiro (catálogo de produtos)
- Depois importe o PedidoCompra com a data correta
- Repita para cada período (Janeiro, Fevereiro, etc.)
- Quanto mais dados, melhor as sugestões

### ❌ Não Faça Assim:
- Não importe PedidoCompra sem ter importado COTAC primeiro
- Não esqueça de especificar a data do arquivo
- Não importe o mesmo arquivo duas vezes
- Não use datas incorretas

---

## 📈 Como Melhorar as Sugestões

1. **Mais dados = Melhores sugestões**
   - Importe histórico de vários meses
   - Quanto mais períodos, melhor

2. **Datas corretas = Análise correta**
   - Sempre especifique a data/período do arquivo
   - Isso ajuda o sistema a entender padrões sazonais

3. **Atualizações regulares**
   - Importe novo histórico regularmente
   - Mensalmente é o ideal

---

## 🆘 Se Algo Não Funcionar

### Problema: "Nenhum produto encontrado"
- **Solução:** Verifique se fez upload do COTAC primeiro
- **Solução:** Verifique se o arquivo COTAC não está vazio

### Problema: "Arquivo inválido"
- **Solução:** Verifique o formato do arquivo
- **Solução:** Verifique se não há caracteres especiais

### Problema: Sugestões mostram "--"
- **Solução:** Faça upload do PedidoCompra
- **Solução:** Aguarde alguns segundos e recarregue a página

### Problema: Confiança está muito baixa
- **Solução:** Importe mais histórico (mais períodos)
- **Solução:** Aguarde o sistema acumular mais dados

---

## 📞 Contato e Suporte

Se tiver dúvidas:
1. Releia este guia
2. Verifique as mensagens de erro na aplicação
3. Contate o suporte técnico

---

**Versão:** 1.0.0  
**Última atualização:** 28 de março de 2026  
**Status:** Pronto para uso
