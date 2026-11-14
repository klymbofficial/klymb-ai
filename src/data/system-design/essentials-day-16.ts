/**
 * Day 16 of "System Design Essentials": revision, designing a whole system from
 * scratch. Built from the Day 16 video script. The file-sharing service and its
 * numbers are illustrative, not any company's question. Learners practise and
 * review on their own: there is no mock interview with a person or an evaluator.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Day 16 · Revision from scratch",
  hookLines: [
    "“Design a file-sharing service.”",
    "A blank whiteboard, and your mind goes blank too.",
    "Today, the first step is yours.",
  ],
  question: "Can you take a problem you’ve never seen from a blank board to a design you can explain?",

  pre: [
    {
      id: "pre-1",
      scenario: "You’re given the file-sharing question and an empty whiteboard.",
      prompt: "How do you start?",
      choices: [
        { text: "Understand what the system must do: size limits, who can access, expiry", why: "Right. Clarify the scope before assuming every detail.", best: true },
        { text: "List load balancers, databases and caches", why: "Naming components isn’t yet solving the problem." },
        { text: "Draw the final architecture straight away", why: "You don’t yet know what to design for." },
      ],
    },
    {
      id: "pre-2",
      scenario: "In this design, someone has found out a file’s link.",
      prompt: "Do they automatically get access?",
      choices: [
        { text: "No: the app checks their authenticated identity and the file’s permissions", why: "Yes. In this design, knowing the link isn’t permission.", best: true },
        { text: "Yes: a link is all you need", why: "Not in this design." },
        { text: "Yes, if they ask politely in a comment", why: "Access comes from the permissions." },
      ],
    },
    {
      id: "pre-3",
      scenario: "A file’s upload was cut off partway.",
      prompt: "What should its status be?",
      choices: [
        { text: "Not ready: it stays uploading, and the user can get an option to retry", why: "Right. Ready comes only after completion and required validation.", best: true },
        { text: "Ready, since the upload began", why: "Accepting a request doesn’t make the file ready." },
        { text: "Ready, if most of it arrived", why: "A partial file isn’t a ready file." },
      ],
    },
  ],

  revealTitle: "One possible approach",
  revealSub: "an illustrative practice question, with assumptions",
  reveal: [
    { when: "Requirements", what: "Ask about the maximum file size, public links or specific users, expiry and resuming. For this walkthrough: an authenticated user uploads, and the owner gives selected users access. Simple upload and download first. These are our assumptions, not a universal design." },
    { when: "Estimate", what: "Assume 10,000 files a day at an average of 10 MB. That’s 100,000 MB a day, about 100 GB in decimal units. It’s a sample, and replicas, overhead, retention and downloads aren’t included. It informs capacity, storage cost and network needs." },
    { when: "API and data", what: "Give each file a unique ID and a storage key. The bytes live in object storage. The database holds metadata: owner, file ID, status and access rules. Sharing lets the owner give a user access, and opening a file checks identity and permissions." },
    { when: "Upload flow", what: "The app checks authorization and can issue a limited-scope, short-lived upload URL, so the client uploads directly to object storage. After completion and required validation, the metadata is marked ready. If file checks are required, complete them before the file is available." },
    { when: "Download flow", what: "The app first checks access. If authorized, it can issue a short-lived scoped link, or proxy the content in a chosen design. Otherwise, access is denied. A signed link gives its holder access while it’s valid, so choose its duration and exposure carefully." },
    { when: "Failure and revoked access", what: "Partial uploads aren’t ready. Handle duplicate completion calls safely, and have a cleanup policy for abandoned uploads. If access is revoked while a link is valid, it may work until it expires. Immediate revocation needs a proxy or token-checking design, at some latency and cost." },
  ],

  explain: {
    title: "The words from today",
    items: [
      { term: "Metadata", what: "Details about a file, kept apart from its bytes.", example: "Owner, file ID, status, access rules" },
      { term: "Storage key", what: "The identifier for where a file’s bytes are in object storage.", example: "Stored with the file’s metadata" },
      { term: "Signed URL", what: "A link that grants limited access while it’s valid. Scope it and let it expire.", example: "A short-lived scoped upload or download link" },
      { term: "Revocation", what: "Removing someone’s access.", example: "An issued link may still work until it expires" },
      { term: "Authorization-enforcing proxy", what: "A service that checks access while it passes the content along.", example: "Immediate revocation, with extra latency and cost" },
    ],
  },

  concept: {
    cards: [{
      name: "Solve it first",
      examples: ["Pause and set a timer", "Your own requirements, estimate and flows"],
      moves: ["Finish your answer before the reveal", "Label your assumptions", "Draw upload and download separately"],
    }, {
      name: "Review it honestly",
      examples: ["A self-review, or feedback from a peer", "Your weakest area"],
      moves: ["Can you give each decision’s reason?", "Revise the weakest area", "Explain it again in two minutes"],
    }],
    rule: "An example solution or a checklist doesn’t guarantee interview success: the practice is what’s useful.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Where do the file’s bytes and its access rules each live?",
      choices: [
        { text: "Bytes in object storage; owner, status and access rules in the database", why: "Right. Each store does the job it’s suited to.", best: true },
        { text: "Both in the app server’s memory", why: "That wouldn’t survive a restart." },
        { text: "Both in a cache", why: "A cache isn’t the source of truth." },
      ],
    },
    {
      id: "post-2",
      scenario: "The app gives a client a short-lived scoped URL to upload directly to object storage.",
      prompt: "What’s the point?",
      choices: [
        { text: "The file’s bytes don’t have to pass through the app server", why: "Yes. The URL must still be carefully scoped and set to expire.", best: true },
        { text: "It removes the need for authorization", why: "The app checks authorization before giving the URL." },
        { text: "It marks the file ready immediately", why: "Ready comes after completion and validation." },
      ],
    },
    {
      id: "post-3",
      scenario: "A user who isn’t authorized opens a file’s link.",
      prompt: "What should happen?",
      choices: [
        { text: "Access is denied, because the app checks access first", why: "Right. Only an authorized user gets a link or the content.", best: true },
        { text: "They get a short-lived link anyway", why: "A link would give them access." },
        { text: "They get the file’s metadata instead", why: "They have no access to that file." },
      ],
    },
    {
      id: "post-4",
      scenario: "The owner revokes a user’s access, but that user already has a valid signed link.",
      prompt: "What’s true?",
      choices: [
        { text: "The link may stay usable until it expires, unless you design for immediate revocation", why: "Yes. Clarify the required behaviour, since a proxy adds latency and cost.", best: true },
        { text: "Access always stops instantly", why: "In some designs a signed link works until its expiry." },
        { text: "It can never be stopped", why: "Shorter expiry or a proxy can address it." },
      ],
    },
    {
      id: "post-5",
      prompt: "What does the 100 GB a day estimate leave out?",
      choices: [
        { text: "Replicas, storage overhead, retention and downloads", why: "Right. And don’t size a whole system from one average.", best: true },
        { text: "The files uploaded that day", why: "That’s exactly what it counts." },
        { text: "Nothing: it’s the system’s total need", why: "It’s just the incoming file data, from a sample assumption." },
      ],
    },
  ],

  estimates: [
    {
      id: "est-1",
      prompt: "How much new file data arrives each day, in GB?",
      given: ["10,000 files uploaded per day (an assumption)", "An average size of 10 MB", "1,000 MB = 1 GB, in decimal units"],
      unit: "GB/day",
      answer: 100,
      tolerance: 0.1,
      working: ["10,000 × 10 MB = 100,000 MB per day.", "100,000 MB ÷ 1,000 = about 100 GB a day.", "That’s before replicas, overhead, retention and downloads."],
    },
  ],

  build: {
    title: "Share a file safely",
    intro: "Drag each piece to the job it does. You can also tap one, then tap a slot.",
    given: "“Design a file-sharing service.”",
    rows: [["storage", "metadata", "upload"], ["check", "link", "cleanup"]],
    rowLabels: ["Keep and upload", "Share and clean up"],
    slots: {
      storage: { role: "Hold the file’s actual bytes", answer: "storage" },
      metadata: { role: "Hold the owner, status and access rules", answer: "metadata" },
      upload: { role: "Let the client upload without going through the app", answer: "upload" },
      check: { role: "Decide if this person may open this file", answer: "check" },
      link: { role: "Give an authorized recipient the file, for a short time", answer: "link" },
      cleanup: { role: "Deal with uploads that were never finished", answer: "cleanup" },
    },
    chips: [
      { id: "cleanup", label: "Cleanup policy", does: "removing abandoned uploads, according to a policy" },
      { id: "knownlink", label: "Anyone who knows the link", does: "treating knowledge of a link as permission" },
      { id: "metadata", label: "Metadata database", does: "storing the file’s details, not its bytes" },
      { id: "check", label: "Identity and permission check", does: "verifying who’s asking and what they may access" },
      { id: "upload", label: "Short-lived scoped upload URL", does: "a limited link for uploading directly to storage" },
      { id: "storage", label: "Object storage", does: "a place for the file’s bytes" },
      { id: "link", label: "Short-lived scoped download link", does: "limited access for an authorized recipient" },
    ],
    done: "Object storage, metadata and a scoped upload URL to keep files; a permission check, a short-lived link and a cleanup policy to share them.",
  },

  canvas: {
    title: "Draw it from scratch: file sharing",
    brief: "Draw the whole service. The client asks the app server for permission. The server keeps the metadata in the database. The client uploads and downloads the bytes directly with object storage, using short-lived scoped links.",
    parts: ["client", "server", "database", "objects", "cache", "queue", "cdn"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.1, y: 0.5 }, { id: "s", part: "server", x: 0.5, y: 0.2 },
        { id: "d", part: "database", x: 0.88, y: 0.2 }, { id: "o", part: "objects", x: 0.5, y: 0.84 },
      ],
      edges: [["c", "s"], ["s", "d"], ["c", "o"]],
    },
    why: {
      "client>server": "The client asks the app first, which checks authorization and can issue a short-lived scoped link.",
      "server>database": "The app stores and checks the metadata: owner, file ID, status and access rules.",
      "client>objects": "With a scoped link, the bytes go directly to and from object storage, without passing through the app server.",
    },
    done: "Permission through the app, metadata in the database, and bytes directly with object storage. Add a CDN only after thinking through the bottleneck and private access.",
  },

  design: {
    title: "Your turn: design it from scratch",
    brief: "Design a service where a user can upload a file and authorized users can access it through a share link. Consider security, storage and failure. If you can, use the suggested split: 5 minutes for requirements, 5 for estimates, 5 for API and data, 12 for flows, 10 for failure and scaling, and 8 to explain and review.",
    constraints: [
      "Finish your own answer before reading the approach below",
      "Draw upload and download separately",
      "Explain one failure and one trade-off",
    ],
    minChars: 200,
    walkthrough: [
      { heading: "One possible approach", points: ["Clarify size limits, sharing, expiry and resuming.", "Estimate the incoming data, with labelled assumptions.", "Bytes in object storage; metadata in the database.", "Upload and download with short-lived scoped links, after checking access."] },
      { heading: "Failure and trade-offs", points: ["A partial upload isn’t marked ready; have a cleanup policy.", "Handle duplicate completion calls safely.", "Immediate revocation needs a proxy or token check, which adds latency and cost."] },
    ],
    checklist: [
      "I clarified the requirements",
      "I stated my estimate’s assumptions and units",
      "I drew upload and download separately",
      "I enforced permissions",
      "I explained a failure and a trade-off",
      "I can give the reason for each decision",
    ],
  },

  followUps: [
    {
      q: "“Access was revoked, but the user has a valid link. Does it stop?”",
      answer: [
        "A short-lived signed link can stay usable until it expires in some designs.",
        "If immediate revocation is required, consider an authorization-enforcing proxy or a suitable token check.",
        "That adds latency and infrastructure cost, so clarify the required behaviour first.",
      ],
      say: "“It may work until expiry. If I need it to stop instantly, I’d use a proxy or token check and accept the cost.”",
    },
    {
      q: "“An upload was cut off. What happens?”",
      answer: [
        "The file can be partially uploaded, so don’t mark it ready.",
        "Offer the user a retry. Resumable uploads need chunk tracking and cleanup, designed separately.",
        "Handle duplicate completion requests safely, with a cleanup policy for abandoned uploads.",
      ],
      say: "“It stays not ready, the user can retry, and a cleanup policy deals with abandoned uploads.”",
    },
    {
      q: "“Could you add a CDN?”",
      answer: [
        "It’s worth considering for repeated, public or appropriately authorized downloads.",
        "Private access controls must be preserved.",
        "Understand the bottleneck and the privacy requirements before adding it.",
      ],
      say: "“Possibly, once I’ve seen the bottleneck, and only in a way that keeps the private access controls.”",
      deeper: "Day 15",
    },
  ],

  faq: [
    { q: "Do I have to spend 45 minutes on this?", a: "It’s a suggested split for practising. An actual interview’s format can be different." },
    { q: "Is this a real company’s question?", a: "No. It’s an illustrative practice question, not a verified question from any company." },
    { q: "Who checks my answer?", a: "You do. It’s a self-review, using the checklist. If a mentor or peer is available, ask them for feedback too." },
    { q: "Does finishing this mean I’m ready for interviews?", a: "An example solution or a checklist doesn’t guarantee success. Choose your weakest area, revise your design, and explain it again in two minutes." },
  ],

  interview: [
    "Clarify the requirements and state your assumptions.",
    "Estimate, with units, and say what it leaves out.",
    "Separate the bytes in object storage from the metadata in the database.",
    "Walk through upload and download separately, enforcing permissions.",
    "Explain one failure, one trade-off, and the reason for each decision.",
  ],

  cheatsheet: {
    title: "Day 16 · Revision from scratch",
    points: [
      "Solve it yourself before seeing any approach",
      "Clarify first; label your assumptions and units",
      "Bytes in object storage; metadata in the database",
      "Knowing a link isn’t permission, in this design",
      "Signed links: short-lived and carefully scoped",
      "Partial uploads aren’t ready; have a cleanup policy",
      "Review yourself, then explain it again in two minutes",
    ],
  },

  linkedin:
    "Day 16/21 of System Design Essentials with Klymb.\n\nRevision day: I designed a file-sharing service from a blank board, before seeing any approach.\n\nBytes in object storage, metadata in a database, short-lived scoped links, and permissions checked first. The curveball: revoking access doesn’t always stop a link that’s already been issued.\n\n#SystemDesign #Klymb",

  nextDay: "Day 17: AI system design. When a user types a question, what actually happens between the app and the model?",
};

const hi: DayCopy = {
  tag: "Day 16 · Scratch se revision",
  hookLines: [
    "“Design a file-sharing service.”",
    "Blank whiteboard, aur mind bhi blank.",
    "Aaj pehla step aapka hai.",
  ],
  question: "Kya aap ek naye problem ko blank board se aise design tak le ja sakte ho jise explain kar sako?",

  pre: [
    {
      id: "pre-1",
      scenario: "Aapko file-sharing ka question aur khaali whiteboard mila hai.",
      prompt: "Shuru kaise karoge?",
      choices: [
        { text: "Samjho system ko karna kya hai: size limit, kaun access kar sakta hai, expiry", why: "Sahi. Har detail assume karne se pehle scope clear karo.", best: true },
        { text: "Load balancers, databases aur cache ke naam bolo", why: "Naam lena abhi problem solve karna nahi hai." },
        { text: "Seedha final architecture draw karo", why: "Abhi pata nahi design kis cheez ke liye hai." },
      ],
    },
    {
      id: "pre-2",
      scenario: "Is design mein kisi ko file ka link pata chal gaya.",
      prompt: "Kya use apne aap access mil jaata hai?",
      choices: [
        { text: "Nahi: app uski authenticated identity aur file permissions check karti hai", why: "Haan. Is design mein link pata hona permission nahi hai.", best: true },
        { text: "Haan: link hi kaafi hai", why: "Is design mein nahi." },
        { text: "Haan, agar comment mein politely maange", why: "Access permissions se aata hai." },
      ],
    },
    {
      id: "pre-3",
      scenario: "File ka upload beech mein cut ho gaya.",
      prompt: "Uska status kya hona chahiye?",
      choices: [
        { text: "Ready nahi: woh uploading rehta hai, aur user ko retry ka option mil sakta hai", why: "Sahi. Ready completion aur required validation ke baad hi.", best: true },
        { text: "Ready, kyunki upload shuru hua tha", why: "Request accept hone se file ready nahi hoti." },
        { text: "Ready, agar zyada tar aa gaya", why: "Partial file ready file nahi." },
      ],
    },
  ],

  revealTitle: "Ek possible approach",
  revealSub: "illustrative practice question, assumptions ke saath",
  reveal: [
    { when: "Requirements", what: "Maximum file size, public link ya specific users, expiry aur resume poochho. Is walkthrough mein: authenticated user upload karta hai, aur owner selected users ko access deta hai. Pehle simple upload aur download. Yeh humari assumptions hain, universal design nahi." },
    { when: "Estimate", what: "Maan lo roz 10,000 files, average 10 MB. Yeh 100,000 MB per day hai, decimal units mein lagbhag 100 GB. Yeh sample hai, aur replicas, overhead, retention aur downloads included nahi. Isse capacity, storage cost aur network needs samajh aati hain." },
    { when: "API aur data", what: "Har file ko unique ID aur storage key do. Bytes object storage mein. Database mein metadata: owner, file ID, status aur access rules. Sharing se owner kisi user ko access deta hai, aur file kholne par identity aur permissions check hoti hain." },
    { when: "Upload flow", what: "App authorization check karke limited-scope, short-lived upload URL de sakti hai, toh client directly object storage par upload karta hai. Completion aur required validation ke baad metadata ready mark hoti hai. File checks required hon toh availability se pehle complete karo." },
    { when: "Download flow", what: "App pehle access check karti hai. Authorized ho toh short-lived scoped link de sakti hai, ya chosen design mein content proxy kar sakti hai. Warna access deny. Signed link apni validity mein holder ko access deta hai, toh duration aur exposure carefully chuno." },
    { when: "Failure aur revoke", what: "Partial uploads ready nahi hote. Duplicate completion calls safely handle karo, aur abandoned uploads ki cleanup policy rakho. Valid link ke rehte access revoke ho toh woh expiry tak chal sakta hai. Immediate revocation ke liye proxy ya token-checking design, kuch latency aur cost ke saath." },
  ],

  explain: {
    title: "Aaj ke words",
    items: [
      { term: "Metadata", what: "File ki details, uske bytes se alag.", example: "Owner, file ID, status, access rules" },
      { term: "Storage key", what: "Object storage mein file ke bytes ki jagah ka identifier.", example: "File ki metadata ke saath stored" },
      { term: "Signed URL", what: "Link jo valid rehne tak limited access deta hai. Use scope karo aur expire hone do.", example: "Short-lived scoped upload ya download link" },
      { term: "Revocation", what: "Kisi ka access hatana.", example: "Issued link expiry tak chal sakta hai" },
      { term: "Authorization-enforcing proxy", what: "Service jo content aage bhejte hue access check karti hai.", example: "Immediate revocation, extra latency aur cost ke saath" },
    ],
  },

  concept: {
    cards: [{
      name: "Pehle khud solve karo",
      examples: ["Pause karke timer lagao", "Apni requirements, estimate aur flows"],
      moves: ["Reveal se pehle apna answer poora karo", "Assumptions label karo", "Upload aur download alag draw karo"],
    }, {
      name: "Honestly review karo",
      examples: ["Self-review, ya peer se feedback", "Aapka weakest area"],
      moves: ["Kya har decision ka reason bol pa rahe ho?", "Weakest area revise karo", "Do minute mein phir explain karo"],
    }],
    rule: "Example solution ya checklist interview success guarantee nahi karta: practice hi useful hai.",
  },

  post: [
    {
      id: "post-1",
      prompt: "File ke bytes aur access rules kahan rehte hain?",
      choices: [
        { text: "Bytes object storage mein; owner, status aur access rules database mein", why: "Sahi. Har store apne suited kaam karta hai.", best: true },
        { text: "Dono app server ki memory mein", why: "Yeh restart ke baad nahi bachega." },
        { text: "Dono cache mein", why: "Cache source of truth nahi hai." },
      ],
    },
    {
      id: "post-2",
      scenario: "App client ko directly object storage par upload ke liye short-lived scoped URL deti hai.",
      prompt: "Iska point kya hai?",
      choices: [
        { text: "File ke bytes ko app server se guzarna zaroori nahi", why: "Haan. URL ko phir bhi carefully scope aur expire karna hoga.", best: true },
        { text: "Isse authorization ki zaroorat khatam hoti hai", why: "URL dene se pehle app authorization check karti hai." },
        { text: "Isse file turant ready mark hoti hai", why: "Ready completion aur validation ke baad." },
      ],
    },
    {
      id: "post-3",
      scenario: "Jo user authorized nahi hai, woh file ka link kholta hai.",
      prompt: "Kya hona chahiye?",
      choices: [
        { text: "Access deny, kyunki app pehle access check karti hai", why: "Sahi. Sirf authorized user ko link ya content milta hai.", best: true },
        { text: "Phir bhi short-lived link mile", why: "Link use access de dega." },
        { text: "Use file ki metadata mile", why: "Us file ka access use nahi hai." },
      ],
    },
    {
      id: "post-4",
      scenario: "Owner ne user ka access revoke kiya, par us user ke paas already valid signed link hai.",
      prompt: "Kya sach hai?",
      choices: [
        { text: "Link expiry tak usable reh sakta hai, jab tak immediate revocation ke liye design na ho", why: "Haan. Required behaviour clarify karo, kyunki proxy latency aur cost badhata hai.", best: true },
        { text: "Access hamesha turant rukta hai", why: "Kuch designs mein signed link expiry tak chalta hai." },
        { text: "Use kabhi roka nahi ja sakta", why: "Shorter expiry ya proxy se address ho sakta hai." },
      ],
    },
    {
      id: "post-5",
      prompt: "Roz 100 GB wale estimate mein kya shamil nahi?",
      choices: [
        { text: "Replicas, storage overhead, retention aur downloads", why: "Sahi. Aur ek average se poore system ka sizing mat karo.", best: true },
        { text: "Us din upload hui files", why: "Yeh toh wahi ginta hai." },
        { text: "Kuch nahi: yeh system ki total need hai", why: "Yeh sample assumption se sirf incoming file data hai." },
      ],
    },
  ],

  estimates: [
    {
      id: "est-1",
      prompt: "Roz kitna naya file data aata hai, GB mein?",
      given: ["Roz 10,000 files upload (assumption)", "Average size 10 MB", "Decimal units mein 1,000 MB = 1 GB"],
      unit: "GB/day",
      answer: 100,
      tolerance: 0.1,
      working: ["10,000 × 10 MB = 100,000 MB per day.", "100,000 MB ÷ 1,000 = lagbhag 100 GB roz.", "Yeh replicas, overhead, retention aur downloads se pehle hai."],
    },
  ],

  build: {
    title: "File safely share karo",
    intro: "Har piece ko uske kaam par drag karo. Ya ek tap karo, phir slot tap karo.",
    given: "“Design a file-sharing service.”",
    rows: [["storage", "metadata", "upload"], ["check", "link", "cleanup"]],
    rowLabels: ["Rakhna aur upload", "Share aur cleanup"],
    slots: {
      storage: { role: "File ke actual bytes rakho", answer: "storage" },
      metadata: { role: "Owner, status aur access rules rakho", answer: "metadata" },
      upload: { role: "Client ko app se guzre bina upload karne do", answer: "upload" },
      check: { role: "Decide karo yeh insaan yeh file khol sakta hai ya nahi", answer: "check" },
      link: { role: "Authorized recipient ko thodi der ke liye file do", answer: "link" },
      cleanup: { role: "Kabhi poore na hue uploads ko sambhalo", answer: "cleanup" },
    },
    chips: [
      { id: "cleanup", label: "Cleanup policy", does: "policy ke hisaab se abandoned uploads hatana" },
      { id: "knownlink", label: "Jise bhi link pata ho", does: "link pata hone ko permission maanna" },
      { id: "metadata", label: "Metadata database", does: "file ki details rakhna, bytes nahi" },
      { id: "check", label: "Identity aur permission check", does: "verify karna kaun maang raha hai aur kya access kar sakta hai" },
      { id: "upload", label: "Short-lived scoped upload URL", does: "directly storage par upload ke liye limited link" },
      { id: "storage", label: "Object storage", does: "file ke bytes ki jagah" },
      { id: "link", label: "Short-lived scoped download link", does: "authorized recipient ke liye limited access" },
    ],
    done: "Files rakhne ke liye object storage, metadata aur scoped upload URL; share karne ke liye permission check, short-lived link aur cleanup policy.",
  },

  canvas: {
    title: "Scratch se draw karo: file sharing",
    brief: "Poori service draw karo. Client app server se permission maangta hai. Server metadata database mein rakhta hai. Client short-lived scoped links se bytes directly object storage par upload aur download karta hai.",
    parts: ["client", "server", "database", "objects", "cache", "queue", "cdn"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.1, y: 0.5 }, { id: "s", part: "server", x: 0.5, y: 0.2 },
        { id: "d", part: "database", x: 0.88, y: 0.2 }, { id: "o", part: "objects", x: 0.5, y: 0.84 },
      ],
      edges: [["c", "s"], ["s", "d"], ["c", "o"]],
    },
    why: {
      "client>server": "Client pehle app se poochta hai, jo authorization check karke short-lived scoped link de sakti hai.",
      "server>database": "App metadata store aur check karti hai: owner, file ID, status aur access rules.",
      "client>objects": "Scoped link se bytes directly object storage se aate jaate hain, app server se guzre bina.",
    },
    done: "App se permission, database mein metadata, aur bytes directly object storage ke saath. CDN tabhi add karo jab bottleneck aur private access soch liya ho.",
  },

  design: {
    title: "Aapki baari: scratch se design karo",
    brief: "Ek service design karo jahan user file upload kar sake aur authorized users share link se access kar sakein. Security, storage aur failure ke baare mein socho. Ho sake toh suggested split use karo: 5 minutes requirements, 5 estimates, 5 API aur data, 12 flows, 10 failure aur scaling, aur 8 explanation aur review.",
    constraints: [
      "Neeche ka approach padhne se pehle apna answer poora karo",
      "Upload aur download alag draw karo",
      "Ek failure aur ek trade-off explain karo",
    ],
    minChars: 200,
    walkthrough: [
      { heading: "Ek possible approach", points: ["Size limits, sharing, expiry aur resume clarify karo.", "Incoming data estimate karo, labelled assumptions ke saath.", "Bytes object storage mein; metadata database mein.", "Access check karke short-lived scoped links se upload aur download."] },
      { heading: "Failure aur trade-offs", points: ["Partial upload ready mark nahi hota; cleanup policy rakho.", "Duplicate completion calls safely handle karo.", "Immediate revocation ke liye proxy ya token check, jo latency aur cost badhata hai."] },
    ],
    checklist: [
      "Maine requirements clarify kiye",
      "Maine estimate ke assumptions aur units bataye",
      "Maine upload aur download alag draw kiye",
      "Maine permissions enforce ki",
      "Maine ek failure aur ek trade-off explain kiya",
      "Main har decision ka reason bol sakta hoon",
    ],
  },

  followUps: [
    {
      q: "“Access revoke hua, par user ke paas valid link hai. Kya woh rukega?”",
      answer: [
        "Kuch designs mein short-lived signed link expiry tak usable reh sakta hai.",
        "Immediate revocation required ho toh authorization-enforcing proxy ya suitable token check consider karo.",
        "Isse latency aur infrastructure cost aati hai, toh pehle required behaviour clear karo.",
      ],
      say: "“Woh expiry tak chal sakta hai. Turant rokna ho toh proxy ya token check use karunga aur cost maanunga.”",
    },
    {
      q: "“Upload cut ho gaya. Kya hoga?”",
      answer: [
        "File partially uploaded ho sakti hai, toh use ready mark mat karo.",
        "User ko retry do. Resumable uploads ke liye chunk tracking aur cleanup alag design karna padega.",
        "Duplicate completion requests safely handle karo, aur abandoned uploads ki cleanup policy rakho.",
      ],
      say: "“Woh ready nahi rehta, user retry kar sakta hai, aur cleanup policy abandoned uploads sambhalti hai.”",
    },
    {
      q: "“Kya CDN add kar sakte ho?”",
      answer: [
        "Repeated public ya appropriately authorized downloads ke liye consider kar sakte ho.",
        "Private access controls preserve karne honge.",
        "Add karne se pehle bottleneck aur privacy requirements samjho.",
      ],
      say: "“Shayad, bottleneck dekhne ke baad, aur sirf aise ki private access controls bache rahein.”",
      deeper: "Day 15",
    },
  ],

  faq: [
    { q: "Kya is par 45 minutes lagana zaroori hai?", a: "Yeh practice ke liye suggested split hai. Actual interview ka format alag ho sakta hai." },
    { q: "Kya yeh kisi real company ka question hai?", a: "Nahi. Yeh illustrative practice question hai, kisi company ka verified question nahi." },
    { q: "Mera answer kaun check karega?", a: "Aap khud. Yeh checklist se self-review hai. Mentor ya peer available ho toh unse bhi feedback lo." },
    { q: "Kya ise poora karke main interviews ke liye ready hoon?", a: "Example solution ya checklist success guarantee nahi karta. Apna weakest area chuno, design revise karo, aur do minute mein phir explain karo." },
  ],

  interview: [
    "Requirements clarify karo aur assumptions batao.",
    "Units ke saath estimate karo, aur batao kya shamil nahi.",
    "Bytes object storage mein, metadata database mein, alag rakho.",
    "Upload aur download alag bolo, permissions enforce karte hue.",
    "Ek failure, ek trade-off, aur har decision ka reason batao.",
  ],

  cheatsheet: {
    title: "Day 16 · Scratch se revision",
    points: [
      "Koi approach dekhne se pehle khud solve karo",
      "Pehle clarify karo; assumptions aur units label karo",
      "Bytes object storage mein; metadata database mein",
      "Is design mein link pata hona permission nahi",
      "Signed links: short-lived aur carefully scoped",
      "Partial uploads ready nahi; cleanup policy rakho",
      "Khud review karo, phir do minute mein explain karo",
    ],
  },

  linkedin:
    "Day 16/21: System Design Essentials with Klymb.\n\nRevision day: maine blank board se file-sharing service design ki, koi approach dekhne se pehle.\n\nBytes object storage mein, metadata database mein, short-lived scoped links, aur pehle permission check. Curveball: access revoke karne se pehle se issued link hamesha nahi rukta.\n\n#SystemDesign #Klymb",

  nextDay: "Day 17: AI system design. User question type karta hai, toh app aur model ke beech actually kya hota hai?",
};

export const essentialsDaySixteen: Day = {
  day: 16,
  of: 21,
  app: "A file-sharing service",
  minutes: 45,
  hook: { date: "Illustrative practice" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/essentials-day-16.mp4", poster: "/videos/system-design/essentials-day-16-poster.jpg", minutes: 7, lang: "Hinglish",
    // One horizontal cut with the captions burned in: it plays in the wide frame, and with no caption lines there's no subtitle switch.
    wide: { src: "/api/video/essentials-day-16.mp4", poster: "/videos/system-design/essentials-day-16-poster.jpg" },
  },
};
