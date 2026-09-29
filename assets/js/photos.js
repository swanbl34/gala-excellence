/**
 * Photothèque du gala : rend les albums depuis assets/data/photos.json
 * et fournit une visionneuse plein écran (clavier, tactile, molette).
 */
(function () {
  "use strict";

  const MANIFEST = "assets/data/photos.json?v=20260929-01";
  const BASE = "assets/images/photos";

  const root = document.querySelector("[data-gallery]");
  if (!root) return;

  const state = {
    albums: [],
    /** Liste à plat { albumIndex, photoIndex } pour naviguer d'une photo à l'autre. */
    flat: [],
    current: -1
  };

  function photoSrc(album, index) {
    return `${BASE}/${album.slug}/${String(index + 1).padStart(3, "0")}.webp`;
  }

  function thumbSrc(album, index) {
    return `${BASE}/${album.slug}/thumb/${String(index + 1).padStart(3, "0")}.webp`;
  }

  // ---------------------------------------------------------------- rendu

  function buildAlbum(album, albumIndex) {
    const section = document.createElement("section");
    section.className = "album-section reveal is-visible";
    section.id = `album-${album.num}`;

    const head = document.createElement("div");
    head.className = "album-section-head";
    head.innerHTML = `
      <div>
        <span class="album-card-index">Album ${album.num}</span>
        <h3 class="album-section-title">${album.title}</h3>
      </div>
      <div class="album-section-meta">
        <span class="chip">${album.count} photo${album.count > 1 ? "s" : ""}</span>
        <a class="album-source" href="${album.source}" target="_blank" rel="noopener noreferrer">Album original</a>
      </div>`;
    section.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "photo-grid";

    album.sizes.forEach((size, photoIndex) => {
      const flatIndex = state.flat.length;
      state.flat.push({ albumIndex, photoIndex });

      const button = document.createElement("button");
      button.type = "button";
      button.className = "photo-tile";
      button.dataset.index = String(flatIndex);
      button.setAttribute("aria-label", `Ouvrir la photo ${photoIndex + 1} de l'album ${album.title}`);
      button.innerHTML = `<img src="${thumbSrc(album, photoIndex)}" alt="" loading="lazy" decoding="async" width="${size[0]}" height="${size[1]}" />`;
      grid.appendChild(button);
    });

    section.appendChild(grid);
    return section;
  }

  function buildIndex(albums) {
    const nav = document.querySelector("[data-album-index]");
    if (!nav) return;
    const groups = [];
    albums.forEach((album) => {
      let group = groups.find((g) => g.name === album.group);
      if (!group) {
        group = { name: album.group, albums: [] };
        groups.push(group);
      }
      group.albums.push(album);
    });

    nav.innerHTML = groups
      .map(
        (group) => `
        <div class="album-index-group">
          <p class="album-index-label">${group.name}</p>
          <ul>
            ${group.albums
              .map(
                (a) =>
                  `<li><a href="#album-${a.num}"><span>${a.num}</span> ${a.title} <em>${a.count}</em></a></li>`
              )
              .join("")}
          </ul>
        </div>`
      )
      .join("");
  }

  // ---------------------------------------------------------- visionneuse

  const viewer = {
    el: null,
    img: null,
    caption: null,
    counter: null,
    download: null
  };

  function buildViewer() {
    const el = document.createElement("div");
    el.className = "viewer";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Visionneuse photo");
    el.hidden = true;
    el.innerHTML = `
      <button class="viewer-close" type="button" aria-label="Fermer">×</button>
      <button class="viewer-nav viewer-nav--prev" type="button" aria-label="Photo précédente">‹</button>
      <button class="viewer-nav viewer-nav--next" type="button" aria-label="Photo suivante">›</button>
      <figure class="viewer-stage">
        <img class="viewer-image" alt="" />
      </figure>
      <div class="viewer-bar">
        <p class="viewer-caption"></p>
        <div class="viewer-actions">
          <span class="viewer-counter"></span>
          <a class="viewer-download" download>Télécharger</a>
        </div>
      </div>`;
    document.body.appendChild(el);

    viewer.el = el;
    viewer.img = el.querySelector(".viewer-image");
    viewer.caption = el.querySelector(".viewer-caption");
    viewer.counter = el.querySelector(".viewer-counter");
    viewer.download = el.querySelector(".viewer-download");

    el.querySelector(".viewer-close").addEventListener("click", close);
    el.querySelector(".viewer-nav--prev").addEventListener("click", () => step(-1));
    el.querySelector(".viewer-nav--next").addEventListener("click", () => step(1));
    el.addEventListener("click", (event) => {
      if (event.target === el || event.target.classList.contains("viewer-stage")) close();
    });

    // Balayage tactile
    let startX = null;
    el.addEventListener("touchstart", (e) => {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 50) step(delta < 0 ? 1 : -1);
      startX = null;
    }, { passive: true });
  }

  function preload(index) {
    const entry = state.flat[index];
    if (!entry) return;
    const album = state.albums[entry.albumIndex];
    new Image().src = photoSrc(album, entry.photoIndex);
  }

  function show(index) {
    if (index < 0 || index >= state.flat.length) return;
    const entry = state.flat[index];
    const album = state.albums[entry.albumIndex];
    const size = album.sizes[entry.photoIndex];
    const src = photoSrc(album, entry.photoIndex);

    state.current = index;
    viewer.img.src = src;
    viewer.img.width = size[0];
    viewer.img.height = size[1];
    viewer.img.alt = `${album.title} — photo ${entry.photoIndex + 1}`;
    viewer.caption.textContent = `Album ${album.num} · ${album.title}`;
    viewer.counter.textContent = `${entry.photoIndex + 1} / ${album.count}`;
    viewer.download.href = src;
    viewer.download.setAttribute("download", `${album.slug}-${String(entry.photoIndex + 1).padStart(3, "0")}.webp`);

    preload(index + 1);
    preload(index - 1);
  }

  function open(index) {
    if (!viewer.el) buildViewer();
    viewer.el.hidden = false;
    document.body.classList.add("viewer-open");
    show(index);
    viewer.el.querySelector(".viewer-close").focus();
  }

  function close() {
    if (!viewer.el) return;
    viewer.el.hidden = true;
    viewer.img.removeAttribute("src");
    document.body.classList.remove("viewer-open");
    const tile = document.querySelector(`.photo-tile[data-index="${state.current}"]`);
    if (tile) tile.focus();
  }

  function step(direction) {
    const next = state.current + direction;
    if (next < 0 || next >= state.flat.length) return;
    show(next);
  }

  document.addEventListener("keydown", (event) => {
    if (!viewer.el || viewer.el.hidden) return;
    if (event.key === "Escape") close();
    else if (event.key === "ArrowRight") step(1);
    else if (event.key === "ArrowLeft") step(-1);
    else return;
    event.preventDefault();
  });

  // ------------------------------------------------------------ démarrage

  fetch(MANIFEST)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      state.albums = data.albums;
      const fragment = document.createDocumentFragment();

      let currentGroup = null;
      data.albums.forEach((album, albumIndex) => {
        if (album.group !== currentGroup) {
          currentGroup = album.group;
          const heading = document.createElement("h2");
          heading.className = "album-group-title";
          heading.textContent = currentGroup;
          fragment.appendChild(heading);
        }
        fragment.appendChild(buildAlbum(album, albumIndex));
      });

      root.innerHTML = "";
      root.appendChild(fragment);
      buildIndex(data.albums);

      document.querySelectorAll("[data-photo-total]").forEach((node) => {
        node.textContent = `${data.total} photos`;
      });

      root.addEventListener("click", (event) => {
        const tile = event.target.closest(".photo-tile");
        if (tile) open(Number(tile.dataset.index));
      });
    })
    .catch((error) => {
      root.innerHTML =
        '<div class="notice-card"><h2>Photos momentanément indisponibles</h2>' +
        "<p>La photothèque n'a pas pu être chargée. Les albums restent consultables sur " +
        '<a href="https://public.photowebcloud.fr/albums/6aa49c77c902f" target="_blank" rel="noopener noreferrer">PhotoWeb Cloud</a>.</p></div>';
      console.error("Photothèque :", error);
    });
})();
