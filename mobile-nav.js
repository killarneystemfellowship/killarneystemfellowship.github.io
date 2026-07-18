(() => {
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
