/**
 * Parsers para arquivos de dados da farmácia (COTAC, Vendas, etc)
 */

export interface CotacRow {
  code: string;
  ean: string | null;
  name: string;
  isperfumery: boolean;
}

export interface SalesRow {
  code: string;
  ean: string | null;
  name: string;
  quantity: number;
  manufacturer: string | null;
  price: number | null;
}

/**
 * Filtra e processa as linhas do arquivo COTAC
 */
export function parseCotacContent(content: string): CotacRow[] {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const rows: CotacRow[] = [];
  const seenCodes = new Set<string>();

  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length >= 5) {
      const ean = fields[1]?.trim();
      const code = fields[3]?.trim();
      const name = fields[4]?.trim();

      if (!code || !name || seenCodes.has(code)) continue;
      if (name.includes('**')) continue; // Pula itens de serviço ou mensagens do sistema
      
      seenCodes.add(code);
      const isperfumery = name.toLowerCase().includes('perfume') || name.toLowerCase().includes('shampoo');

      rows.push({
        code,
        ean: ean || null,
        name,
        isperfumery
      });
    }
  }
  return rows;
}

/**
 * Filtra e processa as linhas do arquivo de Vendas do COTAC
 * Formato esperado: Linhas começando com '2'
 */
export function parseSalesContent(content: string): SalesRow[] {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const rows: SalesRow[] = [];

  for (const line of lines) {
    const fields = line.split(';');
    // O formato do COTAC usa '2' no primeiro campo para registros de itens vendidos
    if (fields.length >= 7 && fields[0] === '2') {
      const ean = fields[1]?.trim();
      const quantity = parseInt(fields[2]?.trim() || '0');
      const code = fields[3]?.trim();
      const name = fields[4]?.trim();
      const lab = fields[5]?.trim();
      const price = parseFloat(fields[6]?.trim() || '0');

      if (!code || isNaN(quantity) || quantity === 0) continue;
      if (name?.startsWith('**')) continue;

      rows.push({
        code,
        ean: ean || null,
        name,
        quantity,
        manufacturer: lab || null,
        price: price || null,
      });
    }
  }
  return rows;
}
