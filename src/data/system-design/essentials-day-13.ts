/**
 * Day 13 of "System Design Essentials": design a ticket booking system.
 * Built from the Day 13 video script. The concert and seat A12 are a fictional
 * teaching example, and the five-minute hold is a product assumption.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Day 13 · Ticket booking",
  hookLines: [
    "One seat. Two people tap Book at the same time.",
    "Both screens showed it as available.",
    "If both get a confirmation, who sits in A12?",
  ],
  question: "How do you make sure one seat has at most one valid holder, even when everything goes wrong?",

  pre: [
    {
      id: "pre-1",
      scenario: "Two users see seat A12 as available and both tap Book.",
      prompt: "What decides the winner?",
      choices: [
        { text: "The authoritative database, using a conditional update inside a transaction", why: "Right. The screen’s old data isn’t the final authority.", best: true },
        { text: "Whichever screen showed available first", why: "Both screens may be showing old data." },
        { text: "Both can win, and it’s sorted out at the venue", why: "Two successful bookings for one seat isn’t acceptable." },
      ],
    },
    {
      id: "pre-2",
      scenario: "A user holds a seat, and a timer on their screen still shows time left.",
      prompt: "Is the screen’s timer the authority?",
      choices: [
        { text: "No: at confirmation the system checks the actual hold ownership and expiry", why: "Yes. The user can see a timer, but it doesn’t decide anything.", best: true },
        { text: "Yes: if the screen shows time, the hold is valid", why: "A screen can be wrong or out of date." },
        { text: "Yes, once the cleanup job has run", why: "Correctness shouldn’t depend on when cleanup runs." },
      ],
    },
    {
      id: "pre-3",
      scenario: "A payment request times out.",
      prompt: "What should you assume?",
      choices: [
        { text: "Not that it failed: the provider may have processed it, so check its status", why: "Right. Blindly sending the same payment again risks a duplicate charge.", best: true },
        { text: "It failed, so send it again", why: "That’s how people get charged twice." },
        { text: "It succeeded, so confirm the seat", why: "Confirm only after verifying the required result." },
      ],
    },
  ],

  revealTitle: "One seat, one holder",
  revealSub: "a fictional concert, simplified",
  reveal: [
    { when: "Requirement", what: "A delay of a few seconds can be acceptable in a feed, depending on the product. Two successful bookings of one seat isn’t. So: at most one valid holder at a time, and a clear record of each successful confirmation." },
    { when: "States", what: "Available: the seat is free. Held: reserved for one user for a limited time. Confirmed: the booking is complete. A hold is temporary, not a confirmed ticket, and an expired or released hold can make the seat available again. Real systems can add cancellation and refund states." },
    { when: "The conditional update", what: "Hold the seat only if it’s available right now. The database’s concurrency guarantees and a transaction handle competing attempts: once one update commits, the other finds the seat unavailable. Return a hold’s success only after that commit." },
    { when: "Hold and expiry", what: "Record the user and an expiry time. Say five minutes for this example: that’s a product assumption, not a universal rule. At confirmation, check the ownership and expiry for real. Cleanup can release expired holds, but correctness shouldn’t depend on its timing." },
    { when: "Payment", what: "Until the required payment result and a valid hold are verified, show payment pending. Sending a payment request doesn’t confirm a booking. After a timeout, use a stable idempotency key, a provider status check, and supported retry behaviour." },
    { when: "The late payment", what: "User A’s hold expires and the seat goes to user B. Then A’s successful payment arrives. Don’t confirm A too. Check the current seat state and reconcile: start a refund or a product-defined workflow. Refunds are external, so track them. Webhooks can repeat, so handle events idempotently." },
  ],

  explain: {
    title: "The words from today",
    items: [
      { term: "Hold", what: "A temporary reservation for one user. Not a confirmed booking.", example: "Held: reserved until it expires or is released" },
      { term: "Conditional update", what: "A change that only applies if a condition is true right now.", example: "Hold A12 only if it’s still available" },
      { term: "Commit", what: "The point at which a transaction’s changes take effect. Only then announce success.", example: "Return the hold after the commit" },
      { term: "Reconciliation", what: "Comparing what happened with the current state, then resolving any mismatch.", example: "A late payment for a seat that’s now someone else’s" },
      { term: "Webhook", what: "A provider calling your system to report an event. It can arrive more than once.", example: "A payment-success event, handled idempotently" },
    ],
  },

  concept: {
    cards: [{
      name: "Protect the seat",
      examples: ["Available, held, confirmed", "A conditional update in a transaction"],
      moves: ["Don’t trust the screen’s old data", "Return success after the commit", "Check expiry at confirmation"],
    }, {
      name: "Survive the payment",
      examples: ["Payment pending", "Timeouts and late results"],
      moves: ["Use a stable idempotency key", "Check the provider’s status", "Reconcile late success: refund or workflow"],
    }],
    rule: "Scale with queues and servers if you need to, but the seat’s final decision belongs to the authoritative storage’s concurrency rules.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Which status describes a seat reserved for a user who hasn’t finished paying?",
      choices: [
        { text: "Held: a temporary reservation, not a confirmed booking", why: "Right. Show payment pending while the result isn’t verified.", best: true },
        { text: "Confirmed", why: "Sending a payment request doesn’t confirm a booking." },
        { text: "Available", why: "It’s reserved for that user until the hold expires or is released." },
      ],
    },
    {
      id: "post-2",
      scenario: "Two requests try to hold A12 at the same moment.",
      prompt: "What should happen?",
      choices: [
        { text: "One update commits; the other finds the seat unavailable", why: "Yes. The check and the change must be coordinated.", best: true },
        { text: "Both read available, so both report success", why: "That’s the bug this design prevents." },
        { text: "Both fail, always", why: "One should win." },
      ],
    },
    {
      id: "post-3",
      scenario: "The cleanup job is running late, and a hold’s expiry time has already passed.",
      prompt: "The user now tries to confirm. What happens?",
      choices: [
        { text: "The system evaluates the expiry itself and doesn’t treat the hold as valid", why: "Right. Correctness can’t depend on when cleanup runs.", best: true },
        { text: "It’s confirmed, because cleanup hasn’t removed it", why: "An expired hold shouldn’t count just because cleanup is late." },
        { text: "The whole system waits for cleanup", why: "Cleanup helps, but confirmation checks expiry directly." },
      ],
    },
    {
      id: "post-4",
      scenario: "A’s hold expired and B got the seat. Now A’s payment succeeds.",
      prompt: "What should the system do?",
      choices: [
        { text: "Check the seat state and reconcile A’s payment: a refund or a defined workflow", why: "Yes. And track the refund, since it’s an external process too.", best: true },
        { text: "Confirm A as well", why: "That’s a double booking." },
        { text: "Take the seat back from B", why: "B holds it validly. A’s payment is what needs resolving." },
      ],
    },
    {
      id: "post-5",
      prompt: "Do you need to say “distributed lock” to prevent double booking?",
      choices: [
        { text: "Not when a database conditional update can handle the requirement", why: "Right. Naming a tool isn’t the same as meeting the requirement.", best: true },
        { text: "Yes: it’s the only way", why: "A conditional update with transactions can do it." },
        { text: "Yes: more servers always need one", why: "Ownership is decided by the authoritative storage’s rules." },
      ],
    },
  ],

  build: {
    title: "Book one seat safely",
    intro: "Drag each piece to the job it does. You can also tap one, then tap a slot.",
    given: "Two users want seat A12",
    rows: [["update", "hold", "verify"], ["key", "webhook", "reconcile"]],
    rowLabels: ["Protect the seat", "Survive the payment"],
    slots: {
      update: { role: "Hold the seat only if it’s available right now", answer: "update" },
      hold: { role: "Record who holds the seat and until when", answer: "hold" },
      verify: { role: "Check the real ownership and expiry before confirming", answer: "verify" },
      key: { role: "Stop a repeated payment request from charging twice", answer: "key" },
      webhook: { role: "Safely process a payment event that arrives twice", answer: "webhook" },
      reconcile: { role: "Resolve a successful payment for a lost seat", answer: "reconcile" },
    },
    chips: [
      { id: "reconcile", label: "Reconciliation workflow", does: "starting a refund or defined resolution when a late payment finds no valid hold" },
      { id: "timer", label: "The screen’s timer", does: "showing the user the time, without deciding anything" },
      { id: "hold", label: "Hold record", does: "storing the seat, its owner and its expiry" },
      { id: "webhook", label: "Idempotent event handling", does: "processing the same payment event safely more than once" },
      { id: "update", label: "Conditional update", does: "changing the seat only if the condition holds, in a transaction" },
      { id: "key", label: "Stable idempotency key", does: "letting a retry be recognised as the same payment" },
      { id: "verify", label: "Check at confirmation", does: "verifying ownership and expiry against the authoritative state" },
    ],
    done: "A conditional update, a hold record and a real check for the seat, then an idempotency key, safe event handling and reconciliation for the payment.",
  },

  design: {
    title: "Prevent double booking",
    brief: "An interviewer says: “Design a ticket booking system and prevent double booking.” Write your answer: the states, how one holder wins, and how you’d handle payment timeouts and late results.",
    constraints: [
      "One seat, at most one valid holder at a time",
      "The screen’s data can be out of date",
      "Payments can time out, repeat, or arrive late",
    ],
    minChars: 100,
    walkthrough: [
      { heading: "One possible answer", points: ["Define the seat’s available, held and confirmed states.", "Ensure one valid hold with a conditional database update and a committed transaction.", "Confirm after verifying the payment result and the hold’s expiry."] },
      { heading: "When things go wrong", points: ["Timeouts: a stable idempotency key and a provider status check.", "Duplicate events: idempotent handling.", "Late payment: a reconciliation workflow, such as a tracked refund."] },
    ],
    checklist: [
      "I defined the seat’s states",
      "I used a conditional update and returned success after the commit",
      "I checked expiry at confirmation",
      "I didn’t treat a timeout as a failure",
      "I handled the late payment without double confirming",
    ],
  },

  followUps: [
    {
      q: "“Design a ticket booking system and prevent double booking.”",
      answer: [
        "Define available, held and confirmed states for the seat.",
        "A conditional database update and a committed transaction ensure one valid hold.",
        "Confirm after verifying the payment result and hold expiry, with a reconciliation workflow for timeouts, duplicate events and late payments.",
      ],
      say: "“States, a conditional update for one valid hold, confirmation after verifying payment and expiry, and reconciliation for the rest.”",
    },
    {
      q: "“The payment arrives after the hold expired. What now?”",
      answer: [
        "Check the current seat state: it may belong to someone else.",
        "Don’t confirm a second booking of that seat.",
        "Reconcile the payment through a refund or a product-defined workflow, and track its status.",
      ],
      say: "“I’d never double confirm. I’d check the seat and reconcile the payment, tracking the refund since it can fail too.”",
    },
    {
      q: "“What would you monitor?”",
      answer: [
        "Hold conflicts.",
        "How long payments have been pending.",
        "Whether refunds are stuck.",
      ],
      say: "“Hold conflicts, the age of pending payments, and stuck refunds.”",
    },
  ],

  faq: [
    { q: "Why is a delay fine in a feed but not here?", a: "A feed’s delay of a few seconds can be acceptable, depending on the product. Two successful bookings of the same seat isn’t. This is a correctness problem, not just a slow screen." },
    { q: "Must a hold last five minutes?", a: "No. Five minutes is a product assumption for this example, not a universal rule." },
    { q: "Exactly how does the conditional update work?", a: "The implementation depends on the database and its isolation rules. What matters is coordinating the check and the change, so two requests can’t both see old state and announce success." },
    { q: "Is this concert a real system?", a: "No. It’s a fictional teaching example." },
  ],

  interview: [
    "Define available, held and confirmed.",
    "Use a conditional update and a committed transaction for one valid hold.",
    "Record the owner and expiry; check them at confirmation.",
    "Verify the payment result, using an idempotency key on retries.",
    "Reconcile timeouts, duplicate events and late payments.",
  ],

  cheatsheet: {
    title: "Day 13 · Ticket booking",
    points: [
      "Available, held, confirmed: a hold isn’t a ticket",
      "Conditional update; return success after the commit",
      "The screen isn’t the authority",
      "Check expiry at confirmation, whatever cleanup has done",
      "A timeout isn’t a failure: stable key and status check",
      "Late payment: reconcile, never double confirm",
      "Webhooks repeat, so handle them idempotently",
    ],
  },

  linkedin:
    "Day 13/21 of System Design Essentials with Klymb.\n\nTwo people tap Book on one seat at the same time. The screen can’t decide who wins: a conditional database update inside a transaction does.\n\nThe interesting part is the late payment. If the hold expired and the seat went to someone else, you don’t confirm twice. You reconcile.\n\n#SystemDesign #Klymb",

  nextDay: "Day 14: a chat system. You sent a message and the internet cut out. Was it saved, delivered, or read?",
};

const hi: DayCopy = {
  tag: "Day 13 · Ticket booking",
  hookLines: [
    "Ek seat. Do log same time par Book dabate hain.",
    "Dono ki screen par seat available dikhi.",
    "Dono ko confirmation mil gayi toh A12 par kaun baithega?",
  ],
  question: "Kaise pakka karoge ki ek seat ka at most ek valid holder ho, chahe sab kuch galat ho jaye?",

  pre: [
    {
      id: "pre-1",
      scenario: "Do users ko seat A12 available dikhti hai aur dono Book dabate hain.",
      prompt: "Winner kaun decide karta hai?",
      choices: [
        { text: "Authoritative database, transaction ke andar conditional update se", why: "Sahi. Screen ka old data final authority nahi hai.", best: true },
        { text: "Jis screen par pehle available dikha", why: "Dono screens old data dikha rahi ho sakti hain." },
        { text: "Dono jeet sakte hain, venue par sort ho jayega", why: "Ek seat ki do successful bookings acceptable nahi." },
      ],
    },
    {
      id: "pre-2",
      scenario: "User ke paas seat ka hold hai, aur screen ke timer mein abhi time bacha hai.",
      prompt: "Kya screen ka timer authority hai?",
      choices: [
        { text: "Nahi: confirm karte waqt system actual hold ownership aur expiry check karta hai", why: "Haan. User ko timer dikh sakta hai, par woh kuch decide nahi karta.", best: true },
        { text: "Haan: screen par time hai toh hold valid hai", why: "Screen galat ya purani ho sakti hai." },
        { text: "Haan, jab cleanup job chal jaye", why: "Correctness cleanup ke time par depend nahi honi chahiye." },
      ],
    },
    {
      id: "pre-3",
      scenario: "Payment request timeout ho jaati hai.",
      prompt: "Kya assume karna chahiye?",
      choices: [
        { text: "Yeh nahi ki fail hui: provider ne process kar li ho sakti hai, toh status check karo", why: "Sahi. Same payment blindly dobara bhejne par duplicate charge ka risk hai.", best: true },
        { text: "Fail hui, toh dobara bhejo", why: "Aise hi logon se do baar paise katte hain." },
        { text: "Success hui, toh seat confirm karo", why: "Required result verify karne ke baad hi confirm karo." },
      ],
    },
  ],

  revealTitle: "Ek seat, ek holder",
  revealSub: "ek fictional concert, simplified",
  reveal: [
    { when: "Requirement", what: "Feed mein kuch seconds ka delay product ke hisaab se acceptable ho sakta hai. Ek seat ki do successful bookings nahi. Isliye: ek time par at most ek valid holder, aur har successful confirmation ka clear record." },
    { when: "States", what: "Available: seat free hai. Held: ek user ke liye limited time reserve. Confirmed: booking complete. Hold temporary hota hai, confirmed ticket nahi, aur expire ya release hone par seat phir available ho sakti hai. Real systems mein cancellation aur refund states bhi ho sakte hain." },
    { when: "Conditional update", what: "Seat tabhi hold karo jab woh abhi available ho. Database ki concurrency guarantees aur transaction competing attempts handle karte hain: ek update commit hone ke baad doosri attempt ko seat unavailable milti hai. Hold ka success commit ke baad hi return karo." },
    { when: "Hold aur expiry", what: "User aur expiry time record karo. Is example mein five minutes maano: yeh product assumption hai, universal rule nahi. Confirm karte waqt ownership aur expiry sach mein check karo. Cleanup expired holds release kar sakta hai, par correctness uske time par depend nahi honi chahiye." },
    { when: "Payment", what: "Jab tak required payment result aur valid hold verify na ho, payment pending dikhao. Sirf payment request bhejne se booking confirmed nahi hoti. Timeout par stable idempotency key, provider status check aur supported retry behaviour use karo." },
    { when: "Late payment", what: "User A ka hold expire hua aur seat user B ko mil gayi. Phir A ki successful payment aayi. A ko bhi confirm mat karo. Current seat state check karke reconcile karo: refund ya product-defined workflow. Refund external hai, toh track karo. Webhooks repeat ho sakte hain, toh events idempotently handle karo." },
  ],

  explain: {
    title: "Aaj ke words",
    items: [
      { term: "Hold", what: "Ek user ke liye temporary reservation. Confirmed booking nahi.", example: "Held: expire ya release hone tak reserve" },
      { term: "Conditional update", what: "Change jo tabhi lagta hai jab condition abhi true ho.", example: "A12 tabhi hold karo jab abhi available ho" },
      { term: "Commit", what: "Woh point jahan transaction ke changes effect mein aate hain. Success tabhi bolo.", example: "Commit ke baad hold return karo" },
      { term: "Reconciliation", what: "Jo hua use current state se milana, phir mismatch resolve karna.", example: "Aisi seat ki late payment jo ab kisi aur ki hai" },
      { term: "Webhook", what: "Provider ka aapke system ko call karke event batana. Ek se zyada baar aa sakta hai.", example: "Payment-success event, idempotently handle" },
    ],
  },

  concept: {
    cards: [{
      name: "Seat ko bachao",
      examples: ["Available, held, confirmed", "Transaction mein conditional update"],
      moves: ["Screen ke old data par bharosa mat karo", "Commit ke baad success return karo", "Confirm karte waqt expiry check karo"],
    }, {
      name: "Payment ko sambhalo",
      examples: ["Payment pending", "Timeouts aur late results"],
      moves: ["Stable idempotency key use karo", "Provider ka status check karo", "Late success reconcile karo: refund ya workflow"],
    }],
    rule: "Zaroorat ho toh queues aur servers se scale karo, par seat ka final decision authoritative storage ke concurrency rules ka hai.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Jis user ne payment poori nahi ki, uske liye reserve seat ka status kya hai?",
      choices: [
        { text: "Held: temporary reservation, confirmed booking nahi", why: "Sahi. Result verify hone tak payment pending dikhao.", best: true },
        { text: "Confirmed", why: "Sirf payment request bhejne se booking confirmed nahi hoti." },
        { text: "Available", why: "Woh hold expire ya release hone tak us user ke liye reserve hai." },
      ],
    },
    {
      id: "post-2",
      scenario: "Do requests same pal A12 hold karne ki koshish karti hain.",
      prompt: "Kya hona chahiye?",
      choices: [
        { text: "Ek update commit hota hai; doosre ko seat unavailable milti hai", why: "Haan. Check aur change coordinate hone chahiye.", best: true },
        { text: "Dono ko available dikha, toh dono success bolein", why: "Yahi bug yeh design rokta hai." },
        { text: "Dono hamesha fail hon", why: "Ek ko jeetna chahiye." },
      ],
    },
    {
      id: "post-3",
      scenario: "Cleanup job late chal raha hai, aur ek hold ka expiry time nikal chuka hai.",
      prompt: "User ab confirm karta hai. Kya hoga?",
      choices: [
        { text: "System khud expiry evaluate karta hai aur hold ko valid nahi maanta", why: "Sahi. Correctness cleanup ke time par depend nahi kar sakti.", best: true },
        { text: "Confirm ho jayega, kyunki cleanup ne hataya nahi", why: "Cleanup late hone se expired hold valid nahi ho jaata." },
        { text: "Poora system cleanup ka wait karega", why: "Cleanup madad karta hai, par confirmation expiry directly check karta hai." },
      ],
    },
    {
      id: "post-4",
      scenario: "A ka hold expire hua aur seat B ko mili. Ab A ki payment successful hui.",
      prompt: "System ko kya karna chahiye?",
      choices: [
        { text: "Seat state check karke A ki payment reconcile karo: refund ya defined workflow", why: "Haan. Aur refund track karo, woh bhi external process hai.", best: true },
        { text: "A ko bhi confirm karo", why: "Yeh double booking hai." },
        { text: "B se seat wapas le lo", why: "B ka hold valid hai. Resolve A ki payment ko karna hai." },
      ],
    },
    {
      id: "post-5",
      prompt: "Double booking rokne ke liye kya “distributed lock” bolna zaroori hai?",
      choices: [
        { text: "Nahi, jab database conditional update requirement handle kar sakta ho", why: "Sahi. Tool ka naam lena requirement poori karna nahi hai.", best: true },
        { text: "Haan: yahi ek tareeka hai", why: "Transactions ke saath conditional update yeh kar sakta hai." },
        { text: "Haan: zyada servers ko hamesha iski zaroorat hoti hai", why: "Ownership authoritative storage ke rules se decide hoti hai." },
      ],
    },
  ],

  build: {
    title: "Ek seat safely book karo",
    intro: "Har piece ko uske kaam par drag karo. Ya ek tap karo, phir slot tap karo.",
    given: "Do users ko seat A12 chahiye",
    rows: [["update", "hold", "verify"], ["key", "webhook", "reconcile"]],
    rowLabels: ["Seat ko bachao", "Payment ko sambhalo"],
    slots: {
      update: { role: "Seat tabhi hold karo jab abhi available ho", answer: "update" },
      hold: { role: "Record karo ki seat kiske paas hai aur kab tak", answer: "hold" },
      verify: { role: "Confirm se pehle asli ownership aur expiry check karo", answer: "verify" },
      key: { role: "Repeated payment request ko do baar charge karne se roko", answer: "key" },
      webhook: { role: "Do baar aaye payment event ko safely process karo", answer: "webhook" },
      reconcile: { role: "Haari hui seat ki successful payment resolve karo", answer: "reconcile" },
    },
    chips: [
      { id: "reconcile", label: "Reconciliation workflow", does: "valid hold na hone par late payment ke liye refund ya defined resolution shuru karna" },
      { id: "timer", label: "Screen ka timer", does: "user ko time dikhana, bina kuch decide kiye" },
      { id: "hold", label: "Hold record", does: "seat, owner aur expiry store karna" },
      { id: "webhook", label: "Idempotent event handling", does: "same payment event ko ek se zyada baar safely process karna" },
      { id: "update", label: "Conditional update", does: "condition sach ho tabhi seat badalna, transaction mein" },
      { id: "key", label: "Stable idempotency key", does: "retry ko same payment ke roop mein pehchanna" },
      { id: "verify", label: "Confirmation par check", does: "ownership aur expiry ko authoritative state se verify karna" },
    ],
    done: "Seat ke liye conditional update, hold record aur asli check, phir payment ke liye idempotency key, safe event handling aur reconciliation.",
  },

  design: {
    title: "Double booking roko",
    brief: "Interviewer kehta hai: “Design a ticket booking system and prevent double booking.” Apna answer likho: states, ek holder kaise jeetta hai, aur payment timeouts aur late results kaise handle karoge.",
    constraints: [
      "Ek seat, ek time par at most ek valid holder",
      "Screen ka data purana ho sakta hai",
      "Payments timeout, repeat ya late ho sakti hain",
    ],
    minChars: 100,
    walkthrough: [
      { heading: "Ek possible answer", points: ["Seat ke available, held aur confirmed states define karo.", "Conditional database update aur committed transaction se ek valid hold ensure karo.", "Payment result aur hold expiry verify karke confirm karo."] },
      { heading: "Jab kuch galat ho", points: ["Timeouts: stable idempotency key aur provider status check.", "Duplicate events: idempotent handling.", "Late payment: reconciliation workflow, jaise tracked refund."] },
    ],
    checklist: [
      "Maine seat ke states define kiye",
      "Maine conditional update use kiya aur commit ke baad success return kiya",
      "Maine confirmation par expiry check ki",
      "Maine timeout ko failure nahi maana",
      "Maine late payment ko double confirm kiye bina handle kiya",
    ],
  },

  followUps: [
    {
      q: "“Design a ticket booking system and prevent double booking.”",
      answer: [
        "Seat ke liye available, held aur confirmed states define karo.",
        "Conditional database update aur committed transaction ek valid hold ensure karte hain.",
        "Payment result aur hold expiry verify karke confirm karo, aur timeouts, duplicate events aur late payments ke liye reconciliation workflow rakho.",
      ],
      say: "“States, ek valid hold ke liye conditional update, payment aur expiry verify karke confirmation, aur baaki ke liye reconciliation.”",
    },
    {
      q: "“Hold expire hone ke baad payment aayi. Ab?”",
      answer: [
        "Current seat state check karo: woh kisi aur ki ho sakti hai.",
        "Us seat ki doosri booking confirm mat karo.",
        "Payment ko refund ya product-defined workflow se reconcile karo, aur status track karo.",
      ],
      say: "“Main kabhi double confirm nahi karunga. Seat check karke payment reconcile karunga, aur refund track karunga kyunki woh bhi fail ho sakta hai.”",
    },
    {
      q: "“Kya monitor karoge?”",
      answer: [
        "Hold conflicts.",
        "Payments kitni der se pending hain.",
        "Refunds stuck toh nahi.",
      ],
      say: "“Hold conflicts, pending payments ki age, aur stuck refunds.”",
    },
  ],

  faq: [
    { q: "Feed mein delay theek hai toh yahan kyun nahi?", a: "Feed mein kuch seconds ka delay product ke hisaab se acceptable ho sakta hai. Same seat ki do successful bookings nahi. Yeh correctness ka problem hai, sirf slow screen ka nahi." },
    { q: "Kya hold five minutes ka hi hona chahiye?", a: "Nahi. Five minutes is example ka product assumption hai, universal rule nahi." },
    { q: "Conditional update exactly kaise kaam karta hai?", a: "Implementation database aur isolation rules par depend karti hai. Zaroori yeh hai ki check aur change coordinate hon, taaki do requests old state dekhkar dono success na bolein." },
    { q: "Kya yeh concert real system hai?", a: "Nahi. Yeh ek fictional teaching example hai." },
  ],

  interview: [
    "Available, held aur confirmed define karo.",
    "Ek valid hold ke liye conditional update aur committed transaction.",
    "Owner aur expiry record karo; confirmation par check karo.",
    "Payment result verify karo, retries par idempotency key ke saath.",
    "Timeouts, duplicate events aur late payments reconcile karo.",
  ],

  cheatsheet: {
    title: "Day 13 · Ticket booking",
    points: [
      "Available, held, confirmed: hold ticket nahi hai",
      "Conditional update; commit ke baad success return karo",
      "Screen authority nahi hai",
      "Confirmation par expiry check karo, cleanup ne kuch bhi kiya ho",
      "Timeout failure nahi: stable key aur status check",
      "Late payment: reconcile karo, kabhi double confirm nahi",
      "Webhooks repeat hote hain, idempotently handle karo",
    ],
  },

  linkedin:
    "Day 13/21: System Design Essentials with Klymb.\n\nDo log ek seat par same time Book dabate hain. Screen decide nahi kar sakti kaun jeeta: transaction ke andar conditional database update karta hai.\n\nInteresting part late payment hai. Hold expire hua aur seat kisi aur ko mil gayi, toh do baar confirm nahi karte. Reconcile karte hain.\n\n#SystemDesign #Klymb",

  nextDay: "Day 14: chat system. Message bheja aur internet cut gaya. Saved hua, deliver hua, ya padha gaya?",
};

export const essentialsDayThirteen: Day = {
  day: 13,
  of: 21,
  app: "A concert booking app",
  minutes: 18,
  hook: { date: "Fictional example" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/essentials-day-13.mp4", poster: "/videos/system-design/essentials-day-13-poster.jpg", minutes: 5, lang: "Hinglish",
    // One horizontal cut with the captions burned in: it plays in the wide frame, and with no caption lines there's no subtitle switch.
    wide: { src: "/api/video/essentials-day-13.mp4", poster: "/videos/system-design/essentials-day-13-poster.jpg" },
  },
};
