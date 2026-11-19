 const STATUS_MAP = {
  completed: { label: "Готов", className: "badge-completed" },
  processing: { label: "В работе", className: "badge-processing" },
  failed: { label: "Ошибка", className: "badge-failed" }
};

let allReports = [];
let currentFilter = "all";

async function init() {
  try {
    const res = await fetch("./data.json");
    const data = await res.json();
    allReports = data.items || [];
    renderCards();
  } catch (e) {
    document.getElementById("reportsList").textContent = "Ошибка загрузки данных.";
  }
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(iso));
}

function renderMd(box, text) {
  let table = null;
  text.split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    if (!line) { table = null; return; }
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.slice(1, -1).split("|").map(c => c.trim());
      if (cells.every(c => /^:?-+:?$/.test(c))) return;
      if (!table) {
        const wrap = box.appendChild(document.createElement("div"));
        wrap.className = "table-wrapper";
        table = wrap.appendChild(document.createElement("table"));
      }
      const tr = table.appendChild(document.createElement("tr"));
      cells.forEach(c => {
        const cell = tr.appendChild(document.createElement(table.rows.length === 1 ? "th" : "td"));
        cell.textContent = c.replace(/\*\*/g, "");
      });
      return;
    }
    table = null;
    const tag = line.startsWith("### ") ? "h3" : line.startsWith("## ") ? "h2" : line.startsWith("> ") ? "blockquote" : (line.startsWith("- ") || /^\d+\.\s/.test(line)) ? "li" : "p";
    const el = box.appendChild(document.createElement(tag));
    const clean = line.replace(/^(### |## |> |- |\d+\.\s)/, "");
    clean.split(/(\*\*[^*]+\*\*|[^]+)/g).forEach(part => {
      if (part.startsWith("**") && part.endsWith("**")) {
        el.appendChild(document.createElement("strong")).textContent = part.slice(2, -2);
      } else if (part.startsWith("") && part.endsWith("`")) {
        el.appendChild(document.createElement("code")).textContent = part.slice(1, -1);
      } else {
        el.appendChild(document.createTextNode(part.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")));
      }
    });
  });
}

function renderCards() {
  const list = document.getElementById("reportsList");
  list.textContent = "";
  const items = currentFilter === "all" ? allReports : allReports.filter(i => i.status === currentFilter);
  if (!items.length) {
    const empty = list.appendChild(document.createElement("div"));
    empty.className = "empty-state";
    empty.textContent = "Отчётов с выбранным статусом нет";
    return;
  }
  items.forEach(item => {
    const st = STATUS_MAP[item.status] || { label: item.status, className: "" };
    const card = list.appendChild(document.createElement("article"));
    card.className = "card";
    const head = card.appendChild(document.createElement("div"));
    head.className = "card-header";
    const meta = head.appendChild(document.createElement("div"));
    meta.className = "card-meta";
    meta.appendChild(document.createElement("span")).textContent = "#" + item.id;
    meta.firstChild.className = "report-id";
    meta.appendChild(document.createElement("span")).textContent = formatDate(item.created_at);
    const lang = meta.appendChild(document.createElement("span"));
    lang.className = "lang-tag";
    lang.textContent = item.language;
    const badge = head.appendChild(document.createElement("span"));
    badge.className = "badge " + st.className;
    badge.textContent = st.label;
    const p = card.appendChild(document.createElement("p"));
    p.className = "card-prompt";
    p.textContent = item.prompt_text;
    card.onclick = () => openModal(item);
  });
}
[19.11.2026 21:49] Oskolkov Alex: document.getElementById("filters").onclick = e => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentFilter = btn.dataset.status;
  renderCards();
};

const backdrop = document.getElementById("modalBackdrop");
function openModal(item) {
  const st = STATUS_MAP[item.status] || { label: item.status, className: "" };
  const meta = document.getElementById("modalMeta");
  meta.textContent = "";
  const idEl = meta.appendChild(document.createElement("span"));
  idEl.className = "report-id";
  idEl.textContent = "Отчёт #" + item.id;
  meta.appendChild(document.createElement("span")).textContent = formatDate(item.created_at);
  const badge = meta.appendChild(document.createElement("span"));
  badge.className = "badge " + st.className;
  badge.textContent = st.label;

  const body = document.getElementById("modalBody");
  body.textContent = "";
  const pBox = body.appendChild(document.createElement("div"));
  pBox.className = "prompt-box";
  const pLbl = pBox.appendChild(document.createElement("div"));
  pLbl.className = "prompt-box-label";
  pLbl.textContent = "Запрос";
  pBox.appendChild(document.createElement("div")).textContent = item.prompt_text;

  const content = body.appendChild(document.createElement("div"));
  if (item.status === "completed" && item.result_markdown) {
    content.className = "markdown-body";
    renderMd(content, item.result_markdown);
  } else {
    content.className = "status-placeholder";
    content.textContent = item.status === "processing"
      ? "Отчёт ещё формируется. Пожалуйста, проверьте позже."
      : "Не удалось сформировать отчёт из-за ошибки генерации.";
  }
  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  backdrop.classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("closeModalBtn").onclick = closeModal;
backdrop.onclick = e => { if (e.target === backdrop) closeModal(); };
document.onkeydown = e => { if (e.key === "Escape") closeModal(); };

init();
