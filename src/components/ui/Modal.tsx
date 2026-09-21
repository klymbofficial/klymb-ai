"use client";

import { useEffect, useRef } from "react";

/**
 * A modal built on the native <dialog>, so the browser handles the focus
 * trap, the inert background and Escape for us.
 *
 * It is always dismissible: a dialog a keyboard user cannot leave is a trap,
 * so whatever opens this must still make sense once it closes.
 */
export function Modal({
  open, onClose, labelledBy, children,
}: { open: boolean; onClose: () => void; labelledBy?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      // Clicking the backdrop is a click on the dialog itself, never on its content.
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="modal-pop m-auto max-w-[min(34rem,calc(100vw-2rem))] overflow-visible rounded-slab bg-night p-0 text-paper shadow-float backdrop:bg-paper/55 backdrop:backdrop-blur-md"
    >
      {children}
    </dialog>
  );
}
