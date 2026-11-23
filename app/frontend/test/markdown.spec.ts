import { Fragment, createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GuidanceCitation } from "@tiby/ts-shared";
import MarkdownContent from "@/components/ui/markdown-content";
import { splitAnswerCitations } from "@/lib/guidance";
import { safeMarkdownHref } from "@/lib/markdown";

function render(
  content: string,
  options?: {
    variant?: "compact" | "article";
    renderText?: (text: string) => ReactNode;
  },
): string {
  return renderToStaticMarkup(
    createElement(MarkdownContent, {
      content,
      variant: options?.variant ?? "compact",
      renderText: options?.renderText,
    }),
  );
}

describe("safeMarkdownHref", () => {
  it("allows safe web, mailto, hash, and relative paths", () => {
    expect(safeMarkdownHref("https://tiby.web.id/pasien")).toBe(
      "https://tiby.web.id/pasien",
    );
    expect(safeMarkdownHref("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
    expect(safeMarkdownHref("mailto:admin@tiby.health")).toBe(
      "mailto:admin@tiby.health",
    );
    expect(safeMarkdownHref("#panduan")).toBe("#panduan");
    expect(safeMarkdownHref("/pasien/profile")).toBe("/pasien/profile");
  });

  it("blocks dangerous schemes, protocol-relative URLs, and blanks", () => {
    expect(safeMarkdownHref("javascript:alert(1)")).toBeNull();
    expect(safeMarkdownHref("JAVASCRIPT:alert(1)")).toBeNull();
    expect(safeMarkdownHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeMarkdownHref("vbscript:msgbox(1)")).toBeNull();
    expect(safeMarkdownHref("//evil.example/x")).toBeNull();
    expect(safeMarkdownHref("")).toBeNull();
    expect(safeMarkdownHref("   ")).toBeNull();
    expect(safeMarkdownHref(undefined)).toBeNull();
  });
});

describe("MarkdownContent", () => {
  it("renders bold labels, inline emphasis, and strikethrough", () => {
    const html = render(
      "**Untuk Admin:** kelola *faskes*, ***penting***, dan ~~lama~~.",
    );
    expect(html).toContain("<strong");
    expect(html).toContain("Untuk Admin:");
    expect(html).toContain("<em");
    expect(html).toContain("faskes");
    expect(html).toContain("<del");
    expect(html).toContain("lama");
  });

  it("renders headings from h1 to h4", () => {
    const html = render("# Judul\n\n## Subjudul\n\n### Bagian\n\n#### Rincian", {
      variant: "article",
    });
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("<h3");
    expect(html).toContain("<h4");
  });

  it("renders unordered, ordered, nested, and GFM task lists", () => {
    const html = render(
      "- Poin pertama\n  - Subpoin\n- Poin kedua\n\n1. Langkah satu\n2. Langkah dua\n\n- [x] Selesai\n- [ ] Belum",
    );
    expect(html).toContain("<ul");
    expect(html).toContain("<ol");
    expect(html).toContain("<li");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
  });

  it("preserves single-newline line breaks via remark-breaks", () => {
    const html = render("Baris pertama\nBaris kedua");
    expect(html).toContain("<br/>");
  });

  it("renders blockquotes and horizontal rules", () => {
    const html = render("> Catatan penting\n\n---");
    expect(html).toContain("<blockquote");
    expect(html).toContain("Catatan penting");
    expect(html).toContain("<hr");
  });

  it("renders inline code and fenced code blocks without parsing markdown inside code", () => {
    const html = render("Regimen `FDC-4`.\n\n```\n**literal**\n```");
    expect(html).toContain("<code");
    expect(html).toContain("FDC-4");
    expect(html).toContain("<pre");
    expect(html).toContain("**literal**");
    expect(html).not.toContain("<strong>literal</strong>");
  });

  it("renders GFM tables", () => {
    const html = render("| Peran | Menu |\n| --- | --- |\n| Admin | Akun |");
    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
    expect(html).toContain("Admin");
  });

  it("sanitizes unsafe links and escapes raw HTML", () => {
    const html = render(
      '[Aman](https://kemkes.go.id) [Bahaya](javascript:alert(1)) <script>alert(1)</script><img src="x" onerror="alert(1)"/>',
    );
    expect(html).toContain('href="https://kemkes.go.id"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
  });

  it("transforms citation markers in prose and bold text without touching code", () => {
    const citations: GuidanceCitation[] = [
      {
        citation_id: "src-1",
        document_id: "doc-1",
        organization: "Kemenkes",
        title: "Juknis",
        year: 2025,
        page: 12,
        section: null,
        source_url: "https://kemkes.go.id",
      },
    ];
    const renderText = (text: string) =>
      createElement(
        Fragment,
        null,
        ...splitAnswerCitations(text, citations).map((seg, i) =>
          seg.kind === "text"
            ? createElement(Fragment, { key: i }, seg.text)
            : createElement(
                "button",
                { key: i, type: "button", "data-citation": seg.id },
                String(seg.number ?? "?"),
              ),
        ),
      );

    const html = render(
      "- **Mual ringan [src-1]**: keluhan umum.\n- Kode `src-1` tetap teks.",
      { renderText },
    );
    expect(html).toContain("<strong");
    expect(html).toContain('data-citation="src-1"');
    expect(html).toContain(">src-1</code>");
    expect((html.match(/data-citation="src-1"/g) ?? []).length).toBe(1);
  });
});
