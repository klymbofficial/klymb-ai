/**
 * Day 9 of "System Design Essentials": the interview framework, used on a URL
 * shortener. Built from the Day 9 video script. The traffic numbers are the
 * script's illustrative assumptions and go.example is a fictional link.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Day 9 · Interview framework",
  hookLines: [
    "The interviewer says: “Design a URL shortener.”",
    "You remember databases, load balancers and caches.",
    "But what’s your first sentence?",
  ],
  question: "What repeatable steps get you from a blank screen to a design you can defend?",

  pre: [
    {
      id: "pre-1",
      scenario: "The interviewer has just said: “Design a URL shortener.”",
      prompt: "What should you do first?",
      choices: [
        { text: "Clarify the requirements: is the focus creating short links and redirecting?", why: "Right. These questions don’t waste time; they stop you solving the wrong problem.", best: true },
        { text: "Start drawing load balancers and caches", why: "Those come later. You don’t yet know what the system must do." },
        { text: "Pick a database brand", why: "That’s a detail, before you know the requirements." },
      ],
    },
    {
      id: "pre-2",
      scenario: "The interviewer gives no traffic numbers.",
      prompt: "What’s the strong move?",
      choices: [
        { text: "Propose reasonable assumptions and clearly label them as assumptions", why: "Yes. An estimate is a starting point for decisions, not a perfect prediction.", best: true },
        { text: "Refuse to continue without real numbers", why: "You can move forward with labelled assumptions." },
        { text: "State made-up numbers as measured facts", why: "They aren’t measured, so say they’re assumptions." },
      ],
    },
    {
      id: "pre-3",
      scenario: "You have an app with popular links and you’re thinking of adding a cache.",
      prompt: "Is a cache an automatic solution?",
      choices: [
        { text: "No: understand the workload and consistency needs first", why: "Right. A cache also brings complexity and a risk of stale data.", best: true },
        { text: "Yes: a cache always makes things better", why: "It has costs, and it needs a policy for expiry and updates." },
        { text: "Yes: it replaces the database", why: "The database stays the source of truth." },
      ],
    },
  ],

  revealTitle: "Six steps for a blank screen",
  revealSub: "used on a URL shortener, with illustrative numbers",
  reveal: [
    { when: "1. Clarify requirements", what: "Confirm the core: create a short link, and redirect. Ask about custom aliases, expiry and analytics, and agree to build the core first. Ask about quality too: how fast, what if it’s unavailable, and how long links stay valid." },
    { when: "2. Estimate scale", what: "Assume 8.64 million redirects a day. A day has 86,400 seconds, so that’s an average of 100 requests per second. Assume a peak of five times the average: 500 per second. These are assumptions, not measured traffic." },
    { when: "3. API and data", what: "Create: a long URL goes in and a short link comes back. Read: opening the short link makes the system look up the code and respond with a redirect. Store the short code, the original URL, and an expiry if that’s required. Validate incoming URLs too." },
    { when: "4. Read and write flows", what: "Create: generate a unique code and save the mapping. A uniqueness constraint in the database can detect a collision, and the app tries another code. Read: look up the code and redirect, or give an appropriate response if it’s missing or expired." },
    { when: "5. One deep dive", what: "Choose one meaningful area. If popular links are raising read load, a cache for frequent mappings can help: a hit is quick, a miss goes to the database. Expiry and updates need a policy so the cache doesn’t go stale." },
    { when: "6. Trade-offs", what: "Short codes are convenient, but a limited code space raises the chance of collisions. A cache cuts read load but adds complexity and stale data risk. Analytics events can be processed in the background so a redirect doesn’t wait on them." },
  ],

  explain: {
    title: "The words from today",
    items: [
      { term: "Requirements", what: "What the system must do, and how well, agreed before designing.", example: "Create and redirect first, analytics later" },
      { term: "Assumption", what: "A reasonable number you propose and label, when none is given.", example: "“Assume a peak of five times the average”" },
      { term: "Short code", what: "The part of a short link that’s the key for finding the original URL.", example: "abc in go.example/abc" },
      { term: "Redirect", what: "A response that sends the browser on to another URL.", example: "From the short link to the original page" },
      { term: "Uniqueness constraint", what: "A database rule that stops two rows having the same value, so a collision can be detected.", example: "The same code can’t be saved twice" },
    ],
  },

  concept: {
    cards: [{
      name: "Understand it first",
      examples: ["1. Clarify requirements", "2. Estimate scale", "3. API and data"],
      moves: ["Agree the core features", "Label your assumptions", "Define what goes in, out and stored"],
    }, {
      name: "Then design and defend it",
      examples: ["4. Read and write flows", "5. One deep dive", "6. Trade-offs"],
      moves: ["Talk through the flow as you draw", "Go deep on one real bottleneck", "Say what each choice costs"],
    }],
    rule: "Understanding why each step is there matters more than memorising the steps.",
  },

  post: [
    {
      id: "post-1",
      prompt: "What’s the right order for the framework?",
      choices: [
        { text: "Requirements, estimate, API and data, flows, deep dive, trade-offs", why: "Right. Each step gives the next one something to stand on.", best: true },
        { text: "Deep dive, flows, requirements, trade-offs, estimate, API", why: "You’d be going deep before knowing what to build." },
        { text: "Trade-offs, requirements, flows, estimate, deep dive, API", why: "You can’t weigh trade-offs before there’s a design." },
      ],
    },
    {
      id: "post-2",
      scenario: "Daily users and daily requests come up in your estimate.",
      prompt: "What’s true about them?",
      choices: [
        { text: "They aren’t the same number: one user can click several links", why: "Yes. Average and peak also differ.", best: true },
        { text: "They’re always equal", why: "One user can make many requests." },
        { text: "Average and peak are always equal too", why: "They differ, which is why we estimate a peak." },
      ],
    },
    {
      id: "post-3",
      scenario: "A generated short code already exists.",
      prompt: "How can the system catch that?",
      choices: [
        { text: "A uniqueness constraint in the database detects the collision, and the app tries another code", why: "Right. The short link is returned only after a successful save.", best: true },
        { text: "It can’t: the code overwrites the old link", why: "That would send people to the wrong page. The constraint prevents it." },
        { text: "The browser spots the collision", why: "The browser doesn’t know about the codes. That’s the system’s job." },
      ],
    },
    {
      id: "post-4",
      scenario: "A popular link’s mapping isn’t in the cache.",
      prompt: "What happens on this cache miss?",
      choices: [
        { text: "The app looks it up in the database, which remains the source of truth", why: "Yes. And expiry or updates need a policy so the cache isn’t stale.", best: true },
        { text: "The user gets an error", why: "A miss just means going to the database." },
        { text: "The link is deleted", why: "A miss doesn’t change the data." },
      ],
    },
    {
      id: "post-5",
      prompt: "You’re adding click analytics. How should it relate to the redirect?",
      choices: [
        { text: "Process click events in the background, so the redirect doesn’t wait unnecessarily", why: "Right. The redirect is the core job.", best: true },
        { text: "Hold every redirect until analytics finishes", why: "That slows the core feature for an extra one." },
        { text: "Analytics can never be added to this design", why: "It can, in the background." },
      ],
    },
  ],

  estimates: [
    {
      id: "est-1",
      prompt: "What’s the average number of redirect requests per second?",
      given: ["8,640,000 redirect requests per day (an assumption)", "86,400 seconds in a day"],
      unit: "requests/second",
      answer: 100,
      tolerance: 0.1,
      working: ["8,640,000 ÷ 86,400 = 100 requests per second on average.", "This is an assumption for the example, not measured traffic."],
    },
    {
      id: "est-2",
      prompt: "If the peak is five times the average, what’s the peak?",
      given: ["An average of 100 requests per second", "Peak assumed at 5× the average"],
      unit: "requests/second",
      answer: 500,
      tolerance: 0.1,
      working: ["100 × 5 = 500 requests per second at peak.", "It’s a starting point for architecture decisions, not a perfect prediction."],
    },
  ],

  build: {
    title: "Put the framework in order",
    intro: "Drag each step to what you’d say at that point. You can also tap one, then tap a slot.",
    given: "“Design a URL shortener.”",
    rows: [["clarify", "estimate", "data"], ["flows", "deep", "trade"]],
    rowLabels: ["Understand it", "Design and defend it"],
    slots: {
      clarify: { role: "Is the focus creating links and redirecting?", answer: "clarify" },
      estimate: { role: "86,400 seconds a day, so about 100 requests a second", answer: "estimate" },
      data: { role: "A POST for create, and code mapped to original URL", answer: "data" },
      flows: { role: "Save the unique code, then look it up and redirect", answer: "flows" },
      deep: { role: "Popular links raise read load, so consider a cache", answer: "deep" },
      trade: { role: "Short codes are convenient but collide more", answer: "trade" },
    },
    chips: [
      { id: "trade", label: "Trade-offs", does: "what each choice gains and costs" },
      { id: "estimate", label: "Estimate scale", does: "rough numbers as a starting point for decisions" },
      { id: "brand", label: "Name a database brand", does: "a detail that doesn’t answer any step on its own" },
      { id: "flows", label: "Read and write flows", does: "walking the request through the system as you draw" },
      { id: "clarify", label: "Clarify requirements", does: "agreeing what to build before designing" },
      { id: "deep", label: "Deep dive", does: "going further on one meaningful problem" },
      { id: "data", label: "API and data", does: "what goes in, what comes out, and what’s stored" },
    ],
    done: "Requirements, estimate, API and data, flows, a deep dive and trade-offs: the same six steps for any design question.",
  },

  canvas: {
    title: "Draw it from scratch: the URL shortener",
    brief: "Draw the read path: a browser opens a short link, the app looks up the code, and popular mappings can come from a cache, with the database as the source of truth.",
    parts: ["client", "server", "cache", "database", "queue", "cdn", "replica"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.1, y: 0.5 }, { id: "s", part: "server", x: 0.42, y: 0.5 },
        { id: "k", part: "cache", x: 0.82, y: 0.2 }, { id: "d", part: "database", x: 0.82, y: 0.8 },
      ],
      edges: [["c", "s"], ["s", "k"], ["s", "d"]],
    },
    why: {
      "client>server": "The browser opens the short link, and the app responds with a redirect to the original URL.",
      "server>cache": "Frequently used mappings can come from the cache, which helps when popular links raise read load.",
      "server>database": "On a cache miss the app looks up the code in the database, the source of truth. New mappings are saved here too.",
    },
    done: "The app looks up the code, the cache serves popular mappings, and the database stays the source of truth. Mention the expiry policy that keeps the cache from going stale.",
  },

  followUps: [
    {
      q: "“What do you say in your first 30 seconds?”",
      answer: [
        "Say you’ll confirm the create and redirect requirements first.",
        "Then you’ll estimate traffic and explain the API, data and request flow.",
        "After that you’ll discuss the bottleneck and trade-offs.",
      ],
      say: "“I’ll confirm create and redirect first, estimate traffic, explain the API, data and flow, then discuss bottlenecks and trade-offs.”",
    },
    {
      q: "“What if a short code is missing or expired?”",
      answer: [
        "The read flow looks up the code and redirects only if a mapping is found.",
        "If it’s missing or expired, the user gets an appropriate response instead.",
        "If you cache mappings, the expiry policy has to keep the cache from serving a stale one.",
      ],
      say: "“No valid mapping means no redirect, and the cache’s expiry policy has to respect that.”",
    },
    {
      q: "“How would you add click analytics?”",
      answer: [
        "Treat it as a feature beyond the core, agreed in requirements.",
        "Process click events in the background.",
        "Don’t make the redirect wait on analytics unnecessarily.",
      ],
      say: "“Clicks become background events, so the redirect stays quick.”",
      deeper: "Day 8",
    },
  ],

  faq: [
    { q: "Do I have to use these exact six steps?", a: "They’re a repeatable starting point. Understanding why each step is there matters more than memorising them." },
    { q: "Are 100 and 500 requests per second real figures?", a: "No. They’re assumptions for this example. In an interview, propose your own and label them as assumptions." },
    { q: "Doesn’t asking questions waste interview time?", a: "No. Those questions stop you solving the wrong problem. If time is limited, agree to build the core first and leave the optional features for later." },
    { q: "Can a short link point to anything?", a: "Validate incoming URLs. Which URL schemes to allow and how to handle abuse depend on the security requirements." },
  ],

  interview: [
    "Confirm the create and redirect requirements.",
    "Estimate traffic, and label the assumptions.",
    "Define the API and the code-to-URL mapping.",
    "Walk through the create and read flows as you draw.",
    "Go deep on one bottleneck, then discuss the trade-offs.",
  ],

  cheatsheet: {
    title: "Day 9 · Interview framework",
    points: [
      "Requirements, estimate, API and data, flows, deep dive, trade-offs",
      "Agree the core features; optional ones come later",
      "Label assumptions; users and requests aren’t the same",
      "86,400 seconds in a day; average and peak differ",
      "A uniqueness constraint can detect a collision",
      "A cache needs a reason and an expiry policy",
      "Know why each step is there, don’t just memorise it",
    ],
  },

  linkedin:
    "Day 9/21 of System Design Essentials with Klymb.\n\nA blank screen in a design interview has a repeatable answer: requirements, estimate, API and data, flows, a deep dive, and trade-offs.\n\nI used it on a URL shortener. The first sentence isn’t about databases at all: it’s confirming what you’re actually building.\n\n#SystemDesign #Klymb",

  nextDay: "Day 10: keeping the system up when a dependency slows down or traffic suddenly grows.",
};

const hi: DayCopy = {
  tag: "Day 9 · Interview framework",
  hookLines: [
    "Interviewer bolta hai: “Design a URL shortener.”",
    "Aapko databases, load balancers aur cache ke naam yaad hain.",
    "Lekin pehla sentence kya hoga?",
  ],
  question: "Kaunse repeatable steps aapko blank screen se aise design tak le jaate hain jise aap defend kar sako?",

  pre: [
    {
      id: "pre-1",
      scenario: "Interviewer ne abhi kaha: “Design a URL shortener.”",
      prompt: "Sabse pehle kya karna chahiye?",
      choices: [
        { text: "Requirements clarify karo: kya focus short link banana aur redirect karna hai?", why: "Sahi. Yeh questions time waste nahi karte; yeh aapko galat problem solve karne se bachate hain.", best: true },
        { text: "Load balancers aur cache draw karna shuru karo", why: "Woh baad mein aate hain. Abhi pata hi nahi system ko karna kya hai." },
        { text: "Database ka brand chuno", why: "Requirements jaanne se pehle yeh sirf detail hai." },
      ],
    },
    {
      id: "pre-2",
      scenario: "Interviewer traffic ke numbers nahi deta.",
      prompt: "Strong move kya hai?",
      choices: [
        { text: "Reasonable assumptions propose karo aur clearly assumptions label karo", why: "Haan. Estimate decisions ka starting point hai, perfect prediction nahi.", best: true },
        { text: "Real numbers ke bina aage badhne se mana kar do", why: "Labelled assumptions ke saath aage badh sakte ho." },
        { text: "Banaye hue numbers ko measured facts ki tarah bolo", why: "Woh measured nahi hain, toh bolo ki assumptions hain." },
      ],
    },
    {
      id: "pre-3",
      scenario: "App mein kuch links popular hain aur aap cache add karne ki soch rahe ho.",
      prompt: "Kya cache automatic solution hai?",
      choices: [
        { text: "Nahi: pehle workload aur consistency needs samjho", why: "Sahi. Cache complexity aur stale data ka risk bhi laata hai.", best: true },
        { text: "Haan: cache hamesha behtar karta hai", why: "Uski keemat hai, aur expiry aur updates ke liye policy chahiye." },
        { text: "Haan: woh database ko replace kar deta hai", why: "Database hi source of truth rehta hai." },
      ],
    },
  ],

  revealTitle: "Blank screen ke liye chhe steps",
  revealSub: "URL shortener par, illustrative numbers ke saath",
  reveal: [
    { when: "1. Requirements clarify karo", what: "Core confirm karo: short link banana aur redirect karna. Custom aliases, expiry aur analytics poochho, aur agree karo ki pehle core banayenge. Quality bhi poochho: kitna fast, unavailable hone par impact kya, aur link kitne time tak valid." },
    { when: "2. Scale estimate karo", what: "Maan lo daily 86 lakh 40 hazaar redirects. Din mein 86,400 seconds, toh average 100 requests per second. Peak ko average ka five times maano: 500 per second. Yeh assumptions hain, measured traffic nahi." },
    { when: "3. API aur data", what: "Create: long URL aata hai, short link milta hai. Read: short link khulne par system code se lookup karke redirect response deta hai. Short code, original URL, aur zaroorat ho toh expiry store karo. Incoming URLs validate bhi karo." },
    { when: "4. Read aur write flows", what: "Create: unique code generate karke mapping save karo. Database ki uniqueness constraint collision detect kar sakti hai, aur app doosra code try karti hai. Read: code lookup karke redirect karo, ya missing ya expired ho toh appropriate response do." },
    { when: "5. Ek deep dive", what: "Ek meaningful area chuno. Popular links se read load badhe toh frequent mappings ka cache madad kar sakta hai: hit par jaldi, miss par database. Expiry aur updates ke liye policy chahiye taaki cache stale na rahe." },
    { when: "6. Trade-offs", what: "Chhota code convenient hai, par limited code space mein collision ka chance badhta hai. Cache read load kam karta hai par complexity aur stale data laata hai. Analytics events background mein process ho sakte hain, taaki redirect unka wait na kare." },
  ],

  explain: {
    title: "Aaj ke words",
    items: [
      { term: "Requirements", what: "System ko kya karna hai aur kitna achha, design se pehle tay karna.", example: "Pehle create aur redirect, analytics baad mein" },
      { term: "Assumption", what: "Reasonable number jo aap propose aur label karte ho, jab koi diya na ho.", example: "“Maan lo peak average ka five times hai”" },
      { term: "Short code", what: "Short link ka woh hissa jo original URL dhoondhne ki key hai.", example: "go.example/abc mein abc" },
      { term: "Redirect", what: "Response jo browser ko doosre URL par bhejta hai.", example: "Short link se original page par" },
      { term: "Uniqueness constraint", what: "Database rule jo do rows mein same value nahi hone deta, jisse collision detect ho sakta hai.", example: "Same code do baar save nahi ho sakta" },
    ],
  },

  concept: {
    cards: [{
      name: "Pehle samjho",
      examples: ["1. Requirements clarify", "2. Scale estimate", "3. API aur data"],
      moves: ["Core features tay karo", "Assumptions label karo", "Kya aata hai, jaata hai aur store hota hai, define karo"],
    }, {
      name: "Phir design aur defend karo",
      examples: ["4. Read aur write flows", "5. Ek deep dive", "6. Trade-offs"],
      moves: ["Draw karte hue flow bolo", "Ek asli bottleneck par gehre jao", "Batao har choice ki keemat kya hai"],
    }],
    rule: "Framework ratne se zyada zaroori hai har step ka reason samajhna.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Framework ka sahi order kya hai?",
      choices: [
        { text: "Requirements, estimate, API aur data, flows, deep dive, trade-offs", why: "Sahi. Har step agle ko khade hone ki jagah deta hai.", best: true },
        { text: "Deep dive, flows, requirements, trade-offs, estimate, API", why: "Yeh jaane bina gehre chale jaoge ki banana kya hai." },
        { text: "Trade-offs, requirements, flows, estimate, deep dive, API", why: "Design ke bina trade-offs tol nahi sakte." },
      ],
    },
    {
      id: "post-2",
      scenario: "Estimate mein daily users aur daily requests aate hain.",
      prompt: "Unke baare mein kya sach hai?",
      choices: [
        { text: "Woh same number nahi hote: ek user kai links click kar sakta hai", why: "Haan. Average aur peak bhi alag hote hain.", best: true },
        { text: "Woh hamesha barabar hote hain", why: "Ek user kai requests kar sakta hai." },
        { text: "Average aur peak bhi hamesha barabar hote hain", why: "Woh alag hote hain, isliye peak estimate karte hain." },
      ],
    },
    {
      id: "post-3",
      scenario: "Generate kiya hua short code pehle se present hai.",
      prompt: "System ise kaise pakad sakta hai?",
      choices: [
        { text: "Database ki uniqueness constraint collision detect karti hai, aur app doosra code try karti hai", why: "Sahi. Short link successful save ke baad hi return hota hai.", best: true },
        { text: "Nahi pakad sakta: code purane link ko overwrite kar deta hai", why: "Isse log galat page par jayenge. Constraint isse rokti hai." },
        { text: "Browser collision pakadta hai", why: "Browser ko codes ka pata nahi. Yeh system ka kaam hai." },
      ],
    },
    {
      id: "post-4",
      scenario: "Popular link ki mapping cache mein nahi hai.",
      prompt: "Is cache miss par kya hota hai?",
      choices: [
        { text: "App database mein lookup karti hai, jo source of truth rehta hai", why: "Haan. Aur expiry ya updates ke liye policy chahiye taaki cache stale na rahe.", best: true },
        { text: "User ko error milta hai", why: "Miss ka matlab bas database par jana hai." },
        { text: "Link delete ho jaata hai", why: "Miss data nahi badalta." },
      ],
    },
    {
      id: "post-5",
      prompt: "Aap click analytics add kar rahe ho. Redirect se uska kya rishta hona chahiye?",
      choices: [
        { text: "Click events background mein process karo, taaki redirect unnecessarily wait na kare", why: "Sahi. Redirect core kaam hai.", best: true },
        { text: "Har redirect ko analytics khatam hone tak roko", why: "Isse extra feature ke liye core slow hota hai." },
        { text: "Is design mein analytics kabhi add nahi ho sakta", why: "Ho sakta hai, background mein." },
      ],
    },
  ],

  estimates: [
    {
      id: "est-1",
      prompt: "Average kitni redirect requests per second hain?",
      given: ["Roz 8,640,000 redirect requests (assumption)", "Din mein 86,400 seconds"],
      unit: "requests/second",
      answer: 100,
      tolerance: 0.1,
      working: ["8,640,000 ÷ 86,400 = average 100 requests per second.", "Yeh example ke liye assumption hai, measured traffic nahi."],
    },
    {
      id: "est-2",
      prompt: "Agar peak average ka five times hai, toh peak kitna hai?",
      given: ["Average 100 requests per second", "Peak average ka 5× maana"],
      unit: "requests/second",
      answer: 500,
      tolerance: 0.1,
      working: ["100 × 5 = peak par 500 requests per second.", "Yeh architecture decisions ka starting point hai, perfect prediction nahi."],
    },
  ],

  build: {
    title: "Framework ko order mein lagao",
    intro: "Har step ko us baat par drag karo jo aap us point par bologe. Ya ek tap karo, phir slot tap karo.",
    given: "“Design a URL shortener.”",
    rows: [["clarify", "estimate", "data"], ["flows", "deep", "trade"]],
    rowLabels: ["Samjho", "Design aur defend karo"],
    slots: {
      clarify: { role: "Kya focus link banana aur redirect karna hai?", answer: "clarify" },
      estimate: { role: "Din mein 86,400 seconds, toh lagbhag 100 requests per second", answer: "estimate" },
      data: { role: "Create ke liye POST, aur code se original URL ki mapping", answer: "data" },
      flows: { role: "Unique code save karo, phir lookup karke redirect karo", answer: "flows" },
      deep: { role: "Popular links se read load badha, toh cache socho", answer: "deep" },
      trade: { role: "Chhote codes convenient hain par zyada collide karte hain", answer: "trade" },
    },
    chips: [
      { id: "trade", label: "Trade-offs", does: "har choice ka fayda aur keemat" },
      { id: "estimate", label: "Scale estimate", does: "decisions ke liye rough numbers" },
      { id: "brand", label: "Database brand ka naam lo", does: "ek detail jo akele kisi step ka jawab nahi" },
      { id: "flows", label: "Read aur write flows", does: "draw karte hue request ko system se guzarna" },
      { id: "clarify", label: "Requirements clarify", does: "design se pehle tay karna ki kya banana hai" },
      { id: "deep", label: "Deep dive", does: "ek meaningful problem par aage jana" },
      { id: "data", label: "API aur data", does: "kya aata hai, kya jaata hai, kya store hota hai" },
    ],
    done: "Requirements, estimate, API aur data, flows, deep dive aur trade-offs: har design question ke liye yahi chhe steps.",
  },

  canvas: {
    title: "Scratch se draw karo: URL shortener",
    brief: "Read path draw karo: browser short link kholta hai, app code lookup karti hai, aur popular mappings cache se aa sakti hain, jabki database source of truth hai.",
    parts: ["client", "server", "cache", "database", "queue", "cdn", "replica"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.1, y: 0.5 }, { id: "s", part: "server", x: 0.42, y: 0.5 },
        { id: "k", part: "cache", x: 0.82, y: 0.2 }, { id: "d", part: "database", x: 0.82, y: 0.8 },
      ],
      edges: [["c", "s"], ["s", "k"], ["s", "d"]],
    },
    why: {
      "client>server": "Browser short link kholta hai, aur app original URL ka redirect response deti hai.",
      "server>cache": "Frequently used mappings cache se aa sakti hain, jo popular links se badhe read load mein madad karta hai.",
      "server>database": "Cache miss par app code database mein dekhti hai, jo source of truth hai. Nayi mappings bhi yahin save hoti hain.",
    },
    done: "App code lookup karti hai, cache popular mappings deta hai, aur database source of truth rehta hai. Cache ko stale hone se bachane wali expiry policy bhi bolo.",
  },

  followUps: [
    {
      q: "“Pehle 30 seconds mein kya bologe?”",
      answer: [
        "Bolo ki pehle create aur redirect requirements confirm karoge.",
        "Phir traffic estimate karke API, data aur request flow explain karoge.",
        "Uske baad bottleneck aur trade-offs discuss karoge.",
      ],
      say: "“Main pehle create aur redirect confirm karunga, traffic estimate karunga, API, data aur flow explain karunga, phir bottlenecks aur trade-offs discuss karenge.”",
    },
    {
      q: "“Short code missing ya expired ho toh?”",
      answer: [
        "Read flow code lookup karta hai aur mapping milne par hi redirect karta hai.",
        "Missing ya expired ho toh user ko appropriate response milta hai.",
        "Mappings cache karte ho toh expiry policy ko stale mapping serve hone se rokna hoga.",
      ],
      say: "“Valid mapping nahi toh redirect nahi, aur cache ki expiry policy ko iska dhyan rakhna hoga.”",
    },
    {
      q: "“Click analytics kaise add karoge?”",
      answer: [
        "Ise core ke baad wala feature maano, jo requirements mein tay ho.",
        "Click events background mein process karo.",
        "Redirect ko analytics ke wait mein unnecessarily slow mat karo.",
      ],
      say: "“Clicks background events banenge, taaki redirect fast rahe.”",
      deeper: "Day 8",
    },
  ],

  faq: [
    { q: "Kya yehi chhe steps use karna zaroori hai?", a: "Yeh repeatable starting point hain. Inhe ratne se zyada zaroori hai har step ka reason samajhna." },
    { q: "Kya 100 aur 500 requests per second real figures hain?", a: "Nahi. Yeh is example ke assumptions hain. Interview mein apne propose karo aur assumptions label karo." },
    { q: "Kya questions poochne se interview ka time waste nahi hota?", a: "Nahi. Woh aapko galat problem solve karne se bachate hain. Time limited ho toh agree karo ki pehle core banayenge, optional features baad mein." },
    { q: "Kya short link kisi bhi cheez par point kar sakta hai?", a: "Incoming URLs validate karo. Kaunsi URL schemes allow karni hain aur abuse kaise handle hoga, yeh security requirements par depend karta hai." },
  ],

  interview: [
    "Create aur redirect requirements confirm karo.",
    "Traffic estimate karo, aur assumptions label karo.",
    "API aur code-to-URL mapping define karo.",
    "Draw karte hue create aur read flows bolo.",
    "Ek bottleneck par deep dive, phir trade-offs.",
  ],

  cheatsheet: {
    title: "Day 9 · Interview framework",
    points: [
      "Requirements, estimate, API aur data, flows, deep dive, trade-offs",
      "Core features tay karo; optional baad mein",
      "Assumptions label karo; users aur requests same nahi",
      "Din mein 86,400 seconds; average aur peak alag",
      "Uniqueness constraint collision detect kar sakti hai",
      "Cache ko reason aur expiry policy chahiye",
      "Har step ka reason samjho, sirf rato mat",
    ],
  },

  linkedin:
    "Day 9/21: System Design Essentials with Klymb.\n\nDesign interview ki blank screen ka repeatable jawab hai: requirements, estimate, API aur data, flows, deep dive, aur trade-offs.\n\nMaine ise URL shortener par use kiya. Pehla sentence databases ke baare mein nahi hota: woh confirm karta hai ki banana kya hai.\n\n#SystemDesign #Klymb",

  nextDay: "Day 10: jab dependency slow ho ya traffic achanak badh jaye, toh system ko kaise bachayenge.",
};

export const essentialsDayNine: Day = {
  day: 9,
  of: 21,
  app: "A URL shortener",
  minutes: 18,
  hook: { date: "Fictional example" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/essentials-day-9.mp4", poster: "/videos/system-design/essentials-day-9-poster.jpg", minutes: 5, lang: "Hinglish",
    // One horizontal cut with the captions burned in: it plays in the wide frame, and with no caption lines there's no subtitle switch.
    wide: { src: "/api/video/essentials-day-9.mp4", poster: "/videos/system-design/essentials-day-9-poster.jpg" },
  },
};
