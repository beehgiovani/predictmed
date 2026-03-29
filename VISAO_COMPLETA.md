# 🎯 PredictMed - Gestor de Pedidos Inteligente
## Visão Completa: Intenções, Funcionalidades, Botões e Escalabilidade

---

## 📋 INTENÇÕES DO PROJETO

### Objetivo Principal
Criar um sistema inteligente de gestão de pedidos para farmácias que **automatiza e otimiza** a decisão de compra baseado em análise real de histórico de vendas, eliminando suposições e reduzindo erros.

### Problemas que Resolve
1. **Falta de Dados** - Farmacêuticos decidem compras por intuição, não por dados
2. **Desperdício** - Compra excessiva leva a produtos vencidos
3. **Falta de Estoque** - Compra insuficiente causa perda de vendas
4. **Tempo Gasto** - Análise manual de vendas consome horas
5. **Imprecisão** - Sugestões do fornecedor não refletem realidade local

### Benefícios Esperados
- ✅ **Redução de 30-40%** em custos de estoque
- ✅ **Aumento de 15-25%** em disponibilidade de produtos
- ✅ **Economia de 5-10 horas/semana** em análise manual
- ✅ **Precisão de 85-95%** nas previsões
- ✅ **Decisões baseadas em dados**, não em intuição

---

## 🎨 INTERFACE E FUNCIONALIDADES

### 1. DASHBOARD PRINCIPAL
**Localização:** Página inicial (`/`)

#### Componentes Visuais
- **Header com Logo** - Marca PredictMed
- **Título Descritivo** - "Gestor de Pedidos Inteligente"
- **Subtítulo** - "Importe seus arquivos e receba sugestões automáticas de compra baseadas em histórico real"
- **Guia Visual em 3 Passos** - Instruções claras e visuais
- **Cards de Informações** - Explicando o fluxo

#### Abas Principais
1. **Upload** - Importar arquivos
2. **Produtos** - Visualizar sugestões
3. **Pedidos** - Gerenciar pedidos
4. **Relatório** - Análises e gráficos

---

## 🔘 BOTÕES E FUNCIONALIDADES DETALHADAS

### ABA 1: UPLOAD

#### 1.1 Sub-aba: COTAC (Catálogo)
**Propósito:** Importar catálogo de produtos

**Elementos:**
- 📁 **Botão "Selecionar Arquivo"**
  - Abre diálogo de seleção de arquivo
  - Aceita: `.txt`
  - Tamanho máximo: 50 MB
  - Ação: Lê arquivo e processa

- 📊 **Indicador de Progresso**
  - Mostra % de processamento
  - Mensagem: "Processando X linhas..."

- ✅ **Feedback de Sucesso**
  - Mensagem: "X produtos importados com sucesso"
  - Cor: Verde
  - Ícone: CheckCircle

- ❌ **Feedback de Erro**
  - Mensagem: Descrição do erro
  - Cor: Vermelho
  - Ícone: AlertCircle

**Processamento Automático:**
- Lê linhas do arquivo
- Extrai: tipo, ean, quantidade, código, nome, fabricante, preço
- Filtra: perfumaria, itens controlados (**)
- Salva: código como chave única
- Resultado: ~11.000 produtos

**Dados Salvos:**
```
{
  code: "175071",
  name: "#TBT ESMALTE CREMOSO HITS 8ML",
  price: 4.98,
  ean: "7891350051234",
  manufacturer: "HITS",
  type: "COSMETICO"
}
```

---

#### 1.2 Sub-aba: PEDIDOCOMPRA (Histórico de Vendas)
**Propósito:** Importar histórico de vendas para análise

**Elementos:**
- 📅 **Seletor de Data/Período**
  - Input type="date"
  - Padrão: Data atual
  - Obrigatório: Sim
  - Dica: "Especifique a data/período que este arquivo representa"

- 📁 **Botão "Selecionar Arquivo"**
  - Abre diálogo de seleção
  - Aceita: `.csv`
  - Tamanho máximo: 50 MB

- 📊 **Indicador de Progresso**
  - Mostra % de processamento

- ✅ **Feedback de Sucesso**
  - Mensagem: "X registros importados com sucesso"
  - Exibe: Data do período
  - Cor: Verde

- ❌ **Feedback de Erro**
  - Mensagem: Descrição do erro

**Processamento Automático:**
- Lê linhas do CSV
- Extrai: código, quantidade
- Agrupa por código
- Associa com data especificada
- Acumula com histórico anterior
- Resultado: ~11.995 registros

**Dados Salvos:**
```
{
  productCode: "175071",
  quantity: 5,
  saleDate: "2026-03-28",
  aggregatedQuantity: 150 (se houver múltiplos registros)
}
```

**Acúmulo de Histórico:**
- Upload 1 (Jan): 1.000 registros
- Upload 2 (Fev): 1.200 registros
- Upload 3 (Mar): 1.100 registros
- **Total:** 3.300 registros (acumulado)

---

#### 1.3 Sub-aba: XML (Notas Fiscais)
**Propósito:** Importar vendas de notas fiscais eletrônicas

**Elementos:**
- 📁 **Botão "Selecionar Arquivo"**
  - Aceita: `.xml`
  - Tamanho máximo: 100 MB

- 📊 **Indicador de Progresso**

- ✅ **Feedback de Sucesso**
  - Mensagem: "Arquivo XML processado com sucesso"

**Processamento Automático:**
- Parse XML
- Extrai itens da nota
- Agrupa por código
- Registra data da nota
- Acumula com histórico

---

#### 1.4 Histórico de Uploads
**Localização:** Abaixo das abas

**Elementos:**
- 📋 **Tabela de Uploads Recentes**
  - Colunas: Data, Tipo, Arquivo, Status, Registros
  - Ordenação: Mais recente primeiro
  - Limite: Últimos 20 uploads

**Exemplo:**
| Data | Tipo | Arquivo | Status | Registros |
|------|------|---------|--------|-----------|
| 28/03 14:30 | COTAC | COTAC_20260328_182654.txt | ✅ Sucesso | 11.996 |
| 28/03 14:15 | PEDIDO | PedidoCompra.csv | ✅ Sucesso | 11.995 |
| 27/03 10:00 | XML | NF_123456.xml | ✅ Sucesso | 245 |

---

### ABA 2: PRODUTOS

#### 2.1 Barra de Busca
**Propósito:** Filtrar produtos por código ou nome

**Elementos:**
- 🔍 **Input de Busca**
  - Placeholder: "Buscar por código ou nome do produto..."
  - Busca em tempo real
  - Limpa com X

- 📊 **Resultados**
  - Mostra: "X produtos encontrados"

**Exemplo de Busca:**
- Buscar: "175071" → Encontra: "#TBT ESMALTE CREMOSO HITS 8ML"
- Buscar: "ESMALTE" → Encontra: 15 produtos

---

#### 2.2 Tabela de Produtos
**Propósito:** Visualizar sugestões de compra

**Colunas:**
1. **Código** - Código interno do produto
2. **Nome** - Nome completo do produto
3. **Preço** - Preço unitário (R$)
4. **1 dia** - Sugestão para 1 dia (unidades)
5. **2 dias** - Sugestão para 2 dias (unidades)
6. **3 dias** - Sugestão para 3 dias (unidades)
7. **4 dias** - Sugestão para 4 dias (unidades)
8. **5 dias** - Sugestão para 5 dias (unidades)
9. **Confiança** - Nível de confiança (%)

**Exemplo de Linha:**
```
175071 | #TBT ESMALTE CREMOSO HITS 8ML | R$ 4.98 | 2 | 4 | 6 | 8 | 10 | 45%
```

**Cores de Confiança:**
- 🟢 Verde: 70-95% (Alta confiança)
- 🟡 Amarelo: 50-69% (Média confiança)
- 🟠 Laranja: 30-49% (Baixa confiança)

---

#### 2.3 Botões de Ação (por linha)
- 🔄 **Botão "Recalcular"**
  - Recalcula sugestão para este produto
  - Ação: Chama algoritmo novamente
  - Feedback: Toast com resultado

- 📋 **Botão "Criar Pedido"**
  - Cria pedido baseado na sugestão
  - Abre modal com opções
  - Permite selecionar quantidade (1-5 dias)

- 📊 **Botão "Ver Detalhes"**
  - Abre modal com:
    - Histórico de vendas (gráfico)
    - Tendência
    - Sazonalidade
    - Intervalo de confiança

- ⭐ **Botão "Favoritar"**
  - Marca produto como favorito
  - Aparece em lista separada
  - Ícone: Estrela (vazia/preenchida)

---

#### 2.4 Filtros Avançados
- 🏷️ **Filtro por Confiança**
  - Opções: Todas, Alta (70+), Média (50-69), Baixa (-49)

- 📈 **Filtro por Tendência**
  - Opções: Todas, Crescente, Estável, Decrescente

- 🎯 **Filtro por Sazonalidade**
  - Opções: Todas, Forte, Moderada, Fraca

- 💰 **Filtro por Faixa de Preço**
  - Slider: R$ 0 - R$ 1.000

---

#### 2.5 Ações em Lote
- ☑️ **Checkbox "Selecionar Todos"**
  - Seleciona/deseleciona todos os produtos

- 📋 **Botão "Criar Pedidos em Lote"**
  - Cria múltiplos pedidos de uma vez
  - Abre modal com opções

- 📥 **Botão "Exportar Lista"**
  - Exporta em CSV/Excel
  - Inclui: Código, Nome, Preço, Sugestões

- 🖨️ **Botão "Imprimir"**
  - Abre visualização de impressão
  - Formato: Tabela otimizada

---

### ABA 3: PEDIDOS

#### 3.1 Criar Novo Pedido
**Elementos:**
- ➕ **Botão "Novo Pedido"**
  - Abre modal/formulário
  - Campos:
    - Produto (dropdown com busca)
    - Quantidade (input numérico)
    - Fornecedor (dropdown)
    - Data de Entrega Esperada (date picker)
    - Observações (textarea)

- 💾 **Botão "Salvar Pedido"**
  - Valida campos
  - Salva no banco
  - Feedback: Toast de sucesso

- ❌ **Botão "Cancelar"**
  - Fecha modal sem salvar

---

#### 3.2 Tabela de Pedidos
**Colunas:**
1. **ID** - Número do pedido
2. **Produto** - Nome do produto
3. **Quantidade** - Unidades pedidas
4. **Fornecedor** - Fornecedor
5. **Data Pedido** - Quando foi pedido
6. **Data Entrega** - Quando deve chegar
7. **Status** - Estado atual
8. **Ações** - Botões de ação

**Status Disponíveis:**
- 🟡 **Pendente** - Aguardando confirmação
- 📦 **Pedido** - Confirmado com fornecedor
- ✅ **Recebido** - Chegou na farmácia
- ⚠️ **Em Falta** - Fornecedor não tem
- ❌ **Não Conseguido** - Não foi possível comprar

---

#### 3.3 Botões de Ação (por pedido)
- ✏️ **Botão "Editar"**
  - Abre modal com dados do pedido
  - Permite alterar quantidade, data, observações
  - Salva alterações

- 🔄 **Botão "Mudar Status"**
  - Dropdown com opções de status
  - Atualiza imediatamente
  - Registra data/hora da mudança

- 📞 **Botão "Contatar Fornecedor"**
  - Copia email/telefone do fornecedor
  - Abre WhatsApp/Email

- 🗑️ **Botão "Deletar"**
  - Pede confirmação
  - Deleta pedido

- 📋 **Botão "Ver Detalhes"**
  - Abre modal com histórico completo

---

#### 3.4 Filtros de Pedidos
- 🔍 **Filtro por Status**
  - Checkboxes: Pendente, Pedido, Recebido, Em Falta, Não Conseguido

- 📅 **Filtro por Data**
  - Data início e fim

- 🏢 **Filtro por Fornecedor**
  - Dropdown com fornecedores

- 📊 **Filtro por Período**
  - Opções: Hoje, Semana, Mês, Tudo

---

#### 3.5 Estatísticas de Pedidos
- 📊 **Cards com Métricas**
  - Total de Pedidos
  - Pedidos Recebidos (%)
  - Pedidos Pendentes
  - Valor Total Gasto

---

### ABA 4: RELATÓRIO

#### 4.1 Gráficos de Análise
- 📈 **Gráfico de Vendas (Linha)**
  - Eixo X: Datas
  - Eixo Y: Quantidade vendida
  - Período: Últimos 90 dias
  - Interativo: Hover mostra valores

- 📊 **Gráfico de Tendência (Coluna)**
  - Produtos mais vendidos
  - Top 10 produtos
  - Cor: Gradiente

- 🥧 **Gráfico de Distribuição (Pizza)**
  - Vendas por categoria
  - Percentual de cada categoria

- 📉 **Gráfico de Previsão (Linha com Intervalo)**
  - Previsão para próximos 30 dias
  - Intervalo de confiança (área sombreada)

---

#### 4.2 Tabela de Resumo
**Colunas:**
1. **Período** - Mês/Semana
2. **Vendas** - Total de unidades
3. **Receita** - Total em R$
4. **Ticket Médio** - Média por venda
5. **Produtos** - Quantidade de produtos

---

#### 4.3 Filtros de Relatório
- 📅 **Seletor de Período**
  - Opções: Semana, Mês, Trimestre, Ano, Customizado

- 🏷️ **Filtro por Categoria**
  - Checkboxes com categorias

- 🏢 **Filtro por Fornecedor**
  - Dropdown

---

#### 4.4 Botões de Exportação
- 📥 **Botão "Exportar CSV"**
  - Baixa dados em CSV

- 📊 **Botão "Exportar Excel"**
  - Baixa dados em XLSX com formatação

- 📄 **Botão "Gerar PDF"**
  - Gera relatório em PDF
  - Inclui: Gráficos, tabelas, resumo

- 🖨️ **Botão "Imprimir"**
  - Abre visualização de impressão

- 📧 **Botão "Enviar por Email"**
  - Abre modal para enviar relatório
  - Destinatários: Input de email

---

## 🔧 MENU E CONFIGURAÇÕES

### Header (Topo da Página)
- 🏠 **Logo/Home** - Volta para dashboard
- 👤 **Perfil do Usuário** - Dropdown com:
  - Meu Perfil
  - Configurações
  - Logout
- 🔔 **Notificações** - Badge com número
- ⚙️ **Configurações** - Ícone de engrenagem

---

### Configurações
**Localização:** Menu dropdown ou página separada

#### 4.1 Perfil
- Nome
- Email
- Farmácia/Empresa
- Telefone
- Endereço

#### 4.2 Fornecedores
- ➕ **Botão "Adicionar Fornecedor"**
- 📋 **Tabela de Fornecedores**
  - Nome, Email, Telefone, Ações
- ✏️ **Editar Fornecedor**
- 🗑️ **Deletar Fornecedor**

#### 4.3 Categorias de Produtos
- ➕ **Botão "Adicionar Categoria"**
- 📋 **Tabela de Categorias**
- ✏️ **Editar Categoria**
- 🗑️ **Deletar Categoria**

#### 4.4 Preferências
- 🌙 **Tema** - Claro/Escuro
- 🌍 **Idioma** - Português/Inglês/Espanhol
- 📧 **Notificações** - Ativar/Desativar
- 🔔 **Alertas** - Configurar limites

#### 4.5 Integração
- 🔗 **API Key** - Para integração com outros sistemas
- 📱 **Webhook** - URLs para notificações
- 🔐 **Segurança** - Autenticação de dois fatores

---

## 📱 NOTIFICAÇÕES E ALERTAS

### 4.1 Alertas Automáticos
- 🔴 **Estoque Baixo** - Quando sugestão < 5 unidades
- 🟡 **Confiança Baixa** - Quando confiança < 50%
- ⚠️ **Padrão Alterado** - Quando há mudança significativa
- 📦 **Pedido Atrasado** - Quando pedido não chega na data
- 💰 **Orçamento Excedido** - Quando gasto > limite

### 4.2 Notificações
- Aparecem no ícone 🔔 (com badge)
- Podem ser marcadas como lidas
- Podem ser deletadas
- Histórico de 30 dias

---

## 🎯 FUNCIONALIDADES SECUNDÁRIAS

### 5.1 Busca Avançada
- 🔍 **Busca Global**
  - Busca em: Produtos, Pedidos, Fornecedores
  - Resultado: Lista com categorias

### 5.2 Favoritos
- ⭐ **Marcar Favoritos**
  - Produtos mais usados
  - Acesso rápido

### 5.3 Histórico
- 📜 **Histórico de Ações**
  - Quem fez o quê e quando
  - Auditoria completa

### 5.4 Atalhos
- ⌨️ **Atalhos de Teclado**
  - Ctrl+N: Novo pedido
  - Ctrl+S: Salvar
  - Ctrl+P: Imprimir

---

## 📊 RESUMO DE BOTÕES

| Botão | Localização | Ação | Ícone |
|-------|-------------|------|-------|
| Selecionar Arquivo | Upload COTAC | Abre diálogo | 📁 |
| Selecionar Arquivo | Upload Pedido | Abre diálogo | 📁 |
| Recalcular | Tabela Produtos | Recalcula sugestão | 🔄 |
| Criar Pedido | Tabela Produtos | Abre modal | 📋 |
| Ver Detalhes | Tabela Produtos | Abre modal | 📊 |
| Favoritar | Tabela Produtos | Marca favorito | ⭐ |
| Novo Pedido | Pedidos | Abre formulário | ➕ |
| Editar | Tabela Pedidos | Abre modal | ✏️ |
| Mudar Status | Tabela Pedidos | Dropdown | 🔄 |
| Contatar | Tabela Pedidos | Abre contato | 📞 |
| Deletar | Tabela Pedidos | Pede confirmação | 🗑️ |
| Exportar CSV | Relatório | Baixa arquivo | 📥 |
| Exportar Excel | Relatório | Baixa arquivo | 📊 |
| Gerar PDF | Relatório | Gera PDF | 📄 |
| Imprimir | Relatório | Abre impressão | 🖨️ |
| Enviar Email | Relatório | Abre modal | 📧 |

---

## 🚀 PROJEÇÃO DE ESCALABILIDADE

### FASE 1: MVP (Atual - Mês 1)
**Funcionalidades Implementadas:**
- ✅ Upload COTAC e PedidoCompra
- ✅ Tabela de produtos com sugestões
- ✅ Algoritmo de previsão básico
- ✅ Dashboard simples

**Capacidade:**
- Usuários: 1-10
- Produtos: Até 20.000
- Registros de vendas: Até 100.000
- Requisições/dia: Até 10.000

**Infraestrutura:**
- 1 servidor Node.js
- 1 banco de dados MySQL
- 1 GB RAM
- 10 GB storage

**Custo Mensal:** ~R$ 50-100

---

### FASE 2: Funcionalidades Completas (Mês 2-3)
**Novas Funcionalidades:**
- ✅ Sistema de Pedidos completo
- ✅ Gestão de Fornecedores
- ✅ Relatórios avançados
- ✅ Notificações e alertas
- ✅ Integração com APIs de fornecedores

**Capacidade:**
- Usuários: 10-100
- Produtos: Até 50.000
- Registros de vendas: Até 500.000
- Requisições/dia: Até 100.000

**Infraestrutura:**
- 2 servidores Node.js (load balancer)
- 1 banco de dados MySQL (replicado)
- 4 GB RAM
- 50 GB storage
- Cache Redis

**Custo Mensal:** ~R$ 200-400

---

### FASE 3: Escalabilidade Horizontal (Mês 4-6)
**Novas Funcionalidades:**
- ✅ Machine Learning avançado
- ✅ Previsão com Prophet
- ✅ Análise de sazonalidade
- ✅ Recomendações personalizadas
- ✅ Dashboard mobile

**Capacidade:**
- Usuários: 100-1.000
- Produtos: Até 200.000
- Registros de vendas: Até 5.000.000
- Requisições/dia: Até 1.000.000

**Infraestrutura:**
- 5+ servidores Node.js (Kubernetes)
- 2 bancos de dados MySQL (master-slave)
- 16 GB RAM
- 200 GB storage
- Cache Redis (cluster)
- CDN para assets estáticos

**Custo Mensal:** ~R$ 1.000-2.000

---

### FASE 4: Plataforma Empresarial (Mês 7-12)
**Novas Funcionalidades:**
- ✅ Multi-tenant (múltiplas farmácias)
- ✅ Integração com ERP
- ✅ API pública para parceiros
- ✅ Análise preditiva avançada
- ✅ Automação de pedidos
- ✅ Suporte a múltiplos idiomas

**Capacidade:**
- Usuários: 1.000-10.000
- Produtos: Até 1.000.000
- Registros de vendas: Até 50.000.000
- Requisições/dia: Até 10.000.000

**Infraestrutura:**
- 20+ servidores Node.js (Kubernetes)
- 5+ bancos de dados (sharding)
- 64 GB RAM
- 1 TB storage
- Cache Redis (cluster distribuído)
- CDN global
- Message queue (RabbitMQ/Kafka)

**Custo Mensal:** ~R$ 5.000-10.000

---

### FASE 5: Plataforma Global (Ano 2+)
**Novas Funcionalidades:**
- ✅ Suporte a múltiplos países
- ✅ Integração com fornecedores globais
- ✅ Análise de mercado
- ✅ Benchmarking com outras farmácias
- ✅ Marketplace de fornecedores
- ✅ Financiamento de pedidos

**Capacidade:**
- Usuários: 10.000+
- Produtos: Ilimitado
- Registros de vendas: Ilimitado
- Requisições/dia: 100.000.000+

**Infraestrutura:**
- 100+ servidores globais
- Múltiplos data centers
- 256+ GB RAM
- 10+ TB storage
- Arquitetura serverless
- Microserviços
- GraphQL API

**Custo Mensal:** ~R$ 50.000+

---

## 📈 MÉTRICAS DE ESCALABILIDADE

### Crescimento de Usuários
```
Mês 1:   10 usuários
Mês 3:   100 usuários
Mês 6:   1.000 usuários
Mês 12:  10.000 usuários
Ano 2:   100.000 usuários
```

### Crescimento de Dados
```
Mês 1:   100.000 registros
Mês 3:   500.000 registros
Mês 6:   5.000.000 registros
Mês 12:  50.000.000 registros
Ano 2:   500.000.000 registros
```

### Crescimento de Requisições
```
Mês 1:   10.000 req/dia
Mês 3:   100.000 req/dia
Mês 6:   1.000.000 req/dia
Mês 12:  10.000.000 req/dia
Ano 2:   100.000.000 req/dia
```

---

## 🔄 ESTRATÉGIA DE ESCALABILIDADE

### 1. Escalabilidade Vertical (Curto Prazo)
- Aumentar CPU/RAM do servidor
- Otimizar queries do banco
- Implementar caching

### 2. Escalabilidade Horizontal (Médio Prazo)
- Múltiplos servidores
- Load balancer
- Replicação de banco de dados
- Cache distribuído

### 3. Escalabilidade de Arquitetura (Longo Prazo)
- Microserviços
- Kubernetes
- Serverless
- Event-driven architecture
- CQRS (Command Query Responsibility Segregation)

### 4. Escalabilidade de Dados
- Sharding por farmácia
- Particionamento de tabelas
- Arquivamento de dados antigos
- Data warehouse para analytics

---

## 💡 OTIMIZAÇÕES FUTURAS

### Performance
- [ ] Implementar GraphQL
- [ ] Lazy loading de dados
- [ ] Compressão de respostas
- [ ] Service workers
- [ ] Progressive Web App (PWA)

### Segurança
- [ ] Autenticação de dois fatores
- [ ] Criptografia end-to-end
- [ ] Auditoria completa
- [ ] GDPR compliance
- [ ] Backup automático

### Funcionalidades
- [ ] Integração com ERP
- [ ] Automação de pedidos
- [ ] Análise de concorrência
- [ ] Recomendações de preço
- [ ] Gestão de fornecedores

### Analytics
- [ ] Dashboard de KPIs
- [ ] Alertas inteligentes
- [ ] Previsão de demanda
- [ ] Análise de sazonalidade
- [ ] Benchmarking

---

## 📊 ROADMAP

```
Q1 2026: MVP (Upload, Produtos, Sugestões)
Q2 2026: Funcionalidades Completas (Pedidos, Fornecedores, Relatórios)
Q3 2026: Escalabilidade (Multi-tenant, API, Mobile)
Q4 2026: Plataforma Empresarial (ERP, Automação, Marketplace)
Q1 2027: Expansão Global (Múltiplos países, Fornecedores globais)
```

---

## 🎯 CONCLUSÃO

O **PredictMed - Gestor de Pedidos Inteligente** é uma solução escalável que começa simples (MVP) e cresce para uma plataforma empresarial global. 

**Cada fase** adiciona funcionalidades e capacidade sem quebrar o que já existe, seguindo princípios de:
- ✅ Escalabilidade horizontal e vertical
- ✅ Arquitetura modular
- ✅ Separação de responsabilidades
- ✅ Caching e otimização
- ✅ Monitoramento e alertas

**Investimento inicial:** Baixo (R$ 50-100/mês)  
**Retorno esperado:** 30-40% em economia de estoque + 15-25% em aumento de vendas

---

**Versão:** 1.0.0  
**Data:** 28 de março de 2026  
**Status:** Pronto para Produção
