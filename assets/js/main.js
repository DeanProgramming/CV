(() => {
  "use strict";

  const SELECTORS = {
    toggles: ".toggle-button",
    compactNav: "#compact-nav",
    progress: "#scroll-progress",
    spyLinks: "#compact-nav [data-spy], .site-nav [data-spy]",
    videos: "video.lazy-video",
  };

  const SECTION_IDS = ["flagship", "experience", "projects", "contact"];
  const ENTER_Y = 260;
  const EXIT_Y = 150;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  const saveData = Boolean(navigator.connection?.saveData);

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  function getScrollOffset() {
    const rawValue = getComputedStyle(document.documentElement)
      .getPropertyValue("--scroll-offset")
      .trim();
    const parsedValue = Number.parseInt(rawValue, 10);

    return Number.isFinite(parsedValue) ? parsedValue : 84;
  }

  function requestLayoutRefresh() {
    window.dispatchEvent(new Event("portfolio:layoutchange"));
  }

  function setExpanded(button, expanded) {
    const collapsedLabel =
      button.dataset.collapsedLabel || button.textContent.trim() || "Show more";
    const expandedLabel = button.dataset.expandedLabel || "Show less";

    button.setAttribute("aria-expanded", String(expanded));
    button.textContent = expanded ? expandedLabel : collapsedLabel;
  }

  /* -------------------- Expandable engineering details -------------------- */
  function initCollapsibles() {
    const buttons = $$(SELECTORS.toggles);

    buttons.forEach((button) => {
      const targetId = button.getAttribute("aria-controls");
      const panel = targetId ? document.getElementById(targetId) : null;

      if (!panel) {
        button.hidden = true;
        return;
      }

      panel.style.height = "0px";
      panel.classList.remove("is-open");
      setExpanded(button, false);

      button.addEventListener("click", () => {
        const isOpen = panel.classList.contains("is-open");

        if (isOpen) {
          panel.style.height = `${panel.scrollHeight}px`;

          requestAnimationFrame(() => {
            panel.classList.remove("is-open");
            panel.style.height = "0px";
            setExpanded(button, false);
          });
        } else {
          panel.classList.add("is-open");
          panel.style.height = `${panel.scrollHeight}px`;
          setExpanded(button, true);

          const onTransitionEnd = (event) => {
            if (event.propertyName !== "height") {
              return;
            }

            panel.style.height = "auto";
            panel.removeEventListener("transitionend", onTransitionEnd);
          };

          panel.addEventListener("transitionend", onTransitionEnd);
        }

        window.setTimeout(requestLayoutRefresh, 360);
      });
    });

    let resizeFrame = 0;
    window.addEventListener("resize", () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        buttons.forEach((button) => {
          const targetId = button.getAttribute("aria-controls");
          const panel = targetId ? document.getElementById(targetId) : null;

          if (panel?.classList.contains("is-open")) {
            panel.style.height = "auto";
          }
        });

        requestLayoutRefresh();
      });
    });
  }

  /* -------------------- Lazy, viewport-aware videos -------------------- */
  function initLazyVideos() {
    const videos = $$(SELECTORS.videos);

    if (!videos.length) {
      return;
    }

    const mayAutoplay = !prefersReducedMotion.matches && !saveData;

    const loadVideo = (video) => {
      const source = $("source[data-src]", video);

      if (!source || source.src) {
        return;
      }

      source.src = source.dataset.src;
      video.load();
    };

    const playVideo = (video) => {
      if (!mayAutoplay) {
        return;
      }

      const attemptPlayback = () => {
        video.play().catch(() => {
          // The poster remains a complete fallback when autoplay is blocked.
        });
      };

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        attemptPlayback();
      } else {
        video.addEventListener("loadeddata", attemptPlayback, { once: true });
      }
    };

    videos.forEach((video) => {
      video.muted = true;
      video.playsInline = true;
      video.preload = "none";
    });

    if (!mayAutoplay) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      videos.forEach((video) => {
        loadVideo(video);
        playVideo(video);
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;

          if (entry.isIntersecting) {
            loadVideo(video);
            playVideo(video);
          } else if (!video.paused) {
            video.pause();
          }
        });
      },
      {
        rootMargin: "220px 0px",
        threshold: 0.12,
      }
    );

    videos.forEach((video) => observer.observe(video));

    prefersReducedMotion.addEventListener?.("change", (event) => {
      if (!event.matches) {
        return;
      }

      videos.forEach((video) => video.pause());
    });
  }

  /* -------------------- Progress bar and compact navigation -------------------- */
  function initScrollChrome() {
    const progressBar = $(SELECTORS.progress);
    const compactNav = $(SELECTORS.compactNav);
    let framePending = false;

    const update = () => {
      const documentElement = document.documentElement;
      const scrollTop = documentElement.scrollTop || document.body.scrollTop;
      const scrollRange =
        documentElement.scrollHeight - documentElement.clientHeight;
      const progress =
        scrollRange > 0 ? Math.min(100, (scrollTop / scrollRange) * 100) : 0;

      if (progressBar) {
        progressBar.style.width = `${progress.toFixed(2)}%`;
      }

      if (compactNav) {
        const isShown = document.body.classList.contains("show-compact-nav");

        if (!isShown && window.scrollY > ENTER_Y) {
          document.body.classList.add("show-compact-nav");
        } else if (isShown && window.scrollY < EXIT_Y) {
          document.body.classList.remove("show-compact-nav");
        }
      }

      framePending = false;
    };

    const requestUpdate = () => {
      if (framePending) {
        return;
      }

      framePending = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("load", requestUpdate);
    requestUpdate();
  }

  /* -------------------- Active section navigation -------------------- */
  function initSectionSpy() {
    const links = $$(SELECTORS.spyLinks);
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      Boolean
    );

    if (!links.length || !sections.length) {
      return;
    }

    let positions = [];
    let framePending = false;

    const setActive = (activeId) => {
      links.forEach((link) => {
        const isActive = link.dataset.spy === activeId;
        link.classList.toggle("active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });

      $$(".site-nav li").forEach((listItem) => {
        const link = $("[data-spy]", listItem);
        listItem.classList.toggle("current", link?.dataset.spy === activeId);
      });
    };

    const recalculate = () => {
      positions = sections
        .map((section) => ({
          id: section.id,
          top: section.getBoundingClientRect().top + window.scrollY,
        }))
        .sort((first, second) => first.top - second.top);
    };

    const update = () => {
      const marker = window.scrollY + getScrollOffset() + 8;
      let activeId = positions[0]?.id;

      positions.forEach((section) => {
        if (section.top <= marker) {
          activeId = section.id;
        }
      });

      setActive(activeId);
      framePending = false;
    };

    const requestUpdate = () => {
      if (framePending) {
        return;
      }

      framePending = true;
      window.requestAnimationFrame(update);
    };

    const refresh = () => {
      recalculate();
      requestUpdate();
    };

    refresh();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", refresh);
    window.addEventListener("load", refresh);
    window.addEventListener("portfolio:layoutchange", refresh);

    document.addEventListener(
      "toggle",
      (event) => {
        if (event.target.matches?.("details")) {
          window.setTimeout(refresh, 0);
        }
      },
      true
    );
  }

  /* -------------------- Internal navigation -------------------- */
  function initSmoothAnchors() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]');

      if (!link) {
        return;
      }

      const href = link.getAttribute("href");

      if (!href || href === "#") {
        return;
      }

      const target = document.getElementById(href.slice(1));

      if (!target) {
        return;
      }

      event.preventDefault();

      const targetTop =
        target.getBoundingClientRect().top +
        window.scrollY -
        getScrollOffset();

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      });
    });
  }

  function setCurrentYear() {
    const year = $("#year");

    if (year) {
      year.textContent = String(new Date().getFullYear());
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();
    initCollapsibles();
    initLazyVideos();
    initScrollChrome();
    initSectionSpy();
    initSmoothAnchors();
  });
})();
