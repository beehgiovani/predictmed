# 🏥 PredictMed - Inteligência Preditiva para Farmácias

> **Inteligência que Abastece. Dados que Vendem.**

PredictMed é uma plataforma SaaS completa de **Gestão Inteligente e Automação de Cotações para Farmácias**, que eleva o nível do controle de estoque, detecta rupturas de medicamentos e sugere compras ideais da maneira mais inteligente do mercado. Com o uso de métodos estatísticos aplicados e de IA (Google Gemini Pro), a aplicação transforma seu histórico de vendas em decisões de compras precisas e autônomas.

🌐 **Live:** [https://predictmed.web.app](https://predictmed.web.app)

---

## ✨ Finalidades e Funcionalidades

### 1. **Cotação Preditiva de Alta Precisão**
- Importação rápida de Catálogo InovaFarma (COTAC) e Histórico de Vendas/Compras (CSV).
- Análise das tendências de demandas através da Média Móvel Exponencial (EMA), limpeza de outliers (IQR) e Regressão Linear para tendências.
- Geração de sugestões dinâmicas de compra de 1 até 5 dias de estoque.

### 2. **Previsão Aprimorada com IA (Gemini)**
- Processamento e enriquecimento do catálogo via inferência semântica e OCR inteligente utilizando o **Google Gemini Flash / Pro**.
- Indicadores de confiança da predição: o algoritmo quantifica a margem de segurança e o intervalo de confiança entre 30% a 95% dependendo exclusivamente da solidez de seus dados de venda.

### 3. **Sistema de Blacklist (Bloqueio de Itens indesejados)**
- **Inteligência focada:** O mais completo bloqueio inteligente para itens ou fabricantes inteiros! O "Sistema Blacklist" oculta produtos que já saíram de linha, são muito peculiares ou indesejados, e impede a IA ou os sugeridores matemáticos de os empurrar desnecessariamente, enxugando seu capital.

### 4. **Registro de Rupturas (Vendas Perdidas)**
- Não perca dinheiro quando um paciente for embora. Registre as "Rupturas" diretamente pelo aplicativo, para nutrir o próprio banco e aumentar a preferência de sugestão para compra de forma inteligente, ajustando suas cotações reais para os déficits dos meses.

### 5. **Cloud-Native & Sincronização em Tempo Real**
- Banco centralizado e seguro. Seu projeto rodando com funções escaláveis no **Supabase Edge Functions**.
- Extração de imagens e rotinas integradas baseadas na nuvem. Atualizações e integrações constantes com Firebase, permitindo zero atrasos na ponta do navegador!

---

## 🚀 Como Usar (Básico)

1. **Catálogo & Base:** Faça o UPLOAD do seu catálogo de produtos (`COTAC.txt`). O PredictMed lê e classifica todos os milhares de itens em segundos.
2. **Histórico Vivo:** Suba a planilha do seu histórico de vendas. É aqui que o motor começa a desenhar sua curva de lucro. E cada histórico sobrepõe no anterior para ampliar a acurácia.
3. **Gerência Real:** Filtre pela sua Blacklist o que não te serve, veja exatamente quanto pedir baseados nos graus de demanda por dias no "Dashboard Principal".

---

## 🛠 Stack Técnica

- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS 4 + shadcn/ui.
- **Backend (API):** Node.js em Edge Functions e via roteadores modulares (Express + tRPC).
- **Banco de Dados:** PostgreSQL hospedado e provisionado no Supabase c/ rotinas automatizadas via banco; migrações baseadas no Drizzle ORM.
- **IA/Cloud:** Google Gemini, Firebase Hosting.

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 22.x+
- Gerenciador `pnpm`
- Chaves do Supabase e do Firebase (`.env`)

```bash
# Clone o repositório
git clone https://github.com/SeuUsername/predictmed.git
cd predictmed

# Instale tudo e siga com o servidor Vite e a API
pnpm install
cp .env.example .env
pnpm run dev
```

---

## 📄 Licença
Mit © 2026 PredictMed - Sistema Inteligente para Indústria Farmaceutica do Varejo.
