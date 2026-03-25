(function () {
  "use strict";

  const config = window.SITE_CONFIG || {};
  function fillConfigPlaceholders() {
    document.querySelectorAll("[data-config]").forEach((node) => {
      const key = node.getAttribute("data-config");
      if (!key) return;
      const value = config[key];
      if (typeof value !== "string") return;
      if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") {
        node.value = value;
      } else {
        node.textContent = value;
      }
    });
  }

  function fillDynamicLinks() {
    document.querySelectorAll("[data-link]").forEach((node) => {
      const key = node.getAttribute("data-link");
      if (!key || !config.links || !config.links[key]) return;
      node.setAttribute("href", config.links[key]);
      if (String(config.links[key]).startsWith("http")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });
  }

  function fillConfigHrefPlaceholders() {
    document.querySelectorAll("[data-config-href]").forEach((node) => {
      const key = node.getAttribute("data-config-href");
      if (!key) return;
      const value = config[key];
      if (typeof value !== "string" || !value) return;
      node.setAttribute("href", value);
      if (value.startsWith("http")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });
  }

  function fillConfigSrcPlaceholders() {
    document.querySelectorAll("[data-config-src]").forEach((node) => {
      const key = node.getAttribute("data-config-src");
      if (!key) return;
      const value = config[key];
      if (typeof value !== "string" || !value) return;
      if (node.dataset.errorHandlerBound === "true") return;
      node.setAttribute("src", value);
      node.dataset.errorHandlerBound = "true";

      node.addEventListener("error", () => {
        if (node.hasAttribute("data-hide-on-error")) {
          node.style.display = "none";
        }
        if (node.hasAttribute("data-hide-parent-on-error")) {
          const parent = node.parentElement;
          if (parent) parent.style.display = "none";
        }
      });
    });
  }

  function setActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;
    document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
      if (link.dataset.page === page) {
        link.classList.add("active");
      }
    });
  }

  function initMenu() {
    const toggle = document.querySelector("[data-menu-toggle]");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.querySelectorAll(".site-nav a").forEach((link) => {
      link.addEventListener("click", () => {
        document.body.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function initReveal() {
    const nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    nodes.forEach((node) => observer.observe(node));
  }

  function initCountdown() {
    const root = document.querySelector("[data-countdown]");
    if (!root || !config.eventDateISO) return;

    const target = new Date(config.eventDateISO).getTime();
    const cells = {
      days: root.querySelector('[data-unit="days"]'),
      hours: root.querySelector('[data-unit="hours"]'),
      minutes: root.querySelector('[data-unit="minutes"]'),
      seconds: root.querySelector('[data-unit="seconds"]')
    };

    function update() {
      const now = Date.now();
      const delta = target - now;

      if (delta <= 0) {
        Object.values(cells).forEach((cell) => {
          if (cell) cell.textContent = "00";
        });
        return;
      }

      const seconds = Math.floor(delta / 1000);
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (cells.days) cells.days.textContent = String(days).padStart(2, "0");
      if (cells.hours) cells.hours.textContent = String(hours).padStart(2, "0");
      if (cells.minutes) cells.minutes.textContent = String(minutes).padStart(2, "0");
      if (cells.seconds) cells.seconds.textContent = String(secs).padStart(2, "0");
    }

    update();
    window.setInterval(update, 1000);
  }

  function initFaq() {
    document.querySelectorAll("[data-faq-item]").forEach((item) => {
      const trigger = item.querySelector(".faq-trigger");
      const panel = item.querySelector(".faq-panel");
      if (!trigger || !panel) return;

      trigger.addEventListener("click", () => {
        const isOpen = item.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
        const icon = trigger.querySelector("span");
        if (icon) icon.textContent = isOpen ? "−" : "+";
        panel.style.maxHeight = isOpen ? panel.scrollHeight + "px" : "0px";
      });
    });
  }

  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");
    if (!form) return;

    const status = form.querySelector(".form-status");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!status) return;
      status.textContent = "Message pret a etre envoye. Connectez ensuite ce formulaire a votre service d'e-mail ou API.";
    });
  }

  function setYear() {
    document.querySelectorAll("[data-current-year]").forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  }

  fillConfigPlaceholders();
  fillDynamicLinks();
  fillConfigHrefPlaceholders();
  fillConfigSrcPlaceholders();
  setActiveNav();
  initMenu();
  initReveal();
  initCountdown();
  initFaq();
  initContactForm();
  setYear();
})();
