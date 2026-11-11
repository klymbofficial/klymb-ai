"use client";

import { openHelp } from "@/components/support/help-event";
import { IconMessageCircle } from "./parts";

/** "Chat with us": opens Kamran beside it. Kamran's own launcher is hidden on the homepage. */
export function ChatButton() {
  return (
    <button type="button" className="kl-chat" aria-label="Chat with us" aria-haspopup="dialog" onClick={(e) => openHelp(e.currentTarget)}>
      <span className="kl-chat-icon">
        <IconMessageCircle size={18} />
        <span className="kl-chat-online" />
      </span>
      <span className="kl-chat-label">Chat with us</span>
    </button>
  );
}
