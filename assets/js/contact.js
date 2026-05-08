const contactForm = document.querySelector("[data-contact-form]");
const feedbackElement = document.querySelector("[data-form-feedback]");
const contactHelpModal = document.querySelector("[data-contact-help-modal]");
const contactHelpCloseButton = document.querySelector("[data-contact-help-close]");
const successModal = document.querySelector("[data-success-modal]");
const successCloseButton = document.querySelector("[data-success-close]");

if (contactForm && feedbackElement) {
  const contactHelpStorageKey = "portfolio_contact_help_seen";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const fieldSelector = "input:not([disabled]), textarea:not([disabled]), button:not([disabled])";
  const editableSelector = "input:not([disabled]), textarea:not([disabled])";
  const focusableFields = Array.from(contactForm.querySelectorAll(fieldSelector));
  let isEditing = false;

  const renderFeedback = (message, type) => {
    feedbackElement.textContent = message;
    feedbackElement.classList.remove("is-error");

    if (type) {
      feedbackElement.classList.add(type);
    }
  };

  const isManagedElement = (element) => focusableFields.includes(element);

  const isEditableElement = (element) =>
    element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;

  const syncModalState = () => {
    // This page can open either the onboarding modal or the success modal.
    const hasOpenModal = Array.from(document.querySelectorAll("[data-modal]")).some(
      (modal) => !modal.hidden,
    );
    document.body.classList.toggle("modal-open", hasOpenModal);
  };

  const isContactHelpSeen = () => {
    try {
      return window.sessionStorage.getItem(contactHelpStorageKey) === "true";
    } catch {
      return false;
    }
  };

  const markContactHelpSeen = () => {
    try {
      window.sessionStorage.setItem(contactHelpStorageKey, "true");
    } catch {
      // Ignore storage errors and keep the onboarding functional.
    }
  };

  const openContactHelpModal = () => {
    if (!contactHelpModal) {
      return;
    }

    contactHelpModal.hidden = false;
    syncModalState();

    const modalFocusTarget = contactHelpModal.querySelector("[data-modal-focus]");
    if (modalFocusTarget instanceof HTMLElement) {
      modalFocusTarget.focus();
    }
  };

  const closeContactHelpModal = () => {
    if (!contactHelpModal) {
      return;
    }

    contactHelpModal.hidden = true;
    syncModalState();
    focusFieldByIndex(0);
  };

  const openSuccessModal = () => {
    if (!successModal || !successCloseButton) {
      return;
    }

    successModal.hidden = false;
    syncModalState();
    successCloseButton.focus();
  };

  const closeSuccessModal = () => {
    if (!successModal) {
      return;
    }

    successModal.hidden = true;
    syncModalState();
    focusFieldByIndex(0);
  };

  const updateFieldState = () => {
    const activeElement = document.activeElement;

    focusableFields.forEach((field) => {
      const isActive = field === activeElement;
      field.classList.toggle("is-selected", isActive);
      field.classList.toggle("is-editing", isActive && isEditing && isEditableElement(field));

      if (field.matches(editableSelector)) {
        // Fields stay locked during navigation mode so hjkl never starts typing.
        field.readOnly = !(isActive && isEditing);
        field.setAttribute("aria-readonly", String(field.readOnly));
      }
    });
  };

  const focusFieldByIndex = (index) => {
    if (!focusableFields.length) {
      return;
    }

    const nextIndex = (index + focusableFields.length) % focusableFields.length;
    focusableFields[nextIndex].focus();
    updateFieldState();
  };

  const moveFocus = (direction) => {
    if (!focusableFields.length || isEditing) {
      return;
    }

    const activeIndex = focusableFields.indexOf(document.activeElement);
    const safeIndex = activeIndex === -1 ? 0 : activeIndex;
    focusFieldByIndex(safeIndex + direction);
  };

  const enterEditMode = () => {
    if (!isEditableElement(document.activeElement)) {
      return;
    }

    // Editing is explicit: the user must press "c" before the field accepts typing.
    isEditing = true;
    updateFieldState();

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      const valueLength = activeElement.value.length;
      activeElement.setSelectionRange(valueLength, valueLength);
    }
  };

  const leaveEditMode = () => {
    if (!isEditing) {
      return;
    }

    isEditing = false;
    updateFieldState();
  };

  window.contactFormController = {
    // main.js asks this controller for the only valid focus targets in the form region.
    getFocusableElements: () => focusableFields,
    hasForm: () => focusableFields.length > 0,
    isEditing: () => isEditing,
    isManagedElement,
  };

  focusableFields.forEach((field) => {
    if (field.matches(editableSelector)) {
      field.readOnly = true;
      field.setAttribute("aria-readonly", "true");
    }
  });

  contactForm.addEventListener("focusin", updateFieldState);

  window.addEventListener(
    "focusin",
    () => {
      if (!contactForm.contains(document.activeElement)) {
        leaveEditMode();
        updateFieldState();
      }
    },
    true,
  );

  // Capture phase lets the form intercept hjkl/c/Enter before the global handler does.
  window.addEventListener(
    "keydown",
    (event) => {
      const activeElement = document.activeElement;

      if (!isManagedElement(activeElement) || event.key === "Tab") {
        return;
      }

      if (isEditing) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          leaveEditMode();
          return;
        }

        // The textarea keeps Shift+Enter for line breaks, while plain Enter exits edit mode.
        if (
          event.key === "Enter" &&
          activeElement instanceof HTMLTextAreaElement &&
          event.shiftKey
        ) {
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          event.stopImmediatePropagation();
          leaveEditMode();
        }

        return;
      }

      if (event.key === "h" || event.key === "k") {
        event.preventDefault();
        event.stopImmediatePropagation();
        moveFocus(-1);
        return;
      }

      if (event.key === "j" || event.key === "l") {
        event.preventDefault();
        event.stopImmediatePropagation();
        moveFocus(1);
        return;
      }

      if (event.key === "c" && isEditableElement(activeElement)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        enterEditMode();
        return;
      }

      if (event.key === "Enter") {
        if (activeElement instanceof HTMLButtonElement) {
          event.preventDefault();
          event.stopImmediatePropagation();
          activeElement.click();
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = formData.get("name")?.toString().trim() ?? "";
    const email = formData.get("email")?.toString().trim() ?? "";
    const message = formData.get("message")?.toString().trim() ?? "";

    if (!name || !email || !message) {
      renderFeedback("Preencha nome, e-mail e mensagem antes de enviar.", "is-error");
      return;
    }

    if (!emailPattern.test(email)) {
      renderFeedback("Informe um e-mail valido no formato usuario@dominio.com.", "is-error");
      return;
    }

    leaveEditMode();
    contactForm.reset();
    renderFeedback("", "");
    openSuccessModal();
  });

  contactForm.addEventListener("reset", () => {
    window.setTimeout(() => {
      leaveEditMode();
      updateFieldState();
      renderFeedback("", "");
    }, 0);
  });

  if (successCloseButton) {
    successCloseButton.addEventListener("click", () => {
      closeSuccessModal();
    });
  }

  if (contactHelpCloseButton) {
    contactHelpCloseButton.addEventListener("click", () => {
      markContactHelpSeen();
      closeContactHelpModal();
    });
  }

  window.addEventListener("load", () => {
    if (isContactHelpSeen()) {
      return;
    }

    openContactHelpModal();
  });

  updateFieldState();
}
