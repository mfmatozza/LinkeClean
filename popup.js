const SECTIONS = [
  {
    title: "Clutter",
    filters: [
      { key: "ads", label: "Ads" },
      { key: "promoted", label: "Promoted posts" },
      { key: "suggested", label: "Suggested posts" },
      { key: "followRecommendations", label: "Follow suggestions & upsells" },
    ],
  },
  {
    title: "Social noise",
    filters: [
      { key: "anniversaries", label: "Work anniversaries" },
      { key: "celebrations", label: "Celebrations & new jobs" },
      { key: "reactions", label: "Liked / commented by others" },
    ],
  },
  {
    title: "Content types",
    filters: [
      { key: "polls", label: "Polls" },
      { key: "newsletters", label: "Newsletters" },
      { key: "events", label: "Events" },
      { key: "groupPosts", label: "Group posts" },
    ],
  },
];

const DEFAULT_FILTERS = {
  anniversaries: true,
  celebrations: true,
  ads: true,
  suggested: true,
  polls: true,
  promoted: true,
  followRecommendations: true,
  reactions: true,
  groupPosts: false,
  newsletters: true,
  events: true,
};

const container = document.getElementById("filters");

chrome.storage.sync.get("filters", (data) => {
  const filters = { ...DEFAULT_FILTERS, ...(data.filters || {}) };

  SECTIONS.forEach((section) => {
    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = section.title;
    container.appendChild(title);

    const card = document.createElement("div");
    card.className = "card";

    section.filters.forEach(({ key, label }) => {
      const row = document.createElement("label");
      row.className = "filter-row";
      row.innerHTML = `
        <span class="filter-label">${label}</span>
        <div class="toggle">
          <input type="checkbox" data-key="${key}" ${filters[key] ? "checked" : ""} />
          <span class="slider"></span>
        </div>
      `;
      card.appendChild(row);
    });

    container.appendChild(card);
  });

  container.addEventListener("change", () => {
    const updated = {};
    container.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      updated[cb.dataset.key] = cb.checked;
    });
    chrome.storage.sync.set({ filters: updated });
  });
});
