(function () {
  "use strict";

  const config = window.SITE_CONFIG || {};

  const fallbackResults = {
    miss: [
      { name: "Lea M.", school: "Lycee Victor Schoelcher", votes: 1284 },
      { name: "Camille R.", school: "Lycee Bellevue", votes: 1142 },
      { name: "Ines D.", school: "Lycee Schoelcher", votes: 1033 },
      { name: "Nina T.", school: "Lycee Acajou 2", votes: 968 },
      { name: "Sarah P.", school: "Lycee Frantz Fanon", votes: 902 }
    ],
    mister: [
      { name: "Noah L.", school: "Lycee Bellevue", votes: 1221 },
      { name: "Ethan B.", school: "Lycee Victor Schoelcher", votes: 1105 },
      { name: "Mathis C.", school: "Lycee Acajou 2", votes: 981 },
      { name: "Yanis F.", school: "Lycee Schoelcher", votes: 917 },
      { name: "Adam N.", school: "Lycee Frantz Fanon", votes: 893 }
    ]
  };

  const refs = {
    podiumMiss: document.getElementById("podium-miss"),
    podiumMister: document.getElementById("podium-mister"),
    tableMiss: document.getElementById("table-miss-body"),
    tableMister: document.getElementById("table-mister-body"),
    updatedAt: document.getElementById("results-updated-at"),
    sourceLabel: document.getElementById("results-source"),
    totalVotes: document.getElementById("results-total-votes")
  };

  function sanitizeText(value, fallback) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  function sanitizeVotes(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function getInitials(name) {
    return sanitizeText(name, "??")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function normalizeCandidate(item, index) {
    return {
      name: sanitizeText(item.name || item.candidate || item.nom, `Candidat ${index + 1}`),
      school: sanitizeText(item.school || item.lycee || item.establishment, "Lycee non renseigne"),
      votes: sanitizeVotes(item.votes || item.voteCount || item.total || item.score)
    };
  }

  function sortByVotesDesc(list) {
    return [...list].sort((a, b) => b.votes - a.votes);
  }

  function normalizePayload(payload) {
    if (!payload || typeof payload !== "object") return null;

    let missRaw = [];
    let misterRaw = [];

    if (Array.isArray(payload.miss) || Array.isArray(payload.mister)) {
      missRaw = Array.isArray(payload.miss) ? payload.miss : [];
      misterRaw = Array.isArray(payload.mister) ? payload.mister : [];
    } else if (Array.isArray(payload.candidates)) {
      payload.candidates.forEach((candidate) => {
        const category = sanitizeText(candidate.category || candidate.type || "", "").toLowerCase();
        if (category.includes("miss")) missRaw.push(candidate);
        if (category.includes("mister")) misterRaw.push(candidate);
      });
    } else if (Array.isArray(payload)) {
      payload.forEach((candidate) => {
        const category = sanitizeText(candidate.category || candidate.type || "", "").toLowerCase();
        if (category.includes("miss")) missRaw.push(candidate);
        if (category.includes("mister")) misterRaw.push(candidate);
      });
    }

    const miss = sortByVotesDesc(missRaw.map(normalizeCandidate));
    const mister = sortByVotesDesc(misterRaw.map(normalizeCandidate));

    return { miss, mister };
  }

  function createAvatarMarkup(person) {
    const initials = getInitials(person.name);
    return `<div class="avatar">${initials}</div>`;
  }

  function renderPodium(container, list, title) {
    if (!container) return;

    const top = list.slice(0, 3);
    if (!top.length) {
      container.innerHTML = `<p class="empty-note">Aucun resultat disponible pour ${title}.</p>`;
      return;
    }

    container.innerHTML = top
      .map((person, index) => {
        const rank = index + 1;
        return `
          <article class="podium-card podium-card--rank-${rank}">
            <p class="podium-rank">Top ${rank}</p>
            <div class="podium-person">
              ${createAvatarMarkup(person)}
              <div>
                <p class="podium-name">${person.name}</p>
                <p class="podium-school">${person.school}</p>
              </div>
            </div>
            <p class="podium-votes">${person.votes.toLocaleString("fr-FR")} votes</p>
          </article>
        `;
      })
      .join("");
  }

  function renderTable(tbody, list, title) {
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="4">Aucun resultat ${title} disponible.</td></tr>`;
      return;
    }

    tbody.innerHTML = list
      .map((person, index) => {
        return `
          <tr>
            <td>#${index + 1}</td>
            <td>
              <div class="candidate-cell">
                ${createAvatarMarkup(person)}
                <span>${person.name}</span>
              </div>
            </td>
            <td>${person.school}</td>
            <td>${person.votes.toLocaleString("fr-FR")}</td>
          </tr>
        `;
      })
      .join("");
  }

  function updateSummary(data, sourceLabel) {
    const total = [...data.miss, ...data.mister].reduce((sum, candidate) => sum + candidate.votes, 0);

    if (refs.totalVotes) refs.totalVotes.textContent = `${total.toLocaleString("fr-FR")} votes comptabilises`;
    if (refs.updatedAt) refs.updatedAt.textContent = new Date().toLocaleString("fr-FR");
    if (refs.sourceLabel) refs.sourceLabel.textContent = sourceLabel;
  }

  function renderAll(data, sourceLabel) {
    renderPodium(refs.podiumMiss, data.miss, "Miss");
    renderPodium(refs.podiumMister, data.mister, "Mister");
    renderTable(refs.tableMiss, data.miss, "Miss");
    renderTable(refs.tableMister, data.mister, "Mister");
    updateSummary(data, sourceLabel);
  }

  async function fetchFromEndpoints() {
    const endpoints = (config.results && Array.isArray(config.results.endpoints) ? config.results.endpoints : []).filter(Boolean);

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
        if (!response.ok) continue;
        const payload = await response.json();
        const normalized = normalizePayload(payload);
        if (normalized && (normalized.miss.length || normalized.mister.length)) {
          return { data: normalized, sourceLabel: `Source: ${endpoint}` };
        }
      } catch (_err) {
        // Ignore endpoint errors and keep trying the next source.
      }
    }

    return null;
  }

  // Permet d'injecter un bloc externe de votes sans modifier cette page.
  window.renderInterlyceeResults = function renderInterlyceeResults(payload) {
    const normalized = normalizePayload(payload);
    if (!normalized) return;
    renderAll(normalized, "Source: bloc externe");
  };

  async function init() {
    const injectedPayload =
      window.INTERLYCEE_RESULTS_PAYLOAD || window.RESULTS_PAYLOAD || window.__RESULTS_PAYLOAD__ || null;

    if (injectedPayload) {
      const normalized = normalizePayload(injectedPayload);
      if (normalized) {
        renderAll(normalized, "Source: payload injecte");
        return;
      }
    }

    const remote = await fetchFromEndpoints();
    if (remote) {
      renderAll(remote.data, remote.sourceLabel);
      return;
    }

    renderAll(fallbackResults, "Source: jeu de donnees local (fallback)");
  }

  init();
})();
