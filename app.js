 const ST = { completed: ["Готов", "badge-completed"], processing: ["В работе", "badge-processing"], failed: ["Ошибка", "badge-failed"] };
let items = [], filter = "all";

async function init() {
  try {
    const r = await fetch("./data.json");
    items = (await r.json()).items || [];
    render();
  } catch (e) {
    document.getElementById("reportsList").textContent = "Ошибка загрузки данных.";
  }
}

const fmt = d => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };

function renderMd(box, text) {
  const B = String.fromCharCode(42, 42), C = String.fromCharCode(96);
  let tbl = null;
  text.split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    if (!line) { tbl = null; return; }
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.slice(1, -1).split("|").map(s => s.trim());
      if (cells.every(s => /^:?-+:?$/.test(s))) return;
      if (!tbl) tbl = box.appendChild(el("div", "table-wrapper")).appendChild(el("table"));
      const tr = tbl.appendChild(el("tr"));
      cells.forEach(s => tr.appendChild(el(tbl.rows.length === 1 ? "th" : "td", "", s.split(B).join(""))));
      return;
    }
    tbl = null;
    const tag = line.startsWith("### ") ? "h3" : line.startsWith("## ") ? "h2" : line.startsWith("> ") ? "blockquote" : (line.startsWith("- ") || /^\d+\.\s/.test(line)) ? "li" : "p";
    const node = box.appendChild(el(tag));
    const clean = line.replace(/^(### |## |> |- |\d+\.\s)/, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    clean.split(B).forEach((chunk, i) => {
      if (i % 2 === 1) { node.appendChild(el("strong", "", chunk)); return; }
      chunk.split(C).forEach((sub, j) => node.appendChild(j % 2 === 1 ? el("code", "", sub) : document.createTextNode(sub)));
    });
  });
}

function render() {
  const list = document.getElementById("reportsList");
  list.textContent = "";
  const arr = filter === "all" ? items : items.filter(i => i.status === filter);
  if (!arr.length) { list.appendChild(el("div", "empty-state", "Отчётов нет")); return; }
  arr.forEach(item => {
    const [lbl, cls] = ST[item.status] || [item.status, ""];
    const card = list.appendChild(el("article", "card"));
    const head = card.appendChild(el("div", "card-header"));
    const meta = head.appendChild(el("div", "card-meta"));
    meta.append(el("span", "report-id", "#" + item.id), el("span", "", fmt(item.created_at)), el("span", "lang-tag", item.language));
    head.appendChild(el("span", "badge " + cls, lbl));
    card.appendChild(el("p", "card-prompt", item.prompt_text));
    card.onclick = () => openModal(item);
  });
}

document.getElementById("filters").onclick = e => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  filter = btn.dataset.status;
  render();
};

const modal = document.getElementById("modalBackdrop");
function openModal(item) {
  const [lbl, cls] = ST[item.status] || [item.status, ""];
  const meta = document.getElementById("modalMeta");
  meta.textContent = "";
  meta.append(el("span", "report-id", "Отчёт #" + item.id), el("span", "", fmt(item.created_at)), el("span", "badge " + cls, lbl));
  const body = document.getElementById("modalBody");
  body.textContent = "";
  const pBox = body.appendChild(el("div", "prompt-box"));
  pBox.append(el("div", "prompt-box-label", "Запрос"), el("div", "", item.prompt_text));
  const content = body.appendChild(el("div"));
  if (item.status === "completed" && item.result_markdown) {
[19.11.2026 21:54] Oskolkov Alex: content.className = "markdown-body";
    renderMd(content, item.result_markdown);
  } else {
    content.className = "status-placeholder";
    content.textContent = item.status === "processing" ? "Отчёт ещё формируется." : "Ошибка генерации отчёта.";
  }
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

const close = () => { modal.classList.remove("open"); document.body.style.overflow = ""; };
document.getElementById("closeModalBtn").onclick = close;
modal.onclick = e => { if (e.target === modal) close(); };
document.onkeydown = e => { if (e.key === "Escape") close(); };
init();
