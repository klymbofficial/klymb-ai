/**
 * Day 2 of "System Design in 21 Days": Swiggy's dinner rush -> load balancing.
 * Swiggy facts come only from the sources in `sources` (Swiggy's own blog, and
 * Swiggy's figures as reported by the press). The load-balancer design itself is
 * the general industry pattern and is never presented as Swiggy's internals.
 */
import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  hookLines: [
    "New Year's Eve 2021 on Swiggy.",
    "At one point: 9,500 food orders every minute.",
    "And every order hits the servers again and again: menu, cart, payment, tracking.",
  ],
  question: "Lakhs of requests a minute, and dozens of servers. Who decides which server answers each one?",

  pre: [
    {
      id: "d2-pre-1",
      scenario: "Your food app runs on 20 identical servers. The dinner rush starts and requests pour in.",
      prompt: "How should requests reach the servers?",
      choices: [
        {
          text: "Put a load balancer in front: it spreads requests across all 20 and skips any that are down",
          why: "One front door, many cooks. Servers can be added or removed without the app changing. Trade-off: the load balancer is now one more box that must never go down.",
          best: true,
        },
        { text: "Ship the app with a list of all 20 server addresses and let each phone pick one", why: "Works on paper, but phones keep calling a server after it dies, and moving traffic means shipping a new app version." },
        { text: "Point the domain at all 20 servers with DNS and let DNS rotate them", why: "DNS round robin is real, but DNS answers are cached for minutes or hours, so a dead server keeps getting traffic long after it fails." },
      ],
    },
    {
      id: "d2-pre-2",
      scenario: "The load balancer uses round robin: each server gets the next request in turn. One of 20 servers is stuck and answers in 8 seconds.",
      prompt: "What happens?",
      choices: [
        {
          text: "It still gets 1 in every 20 requests, so about 5% of users wait 8 seconds",
          why: "Round robin counts turns, not how busy or slow a server is. The fix: least connections or latency-aware routing, plus health checks that pull it out.",
          best: true,
        },
        { text: "The load balancer notices on its own and stops sending to it", why: "Only if its health checks measure speed or errors. A plain \"are you alive?\" check says yes: the server is alive, just slow." },
        { text: "All 20 servers slow down together", why: "The other 19 are fine. The damage lands on the unlucky 5% of users routed to the stuck one." },
      ],
    },
    {
      id: "d2-pre-3",
      scenario: "A user logs in and their request lands on server 3. Their next request lands on server 7.",
      prompt: "What's the cleanest way to keep them logged in?",
      choices: [
        {
          text: "Keep session data in a shared store (like Redis) that every server can read",
          why: "Servers stay stateless: any server can take any request, so you can add, remove or lose servers freely. Trade-off: one quick extra lookup per request.",
          best: true,
        },
        { text: "Sticky sessions: always send this user back to server 3", why: "Common and quick to set up, but if server 3 dies they're logged out, and sticky heavy users make the load uneven." },
        { text: "Copy every login to all 20 servers as it happens", why: "Twenty copies of every session means a lot of chatter between servers, and the copies drift out of sync under load." },
      ],
    },
  ],

  revealTitle: "What Swiggy has said, and how load balancing is usually built",
  revealSub: "Swiggy's public account, then the standard pattern",
  sourceNote: "Swiggy facts: Swiggy's own blog (New Year's Eve 2022 war room) and Swiggy's figures as reported by The News Minute (New Year's Eve 2021). The last row is the general industry pattern, not a claim about Swiggy's internals.",
  reveal: [
    { when: "NYE 2021", what: "Swiggy said food orders peaked at 9,500 a minute, beating its own record of 5,500 set the night before." },
    { when: "8–10 weeks before NYE 2022", what: "Engineering readiness planning starts. Teams forecast the peak orders per minute." },
    { when: "Orders → requests", what: "That peak becomes the maximum requests per minute each service must handle. Services are scaled up to match, then back down after." },
    { when: "Before the night", what: "Critical caches and databases are moved from one availability zone to several, so one data centre failing can't take them down." },
    { when: "On the night", what: "A war room watches the dashboards. When UPI payments failed, the payments team switched on other payment methods." },
    { when: "The usual design", what: "A pair of load balancers across zones, health checks, least connections, stateless servers and sessions in a shared store." },
  ],

  explain: {
    title: "Load balancing, explained",
    items: [
      { term: "Round robin", what: "Each server gets the next request in turn. Simple, and blind to a slow server.", example: "Identical servers, short requests" },
      { term: "Weighted", what: "Bigger servers get a bigger share of the requests.", example: "Mixing small and large machines" },
      { term: "Least connections", what: "Each request goes to the server with the fewest requests in progress.", example: "Requests that take very different times" },
      { term: "Consistent hashing", what: "The same user always lands on the same server, and adding a server moves only a few users.", example: "Caches, live chat rooms" },
      { term: "Health checks", what: "The balancer keeps asking each server \"can you do real work?\" and pulls out the ones that can't.", example: "Error rate, a test request" },
      { term: "Layer 4 vs Layer 7", what: "L4 balances connections by address and port. L7 reads the HTTP request and can route by path.", example: "/payments to its own servers" },
    ],
  },

  concept: {
    cards: [
      {
        name: "Spread the load",
        examples: ["Round robin", "Weighted", "Least connections", "Consistent hashing"],
        moves: ["Same servers, short requests → round robin", "Different-sized servers → weighted", "Slow, uneven requests → least connections", "Same user, same server → consistent hashing"],
      },
      {
        name: "Stay up",
        examples: ["Health checks", "Stateless servers", "Two load balancers", "Several zones"],
        moves: ["Pull out servers that fail real checks", "Keep sessions in a shared store", "Never one load balancer: run a pair", "Spread across zones, like Swiggy's Multi-AZ move"],
      },
    ],
    rule: "Spread the load smartly, and assume something will break: every box, including the load balancer, needs a backup.",
  },

  post: [
    {
      id: "d2-post-1",
      scenario: "Exam results day. One server's disk is full, so it returns an error instantly. Least connections loves it: it finishes requests fastest.",
      prompt: "What catches this?",
      choices: [
        { text: "Health checks on error rate or a real test request, not just \"is it up\"", why: "The server is up and very fast, at failing. Trade-off: deeper checks cost a little load and need tuning, so one blip doesn't eject a good server.", best: true },
        { text: "Switch to round robin", why: "Round robin would still send it 1 in every N requests. The real gap is that nobody checks whether its answers are any good." },
        { text: "Add more servers", why: "The broken one still gets its share, and least connections keeps favouring it." },
      ],
    },
    {
      id: "d2-post-2",
      scenario: "Your only load balancer crashes at 8:05 PM on a Friday.",
      prompt: "What should have been in place?",
      choices: [
        { text: "A second load balancer ready to take over, in another zone", why: "Never one of anything critical. Trade-off: you pay for a balancer that mostly waits, or run both live and keep each half-loaded.", best: true },
        { text: "A bigger, more powerful load balancer", why: "Still one box. Bigger doesn't mean it can't fail." },
        { text: "Faster servers behind it", why: "They're unreachable when the only door is broken." },
      ],
    },
    {
      id: "d2-post-3",
      scenario: "Each user's live chat room sits on one server. You grow from 10 servers to 12.",
      prompt: "Which routing keeps most users where they are?",
      choices: [
        { text: "Consistent hashing: adding servers moves only a small share of users", why: "With hash mod N, changing N reshuffles almost everyone. Consistent hashing moves roughly 1 in N. Trade-off: more complex, and one hot user can still overload a server.", best: true },
        { text: "Hash of user ID mod the number of servers", why: "Same server every time, until the number of servers changes. Then almost every user moves at once." },
        { text: "Least connections", why: "Great for spreading work, but it doesn't keep a user on the server that holds their room." },
      ],
    },
    {
      id: "d2-post-4",
      scenario: "You turn on sticky sessions so you don't need a shared session store.",
      prompt: "What did you trade away?",
      choices: [
        { text: "Even load and safe failover: one server can get stuck with heavy users, and if it dies they lose their session", why: "Sticky sessions are quick to set up. The cost shows up exactly when traffic peaks or a server fails.", best: true },
        { text: "Speed: sticky sessions make every request slower", why: "Usually the opposite: the server may already have that user's data in memory. The cost is balance and failover, not speed." },
        { text: "Security: sticky sessions are easier to hack", why: "Not by themselves. The question is where the session state lives, not how secure it is." },
      ],
    },
  ],

  estimates: [
    {
      id: "d2-est-1",
      given: ["Peak: 9,500 orders a minute", "Each order makes about 30 requests: menu, cart, payment, tracking…"],
      prompt: "How many requests per second at the peak?",
      unit: "requests/sec",
      answer: 4750,
      tolerance: 0.3,
      working: ["9,500 ÷ 60 ≈ 158 orders a second", "158 × 30 ≈ 4,750 requests a second", "That's what the load balancer spreads, every second, at the peak."],
    },
    {
      id: "d2-est-2",
      given: ["About 4,750 requests a second at the peak", "One server handles 400 requests a second", "Keep 30% spare so a server can fail"],
      prompt: "How many servers do you need?",
      unit: "servers",
      answer: 17,
      tolerance: 0.25,
      working: ["4,750 ÷ 400 ≈ 12 servers just to cope", "With 30% spare: 12 ÷ 0.7 ≈ 17 servers", "Spread them across zones, so losing one zone still leaves enough."],
    },
    {
      id: "d2-est-3",
      given: ["10 servers behind round robin", "One is stuck and answers in 8 seconds", "Users make 6,000 requests a minute"],
      prompt: "How many requests a minute hit the stuck server?",
      unit: "requests/min",
      answer: 600,
      tolerance: 0.15,
      working: ["Round robin sends each server 1 in 10 requests", "6,000 ÷ 10 = 600 slow requests a minute", "600 unhappy users every minute, until a health check pulls it out."],
    },
  ],

  build: {
    title: "Build the dinner-rush front door",
    intro: "Drag each box to the job it does. You can also tap a box, then tap a slot.",
    given: "Lakhs of phones",
    rows: [["dns"], ["lb", "standby"], ["health", "servers"], ["session", "zones"]],
    slots: {
      dns: { role: "Turns the app's domain into the load balancers' address", answer: "dns" },
      lb: { role: "Spreads every request across the servers", answer: "lb" },
      standby: { role: "Takes over if the main balancer dies", answer: "standby" },
      health: { role: "Pulls slow or broken servers out of rotation", answer: "health" },
      servers: { role: "Any one of them can take any request", answer: "servers" },
      session: { role: "Keeps logins so any server can read them", answer: "session" },
      zones: { role: "Copies in another data centre, in case one fails", answer: "zones" },
    },
    chips: [
      { id: "health", label: "Health checks", does: "keep testing each server and pull out the ones that fail" },
      { id: "sticky", label: "Sticky sessions", does: "not a box in this design: they tie users to one server, so a crash logs them out" },
      { id: "lb", label: "Load balancer", does: "the front door: it spreads requests across the servers" },
      { id: "zones", label: "Second zone", does: "another data centre with its own copy, so one can fail" },
      { id: "dns", label: "DNS", does: "the address book: turns a name into the load balancers' address" },
      { id: "session", label: "Shared session store", does: "keeps logins in one place every server can read" },
      { id: "servers", label: "Stateless servers", does: "app servers that keep nothing locally, so any one can take any request" },
      { id: "standby", label: "Standby balancer", does: "a second load balancer, ready to take over" },
    ],
    done: "That's a front door that survives the dinner rush. Swiggy has written about moving critical caches and databases to several zones for the same reason.",
  },

  design: {
    title: "Keep ordering when a data centre goes dark",
    brief: "Your food app runs in one data centre. At 8:30 PM on a Friday, that whole data centre loses power. Design the setup so customers can keep ordering.",
    constraints: [
      "Peak: about 5,000 requests a second",
      "Users shouldn't have to log in again",
      "No order lost, and nobody charged twice",
      "Back to normal in minutes, not hours",
    ],
    minChars: 120,
    walkthrough: [
      { heading: "Requirements and numbers", points: ["Browse, cart and payment must stay up. Recommendations can switch off.", "About 5,000 requests a second at the peak. With two zones, each must be able to carry all of it alone."] },
      { heading: "Two zones, both live", points: ["Servers in at least two availability zones, each sized for the full peak.", "Load balancers in each zone. DNS or a global balancer sends users only to healthy zones."] },
      { heading: "Stateless servers, replicated state", points: ["Sessions in a store copied across zones, so logins survive.", "Database: a primary with a replica in the other zone that takes over automatically if the primary's zone dies."] },
      { heading: "Orders and payments stay safe", points: ["Save each order before confirming it. An idempotency key per order means a retry after failover never charges twice.", "Queue slow work (SMS, rider assignment) so the burst after failover isn't dropped."] },
      { heading: "Trade-offs to say out loud", points: ["Two full-size zones cost about double: the price of surviving a whole data centre.", "Copying every write to another zone adds a few milliseconds, in exchange for losing no orders.", "Practise it: run failover drills before the real night."] },
    ],
    checklist: [
      "I put servers in at least two zones",
      "I sized each zone to carry the peak alone",
      "I kept servers stateless, with sessions in a shared, replicated store",
      "I had a database replica in another zone ready to take over",
      "I protected orders from loss and double charges",
      "I named at least one trade-off",
    ],
  },

  followUps: [
    {
      q: "\"Now traffic doubles at 8 PM, but only on the menu. What changes?\"",
      answer: [
        "Route by path at layer 7: menu requests go to their own pool of servers, so the menu rush can't starve checkout.",
        "Scale that pool on its own, and cache menus: they change rarely.",
        "Checkout and payments keep their own capacity.",
      ],
      say: "\"Split pools by path at layer 7, scale only the hot one, and cache what rarely changes.\"",
      deeper: "Days 3 and 8",
    },
    {
      q: "\"Now one whole availability zone goes down. What happens?\"",
      answer: [
        "Every server there fails its health checks, and traffic shifts to the other zone.",
        "That zone must already be big enough to carry everything. If not, shed load: switch off extras, keep ordering alive.",
        "Logins and data survive only if they were copied across zones beforehand.",
      ],
      say: "\"Health checks move traffic to the healthy zone; it was sized for the full peak, and state was replicated, so users barely notice.\"",
      deeper: "Days 13 and 18",
    },
    {
      q: "\"Now the app retries every failed request 3 times, and one slow server makes it worse. What do you do?\"",
      answer: [
        "Retries multiply the load exactly when things are struggling: a retry storm.",
        "Use exponential backoff with jitter, cap the retries, and add a circuit breaker so a sick server gets a rest.",
        "Make writes idempotent so a retry can never place an order twice.",
      ],
      say: "\"Backoff with jitter, a retry cap, circuit breakers, and idempotent writes.\"",
      deeper: "Days 13 and 18",
    },
    {
      q: "\"Now your manager wants every user always on the same server, 'for speed'. What do you say?\"",
      answer: [
        "Stickiness can help a server reuse what's in its memory, but it makes load uneven and turns a crash into lost sessions.",
        "If affinity really helps, use consistent hashing on the user ID, and still keep sessions in a shared store.",
        "Measure first: most of that speed usually comes from a shared cache, not from stickiness.",
      ],
      say: "\"Consistent hashing if affinity really helps, sessions still in a shared store, and measure before trading away failover.\"",
      deeper: "Days 3 and 6",
    },
  ],

  interview: [
    "Clarify first: how many requests a second, how many servers, and is anything stored on the servers?",
    "Put a pair of load balancers in front, across zones, with DNS pointing at them.",
    "Pick the algorithm: round robin for identical short requests, least connections for uneven ones, consistent hashing when the same user must land on the same server.",
    "Health checks on real work and error rate; pull bad servers out automatically.",
    "Keep servers stateless with sessions in a shared store, so adding or losing a server is a non-event.",
  ],

  cheatsheet: {
    title: "Day 2 · Load balancing",
    points: [
      "A load balancer spreads requests and skips broken servers",
      "Round robin is blind to slow servers; least connections isn't",
      "Consistent hashing moves only a few users when servers change",
      "Health checks must test real work, not just \"are you alive\"",
      "Keep servers stateless; sessions in a shared store",
      "Two load balancers, several zones: never one of anything",
    ],
  },

  linkedin:
    "Day 2/21 of System Design with Klymb.\n\nOn New Year's Eve 2021, Swiggy said it peaked at 9,500 food orders a minute. Every order is dozens of requests, and something has to decide which server answers each one: the load balancer.\n\nWhat I learned: round robin is blind to a slow server, health checks must test real work, servers should be stateless, and you never run just one load balancer.\n\n#SystemDesign #Klymb",

  nextDay: "Hotstar's IPL final: crores watching one match. How does the video reach everyone?",
};

const hi: DayCopy = {
  hookLines: [
    "Swiggy pe New Year's Eve 2021.",
    "Ek point pe: har minute 9,500 food orders.",
    "Aur har order servers ko baar baar hit karta hai: menu, cart, payment, tracking.",
  ],
  question: "Har minute lakhon requests, aur darjanon servers. Kaun decide karta hai ki har request ka jawab kaunsa server dega?",

  pre: [
    {
      id: "d2-pre-1",
      scenario: "Tumhara food app 20 ek jaise servers pe chalta hai. Dinner rush shuru, requests ki baarish.",
      prompt: "Requests servers tak kaise pahunchni chahiye?",
      choices: [
        {
          text: "Aage ek load balancer: woh requests 20 servers mein baante aur jo band hai use skip kare",
          why: "Ek darwaza, kai cooks. Servers badhao ya hatao, app ko kuch pata nahi chalta. Trade-off: load balancer ab ek aur box hai jo kabhi band nahi hona chahiye.",
          best: true,
        },
        { text: "App mein 20 servers ke address daal do, har phone khud ek chun le", why: "Kaagaz pe chalta hai, par server mar jaaye tab bhi phones use call karte rehte hain, aur traffic shift karne ke liye naya app version bhejna padta hai." },
        { text: "DNS se domain ko 20 servers pe point karo, DNS khud ghumayega", why: "DNS round robin asli technique hai, par DNS ke jawab minutes ya ghanton tak cache hote hain, toh mara hua server der tak traffic paata rehta hai." },
      ],
    },
    {
      id: "d2-pre-2",
      scenario: "Load balancer round robin use karta hai: har server ko baari baari agli request. 20 mein se ek server atka hai aur 8 second mein jawab deta hai.",
      prompt: "Kya hoga?",
      choices: [
        {
          text: "Use phir bhi har 20 mein se 1 request milegi, toh lagbhag 5% users 8 second wait karenge",
          why: "Round robin baari ginta hai, yeh nahi ki server kitna busy ya slow hai. Fix: least connections ya latency dekh ke routing, plus health checks jo use bahar nikaalein.",
          best: true,
        },
        { text: "Load balancer khud samajh jaayega aur use bhejna band kar dega", why: "Tabhi jab health checks speed ya errors naapte hon. Simple \"zinda ho?\" check haan bolega: server zinda hai, bas slow." },
        { text: "Saare 20 servers ek saath slow ho jaayenge", why: "Baaki 19 theek hain. Nuksaan un 5% bad-kismat users ka hai jo atke server pe pahunche." },
      ],
    },
    {
      id: "d2-pre-3",
      scenario: "User login karta hai, request server 3 pe jaati hai. Agli request server 7 pe pahunchti hai.",
      prompt: "Use logged in rakhne ka sabse saaf tareeka?",
      choices: [
        {
          text: "Session data ek shared store (jaise Redis) mein rakho jise har server padh sake",
          why: "Servers stateless rehte hain: koi bhi server koi bhi request le sakta hai, toh servers badhao, hatao ya kho do, fark nahi. Trade-off: har request pe ek chhota extra lookup.",
          best: true,
        },
        { text: "Sticky sessions: is user ko hamesha server 3 pe bhejo", why: "Common hai aur jaldi lag jaata hai, par server 3 gira toh user logout, aur sticky bhaari users load ko uneven kar dete hain." },
        { text: "Har login ko turant saare 20 servers pe copy karo", why: "Har session ki 20 copies matlab servers ke beech bahut baat-cheet, aur load mein copies sync se bahar ho jaati hain." },
      ],
    },
  ],

  revealTitle: "Swiggy ne kya bataya, aur load balancing aksar kaise banti hai",
  revealSub: "Swiggy ka public account, phir standard pattern",
  sourceNote: "Swiggy facts: Swiggy ka apna blog (New Year's Eve 2022 war room) aur The News Minute mein Swiggy ke figures (New Year's Eve 2021). Aakhri row general industry pattern hai, Swiggy ke andar ka claim nahi.",
  reveal: [
    { when: "NYE 2021", what: "Swiggy ne bataya ki food orders 9,500 per minute tak pahunche, pichli raat ka apna 5,500 ka record tod ke." },
    { when: "NYE 2022 se 8–10 hafte pehle", what: "Engineering readiness planning shuru. Teams peak orders per minute ka forecast karti hain." },
    { when: "Orders → requests", what: "Wahi peak har service ke liye maximum requests per minute ban jaata hai. Services utna scale up hoti hain, baad mein wapas down." },
    { when: "Raat se pehle", what: "Critical caches aur databases ek availability zone se kai zones pe shift, taaki ek data centre gire toh woh na girein." },
    { when: "Us raat", what: "War room dashboards dekhta hai. UPI payments fail hue, toh payments team ne doosre payment options chalu kiye." },
    { when: "Aam design", what: "Zones mein load balancers ki jodi, health checks, least connections, stateless servers aur shared store mein sessions." },
  ],

  explain: {
    title: "Load balancing, aasaan bhasha mein",
    items: [
      { term: "Round robin", what: "Har server ko baari baari agli request. Simple, par slow server nahi dikhta.", example: "Ek jaise servers, chhoti requests" },
      { term: "Weighted", what: "Bade servers ko requests ka bada hissa.", example: "Chhoti aur badi machines saath mein" },
      { term: "Least connections", what: "Request us server ko jis pe sabse kam requests chal rahi hain.", example: "Requests jinka time bahut alag hai" },
      { term: "Consistent hashing", what: "Ek user hamesha ek hi server pe, aur naya server judne pe sirf thode users shift.", example: "Caches, live chat rooms" },
      { term: "Health checks", what: "Balancer har server se poochta rehta hai \"asli kaam kar sakte ho?\" aur jo nahi kar sakta use nikaal deta hai.", example: "Error rate, ek test request" },
      { term: "Layer 4 vs Layer 7", what: "L4 address aur port se connections baantta hai. L7 HTTP request padh ke path se route kar sakta hai.", example: "/payments apne servers pe" },
    ],
  },

  concept: {
    cards: [
      {
        name: "Load baanto",
        examples: ["Round robin", "Weighted", "Least connections", "Consistent hashing"],
        moves: ["Ek jaise servers, chhoti requests → round robin", "Alag size ke servers → weighted", "Slow, uneven requests → least connections", "Wahi user, wahi server → consistent hashing"],
      },
      {
        name: "Chalte raho",
        examples: ["Health checks", "Stateless servers", "Do load balancers", "Kai zones"],
        moves: ["Asli check fail karne wale servers bahar", "Sessions shared store mein", "Ek load balancer kabhi nahi: jodi chalao", "Zones mein phailao, jaise Swiggy ka Multi-AZ move"],
      },
    ],
    rule: "Load samajhdaari se baanto, aur maan ke chalo kuch tootega: har box ka, load balancer ka bhi, backup chahiye.",
  },

  post: [
    {
      id: "d2-post-1",
      scenario: "Exam results ka din. Ek server ki disk full hai, toh woh turant error lautata hai. Least connections ko woh bahut pasand hai: sabse jaldi requests khatam karta hai.",
      prompt: "Ise kaun pakdega?",
      choices: [
        { text: "Error rate ya asli test request pe health checks, sirf \"zinda ho?\" nahi", why: "Server zinda hai aur bahut tez, fail hone mein. Trade-off: gehre checks thoda load lete hain aur tuning chahiye, taaki ek jhatke pe achha server na nikle.", best: true },
        { text: "Round robin pe shift karo", why: "Round robin phir bhi use har N mein se 1 request bhejega. Asli kami yeh hai ki koi check nahi karta ki uske jawab theek hain ya nahi." },
        { text: "Aur servers jodo", why: "Toota server phir bhi apna hissa paata hai, aur least connections use hi pasand karta rahega." },
      ],
    },
    {
      id: "d2-post-2",
      scenario: "Friday raat 8:05 baje tumhara akela load balancer crash ho gaya.",
      prompt: "Pehle se kya hona chahiye tha?",
      choices: [
        { text: "Doosra load balancer, doosre zone mein, jo turant sambhal le", why: "Critical cheez kabhi ek nahi. Trade-off: ek balancer ka paisa jo zyada tar wait karta hai, ya dono live chalao aur dono aadhe load pe.", best: true },
        { text: "Bada, zyada powerful load balancer", why: "Phir bhi ek hi box. Bada matlab fail nahi hoga, aisa nahi." },
        { text: "Peeche tez servers", why: "Akela darwaza toota hai toh untak koi pahunch hi nahi sakta." },
      ],
    },
    {
      id: "d2-post-3",
      scenario: "Har user ka live chat room ek server pe hai. Tum 10 servers se 12 pe jaate ho.",
      prompt: "Kaunsi routing zyada tar users ko wahin rakhegi?",
      choices: [
        { text: "Consistent hashing: servers badhne pe sirf thode users shift", why: "Hash mod N mein N badla toh lagbhag sab shuffle. Consistent hashing lagbhag N mein se 1 ko hilata hai. Trade-off: thoda complex, aur ek bhaari user phir bhi ek server bhar sakta hai.", best: true },
        { text: "User ID ka hash mod servers ki ginti", why: "Har baar wahi server, jab tak servers ki ginti na badle. Badli toh lagbhag har user ek saath shift." },
        { text: "Least connections", why: "Kaam baantne mein badhiya, par user ko us server pe nahi rakhta jahan uska room hai." },
      ],
    },
    {
      id: "d2-post-4",
      scenario: "Shared session store na banana pade, isliye tumne sticky sessions on kar diye.",
      prompt: "Kya trade off kiya?",
      choices: [
        { text: "Barabar load aur safe failover: ek server bhaari users se bhar sakta hai, aur woh gira toh unka session gaya", why: "Sticky sessions jaldi lag jaate hain. Keemat theek tab dikhti hai jab traffic peak pe ho ya server gire.", best: true },
        { text: "Speed: sticky sessions se har request slow hoti hai", why: "Aksar ulta: server ki memory mein user ka data pehle se hota hai. Keemat balance aur failover hai, speed nahi." },
        { text: "Security: sticky sessions hack karna aasaan", why: "Apne aap mein nahi. Sawaal yeh hai ki session state kahan rehta hai, security ka nahi." },
      ],
    },
  ],

  estimates: [
    {
      id: "d2-est-1",
      given: ["Peak: 9,500 orders per minute", "Har order lagbhag 30 requests: menu, cart, payment, tracking…"],
      prompt: "Peak pe kitni requests per second?",
      unit: "requests/sec",
      answer: 4750,
      tolerance: 0.3,
      working: ["9,500 ÷ 60 ≈ 158 orders per second", "158 × 30 ≈ 4,750 requests per second", "Peak pe har second itna load balancer baantta hai."],
    },
    {
      id: "d2-est-2",
      given: ["Peak pe lagbhag 4,750 requests per second", "Ek server 400 requests per second sambhalta hai", "30% spare rakho taaki ek server gir sake"],
      prompt: "Kitne servers chahiye?",
      unit: "servers",
      answer: 17,
      tolerance: 0.25,
      working: ["4,750 ÷ 400 ≈ 12 servers sirf sambhalne ke liye", "30% spare ke saath: 12 ÷ 0.7 ≈ 17 servers", "Inhe zones mein phailao, taaki ek zone gire toh bhi kaafi bachein."],
    },
    {
      id: "d2-est-3",
      given: ["Round robin ke peeche 10 servers", "Ek atka hai, 8 second mein jawab deta hai", "Users har minute 6,000 requests karte hain"],
      prompt: "Atke server pe har minute kitni requests?",
      unit: "requests/min",
      answer: 600,
      tolerance: 0.15,
      working: ["Round robin har server ko 10 mein se 1 request bhejta hai", "6,000 ÷ 10 = 600 slow requests per minute", "Har minute 600 naraaz users, jab tak health check use nikaal na de."],
    },
  ],

  build: {
    title: "Dinner rush ka front door banao",
    intro: "Har box ko uske kaam wali jagah pe drag karo. Ya box tap karo, phir slot tap karo.",
    given: "Lakhon phones",
    rows: [["dns"], ["lb", "standby"], ["health", "servers"], ["session", "zones"]],
    slots: {
      dns: { role: "App ke domain ko load balancers ke address mein badalta hai", answer: "dns" },
      lb: { role: "Har request servers mein baantta hai", answer: "lb" },
      standby: { role: "Main balancer gire toh sambhalta hai", answer: "standby" },
      health: { role: "Slow ya toote servers ko rotation se bahar karta hai", answer: "health" },
      servers: { role: "Inmein se koi bhi koi bhi request le sakta hai", answer: "servers" },
      session: { role: "Logins rakhta hai taaki har server padh sake", answer: "session" },
      zones: { role: "Doosre data centre mein copy, agar ek gire", answer: "zones" },
    },
    chips: [
      { id: "health", label: "Health checks", does: "har server ko test karte rehte hain aur fail hone wale ko nikaalte hain" },
      { id: "sticky", label: "Sticky sessions", does: "is design ka box nahi: user ko ek server se baandh dete hain, server gira toh logout" },
      { id: "lb", label: "Load balancer", does: "front door: requests servers mein baantta hai" },
      { id: "zones", label: "Doosra zone", does: "doosra data centre apni copy ke saath, taaki ek gir sake" },
      { id: "dns", label: "DNS", does: "address book: naam ko load balancers ke address mein badalta hai" },
      { id: "session", label: "Shared session store", does: "logins ek jagah jahan se har server padh sake" },
      { id: "servers", label: "Stateless servers", does: "app servers jo apne paas kuch nahi rakhte, toh koi bhi koi bhi request le" },
      { id: "standby", label: "Standby balancer", does: "doosra load balancer, sambhalne ko taiyaar" },
    ],
    done: "Yeh hai dinner rush jhelne wala front door. Swiggy ne bhi critical caches aur databases ko kai zones pe le jaane ke baare mein isi wajah se likha hai.",
  },

  design: {
    title: "Data centre band ho, phir bhi orders chalein",
    brief: "Tumhara food app ek data centre mein chalta hai. Friday raat 8:30 baje poore data centre ki bijli chali gayi. Aisa setup design karo ki customers order karte rahein.",
    constraints: [
      "Peak: lagbhag 5,000 requests per second",
      "Users ko dobara login na karna pade",
      "Koi order na khoye, kisi ka paisa do baar na kate",
      "Ghanton mein nahi, minutes mein normal",
    ],
    minChars: 120,
    walkthrough: [
      { heading: "Requirements aur numbers", points: ["Browse, cart aur payment chalte rehne chahiye. Recommendations band ho sakte hain.", "Peak pe lagbhag 5,000 requests per second. Do zones hain toh har ek akela poora load utha sake."] },
      { heading: "Do zones, dono live", points: ["Kam se kam do availability zones mein servers, har ek full peak ke size ka.", "Har zone mein load balancers. DNS ya global balancer users ko sirf healthy zones bhejta hai."] },
      { heading: "Stateless servers, replicated state", points: ["Sessions ek store mein jo zones mein copy hota hai, taaki logins bachein.", "Database: primary aur doosre zone mein replica, jo primary ka zone gire toh apne aap sambhal le."] },
      { heading: "Orders aur payments safe", points: ["Confirm karne se pehle order save karo. Har order ki idempotency key, taaki failover ke baad retry pe paisa do baar na kate.", "Slow kaam (SMS, rider assign) queue mein, taaki failover ke baad ka burst drop na ho."] },
      { heading: "Trade-offs jo bolke batao", points: ["Do full-size zones ka kharcha lagbhag double: poora data centre jhelne ki keemat.", "Har write doosre zone mein copy karne se kuch milliseconds lagte hain, badle mein koi order nahi khota.", "Practice karo: asli raat se pehle failover drills."] },
    ],
    checklist: [
      "Maine kam se kam do zones mein servers rakhe",
      "Maine har zone ko akele peak uthane ke size ka rakha",
      "Maine servers stateless rakhe, sessions shared, replicated store mein",
      "Maine doosre zone mein database replica rakha jo sambhal sake",
      "Maine orders ko khone aur double charge se bachaya",
      "Maine kam se kam ek trade-off bataya",
    ],
  },

  followUps: [
    {
      q: "\"Ab 8 baje traffic double, par sirf menu pe. Kya badloge?\"",
      answer: [
        "Layer 7 pe path se route karo: menu requests apne servers ke pool pe, taaki menu ka rush checkout ko bhookha na rakhe.",
        "Sirf us pool ko scale karo, aur menus cache karo: woh kam badalte hain.",
        "Checkout aur payments ki apni capacity bani rahe.",
      ],
      say: "\"Layer 7 pe path se pools alag, sirf garam pool scale, aur jo kam badalta hai woh cache.\"",
      deeper: "Days 3 aur 8",
    },
    {
      q: "\"Ab poora ek availability zone gir gaya. Kya hoga?\"",
      answer: [
        "Wahan ke saare servers health checks fail karte hain, traffic doosre zone pe shift.",
        "Woh zone pehle se itna bada hona chahiye ki sab utha sake. Nahi toh load shed karo: extras band, ordering chalu.",
        "Logins aur data tabhi bachte hain jab pehle se zones mein copy hon.",
      ],
      say: "\"Health checks traffic healthy zone pe bhejte hain; woh full peak ke size ka tha aur state replicated tha, toh users ko pata bhi nahi chalta.\"",
      deeper: "Days 13 aur 18",
    },
    {
      q: "\"Ab app har failed request 3 baar retry karta hai, aur ek slow server haalat bigaad raha hai. Kya karoge?\"",
      answer: [
        "Retries load ko theek tab guna karte hain jab system pehle se pareshaan hai: retry storm.",
        "Exponential backoff aur jitter, retries pe limit, aur circuit breaker taaki beemar server ko aaraam mile.",
        "Writes idempotent rakho taaki retry se order do baar na bane.",
      ],
      say: "\"Jitter ke saath backoff, retry limit, circuit breakers, aur idempotent writes.\"",
      deeper: "Days 13 aur 18",
    },
    {
      q: "\"Ab manager chahta hai har user hamesha ek hi server pe rahe, 'speed ke liye'. Kya bologe?\"",
      answer: [
        "Stickiness se server apni memory reuse kar sakta hai, par load uneven hota hai aur crash matlab sessions gaye.",
        "Affinity sach mein madad kare toh user ID pe consistent hashing, aur sessions phir bhi shared store mein.",
        "Pehle measure karo: zyada tar speed shared cache se aati hai, stickiness se nahi.",
      ],
      say: "\"Affinity sach mein chahiye toh consistent hashing, sessions phir bhi shared store mein, aur failover chhodne se pehle measure.\"",
      deeper: "Days 3 aur 6",
    },
  ],

  interview: [
    "Pehle poocho: kitni requests per second, kitne servers, aur kya servers pe kuch store hota hai?",
    "Aage zones mein load balancers ki jodi, DNS unpe point karta hai.",
    "Algorithm chuno: ek jaisi chhoti requests ke liye round robin, uneven ke liye least connections, wahi user wahi server ke liye consistent hashing.",
    "Asli kaam aur error rate pe health checks; kharab servers apne aap bahar.",
    "Servers stateless, sessions shared store mein, taaki server badhna ya girna koi baat hi na ho.",
  ],

  cheatsheet: {
    title: "Day 2 · Load balancing",
    points: [
      "Load balancer requests baantta hai aur toote servers skip karta hai",
      "Round robin ko slow server nahi dikhta; least connections ko dikhta hai",
      "Servers badalne pe consistent hashing sirf thode users hilata hai",
      "Health checks asli kaam test karein, sirf \"zinda ho?\" nahi",
      "Servers stateless; sessions shared store mein",
      "Do load balancers, kai zones: koi bhi cheez akeli nahi",
    ],
  },

  linkedin:
    "Day 2/21: System Design with Klymb.\n\nNew Year's Eve 2021 pe Swiggy ne bataya ki food orders 9,500 per minute tak pahunche. Har order darjanon requests hai, aur koi decide karta hai ki har request ka jawab kaunsa server dega: load balancer.\n\nMera takeaway: round robin ko slow server nahi dikhta, health checks asli kaam test karein, servers stateless hon, aur load balancer kabhi akela nahi.\n\n#SystemDesign #Klymb",

  nextDay: "Hotstar ka IPL final: crores log ek match dekh rahe. Video sab tak kaise pahunchta hai?",
};

export const dayTwo: Day = {
  day: 2,
  of: 21,
  app: "Swiggy",
  minutes: 15,
  hook: { date: "31 Dec 2021 · 9,500 orders a minute" },
  copy: { en, hi },
  sources: [
    { label: "Swiggy Diaries: Swiggy's NYE War Room (Jan 2023)", href: "https://blog.swiggy.com/?p=13233" },
    { label: "The News Minute: 9,500 orders per minute on Swiggy, NYE 2021", href: "https://www.thenewsminute.com/news/two-million-order-9-pm-5500-minute-how-indians-used-swiggy-nye-159385" },
  ],
  video: {
    src: "/videos/system-design/day-2-wide.mp4", poster: "/videos/system-design/day-2-wide-poster.jpg", minutes: 3, lang: "Hinglish",
    wide: { src: "/videos/system-design/day-2-wide.mp4", poster: "/videos/system-design/day-2-wide-poster.jpg" },
  },
  prevHref: "/system-design/day-1",
};
