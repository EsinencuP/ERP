import { readFile, writeFile } from "node:fs/promises";

const source = await readFile(new URL("../INSTRUCTIONS.md", import.meta.url), "utf8");
const theme = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function inline(value) {
  return escape(value).replace(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
}
const lines = source.split(/\r?\n/), html = [], contents = [];
let list = null;
function closeList() { if (list) { html.push(`</${list}>`); list = null; } }
for (let index = 0; index < lines.length; index++) {
  const line = lines[index]?.trim() ?? "";
  if (!line) { closeList(); continue; }
  const heading = /^(#{1,3})\s+(.+)$/.exec(line);
  if (heading) {
    closeList(); const level = heading[1].length, title = heading[2], id = `section-${index}`;
    html.push(`<h${level} id="${id}">${inline(title)}</h${level}>`);
    if (level === 2) contents.push(`<a href="#${id}">${inline(title)}</a>`);
    continue;
  }
  if (line.startsWith("|")) {
    closeList(); const rows = [];
    while (index < lines.length && lines[index]?.trim().startsWith("|")) {
      const cells = lines[index].trim().slice(1, -1).split("|").map(cell => cell.trim());
      if (!cells.every(cell => /^:?-{3,}:?$/.test(cell))) rows.push(cells);
      index++;
    }
    index--; const [head, ...body] = rows;
    html.push(`<div class="table-scroll" tabindex="0" role="region" aria-label="Таблица"><table><thead><tr>${head.map(cell => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${body.map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    continue;
  }
  const bullet = /^(- |\d+\. )(.+)$/.exec(line);
  if (bullet) {
    const kind = bullet[1] === "- " ? "ul" : "ol";
    if (list !== kind) { closeList(); html.push(`<${kind}>`); list = kind; }
    html.push(`<li>${inline(bullet[2])}</li>`); continue;
  }
  closeList(); html.push(`<p>${inline(line)}</p>`);
}
closeList();
const light = /:root\s*\{([^}]+)\}/.exec(theme)?.[1] ?? "";
const dark = /\.dark\s*\{([^}]+)\}/.exec(theme)?.[1] ?? "";
const page = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Evo ERP — руководство пользователя</title><style>
@font-face{font-family:Geist;src:url('/fonts/Geist-Regular.ttf') format('truetype');font-display:swap}
:root{${light}}@media(prefers-color-scheme:dark){:root{${dark}}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:hsl(var(--color-background));color:hsl(var(--color-foreground));font:16px/1.75 Geist,system-ui,sans-serif}main,header{max-width:960px;margin:auto;padding:24px}header{display:flex;gap:16px;align-items:center;justify-content:space-between;border-bottom:1px solid hsl(var(--color-border))}a{color:hsl(var(--color-primary));text-underline-offset:3px}a:focus-visible,.table-scroll:focus-visible{outline:2px solid hsl(var(--color-primary));outline-offset:4px}h1{font-size:clamp(28px,5vw,42px);line-height:1.2}h2{margin-top:56px;font-size:26px;scroll-margin-top:24px}h3{margin-top:32px;font-size:20px}p,li{overflow-wrap:anywhere}nav{padding:20px;border:1px solid hsl(var(--color-border));border-radius:16px;background:hsl(var(--color-surface))}nav a{display:block;padding:5px 0}.table-scroll{max-width:100%;overflow-x:auto;margin:24px 0}table{border-collapse:collapse;min-width:520px;width:100%;font-size:14px}th,td{border:1px solid hsl(var(--color-border));padding:12px;text-align:left;vertical-align:top}th{background:hsl(var(--color-surface))}li+li{margin-top:8px}main{animation:enter 250ms ease-out}@keyframes enter{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}main{animation:none}}@media(max-width:600px){main,header{padding:20px}h2{font-size:23px}}
</style></head><body><header><strong>Evo ERP · Помощь</strong><a href="/">Открыть ERP</a></header><main><nav aria-label="Содержание"><strong>Содержание</strong>${contents.join("")}</nav>${html.join("\n")}</main></body></html>`;
await writeFile(new URL("../public/user-guide.html", import.meta.url), page);
console.info("User guide generated from INSTRUCTIONS.md");
