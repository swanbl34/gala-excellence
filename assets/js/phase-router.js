// Change this value to 0, 1, 2, or 3 depending on the current site phase.
var PHASE = 0;

(function () {
  "use strict";

  const ROUTES = {
    home: "index.html",
    candidatures: "candidatures.html",
    candidats: "candidats.html",
    votes: "votes.html",
    resultats: "resultats.html",
    billetterie: "billetterie.html",
    cashless: "cashless.html",
    contact: "contact.html"
  };

  const LEGACY_ROUTES = {
    "candidature.html": ROUTES.candidatures,
    "votez.html": ROUTES.votes
  };

  const PHASE_RULES = {
    0: {
      home: null,
      allowed: new Set([
        ROUTES.candidatures,
        ROUTES.candidats,
        ROUTES.votes,
        ROUTES.resultats,
        ROUTES.billetterie,
        ROUTES.cashless,
        ROUTES.contact
      ])
    },
    1: {
      home: null,
      allowed: new Set([ROUTES.candidatures, ROUTES.billetterie, ROUTES.contact])
    },
    2: {
      home: null,
      allowed: new Set([ROUTES.candidats, ROUTES.votes, ROUTES.billetterie, ROUTES.contact])
    },
    3: {
      home: null,
      allowed: new Set([ROUTES.candidats, ROUTES.resultats, ROUTES.billetterie, ROUTES.cashless, ROUTES.contact])
    }
  };

  const MANAGED_PAGES = new Set([
    ROUTES.candidatures,
    ROUTES.candidats,
    ROUTES.votes,
    ROUTES.resultats,
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
    const canonicalPageName = getCanonicalPageName(pageName);
    if (canonicalPageName === ROUTES.billetterie) {
      return true;
    }
    return phaseSettings.allowed.has(canonicalPageName);
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

    if (currentPageName !== canonicalPageName) {
      const suffix = `${url.search}${url.hash}`;
      link.setAttribute("href", `${canonicalPageName}${suffix}`);
    }

    return canonicalPageName;
  }

  function updateManagedLinks() {
    document.querySelectorAll("a[href]").forEach((link) => {
      const canonicalPageName = normalizeLink(link);
      if (!canonicalPageName || !MANAGED_PAGES.has(canonicalPageName)) return;
      setVisibility(link, isAllowedPage(canonicalPageName));
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
    document.documentElement.setAttribute("data-phase", String(currentPhase));
    updateManagedLinks();
  });
})();
