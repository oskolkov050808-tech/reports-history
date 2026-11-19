 const STATUS_MAP = {
  completed: { label: "Готов", className: "badge-completed" },
  processing: { label: "В работе", className: "badge-processing" },
  failed: { label: "Ошибка", className: "badge-failed" }
};

let allReports = [];
let currentFilter = "all";

async function init() {
  try {
    const response = await fetch("./data.json");
    const data = await response.json();
    allReports = data.items || [];
    renderCards();
  } catch (error) {
    document.getElementById("reportsList").innerHTML =
      '<div class="empty-state">Ошибка загрузки данных.</div>';
    console.error(error);
  }
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoString));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(text) {
  let s = escapeHtml(text);
  s = s.replace(/([^]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  return s;
}

function renderSafeMarkdown(mdText) {
  const lines = mdText.split(/\r?\n/);
  let html = "";
  let inUl = false;
  let inOl = false;
  let inTable = false;

  function closeLists() {
    if (inUl) { html += "</ul>"; inUl = false; }
    if (inOl) { html += "</ol>"; inOl = false; }
  }

  function closeTable() {
    if (inTable) {
      html += "</tbody></table></div>";
      inTable = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      closeLists();
      closeTable();
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      closeLists();
      const cells = line.slice(1, -1).split("|").map(c => c.trim());
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        continue;
      }
      if (!inTable) {
        html += '<div class="table-wrapper"><table><thead><tr>';
        cells.forEach(c => { html += "<th>" + formatInline(c) + "</th>"; });
        html += "</tr></thead><tbody>";
        inTable = true;
      } else {
        html += "<tr>";
        cells.forEach(c => { html += "<td>" + formatInline(c) + "</td>"; });
        html += "</tr>";
      }
      continue;
    } else {
      closeTable();
    }

    if (line.startsWith("### ")) {
      closeLists();
      html += "<h3>" + formatInline(line.slice(4)) + "</h3>";
    } else if (line.startsWith("## ")) {
      closeLists();
      html += "<h2>" + formatInline(line.slice(3)) + "</h2>";
    } else if (line.startsWith("# ")) {
      closeLists();
      html += "<h1>" + formatInline(line.slice(2)) + "</h1>";
    } else if (line.startsWith("&gt; ") || line.startsWith("> ")) {
      closeLists();
      const quoteText = line.startsWith("&gt; ") ? line.slice(5) : line.slice(2);
      html += "<blockquote>" + formatInline(quoteText) + "</blockquote>";
    } else if (line.startsWith("- ")) {
      if (inOl) { html += "</ol>"; inOl = false; }
      if (!inUl) { html += "<ul>"; inUl = true; }
      html += "<li>" + formatInline(line.slice(2)) + "</li>";
    } else if (/^\d+\.\s/.test(line)) {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (!inOl) { html += "<ol>"; inOl = true; }
      html += "<li>" + formatInline(line.replace(/^\d+\.\s/, "")) + "</li>";
    } else {
      closeLists();
      html += "<p>" + formatInline(line) + "</p>";
    }
  }

  closeLists();
  closeTable();
  return html;
}

function renderCards() {
  const listEl = document.getElementById("reportsList");
  const filtered = currentFilter === "all"
    ? allReports
    : allReports.filter(item => item.status === currentFilter);

  listEl.innerHTML = "";
[19.11.2026 21:41] Oskolkov Alex: if (filtered.length === 0) {
    listEl.innerHTML = '<div class="empty-state">Отчётов с выбранным статусом нет</div>';
    return;
  }

  filtered.forEach(item => {
    const statusInfo = STATUS_MAP[item.status] || { label: item.status, className: "" };
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML =
      '<div class="card-header">' +
        '<div class="card-meta">' +
          '<span class="report-id">#' + escapeHtml(item.id) + '</span>' +
          '<span>' + escapeHtml(formatDate(item.created_at)) + '</span>' +
          '<span class="lang-tag">' + escapeHtml(item.language) + '</span>' +
        '</div>' +
        '<span class="badge ' + statusInfo.className + '">' + escapeHtml(statusInfo.label) + '</span>' +
      '</div>' +
      '<p class="card-prompt"></p>';

    card.querySelector(".card-prompt").textContent = item.prompt_text;
    card.addEventListener("click", () => openModal(item));

    listEl.appendChild(card);
  });
}

document.getElementById("filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;

  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentFilter = btn.dataset.status;
  renderCards();
});

const modalBackdrop = document.getElementById("modalBackdrop");
const modalMeta = document.getElementById("modalMeta");
const modalBody = document.getElementById("modalBody");

function openModal(item) {
  const statusInfo = STATUS_MAP[item.status] || { label: item.status, className: "" };

  modalMeta.innerHTML =
    '<span class="report-id">Отчёт #' + escapeHtml(item.id) + '</span>' +
    '<span>' + escapeHtml(formatDate(item.created_at)) + '</span>' +
    '<span class="badge ' + statusInfo.className + '">' + escapeHtml(statusInfo.label) + '</span>';

  modalBody.innerHTML = "";

  const promptBox = document.createElement("div");
  promptBox.className = "prompt-box";
  promptBox.innerHTML = '<div class="prompt-box-label">Запрос</div><div class="prompt-box-text"></div>';
  promptBox.querySelector(".prompt-box-text").textContent = item.prompt_text;
  modalBody.appendChild(promptBox);

  const contentContainer = document.createElement("div");
  if (item.status === "completed" && item.result_markdown) {
    contentContainer.className = "markdown-body";
    contentContainer.innerHTML = renderSafeMarkdown(item.result_markdown);
  } else if (item.status === "processing") {
    contentContainer.className = "status-placeholder";
    contentContainer.textContent = "Отчёт ещё формируется. Пожалуйста, проверьте позже.";
  } else {
    contentContainer.className = "status-placeholder";
    contentContainer.textContent = "Не удалось сформировать отчёт из-за ошибки генерации.";
  }

  modalBody.appendChild(contentContainer);
  modalBackdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalBackdrop.classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("closeModalBtn").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

init();
