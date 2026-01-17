document.addEventListener("DOMContentLoaded", function () {
  const buttons = document.querySelectorAll(".toggle-button");

  buttons.forEach((button) => {
    const box = button.closest(".box");
    const hiddenText = box ? box.querySelector(".hidden-text") : null;
    if (!hiddenText) return;

    // Initial state
    hiddenText.classList.remove("active");
    button.textContent = "Show More";

    button.addEventListener("click", function () {
      const isOpen = hiddenText.classList.contains("active");

      // Toggle state
      hiddenText.classList.toggle("active");
      button.textContent = isOpen ? "Show More" : "Show Less";

      // If we are collapsing, bring the card back into view
      if (isOpen) {
        // Wait one frame for layout to update, then scroll to the card
        requestAnimationFrame(() => {
          const y = box.getBoundingClientRect().top + window.scrollY - 120; // 120px breathing room
          window.scrollTo({ top: y, behavior: "smooth" });
        });
      }
    });
  });
});


document.addEventListener("DOMContentLoaded", function () {
  const progressBar = document.getElementById("scroll-progress");

  // Show compact nav after entering threshold; hide only after leaving a lower one (hysteresis)
  const ENTER_Y = 220; // show compact nav after this
  const EXIT_Y = 120;  // hide only when back above this

  const SPY_LINE = 170; // where we "sample" current section (px from top of viewport)

  const sections = ["main", "personal-projects", "footer"]
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const compactLinks = document.querySelectorAll('#compact-nav [data-spy]');

  let sectionTops = [];
  function recalc() {
    sectionTops = sections.map(sec => ({
      id: sec.id,
      top: sec.getBoundingClientRect().top + window.scrollY
    })).sort((a, b) => a.top - b.top);
  }

  function setCompactActive(id) {
    compactLinks.forEach(a => {
      a.classList.toggle("active", a.getAttribute("data-spy") === id);
    });
  }

  function updateProgress() {
    if (!progressBar) return;
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = percent.toFixed(2) + "%";
  }

  function updateCompactVisibility() {
    const y = window.scrollY;

    if (!document.body.classList.contains("show-compact-nav") && y > ENTER_Y) {
      document.body.classList.add("show-compact-nav");
    } else if (document.body.classList.contains("show-compact-nav") && y < EXIT_Y) {
      document.body.classList.remove("show-compact-nav");
    }
  }

  function updateActiveSection() {
    if (!sectionTops.length) return;

    // At very top, lock to main (no fighting)
    if (window.scrollY < 80) {
      setCompactActive("main");
      return;
    }

    const spyY = window.scrollY + SPY_LINE;

    let current = sectionTops[0].id;
    for (let i = 0; i < sectionTops.length; i++) {
      if (sectionTops[i].top <= spyY) current = sectionTops[i].id;
      else break;
    }

    setCompactActive(current);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateProgress();
      updateCompactVisibility();
      updateActiveSection();
      ticking = false;
    });
  }

  recalc();
  onScroll();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { recalc(); onScroll(); });
  window.addEventListener("load", () => { recalc(); onScroll(); });
});