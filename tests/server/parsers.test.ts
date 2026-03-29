import { describe, it, expect } from "vitest";
import { parseCotacContent, parseSalesContent } from "../../server/lib/parsers";

describe("Server Parsers: parseCotacContent", () => {
  it("should parse multiple lines of COTAC items", () => {
    const content = `
;789123;C;101;DIPIRONA 500MG
;789456;C;102;SHAMPOO INFANTIL
;789789;C;103;** MENSAGEM SISTEMA
    `.trim();

    const result = parseCotacContent(content);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      code: "101",
      ean: "789123",
      name: "DIPIRONA 500MG",
      isperfumery: false
    });
    expect(result[1].isperfumery).toBe(true); // Shampoo should be perfumery
  });

  it("should handle duplicate codes and empty lines", () => {
    const content = " ;789;C;101;ITEM 1\n\n ;456;C;101;ITEM DUPLICADO";
    const result = parseCotacContent(content);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("ITEM 1");
  });
});

describe("Server Parsers: parseSalesContent", () => {
  it("should parse sales lines starting with '2'", () => {
    const content = `
2;789123;5;101;DIPIRONA 500MG;MEDLEY;15.50
2;789456;2;102;SHAMPOO;LOREAL;25.00
1;HEADER;SYSTEM;DATA
    `.trim();

    const result = parseSalesContent(content);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      code: "101",
      ean: "789123",
      name: "DIPIRONA 500MG",
      quantity: 5,
      manufacturer: "MEDLEY",
      price: 15.50
    });
  });

  it("should skip invalid quantities or missing codes", () => {
    const content = "2;789;0;101;ZERO QTY;LAB;10\n2;789;5;;NO CODE;LAB;10";
    const result = parseSalesContent(content);
    expect(result).toHaveLength(0);
  });
});
