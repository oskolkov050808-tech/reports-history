 const STATUS_MAP = {
  completed: { label: "Готов", className: "badge-completed" },
  processing: { label: "В работе", className: "badge-processing" },
  failed: { label: "Ошибка", className: "badge-failed" }
};

let allReports = [];
let currentFilter = "all";

marked.setOptions({ gfm: true, breaks: true });

async function init() {
  try {
    const response = await fetch("./data.json");
    const data = await response.json();
    allReports = data.items || [];
    renderCards();
  } catch (error) {
    document.getElementById("reportsList").innerHTML =
      <div class="empty-state">Ошибка загрузки данных.</div>;
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

function renderSafeMarkdown(mdText) {
  const rawHtml = marked.parse(mdText);
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "p", "br", "strong", "em",
      "ul", "ol", "li", "blockquote", "code", "pre",
      "table", "thead", "tbody", "tr", "th", "td", "a"
    ],
    ALLOWED_ATTR: ["href", "target", "rel"]
  });

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = cleanHtml;
  tempDiv.querySelectorAll("table").forEach(table => {
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrapper";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  return tempDiv.innerHTML;
}

function renderCards() {
  const listEl = document.getElementById("reportsList");
  const filtered = currentFilter === "all"
    ? allReports
    : allReports.filter(item => item.status === currentFilter);

  listEl.innerHTML = "";

  if (filtered.length === 0) {
    listEl.innerHTML = <div class="empty-state">Отчётов с выбранным статусом нет</div>;
    return;
  }

  filtered.forEach(item => {
    const statusInfo = STATUS_MAP[item.status] || { label: item.status, className: "" };
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = 
      <div class="card-header">
        <div class="card-meta">
          <span class="report-id">#${item.id}</span>
          <span>${formatDate(item.created_at)}</span>
          <span class="lang-tag">${item.language}</span>
        </div>
        <span class="badge ${statusInfo.className}">${statusInfo.label}</span>
      </div>
      <p class="card-prompt"></p>
    ;
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
    <span class="report-id">Отчёт #${item.id}</span>
    <span>${formatDate(item.created_at)}</span>
    <span class="badge ${statusInfo.className}">${statusInfo.label}</span>
  ;

  modalBody.innerHTML = "";

  const promptBox = document.createElement("div");
  promptBox.className = "prompt-box";
  promptBox.innerHTML = <div class="prompt-box-label">Запрос</div><div class="prompt-box-text"></div>;
  promptBox.querySelector(".prompt-box-text").textContent = item.prompt_text;
  modalBody.appendChild(promptBox);
[19.11.2026 21:29] Oskolkov Alex: const contentContainer = document.createElement("div");
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
