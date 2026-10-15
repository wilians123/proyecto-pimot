import { escapeHtml } from "@/utils/escapeHtml";

describe("escapeHtml", () => {
  it("escapa todos los metacaracteres HTML", () => {
    expect(escapeHtml(`& < > \" '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("vuelve inerte una etiqueta con manejador de evento", () => {
    expect(escapeHtml('<img onerror="alert(1)">')).toBe(
      "&lt;img onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});
