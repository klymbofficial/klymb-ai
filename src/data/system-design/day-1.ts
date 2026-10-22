/**
 * Day 1 of "System Design in 21 Days": Big Billion Day → predictable vs sudden load.
 * Every claim about Flipkart is from the public sources in `sources`; keep it that way.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  hookLines: [
    "Flipkart's first Big Billion Day.",
    "The site buckled. Errors. Deals sold out in seconds.",
    "Then both founders emailed every customer to say sorry.",
  ],
  question: "The sale is coming back next year. You're the engineer. What do you do?",

  pre: [
    {
      id: "pre-1",
      scenario: "The sale is 2 weeks away. Traffic at midnight is forecast to hit ~8x normal.",
      prompt: "What's the FIRST thing you do?",
      choices: [
        {
          text: "Put capacity above the forecast in place early, and test at even more load than that",
          why: "This load is predictable: you know the date and time. Why wait to be surprised? Scale up and test weeks ahead.",
          best: true,
        },
        {
          text: "Turn on auto-scaling, so servers get added when the traffic arrives",
          why: "Auto-scaling matters, but new servers take minutes to boot and warm up. The midnight spike arrives in seconds.",
        },
        {
          text: "Add rate limiting so too many people can't get in",
          why: "Not wrong, real systems use it. But it's protection, not the plan. Capacity first, then limits.",
        },
        {
          text: "Get one huge, most powerful server",
          why: "One machine has a ceiling, and if it goes down everything goes with it (single point of failure).",
        },
      ],
    },
    {
      id: "pre-2",
      scenario: "Your web servers handle 10x traffic. Test passed.",
      prompt: "What could still sink the sale?",
      choices: [
        {
          text: "The systems behind them: stock database, payments, warehouse. The weakest link breaks first",
          why: "A chain is only as strong as its weakest link. Flipkart said as much in 2015: high QPS means nothing if the warehouse can't pack.",
          best: true,
        },
        {
          text: "Nothing, if the servers are ready everything is ready",
          why: "The web server is just the front door. Inventory, payments and delivery all have to carry the same load.",
        },
        {
          text: "The website's design is too heavy",
          why: "Images come from a CDN and can be cached ahead of time. The real bottleneck sits inside the order path.",
        },
      ],
    },
    {
      id: "pre-3",
      scenario: "12:00:05 AM. Traffic is 2x even the forecast. Servers are full.",
      prompt: "Now what?",
      choices: [
        {
          text: "Let in as many as you can serve, show the rest a queue / 'please wait' page",
          why: "That's graceful degradation: the system stays up and the people inside finish their orders.",
          best: true,
        },
        {
          text: "Let everyone in and see what happens",
          why: "Under overload everything gets slow for everyone, then errors. That's what happened in 2014.",
        },
        {
          text: "Shut the site until traffic drops",
          why: "Zero sales, and everyone comes back at once: another spike.",
        },
      ],
    },
  ],

  revealTitle: "Flipkart, Big Billion Day 2015",
  revealSub: "your answer vs Flipkart",
  sourceNote: "Source: Flipkart Stories (links at the bottom)",
  reveal: [
    { when: "~4 months before", what: "Preparation starts. Most of the last two months before code freeze go to infrastructure." },
    { when: "~1 month of tests", what: "Stress runs at 5x the projected numbers, across all systems." },
    { when: "Before launch", what: "Systems throttled slightly below the limits they had survived in tests." },
    { when: "On the order path", what: "An async queue so no order message is lost, and orders piped by each downstream system's capacity." },
    { when: "When things fail", what: "Fallbacks, hot-standby nodes, replication. Sold-out items marked out of stock immediately." },
    { when: "During the sale", what: "Recalibrated alerts, live dashboards, playbooks and tiger teams on 24x7 shifts." },
  ],

  concept: {
    cards: [{
      name: "Predictable load",
      examples: ["Big Billion Day midnight", "IPL final", "Tatkal at 10 AM", "Exam results"],
      moves: ["Forecast the peak", "Pre-scale and warm caches before it", "Load test well above the forecast", "Freeze code, write playbooks"],
    }, {
      name: "Sudden load",
      examples: ["A celebrity tweets your link", "A reel goes viral", "News breaks"],
      moves: ["Auto-scale (minutes, not seconds)", "Rate limit per user", "Queue or waiting room", "Shed or degrade non-essential features"],
    }],
    rule: "Real systems use both: pre-scale for the forecast, and keep protection for whatever goes past it.",
  },

  post: [
    {
      id: "post-1",
      scenario: "IRCTC Tatkal booking opens at 10:00 AM every day. Quiet at 9:59, peak at 10:00:02.",
      prompt: "What kind of load is this?",
      choices: [
        { text: "Predictable: same time every day, known in advance", why: "The spike is fast, but its time is fixed. So capacity should be ready by 9:45.", best: true },
        { text: "Sudden: it arrives in seconds", why: "Speed doesn't decide the type. Do you know in advance? Yes, 10 AM every day." },
        { text: "Random: impossible to say", why: "Easy to say: tomorrow at 10, and the day after too." },
      ],
    },
    {
      id: "post-2",
      scenario: "10:00:05. Requests are 3x what the booking database can handle.",
      prompt: "Best move?",
      choices: [
        {
          text: "Waiting queue + per-user limit; process bookings at the database's pace",
          why: "Give the database only what it can handle. Everyone else waits in line, in fair order.",
          best: true,
        },
        { text: "Send every request to the database, it'll sort it out", why: "An overloaded database gets slow for everyone, and it's the first thing to break." },
        { text: "Turn off login", why: "The problem is on the booking path. Shutting everything down means zero bookings." },
      ],
    },
    {
      id: "post-3",
      scenario: "A cricketer tweets a small app's link with no warning. 50x traffic in 5 minutes.",
      prompt: "First line of defence?",
      choices: [
        {
          text: "Rate limit + serve what you can from cache + auto-scale on",
          why: "Sudden load: the time to pre-scale has passed. Now protect, degrade, and hold on while you scale.",
          best: true,
        },
        { text: "Pre-scale", why: "Pre-scaling needs advance notice. There was no warning here." },
        { text: "Run a load test now", why: "Load tests are for before the sale. Production is already load testing you." },
      ],
    },
  ],

  interview: [
    "First ask: is this load predictable? (Do we know the date and time?)",
    "Predictable: forecast → pre-scale → load test well above the forecast → code freeze.",
    "Check the whole chain: web, cache, DB, payments, inventory. Weakest link first.",
    "If the forecast breaks: rate limit, queue / waiting room, switch off non-essential features.",
    "Sudden load: auto-scale + cache + rate limit, because there's no time to pre-scale.",
  ],

  cheatsheet: {
    title: "Day 1 · Predictable vs sudden load",
    points: [
      "First question: do you know when the peak comes?",
      "Yes → pre-scale, warm up, test at a multiple of the forecast",
      "No → auto-scale + rate limit + queue + degrade",
      "Auto-scaling takes minutes; spikes take seconds",
      "Weakest downstream system sets your real capacity",
      "Throttle a little below what you tested",
    ],
  },

  linkedin:
    "Day 1/21 of System Design with Klymb.\n\nFlipkart's first Big Billion Day (2014) buckled under load. For 2015 they started ~4 months early and ran stress tests at 5x the projected traffic for about a month.\n\nWhat I learned: first ask whether the load is predictable. If you know when the peak comes, pre-scale and test well above it. If you don't, auto-scale, rate limit, queue and degrade. Good systems do both.\n\n#SystemDesign #Klymb",

  nextDay: "Swiggy dinner rush: everyone orders at 8 PM. How do you spread the load?",
};

const hi: DayCopy = {
  hookLines: [
    "Flipkart ka pehla Big Billion Day.",
    "Site baith gayi. Errors. Deals seconds mein sold out.",
    "Phir dono founders ne har customer ko email karke sorry bola.",
  ],
  question: "Agle saal sale phir aa rahi hai. Tum engineer ho. Kya karoge?",

  pre: [
    {
      id: "pre-1",
      scenario: "Sale 2 hafte baad hai. Midnight par traffic normal se ~8x jaane ka forecast hai.",
      prompt: "Sabse PEHLA kaam kya karoge?",
      choices: [
        {
          text: "Forecast se upar capacity pehle hi khadi karo, aur usse bhi zyada load par test karo",
          why: "Load predictable hai: date aur time pata hai. To surprise ka wait kyun? Weeks pehle scale up karo aur test karo.",
          best: true,
        },
        {
          text: "Auto-scaling on kar do, traffic aayega to servers khud badh jayenge",
          why: "Auto-scaling zaroori hai, par naye servers ko boot aur warm hone mein minutes lagte hain. Midnight ka spike seconds mein aata hai.",
        },
        {
          text: "Rate limiting laga do taaki zyada log andar hi na aa sakein",
          why: "Galat nahi hai, real systems lagate hain. Par yeh protection hai, plan nahi. Pehle capacity, phir limit.",
        },
        {
          text: "Ek bahut bada, sabse powerful server le aao",
          why: "Ek machine ki ek limit hoti hai, aur woh gir gayi to sab gaya (single point of failure).",
        },
      ],
    },
    {
      id: "pre-2",
      scenario: "Tumhare web servers 10x traffic sambhal lete hain. Test pass.",
      prompt: "Sale phir bhi kis wajah se fail ho sakti hai?",
      choices: [
        {
          text: "Peeche wale systems: stock database, payments, warehouse. Sabse kamzor kadi pehle tootegi",
          why: "Chain utni hi strong jitni uski weakest link. Flipkart ne 2015 mein yahi likha: QPS ka koi matlab nahi agar warehouse pack hi na kar paaye.",
          best: true,
        },
        {
          text: "Kisi wajah se nahi, servers ready hain to sab ready hai",
          why: "Web server sirf darwaza hai. Order ke peeche inventory, payment, delivery sab ko bhi utna hi load uthana hai.",
        },
        {
          text: "Website ka design heavy hai",
          why: "Images CDN se aati hain aur pehle se cache ho sakti hain. Asli bottleneck order path ke andar hota hai.",
        },
      ],
    },
    {
      id: "pre-3",
      scenario: "12:00:05 AM. Traffic forecast se bhi 2x upar chala gaya. Servers full.",
      prompt: "Ab kya karoge?",
      choices: [
        {
          text: "Jitna serve kar sakte ho utna andar lo, baaki ko queue / 'thoda ruko' page dikhao",
          why: "Yeh graceful degradation hai: system zinda rehta hai aur jo andar hain unka order poora hota hai.",
          best: true,
        },
        {
          text: "Sabko andar aane do, jaisa hoga dekha jayega",
          why: "Overload mein sab ke liye sab slow ho jata hai, phir errors. 2014 mein yahi hua tha.",
        },
        {
          text: "Site band kar do jab tak traffic kam na ho",
          why: "Zero sales, aur sab log ek saath wapas aayenge: ek aur spike.",
        },
      ],
    },
  ],

  revealTitle: "Flipkart, Big Billion Day 2015",
  revealSub: "tumhara answer vs Flipkart",
  sourceNote: "Source: Flipkart Stories (links neeche hain)",
  reveal: [
    { when: "~4 mahine pehle", what: "Taiyaari shuru. Code freeze se pehle ke aakhri do mahine zyada tar infrastructure par gaye." },
    { when: "~1 mahine tak tests", what: "Saare systems par projected numbers ke 5x par stress tests." },
    { when: "Launch se pehle", what: "Systems ko test mein jhele gaye limit se thoda neeche throttle kiya." },
    { when: "Order path par", what: "Async queue taaki koi order message na khoye, aur har system ko uski capacity ke hisaab se orders." },
    { when: "Jab kuch fail ho", what: "Fallbacks, hot-standby nodes, replication. Sold-out items turant out of stock mark." },
    { when: "Sale ke dauraan", what: "Naye sire se set alerts, live dashboards, playbooks aur 24x7 tiger teams." },
  ],

  concept: {
    cards: [{
      name: "Predictable load",
      examples: ["Big Billion Day midnight", "IPL final", "Tatkal 10 baje", "Exam results"],
      moves: ["Peak ka forecast karo", "Usse pehle scale up karo, cache warm karo", "Forecast se kaafi upar load test", "Code freeze, playbooks likho"],
    }, {
      name: "Sudden load",
      examples: ["Celebrity ne tumhara link tweet kiya", "Reel viral ho gayi", "Breaking news"],
      moves: ["Auto-scale (minutes lagte hain, seconds nahi)", "Per user rate limit", "Queue ya waiting room", "Faltu features band ya halke karo"],
    }],
    rule: "Real systems dono karte hain: forecast ke liye pre-scale, aur usse upar ke liye protection.",
  },

  post: [
    {
      id: "post-1",
      scenario: "IRCTC Tatkal booking roz subah 10:00 baje khulti hai. 9:59 par traffic kam, 10:00:02 par peak.",
      prompt: "Yeh kis type ka load hai?",
      choices: [
        { text: "Predictable: roz same time, pehle se pata hai", why: "Spike tez hai, par uska time fixed hai. Isliye 9:45 tak capacity ready honi chahiye.", best: true },
        { text: "Sudden: seconds mein aata hai", why: "Speed se type decide nahi hota. Kya tum pehle se jaante ho? Haan, roz 10 baje." },
        { text: "Random: kuch keh nahi sakte", why: "Bilkul keh sakte ho: kal bhi 10 baje, parso bhi." },
      ],
    },
    {
      id: "post-2",
      scenario: "10:00:05. Requests, booking database ki capacity se 3x zyada.",
      prompt: "Best move?",
      choices: [
        {
          text: "Waiting queue + per-user limit; database ki speed par bookings process karo",
          why: "Database ko utna hi do jitna woh sambhal sake. Baaki log line mein, fair order mein.",
          best: true,
        },
        { text: "Sab requests database par bhej do, woh sort kar lega", why: "Overloaded database sab ke liye slow ho jata hai, aur woh tootne wali pehli cheez hai." },
        { text: "Login hi band kar do", why: "Problem booking path par hai. Sab kuch band karna = koi booking nahi." },
      ],
    },
    {
      id: "post-3",
      scenario: "Ek cricketer ne bina bataye ek chhote app ka link tweet kar diya. 5 minute mein 50x traffic.",
      prompt: "Pehli line of defence?",
      choices: [
        {
          text: "Rate limit + jo cache se serve ho sake woh cache se + auto-scale on",
          why: "Sudden load: pre-scale ka time nikal chuka. Ab protect karo, degrade karo, aur scale hone tak tik ke raho.",
          best: true,
        },
        { text: "Pre-scale kar do", why: "Pre-scaling ke liye pehle se pata hona chahiye. Yahan warning hi nahi mili." },
        { text: "Abhi load test chalao", why: "Load test sale se pehle ka kaam hai. Production already load test kar raha hai." },
      ],
    },
  ],

  interview: [
    "Pehle poocho: kya yeh load predictable hai? (date/time pata hai?)",
    "Predictable: forecast → pre-scale → forecast se kaafi upar load test → code freeze.",
    "Pura chain dekho: web, cache, DB, payments, inventory. Sabse kamzor kadi pehle.",
    "Forecast toota to: rate limit, queue / waiting room, non-essential features band.",
    "Sudden load: auto-scale + cache + rate limit, kyunki pre-scale ka time nahi.",
  ],

  cheatsheet: {
    title: "Day 1 · Predictable vs sudden load",
    points: [
      "Pehla sawaal: kya peak ka time pata hai?",
      "Pata hai → pre-scale, warm up, forecast ke kai guna par test",
      "Nahi pata → auto-scale + rate limit + queue + degrade",
      "Auto-scaling mein minutes lagte hain; spike seconds mein aata hai",
      "Sabse kamzor downstream system hi tumhari asli capacity hai",
      "Jitna test kiya, usse thoda neeche throttle karo",
    ],
  },

  linkedin:
    "Day 1/21: System Design with Klymb.\n\nFlipkart ka pehla Big Billion Day (2014) load mein baith gaya tha. 2015 ke liye unhone ~4 mahine pehle taiyaari shuru ki aur ~1 mahine tak projected traffic ke 5x par stress tests chalaye.\n\nMera takeaway: pehle poocho, load predictable hai ya nahi. Peak ka time pata hai to pre-scale karo aur usse kaafi upar test karo. Nahi pata to auto-scale, rate limit, queue aur degrade. Achhe systems dono karte hain.\n\n#SystemDesign #Klymb",

  nextDay: "Swiggy dinner rush: 8 baje sab ek saath order karte hain. Load kaise baantoge?",
};

export const dayOne: Day = {
  day: 1,
  of: 21,
  app: "Flipkart",
  minutes: 15,
  hook: {
    date: "6 Oct 2014",
    quote: "We did not live up to the promises we made.",
    quoteBy: "Sachin & Binny Bansal, apology email, Oct 2014",
  },
  copy: { en, hi },
  sources: [
    { label: "Flipkart Stories: TBBD Throwback, The Big Billion Day 2015", href: "https://stories.flipkart.com/tbbd-throwback-the-big-billion-day-2015/" },
    { label: "BOOM: Flipkart issues apology for Big Billion Day fiasco (2014)", href: "https://www.boomlive.in/flipkart-issues-apology-big-billion-day-fiasco/" },
  ],
  video: { src: "/videos/system-design/day-1.mp4", poster: "/videos/system-design/day-1-poster.jpg", minutes: 3, lang: "Hinglish" },
  prevHref: "/system-design/day-0",
};
