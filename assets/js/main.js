(() => {
  "use strict";

  const SELECTORS = {
    toggles: ".toggle-button",
    compactNav: "#compact-nav",
    progress: "#scroll-progress",
    spyLinks: '#compact-nav [data-spy], #header [data-spy]',
    sections: ["#main", "#personal-projects", "#footer"],
  };

  const ENTER_Y = 220; // show compact nav after this
  const EXIT_Y = 120; // hide only when back above this

  const PROGRESS_THROTTLE = true;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setExpanded(button, expanded) {
    button.setAttribute("aria-expanded", String(expanded));
    button.textContent = expanded ? "Show less" : "Show more";
  }

  // read --scroll-offset from CSS (fallback to 90)
  function getScrollOffset() {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--scroll-offset")
      .trim();
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 90;
  }
  

  /* -------------------- Collapsibles -------------------- */
  function initCollapsibles() {
    const buttons = $$(SELECTORS.toggles);

    buttons.forEach((btn) => {
      const targetId = btn.getAttribute("aria-controls");
      const panel = targetId ? document.getElementById(targetId) : null;
      const card = btn.closest(".card");

      if (!panel) return;

      // Initial state
      panel.style.height = "0px";
      panel.classList.remove("is-open");
      setExpanded(btn, false);

      btn.addEventListener("click", () => {
        const isOpen = panel.classList.contains("is-open");

        if (isOpen) {
          panel.style.height = panel.scrollHeight + "px";
          requestAnimationFrame(() => {
            panel.style.height = "0px";
            panel.classList.remove("is-open");
            setExpanded(btn, false);
          });

          requestAnimationFrame(() => {
            if (!card) return;
            const y = card.getBoundingClientRect().top + window.scrollY - 120;
            window.scrollTo({ top: y, behavior: "smooth" });
          });
        } else {
          // Open
          panel.classList.add("is-open");
          panel.style.height = panel.scrollHeight + "px";
          setExpanded(btn, true);

          const onEnd = (e) => {
            if (e.propertyName !== "height") return;
            panel.style.height = "auto";
            panel.removeEventListener("transitionend", onEnd);
          };
          panel.addEventListener("transitionend", onEnd);
        }
      });
    });

    window.addEventListener("resize", () => {
      buttons.forEach((btn) => {
        const id = btn.getAttribute("aria-controls");
        const panel = id ? document.getElementById(id) : null;
        if (!panel) return;

        if (panel.classList.contains("is-open")) {
          panel.style.height = panel.scrollHeight + "px";
          requestAnimationFrame(() => (panel.style.height = "auto"));
        }
      });
    });
  }

    function initLazyVideos() {
      const videos = document.querySelectorAll("video.lazy-video");

      // ---- Stage A: poster preload when near viewport ----
      const posterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const video = entry.target;
 
          if (video.dataset.poster && !video.poster) {
            video.poster = video.dataset.poster;
          }
 
          posterObserver.unobserve(video);
        });
      }, {
        rootMargin: "800px 0px", 
        threshold: 0.01
      });
 
      const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(async (entry) => {
          if (!entry.isIntersecting) return;

          const video = entry.target;
          const source = video.querySelector("source[data-src]");
 
          if (video.dataset.poster && !video.poster) {
            video.poster = video.dataset.poster;
          }
 
          await new Promise((r) => requestAnimationFrame(r));
          await new Promise((r) => requestAnimationFrame(r));
 
          if (source && !source.src) {
            source.src = source.dataset.src;
            video.load();
          }
 
          const tryPlay = () => video.play().catch(() => {});
          if (video.readyState >= 3) {
            tryPlay();
          } else {
            video.addEventListener("canplay", tryPlay, { once: true });
          }

          videoObserver.unobserve(video);
        });
      }, {
        rootMargin: "200px 0px",  
        threshold: 0.25
      });

      videos.forEach((v) => {
        v.preload = "none"; 
        posterObserver.observe(v);
        videoObserver.observe(v);
      });
    }


  /* -------------------- Progress bar -------------------- */
  function updateProgressBar() {
    const bar = $(SELECTORS.progress);
    if (!bar) return;

    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

    bar.style.width = percent.toFixed(2) + "%";
  }

  /* -------------------- Compact nav visibility -------------------- */
  function updateCompactNavVisibility() {
    const compactNav = $(SELECTORS.compactNav);
    if (!compactNav) return;

    const y = window.scrollY;
    const shown = document.body.classList.contains("show-compact-nav");

    if (!shown && y > ENTER_Y) {
      document.body.classList.add("show-compact-nav");
    } else if (shown && y < EXIT_Y) {
      document.body.classList.remove("show-compact-nav");
    }
  }

  /* -------------------- Section spy (activates nav tabs) -------------------- */
  function initSectionSpy() {
    const links = $$(SELECTORS.spyLinks);
    if (!links.length) return;

    const sectionEls = SELECTORS.sections.map((sel) => $(sel)).filter(Boolean);
    if (!sectionEls.length) return;

    const setActive = (id) => {
      // toggle .active on links (header + compact nav)
      links.forEach((a) => {
        a.classList.toggle("active", a.getAttribute("data-spy") === id);
      });

      // move <li class="current"> in the header nav (if you want it)
      const headerLis = $$("#header .site-nav li");
      headerLis.forEach((li) => {
        const a = li.querySelector("[data-spy]");
        li.classList.toggle("current", a?.getAttribute("data-spy") === id);
      });
    };

    let positions = [];

    const recalcPositions = () => {
      positions = sectionEls
        .map((el) => ({
          id: el.id,
          top: el.getBoundingClientRect().top + window.scrollY,
        }))
        .sort((a, b) => a.top - b.top);
    };

    const updateSpy = () => {
      const spyLine = window.scrollY + getScrollOffset() + 5;

      // last section whose top is above the spy line
      let activeId = positions[0]?.id || "main";
      for (const s of positions) {
        if (s.top <= spyLine) activeId = s.id;
        else break;
      }

      setActive(activeId);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateSpy();
        ticking = false;
      });
    };

    // init
    recalcPositions();
    updateSpy();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      recalcPositions();
      updateSpy();
    });
    window.addEventListener("load", () => {
      recalcPositions();
      updateSpy();
    });
  }

  /* -------------------- Smooth internal anchors -------------------- */
  function initSmoothAnchors() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const el = document.querySelector(href);
      if (!el) return;

      e.preventDefault();

      // Respect fixed header offset
      const y = el.getBoundingClientRect().top + window.scrollY - getScrollOffset();
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  }

  /* -------------------- Scroll loop (throttled) -------------------- */
  function initScrollLoop() {
    let ticking = false;

    const onScroll = () => {
      if (PROGRESS_THROTTLE && ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        updateProgressBar();
        updateCompactNavVisibility();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", onScroll);

    // Initial run
    onScroll();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initCollapsibles();
    initSectionSpy();
    initSmoothAnchors();
    initScrollLoop();
    initLazyVideos();
  });
})();
