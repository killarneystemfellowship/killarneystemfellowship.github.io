(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const transitionLayer = document.createElement("div");
  transitionLayer.className = "page-transition";
  transitionLayer.setAttribute("aria-hidden", "true");
  transitionLayer.innerHTML = '<span class="page-transition__label">Ask&nbsp; · &nbsp;Explore&nbsp; · &nbsp;Share</span>';
  document.body.append(transitionLayer);

  const revealPage = () => {
    root.classList.remove("page-leaving");
    if (reducedMotion) {
      root.classList.add("page-ready");
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("page-ready")));
  };

  revealPage();
  window.addEventListener("pageshow", revealPage);

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (
      !link ||
      link.target === "_blank" ||
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const href = link.getAttribute("href");
    if (!href) return;

    const destination = new URL(href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    if (destination.href === window.location.href) return;
    if (
      destination.pathname === window.location.pathname &&
      destination.search === window.location.search &&
      destination.hash
    ) return;
    if (!destination.pathname.endsWith("/") && !destination.pathname.endsWith(".html")) return;

    event.preventDefault();
    if (reducedMotion) {
      window.location.href = link.href;
      return;
    }

    root.classList.add("page-leaving");
    window.setTimeout(() => {
      window.location.href = link.href;
    }, 820);
  });

  const toggle = document.querySelector(".mobile-menu-toggle");
  const menu = document.querySelector(".mobile-menu");

  if (!toggle || !menu) return;

  const setMenu = (isOpen) => {
    document.body.classList.toggle("mobile-menu-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    menu.setAttribute("aria-hidden", String(!isOpen));
    menu.inert = !isOpen;

  };

  toggle.addEventListener("click", () => {
    setMenu(!document.body.classList.contains("mobile-menu-open"));
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("mobile-menu-open")) return;

    if (event.key === "Escape") {
      setMenu(false);
      toggle.focus();
    }

    if (event.key === "Tab") {
      const focusable = [toggle, ...menu.querySelectorAll("a")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1050) setMenu(false);
  });
})();
