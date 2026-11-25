"use client";

import { useState } from "react";
import { BatchForm } from "@/components/company/BatchForm";
import { OrgIcon, type OrgIconName } from "@/components/company/OrgIcons";
import { Overlay } from "@/components/company/Overlay";

/**
 * A button that opens server-rendered content in the shared overlay, over the
 * page it's on (P0.2c): Preview on a test page. `startOpen` opens it on
 * arrival, for links that ask for it.
 */
export function OverlayLaunch({
  label, icon, className, title, description, kind = "drawer", size = "lg", startOpen = false, children,
}: {
  label: string;
  icon?: OrgIconName;
  className: string;
  title: string;
  description?: string;
  kind?: "modal" | "drawer";
  size?: "sm" | "md" | "lg";
  startOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{icon && <OrgIcon name={icon} size={16} />}{label}</button>
      <Overlay open={open} onClose={() => setOpen(false)} title={title} description={description} kind={kind} size={size}>{children}</Overlay>
    </>
  );
}

/**
 * Invite candidates inside the test (P0.2c): the round form in a drawer, the
 * test already chosen. Saving makes a draft round and moves to it on the
 * Candidates tab; nothing is sent from here. Closing with people typed in
 * asks first.
 */
export function InviteOverlay({ className, startOpen = false, form }: { className: string; startOpen?: boolean; form: Omit<React.ComponentProps<typeof BatchForm>, "onDirtyChange" | "onDone"> }) {
  const [open, setOpen] = useState(startOpen);
  const [dirty, setDirty] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}><OrgIcon name="invite" size={16} />Invite candidates</button>
      <Overlay
        open={open}
        onClose={() => { setOpen(false); setDirty(false); }}
        title="Invite candidates"
        description="Choose the window and people, then preview the invitation. Nothing is sent until you press Send."
        kind="drawer"
        size="lg"
        dirty={dirty}
      >
        <BatchForm {...form} onDirtyChange={setDirty} onDone={() => setOpen(false)} />
      </Overlay>
    </>
  );
}
