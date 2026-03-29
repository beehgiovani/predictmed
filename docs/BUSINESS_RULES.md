# 📑 THE PREDICTMED PLAYBOOK - Regras de Negócio Oficiais e Futuro Arquitetural

> Este documento concentra estritamente todas as regras de negócio declaradas para a plataforma PredictMed criadas pelo fundador. Ele serve de 'fonte da verdade' para o algoritmo e arquitetura de dados. Nenhuma alteração de código ou nova funcionalidade que infrinja estas regras pode ser acatada por nenhuma I.A. ou desenvolvedor.

---

## 🏗️ MÓDULO 1: FLUXO DE DADOS CORE (A Base)

### 1.1 Ingestão Original de Catálogo (Onboarding)
- **Origem:** Arquivo gigante `.txt` ou `.csv` (Histórico Maior, ex: 1 ano de transações "COTAC" e "PedidoCompra").
- **Objetivo:** Traçar o esqueleto dos produtos no sistema e alimentar os pesos estáticos do algoritmo desde o dia zero.
- **Formato Estrutural do TXT (Layout Cotefácil):** 
  `[LineType];[Ean];[Quantidade];[CodigoInterno];[NomeProduto];[Fabricante];[Preco]`

### 1.2 Registro Contínuo de Vendas (O "Motor de Aprendizado")
- **Regra do Acúmulo:** O script de histórico cruza o `productCode`, aplica uma `saleDate` (Dada no momento do Upload Csv/Txt) e consolida a venda para ensinar a inteligência artificial.
- Quanto mais arquivos sobem, mais dados a IA possui para estipular *Giro*, *Faltas* e *Sazonalidade*.

---

## 🛒 MÓDULO 2: ROTINA DIÁRIA COTEFÁCIL (The Daily Workflow)

### 2.1 A Cotação Inicial (Upload)
- Diariamente/Semanalmente, o sistema recebe um `.txt` gerado pelo ERP que representa a Cotação Base.
- Esse arquivo possui as seguintes regras de sintaxe (compatível e exigida pela plataforma Cotefácil):
  - **Identificador de Cabeçalho:** A primeira linha inicia com `1;`, onde normalmente contém: `1;[CNPJ];[Versao]` (Ex: `1;39455875000113;3.0`).
  - **Identificador de Itens:** As linhas a seguir iniciam com `2;` (Line Type 2 para Produto).
- O sistema converte esse lote em uma **Sessão de Cotação Diária**.

### 2.2 Motor Preditivo de Sugestões (O Cérebro)
Para os Itens de Linha `2;`, o Motor recalcula a quantidade a ser pedida operando na seguinte lógica:
- A IA prevê o estoque necessário para *N dias de cobertura* (Data de Início e Data Fim estipuladas pelo usuário antes do upload).
- Categoriza ativamente o item em **Tags de Business Intelligence**, como:
  - **[Alto Giro]:** Produtos de venda muito veloz que exigem margem de segurança maior.
  - **[Descontinuados]:** Produtos que pararam de vir nos arquivos fontes/catálogo e devem ser banidos das previsões.
  - **[Sazonal/Época]:** Analisando datas de vendas passadas, ativa produtos apenas em certas janelas de meses.

### 2.3 Carrinho de Conferência Humana (Interface Agradável)
- **Regra de Ouro:** O sistema *nunca* cospe imediatamente um `.txt` de volta de forma cega após a IA rodar. 
- O fluxo exige a abertura de um **Ambiente Agradável de Carrinho/Revisão** em tela item a item.
- Nesta tela, o responsável avalia: a quantidade sugerida pela IA, podendo **aumentar ou diminuir** manualmente a "Quantidade Confirmada" caso discorde do robô.
- Uma das colunas obrigatórias mostra o *Preço Pago Atual vs Preço da Última Vez*, avaliando se deve ou não ter o "valor base aumentado ou diminuído" (análise de inflação e prejuízo iminente).

### 2.4 A Exportação Definitiva ("The Send-off")
- Com a revisão finalizada na UI, um único botão exporta o documento final consolidado.
- O formato deve manter **RIGOROSAMENTE** as especificações rigorosas do Cotefácil para subir redondo:
  - Encabeçado `1;...`
  - Itens alterando apenas na casa da Quantidade (A Confirmada na Tela):
    `2;[EAN];[QTDE_CONFIRMADA];[CODIGO];[NOME];[Vazio/Fabricante];[PRECO]`

---

## 📦 MÓDULO 3: GESTÃO DE FECHAMENTO E XML (Baixa e Auditoria)

### 3.1 A Chegada da Remessa
- Quando a remessa do Fornecedor chegar fisicamente (ou a NF eletrônica for emitida na nuvem), o usuário fará o **Upload do XML da Nota Fiscal** no PredictMed.
- **Entrada Manual:** O sistema também *deverá* prover uma tela para dar entrada manual dos itens que chegaram (conferência pacote a pacote caso o XML falhe ou falte).

### 3.2 Machine Learning de Faltas (Identificando o Fornecedor Ruim)
- Com a baixa real efetuada, o módulo faz um *JOIN* com o banco `quote_items` daquela Cotação exportada.
- **Regra Crítica (Falta de Laboratório):** Se a `Quantidade Confirmada (Pedida)` foi `15`, e na entrada manual/XML constou `0`, o módulo deve **marcar o produto com a tag 'Falta de Laboratório/Falta no Fornecedor'**, pontuando o histórico negativo do produto.

---

## 🌐 MÓDULO 4: FEATURES EM ROADMAP (Ideas Backlog)

> Funcionalidades incríveis sugeridas pelo Founder e catalogadas para desenvolvimentos futuros:

1. **API de Finalidade Pública:** Integrar a plataforma de inteligência a um Banco de Dados de Medicamentos Externo (Ex: Consulta Remédios / MS). Objetivo: Ler o EAN do arquivo e buscar online a `"finalidade do produto"`, enriquecendo a tomada de decisão no Carrinho. 
2. **Histórico de Preço Dinâmico Chart:** No ambiente de Carrinho, ao clicar em um produto, estourar um pequeno gráfico mostrando a variação de custo nos últimos uploads para rastrear se aquele laboratório está inflacionando muito na época.
3. **Análise de Lucratividade / Prejuízo:** Cruzar o Preço Base com Preço Público para alarmar se a farmácia pagará mais caro do que pode vender (evitar prejuízos).
