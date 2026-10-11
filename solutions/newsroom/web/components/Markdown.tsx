// Minimal, safe-ish markdown renderer for edition bodies and articles. Handles
// the subset the wire editor emits: #/##/### headings, blockquotes, **bold**,
// *italic*, [links](url), and paragraphs. Input is escaped before formatting.

function escapeHtml(s: string): string {
  // Escape all HTML-significant chars INCLUDING quotes, so that even the
  // attribute context of generated <a href="..."> links cannot be broken out
  // of by attacker-controlled text (desk content derives from web results).
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

export function renderMarkdown(md: string): string {
  const out: string[] = [];
  const lines = md.split("\n");
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (line.startsWith("### ")) {
      flush();
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      flush();
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      flush();
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith("> ")) {
      flush();
      out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    } else {
      para.push(line);
    }
  }
  flush();
  return out.join("\n");
}

export default function Markdown({ source }: { source: string }) {
  return (
    <div
      className="prose-news"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
