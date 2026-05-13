import { useEffect } from "react";

/**
 * Call this hook with `true` when a modal is open.
 * It sets data-modal-open on body → sidebar becomes inert.
 */
export function useModalFocus(isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.setAttribute("data-modal-open", "1");
    return () => document.body.removeAttribute("data-modal-open");
  }, [isOpen]);
}
