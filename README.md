# PredictMed

> **Inteligência que Abastece. Dados que Vendem.**

PredictMed é uma plataforma SaaS de **Inteligência Preditiva para Farmácias**, que automatiza cotações de estoque, detecta rupturas de medicamentos e sugere pedidos ideais usando Inteligência Artificial (Google Gemini).

🌐 **Live:** [https://predictmed.web.app](https://predictmed.web.app)

---

## ✨ Funcionalidades

| Módulo | Descrição |
|---|---|
| **Painel Estratégico** | Dashboard de saúde do estoque em tempo real |
| **Cotação Preditiva** | Geração de cotações inteligentes via IA (Google Gemini) |
| **Scanner de Ruptura** | Registro de vendas perdidas por falta de produto |
| **Conferência Smart** | Verificação de pedidos vs. NFe do fornecedor |
| **Insights & Relatórios** | Curva A, Stockouts e métricas de desempenho |

---

## 🧠 Como funciona a IA

```
Arquivo de Demanda (CSV) → Algoritmo Matemático de Giro
                         → Inferência Semântica (Gemini)
                         → Sugestão de Compra Otimizada
                         → Exportação para CotefácilFarmácia
```

---

## 🛠 Stack Técnica

- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS v4
- **Backend:** Node.js + Express + tRPC
- **ORM:** Drizzle ORM
- **Banco de Dados:** PostgreSQL (Supabase)
- **IA:** Google Gemini Flash
- **Hosting:** Firebase Hosting
- **Auth:** Supabase Auth

---

## 🚀 Instalação Local

### Pré-requisitos
- Node.js 20+
- pnpm
- Conta Supabase

### Configuração

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/predictmed.git
cd predictmed

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais
```

### Variáveis de Ambiente (`.env`)

```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

### Executar em Desenvolvimento

```bash
pnpm run dev
```

### Build para Produção

```bash
pnpm run build
firebase deploy
```

---

## 📊 Descrição Breve

> PredictMed é uma plataforma de gestão preditiva para farmácias que usa IA para automatizar cotações de estoque, detectar rupturas e otimizar pedidos. Conecte seu ERP, importe seus dados e deixe a inteligência artificial trabalhar por você.

---

## 📄 Licença

MIT © 2026 PredictMed — Bruno

---

## 🗒 Arquitetura do Banco de Dados

Veja o arquivo [`SUPABASE_SCHEMA.sql`](./SUPABASE_SCHEMA.sql) para o schema completo.

Tabelas principais:
- `products` — Catálogo de produtos (COTAC)
- `quote_items` — Itens de cotação e sugestões de IA
- `rupture_scans` — Registro de rupturas scaneadas

---

*Desenvolvido com ❤️ para a saúde do seu estoque.*
