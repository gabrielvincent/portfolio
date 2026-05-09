const currentPage = document.body.dataset.page;
const navItems = Array.from(document.querySelectorAll("[data-nav-item]"));
const topbar = document.querySelector(".topbar");
const menuRegion = document.querySelector('[data-focus-region="menu"]');
const mainRegion = document.querySelector('[data-focus-region="main"]');
const modals = Array.from(document.querySelectorAll("[data-modal]"));
const introModal = document.querySelector("[data-intro-modal]");
const introCloseButton = document.querySelector("[data-intro-close]");
const introStorageKey = "portfolio_intro_seen";
const menuSelector = "a[href]";
const mainSelector =
  "[data-main-focus], a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])";
const modalSelector = "[data-modal-focus], button:not([disabled])";

let activeRegion = "menu";
const viewportPadding = 24;

// The contact page owns its own keyboard model; main.js only delegates to it.
const getContactController = () => window.contactFormController ?? null;

const getOpenModal = () => modals.find((modal) => !modal.hidden) ?? null;

// Highlights the active page in the shared navigation without duplicating markup logic.
navItems.forEach((item) => {
  if (item.dataset.navItem === currentPage) {
    item.classList.add("is-active");
    item.setAttribute("aria-current", "page");
  }
});

const isAvailable = (element) => {
  const isHidden = element.hasAttribute("hidden");
  const isAriaHidden = element.getAttribute("aria-hidden") === "true";
  return !isHidden && !isAriaHidden;
};

const getModalElements = () => {
  const openModal = getOpenModal();

  if (!openModal) {
    return [];
  }

  return Array.from(openModal.querySelectorAll(modalSelector)).filter(isAvailable);
};

const getRegionElements = (region) => {
  const scope = region === "menu" ? menuRegion : mainRegion;
  const selector = region === "menu" ? menuSelector : mainSelector;

  if (!scope) {
    return [];
  }

  if (region === "main" && currentPage === "contact") {
    const controller = getContactController();

    // The contact page uses a dedicated keyboard model, so main-region focus
    // must be delegated to the form controller instead of generic selectors.
    if (controller?.hasForm()) {
      return controller.getFocusableElements();
    }
  }

  return Array.from(scope.querySelectorAll(selector)).filter(isAvailable);
};

const getTopViewportInset = () => {
  if (!(topbar instanceof HTMLElement)) {
    return 0;
  }

  if (window.matchMedia("(max-width: 860px)").matches) {
    return 0;
  }

  const { bottom } = topbar.getBoundingClientRect();
  return Math.max(0, bottom + 8);
};

const scrollElementIntoViewIfNeeded = (element) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  const rect = element.getBoundingClientRect();
  const topInset = getTopViewportInset();
  const viewportTop = topInset + viewportPadding;
  const viewportBottom = window.innerHeight - viewportPadding;
  const isAboveViewport = rect.top < viewportTop;
  const isBelowViewport = rect.bottom > viewportBottom;
  const isLeftOfViewport = rect.left < 0;
  const isRightOfViewport = rect.right > window.innerWidth;

  if (isAboveViewport || isBelowViewport || isLeftOfViewport || isRightOfViewport) {
    const scrollTop = window.scrollY;
    let nextScrollTop = scrollTop;

    if (isAboveViewport) {
      nextScrollTop += rect.top - viewportTop;
    } else if (isBelowViewport) {
      nextScrollTop += rect.bottom - viewportBottom;
    }

    window.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: "smooth",
    });
  }
};

const focusRegion = (region) => {
  const elements = getRegionElements(region);

  if (!elements.length) {
    return;
  }

  activeRegion = region;
  elements[0].focus();
  scrollElementIntoViewIfNeeded(elements[0]);
};

const moveWithinList = (elements, direction) => {
  if (!elements.length) {
    return;
  }

  // When focus lands outside the managed list, restart from the first item.
  const currentIndex = elements.indexOf(document.activeElement);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = (safeIndex + direction + elements.length) % elements.length;
  elements[nextIndex].focus();
  scrollElementIntoViewIfNeeded(elements[nextIndex]);
};

const moveWithinRegion = (direction) => {
  moveWithinList(getRegionElements(activeRegion), direction);
};

const moveWithinModal = (direction) => {
  moveWithinList(getModalElements(), direction);
};

const syncActiveRegion = () => {
  if (menuRegion?.contains(document.activeElement)) {
    activeRegion = "menu";
  }

  if (mainRegion?.contains(document.activeElement)) {
    activeRegion = "main";
  }
};

const isIntroSeen = () => {
  try {
    return window.sessionStorage.getItem(introStorageKey) === "true";
  } catch {
    return false;
  }
};

const markIntroSeen = () => {
  try {
    window.sessionStorage.setItem(introStorageKey, "true");
  } catch {
    // Ignore storage errors and keep the onboarding functional.
  }
};

const closeIntroModal = () => {
  if (!introModal) {
    return;
  }

  introModal.hidden = true;
  if (!getOpenModal()) {
    document.body.classList.remove("modal-open");
  }

  const currentItem = navItems.find((item) => item.dataset.navItem === currentPage);
  if (currentItem) {
    currentItem.focus();
    return;
  }

  focusRegion("menu");
};

const openIntroModal = () => {
  if (!introModal) {
    return;
  }

  // The onboarding blocks the regular TUI navigation until the user confirms it.
  introModal.hidden = false;
  document.body.classList.add("modal-open");

  const modalElements = getModalElements();
  if (modalElements.length) {
    modalElements[0].focus();
  }
};

window.addEventListener("focusin", () => {
  syncActiveRegion();
  scrollElementIntoViewIfNeeded(document.activeElement);
});

if (introCloseButton) {
  introCloseButton.addEventListener("click", () => {
    markIntroSeen();
    closeIntroModal();
  });
}

window.addEventListener("keydown", (event) => {
  const activeElement = document.activeElement;
  const openModal = getOpenModal();
  const isModalOpen = Boolean(openModal);
  const contactController = getContactController();
  const isManagedFormElement = Boolean(contactController?.isManagedElement(activeElement));
  const activeTag = activeElement?.tagName ?? "";
  // Contact inputs are only considered "typing contexts" after explicit edit mode.
  const isTypingContext = isManagedFormElement
    ? contactController?.isEditing() === true
    : activeTag === "INPUT" || activeTag === "TEXTAREA" || activeElement?.isContentEditable;

  if (isModalOpen) {
    if (event.key === "h" || event.key === "k") {
      event.preventDefault();
      moveWithinModal(-1);
    }

    if (event.key === "j" || event.key === "l") {
      event.preventDefault();
      moveWithinModal(1);
    }

    if (
      event.key === "Enter" &&
      activeElement instanceof HTMLButtonElement &&
      openModal?.contains(activeElement)
    ) {
      event.preventDefault();
      activeElement.click();
    }

    if (event.key === "Tab") {
      event.preventDefault();
    }

    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    // Tab swaps between the two navigation regions instead of walking every control.
    focusRegion(activeRegion === "menu" ? "main" : "menu");
    return;
  }

  if (isTypingContext) {
    return;
  }

  if (
    currentPage === "portfolio" &&
    event.key === "Enter" &&
    activeElement instanceof HTMLAnchorElement &&
    activeElement.hasAttribute("data-project-link") &&
    activeElement.href
  ) {
    event.preventDefault();
    // Portfolio cards are links and must always open in a separate tab.
    window.open(activeElement.href, "_blank", "noopener,noreferrer");
    return;
  }

  if (event.key === "h" || event.key === "k") {
    event.preventDefault();
    moveWithinRegion(-1);
  }

  if (event.key === "j" || event.key === "l") {
    event.preventDefault();
    moveWithinRegion(1);
  }
});

window.addEventListener("load", () => {
  if (currentPage === "home" && !isIntroSeen()) {
    openIntroModal();
    return;
  }

  const currentItem = navItems.find((item) => item.dataset.navItem === currentPage);

  if (currentItem) {
    currentItem.focus();
    scrollElementIntoViewIfNeeded(currentItem);
    return;
  }

  focusRegion("menu");
});
