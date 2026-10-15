const ENTIDADES_HTML: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(valor: string): string {
  return valor.replace(/[&<>"']/g, (caracter) => ENTIDADES_HTML[caracter]);
}
