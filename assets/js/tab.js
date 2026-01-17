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
