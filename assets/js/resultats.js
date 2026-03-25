(function () {
  "use strict";

  const config = window.SITE_CONFIG || {};

  const fallbackResults = {
    women: [
      { name: "Murielle A.", structure: "Ligue de handball de Guyane", votes: 1284 },
      { name: "Sandra R.", structure: "Association sportive de Kourou", votes: 1142 },
      { name: "Ines D.", structure: "Comite regional d'athletisme", votes: 1033 },
      { name: "Nadia T.", structure: "Club nautique de Cayenne", votes: 968 },
      { name: "Sarah P.", structure: "US Sinnamary", votes: 902 }
    ],
    men: [
      { name: "Noel L.", structure: "COSMA", votes: 1221 },
      { name: "Etienne B.", structure: "Club omnisports de Remire", votes: 1105 },
      { name: "Mathieu C.", structure: "Ligue de judo de Guyane", votes: 981 },
      { name: "Yanis F.", structure: "Association sportive de Mana", votes: 917 },
      { name: "Adam N.", structure: "USL Montjoly", votes: 893 }
    ]
  };

  const refs = {
    podiumWomen: document.getElementById("podium-women"),
    podiumMen: document.getElementById("podium-men"),
    tableWomen: document.getElementById("table-women-body"),
    tableMen: document.getElementById("table-men-body"),
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

  function sanitizePhoto(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    return trimmed || "";
  }

  function getInitials(name) {
    return sanitizeText(name, "??")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function normalizeProfile(item, index) {
    return {
      name: sanitizeText(item.name || item.person || item.candidate || item.nom, `Profil ${index + 1}`),
      structure: sanitizeText(item.structure || item.school || item.lycee || item.establishment, "Structure non renseignee"),
      votes: sanitizeVotes(item.votes || item.voteCount || item.total || item.score),
      photo: sanitizePhoto(item.photo || item.image || item.avatar || item.picture || item.photoUrl || item.imageUrl)
    };
  }

  function sortByVotesDesc(list) {
    return [...list].sort((a, b) => b.votes - a.votes);
  }

  function normalizePayload(payload) {
    if (!payload || typeof payload !== "object") return null;

    let womenRaw = [];
    let menRaw = [];

    if (Array.isArray(payload.women) || Array.isArray(payload.men)) {
      womenRaw = Array.isArray(payload.women) ? payload.women : [];
      menRaw = Array.isArray(payload.men) ? payload.men : [];
    } else if (Array.isArray(payload.femmes) || Array.isArray(payload.hommes)) {
      womenRaw = Array.isArray(payload.femmes) ? payload.femmes : [];
      menRaw = Array.isArray(payload.hommes) ? payload.hommes : [];
    } else if (Array.isArray(payload.candidates) || Array.isArray(payload.profiles)) {
      const list = Array.isArray(payload.candidates) ? payload.candidates : payload.profiles;
      list.forEach((profile) => {
        const category = sanitizeText(profile.category || profile.type || profile.genre || "", "").toLowerCase();
        if (category.includes("fem") || category.includes("women")) womenRaw.push(profile);
        if (category.includes("hom") || category.includes("men")) menRaw.push(profile);
      });
    } else if (Array.isArray(payload)) {
      payload.forEach((profile) => {
        const category = sanitizeText(profile.category || profile.type || profile.genre || "", "").toLowerCase();
        if (category.includes("fem") || category.includes("women")) womenRaw.push(profile);
        if (category.includes("hom") || category.includes("men")) menRaw.push(profile);
      });
    }

    const women = sortByVotesDesc(womenRaw.map(normalizeProfile));
    const men = sortByVotesDesc(menRaw.map(normalizeProfile));

    return { women, men };
  }

  function createAvatarMarkup(person) {
    const initials = getInitials(person.name);
    if (person.photo) {
      return `<div class="avatar"><img src="${person.photo}" alt="Photo de ${person.name}" loading="lazy" /></div>`;
    }
    return `<div class="avatar">${initials}</div>`;
  }

  function renderPodium(container, list, title) {
    if (!container) return;

    const top = list.slice(0, 3);
    if (!top.length) {
      container.innerHTML = `<p class="empty-note">Aucun résultat disponible pour ${title}.</p>`;
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
                <p class="podium-school">${person.structure}</p>
              </div>
            </div>
            <p class="podium-votes">${person.votes.toLocaleString("fr-FR")} voix</p>
          </article>
        `;
      })
      .join("");
  }

  function renderTable(tbody, list, title) {
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="4">Aucun résultat ${title} disponible.</td></tr>`;
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
            <td>${person.structure}</td>
            <td>${person.votes.toLocaleString("fr-FR")}</td>
          </tr>
        `;
      })
      .join("");
  }

  function updateSummary(data, sourceLabel) {
    const total = [...data.women, ...data.men].reduce((sum, profile) => sum + profile.votes, 0);

    if (refs.totalVotes) refs.totalVotes.textContent = `${total.toLocaleString("fr-FR")} voix comptabilisees`;
    if (refs.updatedAt) refs.updatedAt.textContent = new Date().toLocaleString("fr-FR");
    if (refs.sourceLabel) refs.sourceLabel.textContent = sourceLabel;
  }

  function renderAll(data, sourceLabel) {
    renderPodium(refs.podiumWomen, data.women, "la selection feminine");
    renderPodium(refs.podiumMen, data.men, "la selection masculine");
    renderTable(refs.tableWomen, data.women, "feminin");
    renderTable(refs.tableMen, data.men, "masculin");
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
        if (normalized && (normalized.women.length || normalized.men.length)) {
          return { data: normalized, sourceLabel: `Source: ${endpoint}` };
        }
      } catch (_err) {
        // Ignore endpoint errors and keep trying the next source.
      }
    }

    return null;
  }

  // Permet d'injecter un bloc externe de resultats sans modifier cette page.
  window.renderGalaResults = function renderGalaResults(payload) {
    const normalized = normalizePayload(payload);
    if (!normalized) return;
    renderAll(normalized, "Source : bloc externe");
  };

  async function init() {
    const injectedPayload =
      window.GALA_RESULTS_PAYLOAD ||
      window.RESULTS_PAYLOAD ||
      window.__RESULTS_PAYLOAD__ ||
      null;

    if (injectedPayload) {
      const normalized = normalizePayload(injectedPayload);
      if (normalized) {
        renderAll(normalized, "Source : payload injecté");
        return;
      }
    }

    const remote = await fetchFromEndpoints();
    if (remote) {
      renderAll(remote.data, remote.sourceLabel);
      return;
    }

    renderAll(fallbackResults, "Source : jeu de données local (fallback)");
  }

  init();
})();
