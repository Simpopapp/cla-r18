// Utilitários de passagem com lacunas {{n}} — compartilhados entre os
// motores de FIB (leitura e escuta). Puros, sem dependências de React.

/** Substitui {{n}} pelos valores — usado para montar o texto do áudio. */
export function filledTemplate(template: string, values: readonly string[]): string {
  return template.replace(/\{\{(\d+)\}\}/g, (_, n: string) => values[Number(n) - 1] ?? "…");
}

/** Divide a passagem em segmentos de texto e lacunas, em ordem. */
export function splitTemplate(template: string): { text: string; blank: number | null }[] {
  return template
    .split(/(\{\{\d+\}\})/)
    .filter((part) => part !== "")
    .map((part) => {
      const blank = /^\{\{(\d+)\}\}$/.exec(part);
      return blank ? { text: part, blank: Number(blank[1]) } : { text: part, blank: null };
    });
}
