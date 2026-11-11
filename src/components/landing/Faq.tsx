"use client";

import { useState } from "react";

const FAQS = [
  ["What exactly is Klymb?", "Klymb is an online platform for learning AI skills. Each course combines expert-led lessons, short daily practice, hands-on assessments and a final capstone project that AI agents review in detail."],
  ["Do I need a technical background?", "No. A short starting test places you at the right level, and lessons adapt as you go. Some advanced tracks list prerequisites on their course page."],
  ["How is the capstone graded?", "AI agents review your project against the standards for the role you're training for and return written feedback on what works and what to improve. You can revise and resubmit."],
  ["How long does a course take?", "Most learners spend 15–30 minutes a day. Course pages list the typical duration for each track."],
  ["What do I get at the end?", "A verified skill score, a certificate and your graded capstone, which you can share with employers."],
  ["Can my company pay for this?", "Yes. Klymb for Business covers team licences, workforce skill assessments and custom programs."],
];

/** One answer open at a time; the first starts open. */
export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="kl-faq" aria-labelledby="faq-title">
      <div className="kl-faq-side">
        <span className="kl-faq-num" aria-hidden="true">06</span>
        <h2 id="faq-title" className="kl-faq-label">FAQ</h2>
      </div>
      <div className="kl-faq-list">
        {FAQS.map(([q, a], i) => (
          <div key={q} className="kl-faq-item">
            <h3>
              <button
                type="button"
                className="kl-faq-q"
                aria-expanded={open === i}
                aria-controls={`faq-${i}`}
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <span>{q}</span>
                <span className="kl-faq-icon" aria-hidden="true">{open === i ? "–" : "+"}</span>
              </button>
            </h3>
            {open === i && <p id={`faq-${i}`} className="kl-faq-a">{a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
