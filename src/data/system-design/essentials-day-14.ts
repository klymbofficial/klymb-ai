/**
 * Day 14 of "System Design Essentials": design a chat system.
 * Built from the Day 14 video script. The chat app is a fictional teaching
 * example: one-to-one text with recent history, nothing about any real app.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Day 14 · Chat system",
  hookLines: [
    "You typed “Reached?” and tapped Send.",
    "The internet cut out.",
    "Did it reach the server? Their phone? Did they read it?",
  ],
  question: "How do you show an honest status when the network between you and your friend can’t be trusted?",

  pre: [
    {
      id: "pre-1",
      scenario: "A WebSocket connection between the phone and the server is open.",
      prompt: "Does that mean every message is durably saved?",
      choices: [
        { text: "No: a connection is a communication channel, and storage is separate", why: "Right. The network can drop and a gateway can restart.", best: true },
        { text: "Yes: an open connection saves the messages", why: "A connection only carries them." },
        { text: "Yes, if the gateway keeps them in memory", why: "Gateway memory isn’t enough for offline history." },
      ],
    },
    {
      id: "pre-2",
      scenario: "A message was saved, but the acknowledgement never reached the sender, so the client retries.",
      prompt: "What should the retry use?",
      choices: [
        { text: "The same stable client message ID", why: "Yes. A new ID on retry can create a duplicate message.", best: true },
        { text: "A fresh ID, so that it looks new", why: "That’s exactly how a duplicate gets created." },
        { text: "No ID at all", why: "Then there’s nothing to recognise the repeat by." },
      ],
    },
    {
      id: "pre-3",
      scenario: "The recipient is offline and may get a push notification.",
      prompt: "Is the push the message’s guaranteed store?",
      choices: [
        { text: "No: the database is the history’s source; a push is only a useful signal", why: "Right. The device opens the app and syncs from the server.", best: true },
        { text: "Yes: a push always delivers the message", why: "Push depends on the device and permissions." },
        { text: "Yes: the database isn’t needed then", why: "Without the database there’s no history to sync." },
      ],
    },
  ],

  revealTitle: "Saved, delivered, read",
  revealSub: "a fictional one-to-one chat app, simplified",
  reveal: [
    { when: "Scope", what: "One-to-one text chat with recent history, and offline recipients get their messages later. Group chat, media and end-to-end encryption are separate requirements you can discuss, and today’s flow doesn’t claim to implement them." },
    { when: "The connection", what: "In request-response, the client asks and the server answers. Chat also needs the server to send new messages promptly. A WebSocket is one option: once established, both sides can send messages. But it’s only transport, not storage." },
    { when: "The message flow", what: "The client sends the message and a unique client-generated ID. A gateway routes it to the message service, which checks authorization and saves it in the database. After a successful durable save, the sender can get a saved acknowledgement. Then the system tries to deliver." },
    { when: "Honest statuses", what: "Saved: the server persisted the message and acknowledged it. Delivered: as you define it, such as the recipient’s device acknowledging it. Read: per the product’s rules, and a read receipt was reported. Read receipts can be optional. No receipt doesn’t mean it didn’t happen: the status can be unknown." },
    { when: "Retries and duplicates", what: "Retry with the same stable ID. Enforce uniqueness on conversation, sender and message ID, and keep the check and insert atomic, because two retries can arrive together. Deliveries can repeat too, so the recipient’s client should avoid showing the same ID twice." },
    { when: "Ordering and reconnecting", what: "Don’t blindly rely on phone clocks. If the product needs per-conversation order, the service can assign a sequence, though reliable assignment has a cost at scale. On reconnect, the client fetches messages after its last known cursor. If strict order isn’t required, simpler choices are possible." },
  ],

  explain: {
    title: "The words from today",
    items: [
      { term: "WebSocket", what: "A connection that, once established, lets client and server exchange messages in both directions.", example: "One option for real-time chat. Transport, not storage" },
      { term: "Gateway", what: "The entry point clients connect to, which routes requests to the message service.", example: "It can restart, so it can’t be the store" },
      { term: "Client message ID", what: "A unique ID the client generates for a message, kept the same on retries.", example: "The same ID on every retry" },
      { term: "Sequence", what: "An order number the service assigns within a conversation.", example: "101, 102, 103" },
      { term: "Cursor", what: "A marker for the last message the client knows about.", example: "On reconnect, fetch everything after 101" },
    ],
  },

  concept: {
    cards: [{
      name: "The connection carries",
      examples: ["WebSocket or another channel", "Delivery attempts and push signals"],
      moves: ["Expect it to drop", "Don’t treat it as storage", "Treat push as a signal"],
    }, {
      name: "The database remembers",
      examples: ["Message history", "Unique message IDs"],
      moves: ["Acknowledge after the durable save", "Enforce uniqueness atomically", "Sync from it on reconnect"],
    }],
    rule: "Define what each status means, and show unknown when you don’t have a receipt.",
  },

  post: [
    {
      id: "post-1",
      prompt: "When should the sender get a saved acknowledgement?",
      choices: [
        { text: "After a successful durable save in the database", why: "Right. What durable means depends on the database’s configuration and failure guarantees.", best: true },
        { text: "As soon as the gateway receives the message", why: "The gateway only routes it. It hasn’t been saved yet." },
        { text: "When the recipient reads it", why: "That’s a read receipt, a different event." },
      ],
    },
    {
      id: "post-2",
      scenario: "No read receipt has come in.",
      prompt: "What can you conclude?",
      choices: [
        { text: "Nothing certain: the status can be unknown, and receipts may be disabled", why: "Yes. Read receipts can be optional under privacy settings.", best: true },
        { text: "The recipient definitely hasn’t read it", why: "No receipt doesn’t prove it didn’t happen." },
        { text: "The message was lost", why: "It may be saved and delivered." },
      ],
    },
    {
      id: "post-3",
      scenario: "Two retries of the same message arrive at the same moment.",
      prompt: "What prevents a second logical message?",
      choices: [
        { text: "Atomic check and insert, with uniqueness on conversation, sender and message ID", why: "Right. Both requests can’t then create a record.", best: true },
        { text: "A separate check, then a separate insert", why: "Both retries could pass the check together." },
        { text: "The sender’s phone clock", why: "Clocks don’t stop duplicates." },
      ],
    },
    {
      id: "post-4",
      scenario: "Both users send a message at almost the same time, and the product needs a per-conversation order.",
      prompt: "What’s a sound approach?",
      choices: [
        { text: "Have the service assign a sequence, accepting the coordination it costs", why: "Yes. Blindly trusting phone clocks can give a confusing order.", best: true },
        { text: "Sort by each phone’s clock", why: "That can give a confusing order." },
        { text: "Order doesn’t matter in any chat product", why: "That’s a requirement to clarify, not assume." },
      ],
    },
    {
      id: "post-5",
      prompt: "A phone reconnects after being offline. How does it catch up?",
      choices: [
        { text: "It fetches the messages after its last known cursor or sequence", why: "Right. Stable IDs handle late or repeated deliveries.", best: true },
        { text: "It waits for every push to arrive", why: "Push isn’t a guaranteed store." },
        { text: "It can’t: those messages are gone", why: "They’re in the database." },
      ],
    },
  ],

  build: {
    title: "Send “Reached?” reliably",
    intro: "Drag each piece to the job it does. You can also tap one, then tap a slot.",
    given: "A sender taps Send",
    rows: [["socket", "database", "id"], ["cursor", "push", "sequence"]],
    rowLabels: ["Sending the message", "Reaching the other side"],
    slots: {
      socket: { role: "Carry messages both ways once it’s connected", answer: "socket" },
      database: { role: "Keep the message for offline recipients", answer: "database" },
      id: { role: "Make a retry count as the same message", answer: "id" },
      cursor: { role: "Find what a reconnecting phone missed", answer: "cursor" },
      push: { role: "Wake up an offline recipient", answer: "push" },
      sequence: { role: "Give a conversation a defined order", answer: "sequence" },
    },
    chips: [
      { id: "sequence", label: "Service-assigned sequence", does: "numbering messages within a conversation" },
      { id: "clock", label: "The phone’s clock", does: "a time that can give a confusing order" },
      { id: "socket", label: "WebSocket", does: "a two-way connection: transport, not storage" },
      { id: "cursor", label: "Last known cursor", does: "marking the last message the client has" },
      { id: "id", label: "Stable client message ID", does: "an ID kept the same on every retry" },
      { id: "push", label: "Push notification", does: "a useful signal, not guaranteed storage" },
      { id: "database", label: "Database", does: "the source of the message history" },
    ],
    done: "A connection, a database and a stable ID to send, then a cursor, a push and a sequence to reach the other side in a defined order.",
  },

  canvas: {
    title: "Draw it from scratch: the message path",
    brief: "Draw how a message travels: the client connects through a load balancer to an app server standing in for the gateway and message service, which saves the message to the database. Add a session store that records which server a recipient is connected to.",
    parts: ["client", "lb", "server", "session", "database", "cdn", "storage"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.08, y: 0.5 }, { id: "l", part: "lb", x: 0.32, y: 0.5 },
        { id: "s", part: "server", x: 0.58, y: 0.5 }, { id: "n", part: "session", x: 0.88, y: 0.18 },
        { id: "d", part: "database", x: 0.88, y: 0.82 },
      ],
      edges: [["c", "l"], ["l", "s"], ["s", "n"], ["s", "d"]],
    },
    why: {
      "client>lb": "Clients connect to one entry point, so they don’t need to know the individual servers.",
      "lb>server": "The connection reaches a server, which routes the message and checks authorization.",
      "server>session": "To reach a connected recipient, the server needs to know where their connection is. That’s temporary state, not history.",
      "server>database": "The message is saved durably before the saved acknowledgement. An offline recipient syncs from here later.",
    },
    done: "Connections go through a server, the database holds the history, and connection info stays separate. Mention the stable ID and reconnect sync when you explain it.",
  },

  followUps: [
    {
      q: "“Design a basic chat system.”",
      answer: [
        "Confirm the scope: one-to-one messaging and offline history.",
        "Consider a WebSocket for real-time communication, and persist messages in the database.",
        "Define saved, delivered and read; use stable IDs and duplicate handling for retries; sync missing messages on reconnect.",
      ],
      say: "“A WebSocket for real time, the database for history, defined statuses, stable IDs for retries, and sync on reconnect.”",
    },
    {
      q: "“The acknowledgement was lost. What stops a duplicate?”",
      answer: [
        "The client retries with the same stable message ID.",
        "The database enforces uniqueness on conversation, sender and message ID, atomically.",
        "Deliveries can repeat too, so the recipient’s client avoids displaying the same ID twice.",
      ],
      say: "“The same ID on retry, atomic uniqueness in the database, and the recipient’s client skipping an ID it already shows.”",
      deeper: "Day 8",
    },
    {
      q: "“What about groups or encryption?”",
      answer: [
        "They’re separate requirements to discuss, and today’s flow doesn’t implement them.",
        "Multiple devices also raise questions about each device’s receipts and sync.",
        "Clarify what the product needs before adding them.",
      ],
      say: "“Those are separate requirements. I’d clarify them first rather than claim this design covers them.”",
    },
  ],

  faq: [
    { q: "Must chat use a WebSocket?", a: "No. It’s one option for two-way communication. Whatever you use, the channel isn’t the storage." },
    { q: "Is strict message order always needed?", a: "No. If the app doesn’t require strict order, simpler choices are possible, so clarify the requirement. A reliable sequence can add coordination and cost." },
    { q: "Is “delivered” a fixed definition?", a: "No. You define it, for example as the recipient’s device acknowledging the message. Clearly defined labels matter in both the product and the interview." },
    { q: "Is this a real chat app’s design?", a: "No. It’s a fictional teaching example." },
  ],

  interview: [
    "Confirm one-to-one messaging and offline history.",
    "Consider a WebSocket for real-time communication.",
    "Persist messages, then acknowledge saved.",
    "Define saved, delivered and read, and allow unknown.",
    "Stable IDs for retries, and sync missing messages on reconnect.",
  ],

  cheatsheet: {
    title: "Day 14 · Chat system",
    points: [
      "Saved, delivered and read are different events",
      "A WebSocket is transport, not storage",
      "Acknowledge saved after the durable save",
      "Same client message ID on every retry",
      "Atomic uniqueness stops a second logical message",
      "Don’t blindly trust phone clocks for order",
      "Push is a signal; the database is the history",
    ],
  },

  linkedin:
    "Day 14/21 of System Design Essentials with Klymb.\n\nYou tap Send and the internet cuts out. Saved, delivered and read are three separate events, and no receipt doesn’t mean it didn’t happen.\n\nThe design: a connection for transport, a database for history, the same message ID on every retry, and sync on reconnect.\n\n#SystemDesign #Klymb",

  nextDay: "Day 15: video streaming. How do you store, deliver and play a video when viewers are on different network speeds?",
};

const hi: DayCopy = {
  tag: "Day 14 · Chat system",
  hookLines: [
    "Aapne likha “Reached?” aur Send dabaya.",
    "Internet cut ho gaya.",
    "Message server tak gaya? Friend ke phone tak? Usne padh liya?",
  ],
  question: "Jab network par bharosa nahi kar sakte, toh honest status kaise dikhaoge?",

  pre: [
    {
      id: "pre-1",
      scenario: "Phone aur server ke beech WebSocket connection open hai.",
      prompt: "Kya iska matlab har message durably save ho gaya?",
      choices: [
        { text: "Nahi: connection communication channel hai, storage alag hai", why: "Sahi. Network drop ho sakta hai aur gateway restart ho sakta hai.", best: true },
        { text: "Haan: open connection messages save karta hai", why: "Connection unhe sirf le jaata hai." },
        { text: "Haan, agar gateway unhe memory mein rakhe", why: "Offline history ke liye gateway ki memory enough nahi." },
      ],
    },
    {
      id: "pre-2",
      scenario: "Message save ho gaya, par acknowledgement sender tak nahi aayi, toh client retry karta hai.",
      prompt: "Retry mein kya use hona chahiye?",
      choices: [
        { text: "Wahi stable client message ID", why: "Haan. Retry par nayi ID se duplicate message ban sakta hai.", best: true },
        { text: "Nayi ID, taaki naya lage", why: "Duplicate aise hi banta hai." },
        { text: "Koi ID nahi", why: "Phir repeat pehchanne ka koi tareeka nahi." },
      ],
    },
    {
      id: "pre-3",
      scenario: "Recipient offline hai aur use push notification mil sakti hai.",
      prompt: "Kya push message ka guaranteed storage hai?",
      choices: [
        { text: "Nahi: history ka source database hai; push bas useful signal hai", why: "Sahi. Device app khol kar server se sync karta hai.", best: true },
        { text: "Haan: push hamesha message deliver karta hai", why: "Push device aur permissions par depend karta hai." },
        { text: "Haan: phir database ki zaroorat nahi", why: "Database ke bina sync karne ko history hi nahi." },
      ],
    },
  ],

  revealTitle: "Saved, delivered, read",
  revealSub: "ek fictional one-to-one chat app, simplified",
  reveal: [
    { when: "Scope", what: "One-to-one text chat, recent history, aur offline recipient ko message baad mein mile. Group chat, media aur end-to-end encryption alag requirements hain jinhe discuss kar sakte ho, aur aaj ka flow unhe implement karne ka claim nahi karta." },
    { when: "Connection", what: "Request-response mein client poochta hai aur server jawab deta hai. Chat mein server ko bhi naye messages promptly bhejne hote hain. WebSocket ek option hai: connect hone ke baad dono sides messages bhej sakte hain. Par woh sirf transport hai, storage nahi." },
    { when: "Message flow", what: "Client message aur ek unique client-generated ID bhejta hai. Gateway use message service tak route karta hai, jo authorization check karke database mein save karti hai. Successful durable save ke baad sender ko saved acknowledgement mil sakta hai. Phir system deliver karne ki koshish karta hai." },
    { when: "Honest statuses", what: "Saved: server ne persist karke acknowledge kiya. Delivered: jaisa aap define karo, jaise recipient device ne acknowledge kiya. Read: product ke rules ke hisaab se, aur read receipt report hui. Read receipts optional ho sakti hain. Receipt nahi mili toh matlab yeh nahi ki hua nahi: status unknown ho sakta hai." },
    { when: "Retries aur duplicates", what: "Same stable ID se retry karo. Conversation, sender aur message ID par uniqueness enforce karo, aur check aur insert atomic rakho, kyunki do retries saath aa sakti hain. Deliveries bhi repeat ho sakti hain, toh recipient ka client same ID do baar na dikhaye." },
    { when: "Ordering aur reconnect", what: "Phone clocks par blindly depend mat karo. Product ko per-conversation order chahiye toh service sequence assign kar sakti hai, par scale par uski keemat hai. Reconnect par client apne last known cursor ke baad ke messages fetch karta hai. Strict order zaroori nahi toh simpler choices possible hain." },
  ],

  explain: {
    title: "Aaj ke words",
    items: [
      { term: "WebSocket", what: "Connection jo establish hone ke baad client aur server ko dono directions mein messages exchange karne deta hai.", example: "Real-time chat ka ek option. Transport, storage nahi" },
      { term: "Gateway", what: "Entry point jisse clients connect karte hain, jo requests ko message service tak route karta hai.", example: "Restart ho sakta hai, isliye store nahi ban sakta" },
      { term: "Client message ID", what: "Client ka banaya unique ID, jo retries par same rehta hai.", example: "Har retry par wahi ID" },
      { term: "Sequence", what: "Conversation ke andar service ka diya order number.", example: "101, 102, 103" },
      { term: "Cursor", what: "Client ko pata aakhri message ka marker.", example: "Reconnect par 101 ke baad ka sab fetch karo" },
    ],
  },

  concept: {
    cards: [{
      name: "Connection le jaata hai",
      examples: ["WebSocket ya koi aur channel", "Delivery attempts aur push signals"],
      moves: ["Uske drop hone ki umeed rakho", "Use storage mat samjho", "Push ko signal samjho"],
    }, {
      name: "Database yaad rakhta hai",
      examples: ["Message history", "Unique message IDs"],
      moves: ["Durable save ke baad acknowledge karo", "Uniqueness atomically enforce karo", "Reconnect par usi se sync karo"],
    }],
    rule: "Har status ka matlab define karo, aur receipt na ho toh unknown dikhao.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Sender ko saved acknowledgement kab milna chahiye?",
      choices: [
        { text: "Database mein successful durable save ke baad", why: "Sahi. Durable ka matlab database configuration aur failure guarantees par depend karta hai.", best: true },
        { text: "Gateway ko message milte hi", why: "Gateway sirf route karta hai. Abhi save nahi hua." },
        { text: "Jab recipient padh le", why: "Woh read receipt hai, alag event." },
      ],
    },
    {
      id: "post-2",
      scenario: "Read receipt nahi aayi.",
      prompt: "Kya conclude kar sakte ho?",
      choices: [
        { text: "Kuch pakka nahi: status unknown ho sakta hai, aur receipts disabled ho sakti hain", why: "Haan. Privacy settings mein read receipts optional ho sakti hain.", best: true },
        { text: "Recipient ne definitely nahi padha", why: "Receipt na aana yeh prove nahi karta." },
        { text: "Message kho gaya", why: "Woh saved aur delivered ho sakta hai." },
      ],
    },
    {
      id: "post-3",
      scenario: "Same message ki do retries same pal aati hain.",
      prompt: "Doosra logical message kaun rokta hai?",
      choices: [
        { text: "Atomic check aur insert, conversation, sender aur message ID par uniqueness ke saath", why: "Sahi. Phir dono requests record nahi bana sakti.", best: true },
        { text: "Alag check, phir alag insert", why: "Dono retries saath check paas kar sakti hain." },
        { text: "Sender ke phone ka clock", why: "Clock duplicates nahi rokta." },
      ],
    },
    {
      id: "post-4",
      scenario: "Dono users lagbhag ek saath message bhejte hain, aur product ko per-conversation order chahiye.",
      prompt: "Sound approach kya hai?",
      choices: [
        { text: "Service sequence assign kare, coordination ki keemat maan kar", why: "Haan. Phone clocks par blindly depend karne se confusing order aa sakta hai.", best: true },
        { text: "Har phone ke clock se sort karo", why: "Isse confusing order aa sakta hai." },
        { text: "Kisi chat product mein order matter nahi karta", why: "Yeh requirement clarify karne ki baat hai, assume karne ki nahi." },
      ],
    },
    {
      id: "post-5",
      prompt: "Phone offline ke baad reconnect hua. Woh kaise catch up karta hai?",
      choices: [
        { text: "Apne last known cursor ya sequence ke baad ke messages fetch karta hai", why: "Sahi. Late ya repeated deliveries stable IDs se handle hoti hain.", best: true },
        { text: "Har push ke aane ka wait karta hai", why: "Push guaranteed store nahi hai." },
        { text: "Nahi kar sakta: woh messages gaye", why: "Woh database mein hain." },
      ],
    },
  ],

  build: {
    title: "“Reached?” ko reliably bhejo",
    intro: "Har piece ko uske kaam par drag karo. Ya ek tap karo, phir slot tap karo.",
    given: "Sender Send dabata hai",
    rows: [["socket", "database", "id"], ["cursor", "push", "sequence"]],
    rowLabels: ["Message bhejna", "Doosri side tak pahunchna"],
    slots: {
      socket: { role: "Connect hone ke baad messages dono taraf le jao", answer: "socket" },
      database: { role: "Offline recipient ke liye message rakho", answer: "database" },
      id: { role: "Retry ko same message maano", answer: "id" },
      cursor: { role: "Reconnect hote phone ke chhoote messages dhoondho", answer: "cursor" },
      push: { role: "Offline recipient ko jagao", answer: "push" },
      sequence: { role: "Conversation ko defined order do", answer: "sequence" },
    },
    chips: [
      { id: "sequence", label: "Service ka sequence", does: "conversation ke andar messages ko number dena" },
      { id: "clock", label: "Phone ka clock", does: "aisa time jisse confusing order aa sakta hai" },
      { id: "socket", label: "WebSocket", does: "two-way connection: transport, storage nahi" },
      { id: "cursor", label: "Last known cursor", does: "client ke paas aakhri message ka marker" },
      { id: "id", label: "Stable client message ID", does: "har retry par same rehne wali ID" },
      { id: "push", label: "Push notification", does: "useful signal, guaranteed storage nahi" },
      { id: "database", label: "Database", does: "message history ka source" },
    ],
    done: "Bhejne ke liye connection, database aur stable ID, phir doosri side tak defined order mein pahunchne ke liye cursor, push aur sequence.",
  },

  canvas: {
    title: "Scratch se draw karo: message ka raasta",
    brief: "Message ka raasta draw karo: client load balancer ke through app server se connect hota hai, jo gateway aur message service ki jagah hai, aur message database mein save karta hai. Ek session store add karo jo record kare ki recipient kis server se connected hai.",
    parts: ["client", "lb", "server", "session", "database", "cdn", "storage"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.08, y: 0.5 }, { id: "l", part: "lb", x: 0.32, y: 0.5 },
        { id: "s", part: "server", x: 0.58, y: 0.5 }, { id: "n", part: "session", x: 0.88, y: 0.18 },
        { id: "d", part: "database", x: 0.88, y: 0.82 },
      ],
      edges: [["c", "l"], ["l", "s"], ["s", "n"], ["s", "d"]],
    },
    why: {
      "client>lb": "Clients ek entry point se connect karte hain, unhe individual servers jaanne ki zaroorat nahi.",
      "lb>server": "Connection server tak pahunchta hai, jo message route karta hai aur authorization check karta hai.",
      "server>session": "Connected recipient tak pahunchne ke liye server ko pata hona chahiye connection kahan hai. Yeh temporary state hai, history nahi.",
      "server>database": "Saved acknowledgement se pehle message durably save hota hai. Offline recipient baad mein yahin se sync karta hai.",
    },
    done: "Connections server se jaate hain, database history rakhta hai, aur connection info alag rehti hai. Explain karte waqt stable ID aur reconnect sync bolo.",
  },

  followUps: [
    {
      q: "“Design a basic chat system.”",
      answer: [
        "Scope confirm karo: one-to-one messaging aur offline history.",
        "Real-time ke liye WebSocket consider karo, aur messages database mein persist karo.",
        "Saved, delivered aur read define karo; retries ke liye stable IDs aur duplicate handling; reconnect par missing messages sync karo.",
      ],
      say: "“Real time ke liye WebSocket, history ke liye database, defined statuses, retries ke liye stable IDs, aur reconnect par sync.”",
    },
    {
      q: "“Acknowledgement kho gaya. Duplicate kaun rokega?”",
      answer: [
        "Client same stable message ID se retry karta hai.",
        "Database conversation, sender aur message ID par uniqueness atomically enforce karta hai.",
        "Deliveries bhi repeat ho sakti hain, toh recipient ka client same ID do baar nahi dikhata.",
      ],
      say: "“Retry par same ID, database mein atomic uniqueness, aur recipient ka client pehle se dikhi ID skip kare.”",
      deeper: "Day 8",
    },
    {
      q: "“Groups ya encryption ka kya?”",
      answer: [
        "Woh alag requirements hain, aur aaj ka flow unhe implement nahi karta.",
        "Multiple devices par har device ke receipts aur sync ke sawaal bhi aate hain.",
        "Add karne se pehle clarify karo product ko kya chahiye.",
      ],
      say: "“Woh alag requirements hain. Claim karne ke bajaye main pehle unhe clarify karunga.”",
    },
  ],

  faq: [
    { q: "Kya chat mein WebSocket zaroori hai?", a: "Nahi. Yeh two-way communication ka ek option hai. Jo bhi use karo, channel storage nahi hai." },
    { q: "Kya strict message order hamesha chahiye?", a: "Nahi. App ko strict order nahi chahiye toh simpler choices possible hain, toh requirement clarify karo. Reliable sequence mein coordination aur cost lagti hai." },
    { q: "Kya “delivered” ki definition fixed hai?", a: "Nahi. Aap define karte ho, jaise recipient device ka acknowledge karna. Clear labels product aur interview dono mein zaroori hain." },
    { q: "Kya yeh kisi real chat app ka design hai?", a: "Nahi. Yeh ek fictional teaching example hai." },
  ],

  interview: [
    "One-to-one messaging aur offline history confirm karo.",
    "Real-time ke liye WebSocket consider karo.",
    "Messages persist karo, phir saved acknowledge karo.",
    "Saved, delivered aur read define karo, aur unknown allow karo.",
    "Retries ke liye stable IDs, reconnect par missing messages sync.",
  ],

  cheatsheet: {
    title: "Day 14 · Chat system",
    points: [
      "Saved, delivered aur read alag events hain",
      "WebSocket transport hai, storage nahi",
      "Durable save ke baad saved acknowledge karo",
      "Har retry par same client message ID",
      "Atomic uniqueness doosra logical message rokti hai",
      "Order ke liye phone clocks par blindly bharosa nahi",
      "Push signal hai; history database hai",
    ],
  },

  linkedin:
    "Day 14/21: System Design Essentials with Klymb.\n\nSend dabaya aur internet cut gaya. Saved, delivered aur read teen alag events hain, aur receipt na aane ka matlab yeh nahi ki hua nahi.\n\nDesign: transport ke liye connection, history ke liye database, har retry par same message ID, aur reconnect par sync.\n\n#SystemDesign #Klymb",

  nextDay: "Day 15: video streaming. Viewers alag network speeds par hon toh video store, deliver aur play kaise karenge?",
};

export const essentialsDayFourteen: Day = {
  day: 14,
  of: 21,
  app: "A chat app",
  minutes: 18,
  hook: { date: "Fictional example" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/essentials-day-14.mp4", poster: "/videos/system-design/essentials-day-14-poster.jpg", minutes: 5, lang: "Hinglish",
    // One horizontal cut with the captions burned in: it plays in the wide frame, and with no caption lines there's no subtitle switch.
    wide: { src: "/api/video/essentials-day-14.mp4", poster: "/videos/system-design/essentials-day-14-poster.jpg" },
  },
};
