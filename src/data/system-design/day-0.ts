/**
 * Day 0 of "System Design in 21 Days": start here. What system design is, told as
 * Raju's dhaba growing up and then mapped onto a real app. No company claims.
 */
import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Start here",
  hookLines: [
    "You tap \"Order\" on Swiggy.",
    "One second later: order confirmed.",
    "In that one second, your order passed through about six different systems.",
  ],
  question: "What is system design, and why does every big app need it?",

  pre: [
    {
      id: "d0-pre-1",
      prompt: "What do you think system design is?",
      choices: [
        {
          text: "Choosing an app’s parts (servers, databases, caches…) and how they work together, so it keeps working for crores of people",
          why: "Exactly. Code makes one feature work; system design makes it keep working for everyone, all the time, even when a part breaks.",
          best: true,
        },
        { text: "Picking the right language and framework for the app", why: "It matters less than you’d think: a Java app and a Go app hit the same limits at scale. System design is about the parts and how they connect, not the language." },
        { text: "Writing clean, efficient code for every feature", why: "Necessary, but efficient code on one machine still runs out. Design decides how many machines there are and how they share the work." },
      ],
    },
    {
      id: "d0-pre-2",
      scenario: "Why does it matter? Your app works perfectly with 10 users. Tomorrow, 10 lakh people open it at the same time.",
      prompt: "What is most likely to happen?",
      choices: [
        {
          text: "It slows down or fails, because one server can only do so much",
          why: "Code that works for one user isn’t automatically ready for lakhs. Making it ready is exactly what system design is.",
          best: true,
        },
        { text: "It’s fine, as long as the server is powerful enough", why: "A bigger machine buys time (vertical scaling): simple, no code changes. But it has a ceiling, gets expensive fast, and if it dies, everything dies." },
        { text: "Only the database slows down; the app servers cope", why: "The database often does buckle first, but app servers, connections and the network hit limits too. You find the bottleneck by measuring, not assuming." },
      ],
    },
    {
      id: "d0-pre-3",
      scenario: "Raju’s dhaba now has 1,000 customers and only one cook: Raju.",
      prompt: "What’s the best fix?",
      choices: [
        {
          text: "Hire more cooks, and put a manager at the door to send each order to a free cook",
          why: "More cooks are more servers; the manager is a load balancer. The trade-off: more people to coordinate, and the manager must not become the new bottleneck.",
          best: true,
        },
        { text: "Buy Raju a bigger stove so he cooks faster", why: "That’s vertical scaling. It’s simple and works for a while, but one Raju still has a ceiling, and if he falls ill the dhaba shuts." },
        { text: "Pre-cook the popular dishes every morning and keep them ready", why: "That’s caching, and it really helps the popular items. But custom orders still wait for Raju, and food goes stale. Good alongside more cooks, not instead." },
      ],
    },
  ],
  revealTitle: "Raju's dhaba = every app",
  revealSub: "the dhaba, mapped to real systems",
  reveal: [
    { when: "Customer", what: "Your phone (the client) sends a request." },
    { when: "Address on Google Maps", what: "DNS: turns a name like klymb.ai into a server's address." },
    { when: "Manager at the door", what: "Load balancer: sends each request to a free server." },
    { when: "Cooks", what: "Servers: run the app's code. Add more as traffic grows." },
    { when: "Ready counter", what: "Cache: keeps popular data ready for instant answers." },
    { when: "Register", what: "Database: stores users, orders and stock safely." },
    { when: "Order slips in a line", what: "Queue: slow background work (SMS, rider) done one by one, nothing lost." },
    { when: "New branch in the city", what: "CDN: copies of images and videos kept close to users." },
  ],

  explain: {
    title: "How the boxes talk (HTTP, TCP, UDP)",
    optional: true,
    items: [
      { term: "HTTP", what: "The language of the web. Your phone sends a request (the order slip); the server sends back a response (the plate).", example: "Opening klymb.ai, loading a menu" },
      { term: "REST", what: "The common style of HTTP APIs that apps use: simple addresses like GET /menu or POST /order.", example: "Most mobile apps talking to their servers" },
      { term: "gRPC", what: "A faster, stricter way for servers to call each other, with a fixed format agreed in advance.", example: "One backend service calling another" },
      { term: "TCP", what: "Like a courier: every packet arrives, in order, or it is sent again. Reliable, a little slower.", example: "Payments, chat messages, web pages" },
      { term: "UDP", what: "Like live commentary: fast, and a missed packet is not sent again. You just move on.", example: "Video calls, live streams, online games" },
    ],
  },

  concept: {
    cards: [
      {
        name: "A good system is",
        examples: ["4 words to remember"],
        moves: ["Available: never down (UPI at midnight)", "Scalable: works with a 10x crowd (IPL final)", "Reliable: nothing lost (your money)", "Fast: answers instantly (search suggestions)"],
      },
      {
        name: "Every design answer",
        examples: ["7 steps, used on every day of this course"],
        moves: ["Requirements", "Estimates", "API", "Data model", "High-level design", "Deep dive", "Bottlenecks"],
      },
    ],
    rule: "Estimate first: 1 crore users × 10 requests a day ÷ 86,400 seconds ≈ 1,200 requests per second. Peaks are several times higher.",
  },

  post: [
    {
      id: "d0-post-1",
      scenario: "Images in your app load fast in Mumbai but slowly in Guwahati. Your servers are in Mumbai.",
      prompt: "What fixes it best?",
      choices: [
        { text: "A CDN: keep copies of the images in a city near Guwahati", why: "The problem is distance, and a CDN removes it. Trade-off: when an image changes you must clear the old copies, and you pay for CDN traffic.", best: true },
        { text: "Compress the images to half the size", why: "Worth doing, and it helps everyone. But the bytes still travel about 2,500 km, so Guwahati stays slower than Mumbai." },
        { text: "Cache the images in the app servers’ memory", why: "That saves the servers work, but the servers are still in Mumbai. It saves effort, not the trip." },
      ],
    },
    {
      id: "d0-post-2",
      scenario: "Right after you changed your domain settings, nobody can open your site. Your servers look healthy and idle.",
      prompt: "Which box do you check first?",
      choices: [
        { text: "DNS", why: "Healthy, idle servers mean requests aren’t arriving at all: people can’t find you. Tip: lower the DNS TTL before a planned change, so a mistake can be undone quickly.", best: true },
        { text: "The load balancer", why: "A sensible second check. But a broken load balancer usually shows up as errors, not silence. Silence points earlier, to finding the address." },
        { text: "Restart the servers", why: "They’re healthy and idle; restarting them changes nothing. Find out why no requests are arriving first." },
      ],
    },
    {
      id: "d0-post-3",
      scenario: "Sending the order SMS makes \"Place order\" take 5 seconds.",
      prompt: "What do you add?",
      choices: [
        { text: "A queue: confirm the order now, send the SMS in the background", why: "The user only needs the confirmation. Trade-off: the SMS may arrive a few seconds later, and you need retries if the SMS service fails. Worth it.", best: true },
        { text: "Send the SMS from a separate thread on the same server", why: "The user stops waiting, so it looks fixed. But if that server restarts, the unsent SMS are lost. A queue keeps them safe and retries." },
        { text: "Switch to a faster SMS provider", why: "Helps a little, but the user still waits for something they don’t need to wait for, and you’re now tied to one provider’s speed." },
      ],
    },
    {
      id: "d0-post-4",
      scenario: "Your menu page is slow, so you cache it for 10 minutes.",
      prompt: "What trade-off did you just accept?",
      choices: [
        { text: "A price or \"sold out\" change can take up to 10 minutes to show", why: "That’s the deal with every cache: speed for freshness. Fine for a menu. For stock, keep the time short or clear the cache when it changes.", best: true },
        { text: "The database now has to work harder", why: "The opposite: the cache takes reads away from the database. That’s the point of it." },
        { text: "Every user now sees a slower first load", why: "Only the first request after the cache expires is slow. Everyone after that, for 10 minutes, gets the fast copy." },
      ],
    },
    {
      id: "d0-post-5",
      scenario: "Lunch rush. One of your 4 app servers crashes, and the people it was serving start seeing errors.",
      prompt: "What should catch this on its own?",
      choices: [
        { text: "The load balancer’s health checks: it stops sending requests to the dead server", why: "That’s the manager at the door noticing a cook has gone home. The other 3 servers take the orders. Trade-off: they run hotter until you replace the fourth, so keep some headroom.", best: true },
        { text: "Move everything to one much bigger server", why: "One big server is one big point of failure. When it crashes, everyone sees errors, not a quarter of them." },
        { text: "Show users a \"please retry\" message", why: "Kinder than a raw error, but a retry can land on the same dead server. The fix is to stop sending people there." },
      ],
    },
  ],

  estimates: [
    {
      id: "d0-est-1",
      given: ["1 crore daily users", "Each makes about 10 requests a day", "A day has 86,400 seconds"],
      prompt: "How many requests per second, on average?",
      unit: "requests/sec",
      answer: 1157,
      tolerance: 0.3,
      working: ["1 crore × 10 = 10 crore requests a day", "10 crore ÷ 86,400 ≈ 1,157", "Round it: about 1,200 requests per second. In your head, treat a day as ~1 lakh seconds."],
    },
    {
      id: "d0-est-2",
      given: ["Average: about 1,200 requests/sec", "Dinner peak is 5× the average", "One server handles 500 requests/sec"],
      prompt: "How many servers do you need at the dinner peak?",
      unit: "servers",
      answer: 12,
      tolerance: 0.25,
      working: ["Peak = 1,200 × 5 = 6,000 requests/sec", "6,000 ÷ 500 = 12 servers", "Run a few spare (about 15) so one crash or a deploy doesn’t tip you over."],
    },
    {
      id: "d0-est-3",
      given: ["20 lakh orders a day", "Each order record is about 1 KB"],
      prompt: "How much new order data per year, in GB?",
      unit: "GB/year",
      answer: 730,
      tolerance: 0.3,
      working: ["20 lakh × 1 KB = 20 lakh KB ≈ 2 GB a day", "2 GB × 365 ≈ 730 GB a year", "Under 1 TB a year fits one database easily. Images and logs, not orders, are what grow fast."],
    },
  ],

  build: {
    title: "Build the Swiggy order system",
    intro: "Drag each box to the job it does. You can also tap a box, then tap a slot.",
    given: "Your phone",
    rows: [["dns", "lb", "cdn"], ["servers"], ["cache", "db"], ["queue"]],
    slots: {
      dns: { role: "Finds the server's address", answer: "dns" },
      lb: { role: "Sends each request to a free server", answer: "lb" },
      cdn: { role: "Serves images from a city near you", answer: "cdn" },
      servers: { role: "Run the app's code", answer: "servers" },
      cache: { role: "Instant answers for popular data", answer: "cache" },
      db: { role: "Keeps orders and users safe", answer: "db" },
      queue: { role: "SMS and rider work, in the background", answer: "queue" },
    },
    chips: [
      { id: "lb", label: "Load balancer", does: "the manager at the door: it sends each request to a free server" },
      { id: "cache", label: "Cache", does: "the ready counter: popular data, ready instantly" },
      { id: "big", label: "One giant server", does: "not a box in this design. If one giant server fails, everything fails, so we add more servers instead" },
      { id: "queue", label: "Queue", does: "the line of order slips: slow work done one by one in the background" },
      { id: "dns", label: "DNS", does: "the address book: turns a name into a server's address" },
      { id: "db", label: "Database", does: "the register: keeps records safe" },
      { id: "servers", label: "Servers", does: "the cooks: they run the app's code" },
      { id: "cdn", label: "CDN", does: "nearby branches: copies of images and videos close to users" },
    ],
    done: "That's the whole map of an app. Every box has its own day in this course.",
  },

  followUps: [
    {
      q: "\"One of your servers crashes during the dinner rush. What happens?\"",
      answer: [
        "The load balancer's health checks notice the server stopped answering.",
        "It stops sending requests there, and the other servers take the load.",
        "Users barely notice. That's why we run several servers, not one big one.",
        "Keep servers stateless (no user data stored on them), so any server can handle any request.",
      ],
      say: "\"Health checks take the dead server out of rotation, and because the servers are stateless, the others absorb its traffic.\"",
      deeper: "Day 2 · Load balancing",
    },
    {
      q: "\"Traffic becomes 100x during the IPL final. What do you change?\"",
      answer: [
        "Estimate first: about 1,200 requests a second becomes about 1.2 lakh at the peak.",
        "Add servers behind the load balancer, ahead of time, because the match date is known.",
        "Serve popular data from the cache and images and video from the CDN, so most requests never reach the database.",
        "Move slow work to queues. The database is the next bottleneck: read replicas and sharding.",
      ],
      say: "\"Pre-scale the servers, push reads to the cache and CDN, queue the slow work, and protect the database.\"",
      deeper: "Days 1, 3, 5 and 6",
    },
    {
      q: "\"Your cache goes down. Does the app stop working?\"",
      answer: [
        "No. The database is the source of truth, so answers stay correct, just slower.",
        "The real danger: every request now hits the database at once and can overload it (a cache stampede).",
        "Protect it with several cache nodes, rate limiting, and warming the cache back up gradually.",
      ],
      say: "\"The cache is a speed layer, not the source of truth. I'd make sure the database survives the sudden load while the cache recovers.\"",
      deeper: "Days 3 and 18",
    },
    {
      q: "\"Now the network is flaky and users tap \u2018Place order\u2019 twice. What stops a double order?\"",
      answer: [
        "The app sends a unique order key (an idempotency key) with the request, and resends the same key if it retries.",
        "The server remembers keys it has seen: a repeat key gets the first result back instead of a second order.",
        "Trade-off: you store keys for a while (say 24 hours), but nobody gets charged twice.",
      ],
      say: "\"Every order carries an idempotency key, so a retry or a double tap returns the same order instead of creating a new one.\"",
      deeper: "Days 9 and 13",
    },
  ],

  interview: [
    "System design is choosing an app's parts and connecting them so crores of people can use it, fast, even when something breaks.",
    "The parts: load balancer, servers, cache, database, queue and CDN, plus DNS to find them.",
    "A good system is available, scalable, reliable and fast.",
    "Every design answer: requirements → estimates → API → data → design → deep dive → bottlenecks.",
  ],

  cheatsheet: {
    title: "Day 0 · What system design is",
    points: [
      "System design = making an app work for many people, all the time, even when parts fail",
      "The boxes: client, DNS, load balancer, servers, cache, database, queue, CDN",
      "Goals: available, scalable, reliable, fast",
      "Estimate: daily users × actions ÷ 86,400 = requests per second",
      "Answer in 7 steps: requirements, estimates, API, data, design, deep dive, bottlenecks",
    ],
  },

  linkedin:
    "Day 0/21: System Design with Klymb.\n\nSystem design in one line: choosing an app's parts and connecting them so crores of people can use it, fast, even when something breaks.\n\nThe easiest explanation I've seen is a dhaba. The cooks are servers, the manager at the door is a load balancer, the ready counter is a cache, the register is the database, and the line of order slips is a queue.\n\n#SystemDesign #Klymb",

  nextDay: "Flipkart's Big Billion Day crash: how would you prepare for the next sale?",
};

const hi: DayCopy = {
  tag: "Start here",
  hookLines: [
    "Swiggy pe \"Order\" dabaya.",
    "Ek second baad: order confirmed.",
    "Us ek second mein tumhara order lagbhag chhe alag systems se guzra.",
  ],
  question: "System design kya hai, aur har bade app ko iski zaroorat kyun hai?",

  pre: [
    {
      id: "d0-pre-1",
      prompt: "Tumhe kya lagta hai, system design kya hai?",
      choices: [
        {
          text: "App ke parts chunna (servers, databases, caches…) aur unhe jodna, taaki woh crores logon ke liye chalta rahe",
          why: "Bilkul. Code ek feature chalata hai; system design use sab ke liye, hamesha chalata hai, koi part toote tab bhi.",
          best: true,
        },
        { text: "App ke liye sahi language aur framework chunna", why: "Jitna lagta hai utna fark nahi padta: Java app aur Go app scale pe ek jaisi limits se takraate hain. System design parts aur unke jodne ke baare mein hai, language ke nahi." },
        { text: "Har feature ka clean, efficient code likhna", why: "Zaroori hai, par ek machine pe efficient code bhi ek din kam padta hai. Design tay karta hai kitni machines hongi aur kaam kaise baantengi." },
      ],
    },
    {
      id: "d0-pre-2",
      scenario: "Yeh zaroori kyun hai? Tumhara app 10 users ke saath perfect chalta hai. Kal 10 lakh log ek saath kholte hain.",
      prompt: "Sabse zyada kya hone ke chances hain?",
      choices: [
        {
          text: "Slow ho jayega ya fail, kyunki ek server ki ek limit hoti hai",
          why: "Jo code ek user ke liye chalta hai, woh lakhon ke liye apne aap ready nahi hota. Usko ready karna hi system design hai.",
          best: true,
        },
        { text: "Theek rahega, bas server kaafi powerful hona chahiye", why: "Badi machine time deti hai (vertical scaling): simple, code nahi badalna. Par uski ceiling hai, kharcha tezi se badhta hai, aur woh giri toh sab gira." },
        { text: "Sirf database slow hoga; app servers sambhal lenge", why: "Aksar database pehle thakta hai, par app servers, connections aur network ki bhi limit hai. Bottleneck measure karke milta hai, andaaze se nahi." },
      ],
    },
    {
      id: "d0-pre-3",
      scenario: "Raju ke dhabe pe ab 1,000 customers hain aur cook sirf ek: Raju.",
      prompt: "Best fix kya hai?",
      choices: [
        {
          text: "Aur cooks rakho, aur darwaze pe ek manager jo har order free cook ko de",
          why: "Zyada cooks = zyada servers; manager = load balancer. Trade-off: coordinate karne ko zyada log, aur manager khud naya bottleneck na bane.",
          best: true,
        },
        { text: "Raju ko bada chulha do, taaki woh tez banaye", why: "Yeh vertical scaling hai. Simple hai aur kuch time chalta hai, par ek Raju ki limit hai, aur woh beemar pada toh dhaba band." },
        { text: "Popular dishes subah hi bana ke ready rakho", why: "Yeh caching hai, aur popular items mein sach mein madad karta hai. Par custom orders phir bhi Raju ka wait karenge, aur khana basi hota hai. More cooks ke saath achha, unki jagah nahi." },
      ],
    },
  ],
  revealTitle: "Raju ka dhaba = har app",
  revealSub: "dhaba, asli systems ke saath",
  reveal: [
    { when: "Customer", what: "Tumhara phone (client) request bhejta hai." },
    { when: "Google Maps pe address", what: "DNS: klymb.ai jaise naam ko server ke address mein badalta hai." },
    { when: "Darwaze pe manager", what: "Load balancer: har request ko free server tak bhejta hai." },
    { when: "Cooks", what: "Servers: app ka code chalate hain. Traffic badhe toh aur lagao." },
    { when: "Ready counter", what: "Cache: popular data ready rakhta hai, turant jawab ke liye." },
    { when: "Register", what: "Database: users, orders aur stock safe rakhta hai." },
    { when: "Line mein lagi parchiyan", what: "Queue: slow background kaam (SMS, rider) ek ek karke, kuch nahi khota." },
    { when: "Shehar mein nayi branch", what: "CDN: images aur videos ki copies users ke paas." },
  ],

  explain: {
    title: "Boxes kaise baat karte hain (HTTP, TCP, UDP)",
    optional: true,
    items: [
      { term: "HTTP", what: "Web ki bhasha. Phone request bhejta hai (order ki parchi); server response lautata hai (khane ki plate).", example: "klymb.ai kholna, menu load hona" },
      { term: "REST", what: "Apps ke HTTP APIs ka common tareeka: simple address jaise GET /menu ya POST /order.", example: "Zyada tar mobile apps aur unke servers" },
      { term: "gRPC", what: "Servers ke aapas mein baat karne ka tez aur strict tareeka, pehle se tay format ke saath.", example: "Ek backend service doosri ko call kare" },
      { term: "TCP", what: "Courier jaisa: har packet pahunchta hai, sahi order mein, warna dobara bheja jaata hai. Reliable, thoda slow.", example: "Payments, chat messages, web pages" },
      { term: "UDP", what: "Live commentary jaisa: tez, aur chhoota packet dobara nahi bheja jaata. Bas aage badho.", example: "Video calls, live streams, online games" },
    ],
  },

  concept: {
    cards: [
      {
        name: "Achha system",
        examples: ["4 shabd yaad rakho"],
        moves: ["Available: kabhi band nahi (raat 12 baje UPI)", "Scalable: 10x crowd mein bhi chale (IPL final)", "Reliable: kuch gayab nahi (tumhara paisa)", "Fast: turant jawab (search suggestions)"],
      },
      {
        name: "Har design jawab",
        examples: ["7 steps, course ke har din"],
        moves: ["Requirements", "Estimates", "API", "Data model", "High-level design", "Deep dive", "Bottlenecks"],
      },
    ],
    rule: "Pehle number nikalo: 1 crore users × 10 requests roz ÷ 86,400 second ≈ 1,200 requests per second. Peak pe kai guna zyada.",
  },

  post: [
    {
      id: "d0-post-1",
      scenario: "Tumhare app mein images Mumbai mein fast, par Guwahati mein slow load hoti hain. Servers Mumbai mein hain.",
      prompt: "Sabse achha fix kya hai?",
      choices: [
        { text: "CDN: images ki copies Guwahati ke paas ke shehar mein", why: "Problem doori hai, aur CDN use hata deta hai. Trade-off: image badle toh purani copies clear karni padti hain, aur CDN traffic ka paisa lagta hai.", best: true },
        { text: "Images ko compress karke aadha karo", why: "Karna chahiye, sab ki madad hoti hai. Par bytes phir bhi lagbhag 2,500 km chalte hain, toh Guwahati Mumbai se slow hi rahega." },
        { text: "Images ko app servers ki memory mein cache karo", why: "Servers ka kaam bachta hai, par servers abhi bhi Mumbai mein hain. Mehnat bachti hai, safar nahi." },
      ],
    },
    {
      id: "d0-post-2",
      scenario: "Domain settings badalte hi koi tumhari site nahi khol pa raha. Servers healthy hain aur khaali baithe hain.",
      prompt: "Sabse pehle kaunsa box check karoge?",
      choices: [
        { text: "DNS", why: "Healthy aur khaali servers matlab requests aa hi nahi rahi: log tumhe dhoondh nahi pa rahe. Tip: planned change se pehle DNS TTL kam karo, taaki galti jaldi palat sako.", best: true },
        { text: "Load balancer", why: "Doosra check sahi hai. Par toota load balancer aksar errors deta hai, sannata nahi. Sannata pehle ki taraf ishaara karta hai: address dhoondhna." },
        { text: "Servers restart karo", why: "Woh healthy aur khaali hain; restart se kuch nahi badlega. Pehle yeh pata karo ki requests aa kyun nahi rahi." },
      ],
    },
    {
      id: "d0-post-3",
      scenario: "Order ka SMS bhejne ki wajah se \"Place order\" mein 5 second lagte hain.",
      prompt: "Kya add karoge?",
      choices: [
        { text: "Queue: order abhi confirm, SMS background mein", why: "User ko sirf confirmation chahiye. Trade-off: SMS kuch second late aa sakta hai, aur SMS service fail ho toh retry chahiye. Worth it.", best: true },
        { text: "Usi server pe alag thread se SMS bhejo", why: "User ka wait khatam, toh fix laga. Par server restart hua toh bina bheje SMS gayab. Queue unhe safe rakhti hai aur retry karti hai." },
        { text: "Tez SMS provider le lo", why: "Thoda fark padega, par user phir bhi aisi cheez ka wait karega jiski zaroorat nahi, aur tum ek provider ki speed pe atak gaye." },
      ],
    },
    {
      id: "d0-post-4",
      scenario: "Menu page slow hai, toh tumne use 10 minute ke liye cache kar diya.",
      prompt: "Kaunsa trade-off accept kiya?",
      choices: [
        { text: "Price ya \"sold out\" badle toh dikhne mein 10 minute tak lag sakte hain", why: "Har cache ka yahi deal hai: freshness ke badle speed. Menu ke liye theek. Stock ke liye time chhota rakho ya badalte hi cache clear karo.", best: true },
        { text: "Ab database ko zyada kaam karna padega", why: "Ulta: cache database se reads hata leta hai. Wahi toh uska kaam hai." },
        { text: "Har user ko pehla load slow milega", why: "Sirf cache expire hone ke baad wali pehli request slow hoti hai. Uske baad 10 minute tak sabko fast copy milti hai." },
      ],
    },
    {
      id: "d0-post-5",
      scenario: "Lunch rush. Tumhare 4 app servers mein se ek crash ho gaya, aur uske users ko errors dikhne lage.",
      prompt: "Isko apne aap kaun pakdega?",
      choices: [
        { text: "Load balancer ke health checks: woh dead server ko requests bhejna band kar deta hai", why: "Yeh darwaze wala manager hai jo dekh leta hai ki ek cook ghar chala gaya. Baaki 3 servers orders le lete hain. Trade-off: jab tak chautha wapas nahi aata, woh zyada load uthate hain, toh thodi extra capacity rakho.", best: true },
        { text: "Sab kuch ek bahut bade server pe le jao", why: "Ek bada server matlab failure ka ek bada point. Woh crash hua toh sabko errors, sirf ek chauthai ko nahi." },
        { text: "Users ko \"please retry\" message dikhao", why: "Raw error se achha hai, par retry phir se usi dead server pe ja sakta hai. Asli fix hai wahan bhejna band karna." },
      ],
    },
  ],

  estimates: [
    {
      id: "d0-est-1",
      given: ["1 crore daily users", "Har user din mein lagbhag 10 requests", "Ek din = 86,400 second"],
      prompt: "Average kitni requests per second?",
      unit: "requests/sec",
      answer: 1157,
      tolerance: 0.3,
      working: ["1 crore × 10 = 10 crore requests roz", "10 crore ÷ 86,400 ≈ 1,157", "Round karo: lagbhag 1,200 requests per second. Dimaag mein din ko ~1 lakh second maan lo."],
    },
    {
      id: "d0-est-2",
      given: ["Average: lagbhag 1,200 requests/sec", "Dinner peak average ka 5 guna", "Ek server 500 requests/sec sambhalta hai"],
      prompt: "Dinner peak pe kitne servers chahiye?",
      unit: "servers",
      answer: 12,
      tolerance: 0.25,
      working: ["Peak = 1,200 × 5 = 6,000 requests/sec", "6,000 ÷ 500 = 12 servers", "Kuch spare chalao (lagbhag 15), taaki ek crash ya deploy se system na gire."],
    },
    {
      id: "d0-est-3",
      given: ["Roz 20 lakh orders", "Har order record lagbhag 1 KB"],
      prompt: "Saal bhar mein kitna naya order data, GB mein?",
      unit: "GB/year",
      answer: 730,
      tolerance: 0.3,
      working: ["20 lakh × 1 KB ≈ 2 GB roz", "2 GB × 365 ≈ 730 GB saal mein", "Saal ka 1 TB se kam ek database mein aaraam se. Tezi se badhte hain images aur logs, orders nahi."],
    },
  ],

  build: {
    title: "Swiggy order system khud banao",
    intro: "Har box ko uske kaam wali jagah pe drag karo. Ya box tap karo, phir slot tap karo.",
    given: "Tumhara phone",
    rows: [["dns", "lb", "cdn"], ["servers"], ["cache", "db"], ["queue"]],
    slots: {
      dns: { role: "Server ka address dhoondhta hai", answer: "dns" },
      lb: { role: "Har request free server ko bhejta hai", answer: "lb" },
      cdn: { role: "Images paas ke shehar se deta hai", answer: "cdn" },
      servers: { role: "App ka code chalate hain", answer: "servers" },
      cache: { role: "Popular data ka turant jawab", answer: "cache" },
      db: { role: "Orders aur users safe rakhta hai", answer: "db" },
      queue: { role: "SMS aur rider ka kaam, background mein", answer: "queue" },
    },
    chips: [
      { id: "lb", label: "Load balancer", does: "darwaze ka manager: har request free server ko bhejta hai" },
      { id: "cache", label: "Cache", does: "ready counter: popular data turant" },
      { id: "big", label: "Ek giant server", does: "is design ka box nahi. Ek giant server gira toh sab gira, isliye hum aur servers lagate hain" },
      { id: "queue", label: "Queue", does: "parchiyon ki line: slow kaam background mein ek ek karke" },
      { id: "dns", label: "DNS", does: "address book: naam ko server ke address mein badalta hai" },
      { id: "db", label: "Database", does: "register: records safe rakhta hai" },
      { id: "servers", label: "Servers", does: "cooks: app ka code chalate hain" },
      { id: "cdn", label: "CDN", does: "paas ki branches: images aur videos users ke paas" },
    ],
    done: "Yahi hai ek app ka poora map. Course mein har box ka apna ek din hai.",
  },

  followUps: [
    {
      q: "\"Dinner rush mein tumhara ek server crash ho gaya. Kya hoga?\"",
      answer: [
        "Load balancer ke health checks dekhte hain ki server jawab nahi de raha.",
        "Woh us server ko requests bhejna band karta hai, baaki servers load sambhal lete hain.",
        "Users ko pata bhi nahi chalta. Isiliye ek bade server ki jagah kai servers chalate hain.",
        "Servers stateless rakho (unpe user ka data store nahi), taaki koi bhi server koi bhi request le sake.",
      ],
      say: "\"Health checks dead server ko rotation se nikaal dete hain, aur servers stateless hain, toh baaki uska traffic le lete hain.\"",
      deeper: "Day 2 · Load balancing",
    },
    {
      q: "\"IPL final mein traffic 100 guna ho gaya. Kya badloge?\"",
      answer: [
        "Pehle number: lagbhag 1,200 requests per second, peak pe lagbhag 1.2 lakh.",
        "Load balancer ke peeche aur servers, pehle se, kyunki match ki date pata hai.",
        "Popular data cache se, images aur video CDN se, taaki zyada tar requests database tak pahunche hi nahi.",
        "Slow kaam queue mein. Agla bottleneck database hai: read replicas aur sharding.",
      ],
      say: "\"Servers pehle se badhao, reads cache aur CDN pe, slow kaam queue mein, aur database ko bachao.\"",
      deeper: "Days 1, 3, 5 aur 6",
    },
    {
      q: "\"Tumhara cache down ho gaya. Kya app band ho jayega?\"",
      answer: [
        "Nahi. Database asli source hai, toh jawab sahi rahenge, bas slow.",
        "Asli khatra: ab har request ek saath database pe jaati hai aur usse gira sakti hai (cache stampede).",
        "Bachao: kai cache nodes, rate limiting, aur cache ko dheere dheere wapas bharo.",
      ],
      say: "\"Cache speed layer hai, source of truth nahi. Main ensure karunga ki cache wapas aane tak database achanak ka load jhel le.\"",
      deeper: "Days 3 aur 18",
    },
    {
      q: "\"Ab network kharab hai aur users \u2018Place order\u2019 do baar daba dete hain. Double order kaise rokoge?\"",
      answer: [
        "App har order ke saath ek unique key (idempotency key) bhejta hai, aur retry kare toh wahi key dobara.",
        "Server dekhi hui keys yaad rakhta hai: wahi key dobara aaye toh naya order nahi, pehla result wapas.",
        "Trade-off: keys kuch time (jaise 24 ghante) store karni padti hain, par kisi ka paisa do baar nahi katta.",
      ],
      say: "\"Har order ke saath idempotency key jaati hai, toh retry ya double tap pe naya order nahi banta, wahi order wapas milta hai.\"",
      deeper: "Days 9 aur 13",
    },
  ],

  interview: [
    "System design matlab app ke parts chunna aur jodna, taaki crores log use karein, fast, aur kuch toote toh bhi chalta rahe.",
    "Parts: load balancer, servers, cache, database, queue aur CDN, plus unhe dhoondhne ke liye DNS.",
    "Achha system available, scalable, reliable aur fast hota hai.",
    "Har design jawab: requirements → estimates → API → data → design → deep dive → bottlenecks.",
  ],

  cheatsheet: {
    title: "Day 0 · System design kya hai",
    points: [
      "System design = app ko bahut logon ke liye, hamesha chalana, chahe kuch toot jaaye",
      "Boxes: client, DNS, load balancer, servers, cache, database, queue, CDN",
      "Goals: available, scalable, reliable, fast",
      "Estimate: daily users × actions ÷ 86,400 = requests per second",
      "7 steps: requirements, estimates, API, data, design, deep dive, bottlenecks",
    ],
  },

  linkedin:
    "Day 0/21: System Design with Klymb.\n\nSystem design ek line mein: app ke parts chunna aur jodna, taaki crores log use karein, fast, aur kuch toote toh bhi chalta rahe.\n\nSabse aasaan example ek dhaba hai. Cooks servers hain, darwaze ka manager load balancer, ready counter cache, register database, aur parchiyon ki line queue.\n\n#SystemDesign #Klymb",

  nextDay: "Flipkart ka Big Billion Day crash: agli sale ki taiyaari kaise karoge?",
};

export const dayZero: Day = {
  day: 0,
  of: 21,
  app: "Swiggy",
  minutes: 12,
  hook: { date: "1 tap · 1 second" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/day-0.mp4", poster: "/videos/system-design/day-0-poster.jpg", minutes: 3, lang: "Hinglish",
    wide: { src: "/api/video/day-0-wide.mp4", poster: "/videos/system-design/day-0-wide-poster.jpg" },
  },
  nextHref: "/system-design/day-1",
};
