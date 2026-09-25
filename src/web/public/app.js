const state = { category: "", source: "", language: "", search: "", includeDismissed: false, feedPage: 1, starredPage: 1 };

const feedList = document.getElementById("feed-list");
const feedPager = document.getElementById("feed-pager");
const starredList = document.getElementById("starred-list");
const starredPager = document.getElementById("starred-pager");
const digestsList = document.getElementById("digests-list");
const statsEl = document.getElementById("stats");

function renderPager(container, { page, totalPages, total }, onPageChange) {
  container.innerHTML = "";
  if (total === 0) return;

  const prev = document.createElement("button");
  prev.textContent = "← Prev";
  prev.disabled = page <= 1;
  prev.addEventListener("click", () => onPageChange(page - 1));

  const label = document.createElement("span");
  label.textContent = `Page ${page} of ${totalPages} (${total} items)`;

  const next = document.createElement("button");
  next.textContent = "Next →";
  next.disabled = page >= totalPages;
  next.addEventListener("click", () => onPageChange(page + 1));

  container.append(prev, label, next);
}

function categoryEmoji(cat) {
  return { frontend: "⚛️", backend: "🖥️", devops: "🔧", "ai-ml": "🤖", "full-stack": "🌐" }[cat] || "📦";
}

function itemCard(item) {
  const scorePct = Math.round((item.relevanceScore || 0) * 100);
  const meta = [];
  if (item.stars) meta.push(`⭐ ${item.stars}`);
  if (item.weeklyDownloads) meta.push(`📥 ${item.weeklyDownloads}`);
  if (item.language) meta.push(`📝 ${item.language}`);

  const div = document.createElement("div");
  div.className = "item-card";
  div.innerHTML = `
    <div class="badges">
      <span class="badge">${categoryEmoji(item.category)} ${item.category}</span>
      <span class="badge source">${item.source}</span>
      <span class="badge score">${scorePct}% relevant</span>
    </div>
    <h3><a href="${item.url}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a></h3>
    <p>${escapeHtml(item.description || "")}</p>
    ${meta.length ? `<p>${meta.join(" &nbsp;|&nbsp; ")}</p>` : ""}
    <div class="actions">
      <button data-action="star" data-id="${item.id}" class="${item.starred ? "starred" : ""}">
        ${item.starred ? "⭐ Starred" : "☆ Star"}
      </button>
      <button data-action="dismiss" data-id="${item.id}">🗑️ Dismiss</button>
    </div>
  `;
  return div;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

async function loadFeed() {
  const params = new URLSearchParams();
  if (state.category) params.set("category", state.category);
  if (state.source) params.set("source", state.source);
  if (state.language) params.set("language", state.language);
  if (state.search) params.set("search", state.search);
  if (state.includeDismissed) params.set("includeDismissed", "true");
  params.set("page", state.feedPage);

  const res = await fetch(`/api/items?${params}`);
  const data = await res.json();

  if (data.items.length === 0 && data.page > 1) {
    state.feedPage = data.page - 1;
    return loadFeed();
  }

  feedList.innerHTML = "";
  if (data.items.length === 0) {
    feedList.innerHTML = `<div class="empty">No items match these filters yet. Run "npm run collect" to fetch more.</div>`;
    feedPager.innerHTML = "";
    return;
  }
  data.items.forEach((item) => feedList.appendChild(itemCard(item)));
  renderPager(feedPager, data, (page) => {
    state.feedPage = page;
    loadFeed();
  });
}

async function loadStarred() {
  const params = new URLSearchParams();
  params.set("page", state.starredPage);

  const res = await fetch(`/api/starred?${params}`);
  const data = await res.json();

  if (data.items.length === 0 && data.page > 1) {
    state.starredPage = data.page - 1;
    return loadStarred();
  }

  starredList.innerHTML = "";
  if (data.items.length === 0) {
    starredList.innerHTML = `<div class="empty">Nothing starred yet.</div>`;
    starredPager.innerHTML = "";
    return;
  }
  data.items.forEach((item) => starredList.appendChild(itemCard(item)));
  renderPager(starredPager, data, (page) => {
    state.starredPage = page;
    loadStarred();
  });
}

async function loadDigests() {
  const res = await fetch("/api/digests");
  const digests = await res.json();
  digestsList.innerHTML = "";
  if (digests.length === 0) {
    digestsList.innerHTML = `<div class="empty">No digests generated yet. Run "npm run digest:daily".</div>`;
    return;
  }
  digests.forEach((d) => {
    const filename = (d.filePath || "").split(/[\\/]/).pop();
    const htmlName = filename ? filename.replace(/\.md$/, ".html") : "";
    const row = document.createElement("div");
    row.className = "digest-row";
    row.innerHTML = `
      <span>📋 <b>${d.type}</b> digest &mdash; ${new Date(d.generatedAt).toLocaleString()}</span>
      <span>
        ${htmlName ? `<a href="/digests/${htmlName}" target="_blank">View HTML</a>` : ""}
        ${filename ? `<a href="/digests/${filename}" target="_blank">View Markdown</a>` : ""}
      </span>
    `;
    digestsList.appendChild(row);
  });
}

async function handleAction(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === "star") {
    const isStarred = btn.classList.contains("starred");
    await fetch(`/api/items/${encodeURIComponent(id)}/star`, { method: isStarred ? "DELETE" : "POST" });
  } else if (action === "dismiss") {
    await fetch(`/api/items/${encodeURIComponent(id)}/dismiss`, { method: "POST" });
  }

  refreshActiveTab();
}

function refreshActiveTab() {
  const active = document.querySelector(".tab.active").dataset.tab;
  if (active === "feed") loadFeed();
  if (active === "starred") loadStarred();
  if (active === "digests") loadDigests();
}

async function loadStats() {
  const res = await fetch("/api/stats");
  const s = await res.json();
  statsEl.innerHTML = `
    <span><b>${s.totalItems}</b> items</span>
    <span><b>${s.starredCount}</b> starred</span>
    <span><b>${s.digestCount}</b> digests</span>
  `;
}

async function loadLanguages() {
  const res = await fetch("/api/languages");
  const languages = await res.json();
  const select = document.getElementById("language");
  languages.forEach((lang) => {
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = lang;
    select.appendChild(opt);
  });
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add("active");
    refreshActiveTab();
  });
});

document.getElementById("search").addEventListener("input", (e) => {
  state.search = e.target.value;
  state.feedPage = 1;
  clearTimeout(window.__searchDebounce);
  window.__searchDebounce = setTimeout(loadFeed, 250);
});
document.getElementById("category").addEventListener("change", (e) => {
  state.category = e.target.value;
  state.feedPage = 1;
  loadFeed();
});
document.getElementById("source").addEventListener("change", (e) => {
  state.source = e.target.value;
  state.feedPage = 1;
  loadFeed();
});
document.getElementById("language").addEventListener("change", (e) => {
  state.language = e.target.value;
  state.feedPage = 1;
  loadFeed();
});
document.getElementById("includeDismissed").addEventListener("change", (e) => {
  state.includeDismissed = e.target.checked;
  state.feedPage = 1;
  loadFeed();
});

feedList.addEventListener("click", handleAction);
starredList.addEventListener("click", handleAction);

loadStats();
loadLanguages();
loadFeed();
