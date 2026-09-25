// Change this value to 0, 1, 2, 3 or 4 depending on the current site phase.
// 0 keeps the full site visible.
// 1 candidature / 2 vote / 3 billetterie / 4 après-événement (archive + photos).
var PHASE = 4;
var PHASE_LINK_VERSION = "20260925-01";

(function () {
  "use strict";

  const ROUTES = {
    home: "index.html",
    candidatures: "candidatures.html",
    candidats: "candidats.html",
    votes: "votes.html",
    resultats: "resultats.html",
    photos: "photos.html",
    billetterie: "billetterie.html",
    cashless: "cashless.html",
    contact: "contact.html"
  };

  const LEGACY_ROUTES = {
    "candidature.html": ROUTES.candidatures,
    "votez.html": ROUTES.votes
  };

  // allowed : pages atteignables pendant la phase.
  // closed  : pages encore atteignables (anciens liens, favoris) mais retirées
  //           de la navigation et affichées dans leur état « fermé ».
  const PHASE_RULES = {
    0: {
      home: null,
      allowed: new Set([
        ROUTES.candidatures,
        ROUTES.candidats,
        ROUTES.votes,
        ROUTES.resultats,
        ROUTES.photos,
        ROUTES.billetterie,
        ROUTES.cashless,
        ROUTES.contact
      ]),
      closed: new Set()
    },
    1: {
      home: null,
      allowed: new Set([ROUTES.candidatures, ROUTES.billetterie, ROUTES.contact]),
      closed: new Set()
    },
    2: {
      home: null,
      allowed: new Set([ROUTES.candidats, ROUTES.votes, ROUTES.billetterie, ROUTES.contact]),
      closed: new Set()
    },
    3: {
      home: null,
      allowed: new Set([ROUTES.candidats, ROUTES.resultats, ROUTES.billetterie, ROUTES.cashless, ROUTES.contact]),
      closed: new Set()
    },
    4: {
      home: null,
      allowed: new Set([
        ROUTES.candidats,
        ROUTES.resultats,
        ROUTES.photos,
        ROUTES.cashless,
        ROUTES.contact,
        ROUTES.billetterie
      ]),
      closed: new Set([ROUTES.billetterie])
    }
  };

  const MANAGED_PAGES = new Set([
    ROUTES.candidatures,
    ROUTES.candidats,
    ROUTES.votes,
    ROUTES.resultats,
    ROUTES.photos,
    ROUTES.billetterie,
    ROUTES.cashless,
    ROUTES.contact
  ]);

  const currentPhase = PHASE_RULES[window.PHASE] ? window.PHASE : 1;
  const phaseSettings = PHASE_RULES[currentPhase];

  window.PHASE = currentPhase;
  window.PHASE_ROUTER = {
    currentPhase,
    routes: ROUTES
  };

  function getPageNameFromPath(pathname) {
    const pageName = pathname.split("/").pop();
    return (pageName || ROUTES.home).toLowerCase();
  }

  function getCurrentPageName() {
    return getPageNameFromPath(window.location.pathname);
  }

  function getCanonicalPageName(pageName) {
    return LEGACY_ROUTES[pageName] || pageName;
  }

  function isManagedPage(pageName) {
    return MANAGED_PAGES.has(getCanonicalPageName(pageName));
  }

  function isAllowedPage(pageName) {
    return phaseSettings.allowed.has(getCanonicalPageName(pageName));
  }

  function isClosedPage(pageName) {
    return phaseSettings.closed.has(getCanonicalPageName(pageName));
  }

  // Un lien n'est affiché que si la page est ouverte : une page « closed »
  // reste accessible en direct mais disparaît des menus.
  function isLinkedPage(pageName) {
    return isAllowedPage(pageName) && !isClosedPage(pageName);
  }

  function redirectTo(pageName) {
    window.location.replace(pageName);
  }

  function setVisibility(element, visible) {
    element.hidden = !visible;

    if (visible) {
      element.removeAttribute("aria-hidden");
      element.style.removeProperty("display");
      return;
    }

    element.setAttribute("aria-hidden", "true");
    element.style.setProperty("display", "none", "important");
  }

  function hasPhaseContentRule(element) {
    return element.hasAttribute("data-phase-only") || element.hasAttribute("data-phase-not");
  }

  function matchesPhaseList(value) {
    return String(value || "")
      .split(/\s+/)
      .filter(Boolean)
      .includes(String(currentPhase));
  }

  // Contenu conditionnel dans une page : data-phase-only="4" / data-phase-not="4".
  function applyPhaseContent() {
    document.querySelectorAll("[data-phase-only]").forEach((element) => {
      setVisibility(element, matchesPhaseList(element.getAttribute("data-phase-only")));
    });

    document.querySelectorAll("[data-phase-not]").forEach((element) => {
      setVisibility(element, !matchesPhaseList(element.getAttribute("data-phase-not")));
    });
  }

  function normalizeLink(link) {
    const rawHref = link.getAttribute("href");
    if (!rawHref || rawHref.startsWith("#")) return null;
    if (/^(mailto:|tel:|javascript:)/i.test(rawHref)) return null;

    let url;
    try {
      url = new URL(rawHref, window.location.href);
    } catch (_error) {
      return null;
    }

    if (url.origin !== window.location.origin) return null;

    const currentPageName = getPageNameFromPath(url.pathname);
    const canonicalPageName = getCanonicalPageName(currentPageName);

    if (MANAGED_PAGES.has(canonicalPageName)) {
      url.searchParams.set("site_phase", `${currentPhase}-${PHASE_LINK_VERSION}`);
      const suffix = `${url.search}${url.hash}`;
      link.setAttribute("href", `${canonicalPageName}${suffix}`);
    } else if (currentPageName !== canonicalPageName) {
      const suffix = `${url.search}${url.hash}`;
      link.setAttribute("href", `${canonicalPageName}${suffix}`);
    }

    return canonicalPageName;
  }

  function updateManagedLinks() {
    document.querySelectorAll("a[href]").forEach((link) => {
      const canonicalPageName = normalizeLink(link);
      if (!canonicalPageName || !MANAGED_PAGES.has(canonicalPageName)) return;

      if (!isLinkedPage(canonicalPageName)) {
        setVisibility(link, false);
        return;
      }

      // Un data-phase-only/not déjà appliqué reste prioritaire.
      if (!hasPhaseContentRule(link)) {
        setVisibility(link, true);
      }
    });
  }

  (function handleCurrentRoute() {
    const currentPageName = getCurrentPageName();
    const canonicalPageName = getCanonicalPageName(currentPageName);

    if (currentPageName !== canonicalPageName) {
      redirectTo(canonicalPageName);
      return;
    }

    if (currentPageName === ROUTES.home && phaseSettings.home && phaseSettings.home !== ROUTES.home) {
      redirectTo(phaseSettings.home);
      return;
    }

    if (isManagedPage(currentPageName) && !isAllowedPage(currentPageName)) {
      redirectTo(ROUTES.home);
    }
  })();

  document.addEventListener("DOMContentLoaded", () => {
    const canonicalPageName = getCanonicalPageName(getCurrentPageName());

    document.documentElement.setAttribute("data-phase", String(currentPhase));
    document.documentElement.setAttribute(
      "data-page-state",
      isClosedPage(canonicalPageName) ? "closed" : "open"
    );

    applyPhaseContent();
    updateManagedLinks();
  });
})();
