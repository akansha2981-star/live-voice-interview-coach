import type React from "react";
import { safeUrl } from "@/lib/prep";

/**
 * Safe light-markdown renderer. Produces React elements only (never raw HTML), so admin content is sanitized by construction.
 * Supports: ## / ### headings, - bullets, 1. numbered lists, > callouts, | tables |, ![alt](url) images,
 * **bold**, *italic*, ==highlight==, [links](url).
 */
function inline(text: string, key = 0): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|==[^=]+==|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0]; const k = `${key}-${i++}`;
    if (t.startsWith("**")) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("==")) out.push(<mark key={k} className="rounded bg-accent/25 px-1 text-foreground">{t.slice(2, -2)}</mark>);
    else if (t.startsWith("[")) { const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t); const href = safeUrl(lm?.[2]); out.push(href ? <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">{lm?.[1]}</a> : lm?.[1]); }
    else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function GkRichText({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0; let n = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    const k = n++;
    if (line.startsWith("### ")) { blocks.push(<h4 key={k} className="mt-2 text-base font-bold">{inline(line.slice(4), k)}</h4>); i++; continue; }
    if (line.startsWith("## ")) { blocks.push(<h3 key={k} className="mt-3 text-lg font-bold text-primary">{inline(line.slice(3), k)}</h3>); i++; continue; }
    const img = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line);
    if (img) { const src = safeUrl(img[2]); if (src) blocks.push(<img key={k} src={src} alt={img[1]} loading="lazy" className="my-2 max-h-96 w-full rounded-lg border object-cover" />); i++; continue; }
    if (line.startsWith(">")) { const buf: string[] = []; while (i < lines.length && lines[i].trim().startsWith(">")) buf.push(lines[i++].trim().replace(/^>\s?/, "")); blocks.push(<div key={k} className="rounded-lg border-l-4 border-accent bg-accent/10 p-4 text-sm leading-relaxed">{buf.map((b, j) => <p key={j}>{inline(b, k * 100 + j)}</p>)}</div>); continue; }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { const cells = lines[i++].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()); if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells); }
      const [head, ...body] = rows;
      blocks.push(<div key={k} className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-secondary"><tr>{head.map((c, j) => <th key={j} className="px-3 py-2 text-left font-semibold">{inline(c, j)}</th>)}</tr></thead><tbody className="divide-y">{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{inline(c, j)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^[-*] /.test(line)) { const buf: string[] = []; while (i < lines.length && /^[-*] /.test(lines[i].trim())) buf.push(lines[i++].trim().slice(2)); blocks.push(<ul key={k} className="grid list-disc gap-1.5 pl-5">{buf.map((b, j) => <li key={j}>{inline(b, k * 100 + j)}</li>)}</ul>); continue; }
    if (/^\d+[.)] /.test(line)) { const buf: string[] = []; while (i < lines.length && /^\d+[.)] /.test(lines[i].trim())) buf.push(lines[i++].trim().replace(/^\d+[.)] /, "")); blocks.push(<ol key={k} className="grid list-decimal gap-1.5 pl-5">{buf.map((b, j) => <li key={j}>{inline(b, k * 100 + j)}</li>)}</ol>); continue; }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3} |[-*] |\d+[.)] |>|\||!\[)/.test(lines[i].trim())) buf.push(lines[i++].trim());
    blocks.push(<p key={k}>{inline(buf.join(" "), k)}</p>);
  }
  return <div className={`grid gap-3 leading-relaxed ${className}`}>{blocks}</div>;
}
