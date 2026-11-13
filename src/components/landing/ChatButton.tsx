"use client";

import { useEffect, useState } from "react";
import { openHelp } from "@/components/support/help-event";
import { IconMessageCircle } from "./parts";

/**
 * "Chat with us": opens Kamran beside it. Kamran's own launcher is hidden on
 * the homepage. On phones it steps aside while the hero's slider is on
 * screen (the phone hero has no room for it) and comes back once you scroll.
 */
export function ChatButton() {
  const [tucked, setTucked] = useState(false);

  useEffect(() => {
    const slider = document.querySelector(".kl-slide");
    if (!slider || !("IntersectionObserver" in window)) return;
    // The slider only exists on phones; on wider screens it is display: none and never intersects.
    const io = new IntersectionObserver((es) => setTucked(es[0].isIntersecting), { threshold: 0 });
    io.observe(slider);
    return () => io.disconnect();
  }, []);

  return (
    <button
      type="button"
      className={tucked ? "kl-chat is-tucked" : "kl-chat"}
      aria-label="Chat with us"
      aria-haspopup="dialog"
      tabIndex={tucked ? -1 : undefined}
      onClick={(e) => openHelp(e.currentTarget)}
    >
      <span className="kl-chat-icon">
        <IconMessageCircle size={18} />
        <span className="kl-chat-online" />
      </span>
      <span className="kl-chat-label">Chat with us</span>
    </button>
  );
}
