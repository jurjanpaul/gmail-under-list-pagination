(() => {
  const SENTINEL_CLASS = 'gmx-pager-footer';
  const GRID_ID_ATTR = 'data-gmx-grid-id';

  const LOCALE_TOOLTIPS = {
    en: { newer: 'Newer', older: 'Older' },
    nl: { newer: 'Nieuwer', older: 'Ouder' },
  };

  const state = {
    panes: new Map(),
    nextGridId: 1,
  };

  function getLocaleTooltips() {
    const lang = (document.documentElement.lang || 'en').split('-')[0];
    return LOCALE_TOOLTIPS[lang] || LOCALE_TOOLTIPS.en;
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    if (el.offsetParent !== null) return true;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findCounter(arrows) {
    const bar = arrows.newer.parentElement;
    if (!bar) return null;
    if (!/\d/.test(bar.textContent || '')) return null;
    return bar;
  }

  function findPanes() {
    const main = document.querySelector('div[role="main"]');
    if (!main) return [];
    const grids = Array.from(main.querySelectorAll('table[role="grid"]'));
    if (grids.length === 0) return [];
    const tooltips = getLocaleTooltips();
    const newerSel = `[role="button"][data-tooltip="${tooltips.newer}"]`;
    const olderSel = `[role="button"][data-tooltip="${tooltips.older}"]`;

    const hasVisibleNewer = (root) => {
      for (const a of root.querySelectorAll(newerSel)) {
        if (isVisible(a)) return true;
      }
      return false;
    };
    const candidates = grids.map((grid) => {
      let ancestor = grid.parentElement;
      while (ancestor) {
        if (hasVisibleNewer(ancestor)) return { grid, container: ancestor };
        ancestor = ancestor.parentElement;
      }
      return null;
    }).filter(Boolean);

    if (candidates.length === 0) return [];

    const ownerFor = (arrow) => {
      let best = null;
      for (const c of candidates) {
        if (!c.container.contains(arrow)) continue;
        if (!best) { best = c; continue; }
        if (best.container.contains(c.container) && best.container !== c.container) {
          best = c;
        }
      }
      return best;
    };

    const assignments = new Map();
    for (const newer of document.querySelectorAll(newerSel)) {
      if (!isVisible(newer)) continue;
      const owner = ownerFor(newer);
      if (!owner) continue;
      const entry = assignments.get(owner.grid) || {};
      if (!entry.newer) entry.newer = newer;
      assignments.set(owner.grid, entry);
    }
    for (const older of document.querySelectorAll(olderSel)) {
      if (!isVisible(older)) continue;
      const owner = ownerFor(older);
      if (!owner) continue;
      const entry = assignments.get(owner.grid) || {};
      if (!entry.older) entry.older = older;
      assignments.set(owner.grid, entry);
    }

    const result = [];
    for (const grid of grids) {
      const arrows = assignments.get(grid);
      if (arrows && arrows.newer && arrows.older) {
        result.push({ grid, arrows, count: findCounter(arrows) });
      }
    }
    return result;
  }

  function gridIdFor(grid) {
    let id = grid.getAttribute(GRID_ID_ATTR);
    if (!id) {
      id = String(state.nextGridId++);
      grid.setAttribute(GRID_ID_ATTR, id);
    }
    return id;
  }

  function buildFooter(paneState) {
    const tooltips = getLocaleTooltips();
    const footer = document.createElement('div');
    footer.className = SENTINEL_CLASS;

    const chevron = (d) =>
      `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">` +
      `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" ` +
      `stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const newerBtn = document.createElement('button');
    newerBtn.type = 'button';
    newerBtn.className = 'gmx-pager-btn';
    newerBtn.setAttribute('aria-label', tooltips.newer);
    newerBtn.innerHTML = chevron('M15 6l-6 6 6 6');

    const olderBtn = document.createElement('button');
    olderBtn.type = 'button';
    olderBtn.className = 'gmx-pager-btn';
    olderBtn.setAttribute('aria-label', tooltips.older);
    olderBtn.innerHTML = chevron('M9 6l6 6-6 6');

    const proxyClick = (direction) => (event) => {
      event.preventDefault();
      const btn = direction === 'newer' ? paneState.newerBtn : paneState.olderBtn;
      if (btn.getAttribute('aria-disabled') === 'true') return;
      let arrow = paneState.arrows[direction];
      if (!arrow || !arrow.isConnected) {
        reconcile();
        const current = state.panes.get(paneState.gridId);
        if (!current) return;
        arrow = current.arrows[direction];
      }
      if (arrow && arrow.isConnected) {
        const fire = (type, Ctor) => {
          arrow.dispatchEvent(new Ctor(type, {
            bubbles: true, cancelable: true, view: window, button: 0,
            pointerId: 1, pointerType: 'mouse', isPrimary: true,
          }));
        };
        fire('pointerdown', PointerEvent);
        fire('mousedown', MouseEvent);
        fire('pointerup', PointerEvent);
        fire('mouseup', MouseEvent);
        fire('click', MouseEvent);
      }
    };
    newerBtn.addEventListener('click', proxyClick('newer'));
    olderBtn.addEventListener('click', proxyClick('older'));

    const countSpan = document.createElement('span');
    countSpan.className = 'gmx-pager-count';
    countSpan.setAttribute('aria-hidden', 'true');

    footer.appendChild(countSpan);
    footer.appendChild(newerBtn);
    footer.appendChild(olderBtn);
    return { footer, newerBtn, olderBtn, countSpan };
  }

  function syncDisabled(paneState) {
    const apply = (btn, arrow) => {
      const next = arrow.getAttribute('aria-disabled') === 'true' ? 'true' : 'false';
      if (btn.getAttribute('aria-disabled') !== next) {
        btn.setAttribute('aria-disabled', next);
      }
    };
    apply(paneState.newerBtn, paneState.arrows.newer);
    apply(paneState.olderBtn, paneState.arrows.older);
  }

  function syncCount(paneState) {
    if (!paneState.countSpan) return;
    const text = paneState.countEl
      ? (paneState.countEl.textContent || '').trim()
      : '';
    if (paneState.countSpan.textContent !== text) {
      paneState.countSpan.textContent = text;
    }
  }

  function attachMirror(paneState) {
    const arrowsChanged = !paneState.mirrorObserver
      || paneState.observedNewer !== paneState.arrows.newer
      || paneState.observedOlder !== paneState.arrows.older;
    if (arrowsChanged) {
      if (paneState.mirrorObserver) paneState.mirrorObserver.disconnect();
      const observer = new MutationObserver(() => syncDisabled(paneState));
      observer.observe(paneState.arrows.newer, {
        attributes: true, attributeFilter: ['aria-disabled'],
      });
      observer.observe(paneState.arrows.older, {
        attributes: true, attributeFilter: ['aria-disabled'],
      });
      paneState.mirrorObserver = observer;
      paneState.observedNewer = paneState.arrows.newer;
      paneState.observedOlder = paneState.arrows.older;
    }
    if (paneState.observedCount !== paneState.countEl) {
      if (paneState.countObserver) {
        paneState.countObserver.disconnect();
        paneState.countObserver = null;
      }
      if (paneState.countEl) {
        const obs = new MutationObserver(() => syncCount(paneState));
        obs.observe(paneState.countEl, {
          childList: true, characterData: true, subtree: true,
        });
        paneState.countObserver = obs;
      }
      paneState.observedCount = paneState.countEl;
    }
  }

  function reconcile() {
    const panes = findPanes();
    const seenIds = new Set();
    for (const { grid, arrows, count } of panes) {
      const gridId = gridIdFor(grid);
      seenIds.add(gridId);
      let paneState = state.panes.get(gridId);
      if (!paneState) {
        paneState = {
          gridId, grid, arrows,
          footer: null, newerBtn: null, olderBtn: null, countSpan: null,
          mirrorObserver: null, countObserver: null,
          observedNewer: null, observedOlder: null, observedCount: null,
          countEl: null,
        };
        state.panes.set(gridId, paneState);
      } else {
        paneState.grid = grid;
        paneState.arrows = arrows;
      }
      paneState.countEl = count;
      if (!paneState.footer || !paneState.footer.isConnected) {
        const built = buildFooter(paneState);
        paneState.footer = built.footer;
        paneState.newerBtn = built.newerBtn;
        paneState.olderBtn = built.olderBtn;
        paneState.countSpan = built.countSpan;
        grid.parentNode.insertBefore(paneState.footer, grid.nextSibling);
      }
      attachMirror(paneState);
      syncDisabled(paneState);
      syncCount(paneState);
    }
    for (const [gridId, paneState] of state.panes) {
      if (!seenIds.has(gridId)) {
        if (paneState.mirrorObserver) paneState.mirrorObserver.disconnect();
        if (paneState.countObserver) paneState.countObserver.disconnect();
        if (paneState.footer && paneState.footer.isConnected) paneState.footer.remove();
        state.panes.delete(gridId);
      }
    }
  }

  let reconcileTimer = null;
  function scheduleReconcile() {
    if (reconcileTimer !== null) return;
    reconcileTimer = setTimeout(() => {
      reconcileTimer = null;
      reconcile();
    }, 50);
  }

  let bodyObserver = null;
  let hashListenerAdded = false;
  function startObservers() {
    if (!document.body) return false;
    if (bodyObserver) bodyObserver.disconnect();
    bodyObserver = new MutationObserver(scheduleReconcile);
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    if (!hashListenerAdded) {
      window.addEventListener('hashchange', scheduleReconcile);
      hashListenerAdded = true;
    }
    scheduleReconcile();
    return true;
  }

  function bootstrap() {
    if (startObservers()) return;
    const waitForBody = new MutationObserver(() => {
      if (startObservers()) waitForBody.disconnect();
    });
    waitForBody.observe(document.documentElement, { childList: true, subtree: true });
  }

  bootstrap();

  setInterval(() => {
    if (state.panes.size === 0) {
      scheduleReconcile();
    }
  }, 1000);
})();
