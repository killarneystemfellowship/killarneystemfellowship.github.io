(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (window.location.protocol === "file:") {
    const isDirectoryPage = /\/(?:about|contact|faq|thanks)\/index\.html$/.test(window.location.pathname);
    const rootPrefix = isDirectoryPage ? "../" : "";
    const localRoutes = {
      "/": `${rootPrefix}index.html`,
      "/about/": `${rootPrefix}about/index.html`,
      "/contact/": `${rootPrefix}contact/index.html`,
      "/faq/": `${rootPrefix}faq/index.html`,
      "/thanks/": `${rootPrefix}thanks/index.html`
    };

    document.querySelectorAll('a[href^="/"]').forEach((link) => {
      const href = link.getAttribute("href");
      const [path, fragment] = href.split("#", 2);
      const localPath = localRoutes[path];
      if (!localPath) return;
      link.setAttribute("href", `${localPath}${fragment ? `#${fragment}` : ""}`);
    });
  }

  const staggerGroups = [
    [".support-spectrum__item", 70],
    [".next-steps li", 80]
  ];

  staggerGroups.forEach(([selector, delay]) => {
    document.querySelectorAll(selector).forEach((item, index) => {
      item.setAttribute("data-visual-reveal", "");
      item.style.setProperty("--visual-delay", `${index * delay}ms`);
    });
  });

  const revealItems = [...document.querySelectorAll("[data-visual-reveal]")];
  document.documentElement.classList.add("visual-reveal-ready");

  if (!reduceMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -36px" }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const isControlComplete = (control) => {
    if (control.type === "checkbox" || control.type === "radio") return control.checked;
    return control.value.trim() !== "" && control.checkValidity();
  };

  document.querySelectorAll(".form-meter[data-form-meter-for]").forEach((meter) => {
    const form = document.getElementById(meter.dataset.formMeterFor);
    if (!form) return;

    const requiredControls = [...form.querySelectorAll("[required]")];
    const copy = meter.querySelector(".form-meter__copy");
    let previousCount = -1;

    const updateMeter = () => {
      const completeCount = requiredControls.filter(isControlComplete).length;
      if (completeCount === previousCount) return;

      previousCount = completeCount;
      const total = requiredControls.length;
      const progress = total ? (completeCount / total) * 100 : 0;

      meter.style.setProperty("--meter-progress", `${progress}%`);
      meter.setAttribute("aria-valuenow", String(completeCount));
      meter.setAttribute("aria-valuemax", String(total));
      meter.setAttribute("aria-valuetext", `${completeCount} of ${total} required details ready`);
      if (copy) copy.textContent = `${completeCount} of ${total} details ready`;
    };

    form.addEventListener("input", updateMeter);
    form.addEventListener("change", updateMeter);
    window.addEventListener("pageshow", updateMeter);
    window.setTimeout(updateMeter, 120);
    updateMeter();
  });

  if (!reduceMotion && "IntersectionObserver" in window) {
    const ambientVisuals = document.querySelectorAll(
      ".learning-loop, .skills-ribbon, .chapter-route, .contact-route, .faq-field, .request-kit, .thanks-art"
    );

    const ambientObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visual-paused", !entry.isIntersecting);
        });
      },
      { threshold: 0.02, rootMargin: "120px 0px" }
    );

    ambientVisuals.forEach((visual) => ambientObserver.observe(visual));
  }
})();
