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
      scenario: "Your app works perfectly with 10 users. Tomorrow, 10 lakh people open it at the same time.",
      prompt: "What is most likely to happen?",
      choices: [
        {
          text: "It slows down or crashes, because one server can only do so much",
          why: "Code that works for one user isn't automatically ready for lakhs. Making it ready is exactly what system design is.",
          best: true,
        },
        { text: "Nothing, good code always scales", why: "Good code helps, but one machine still has limits on CPU, memory and network." },
        { text: "It gets faster, because more people are using it", why: "More users means more work for the same machines, not less." },
      ],
    },
    {
      id: "d0-pre-2",
      scenario: "Raju's dhaba now has 1,000 customers and only one cook: Raju.",
      prompt: "What's the best fix?",
      choices: [
        {
          text: "Hire more cooks, and put a manager at the door to send each order to a free cook",
          why: "More cooks are more servers. The manager is a load balancer. That's how apps grow too.",
          best: true,
        },
        { text: "Make Raju cook faster", why: "One person (one machine) has a ceiling. Making one machine bigger is vertical scaling, and it runs out." },
        { text: "Close the door after 100 customers", why: "That's a last resort (rate limiting), not a plan for growth." },
      ],
    },
    {
      id: "d0-pre-3",
      scenario: "Almost everyone orders chai and samosa.",
      prompt: "How do you serve them instantly?",
      choices: [
        { text: "Make them in advance and keep them ready on the counter", why: "That's a cache: keep popular things ready so you don't redo the same work.", best: true },
        { text: "Cook each one fresh when it's ordered", why: "Correct, but slow. With 1,000 customers the line never ends." },
        { text: "Write every order in the register first", why: "The register (the database) keeps records safe. It isn't there for speed." },
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
      scenario: "Images in your app load fast in Mumbai but slowly in Guwahati.",
      prompt: "Which box fixes it?",
      choices: [
        { text: "A CDN: keep copies of the images close to Guwahati", why: "The problem is distance. A CDN serves the files from a nearby city.", best: true },
        { text: "A bigger database", why: "The database isn't what sends images, and it doesn't fix distance." },
        { text: "More servers in Mumbai", why: "They'd still be far from Guwahati." },
      ],
    },
    {
      id: "d0-post-2",
      scenario: "Right after you changed your domain settings, nobody can open your site.",
      prompt: "Which box do you check first?",
      choices: [
        { text: "DNS", why: "DNS is the address book. If it points to the wrong place, nobody finds your servers.", best: true },
        { text: "The cache", why: "The cache only matters once requests actually reach you." },
        { text: "The queue", why: "Queues handle background work, not finding your site." },
      ],
    },
    {
      id: "d0-post-3",
      scenario: "Sending the order SMS makes \"Place order\" take 5 seconds.",
      prompt: "What do you add?",
      choices: [
        { text: "A queue: confirm the order now, send the SMS in the background", why: "The user only needs the confirmation. Slow extras go to a queue.", best: true },
        { text: "A faster SMS provider", why: "Helps a little, but the user still waits for something they don't need to wait for." },
        { text: "Stop sending SMS", why: "Users want it. Just don't make them wait for it." },
      ],
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
      scenario: "Tumhara app 10 users ke saath perfect chalta hai. Kal 10 lakh log ek saath kholte hain.",
      prompt: "Sabse zyada kya hone ke chances hain?",
      choices: [
        {
          text: "Slow ho jayega ya crash, kyunki ek server ki ek limit hoti hai",
          why: "Jo code ek user ke liye chalta hai, woh lakhon ke liye apne aap ready nahi hota. Usko ready karna hi system design hai.",
          best: true,
        },
        { text: "Kuch nahi, achha code hamesha scale karta hai", why: "Achha code madad karta hai, par ek machine ke CPU, memory aur network ki limit rehti hai." },
        { text: "Aur fast ho jayega, kyunki zyada log use kar rahe hain", why: "Zyada users matlab wahi machines pe zyada kaam, kam nahi." },
      ],
    },
    {
      id: "d0-pre-2",
      scenario: "Raju ke dhabe pe ab 1,000 customers hain aur cook sirf ek: Raju.",
      prompt: "Best fix kya hai?",
      choices: [
        {
          text: "Aur cooks rakho, aur darwaze pe ek manager jo har order free cook ko de",
          why: "Zyada cooks = zyada servers. Manager = load balancer. Apps bhi aise hi badhte hain.",
          best: true,
        },
        { text: "Raju ko aur tez banwao", why: "Ek insaan (ek machine) ki limit hai. Ek machine ko bada karna vertical scaling hai, aur woh khatam ho jaata hai." },
        { text: "100 customers ke baad darwaza band", why: "Yeh aakhri upaay hai (rate limiting), growth ka plan nahi." },
      ],
    },
    {
      id: "d0-pre-3",
      scenario: "Lagbhag sab chai aur samosa maangte hain.",
      prompt: "Turant kaise doge?",
      choices: [
        { text: "Pehle se bana ke counter pe ready rakho", why: "Yeh cache hai: popular cheezein ready rakho taaki wahi kaam baar baar na karna pade.", best: true },
        { text: "Har order pe fresh banao", why: "Sahi hai, par slow. 1,000 customers ke saath line kabhi khatam nahi hogi." },
        { text: "Pehle har order register mein likho", why: "Register (database) records safe rakhta hai. Woh speed ke liye nahi hai." },
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
      scenario: "Tumhare app mein images Mumbai mein fast, par Guwahati mein slow load hoti hain.",
      prompt: "Kaunsa box isko fix karega?",
      choices: [
        { text: "CDN: images ki copies Guwahati ke paas rakho", why: "Problem doori hai. CDN paas ke shehar se files deta hai.", best: true },
        { text: "Bada database", why: "Images database nahi bhejta, aur doori bhi fix nahi hoti." },
        { text: "Mumbai mein aur servers", why: "Woh phir bhi Guwahati se door rahenge." },
      ],
    },
    {
      id: "d0-post-2",
      scenario: "Domain settings badalte hi koi bhi tumhari site nahi khol pa raha.",
      prompt: "Sabse pehle kaunsa box check karoge?",
      choices: [
        { text: "DNS", why: "DNS address book hai. Galat jagah point kare toh koi tumhare servers tak nahi pahunchta.", best: true },
        { text: "Cache", why: "Cache tab kaam aata hai jab request tum tak pahunch jaaye." },
        { text: "Queue", why: "Queue background kaam sambhalti hai, site dhoondhna nahi." },
      ],
    },
    {
      id: "d0-post-3",
      scenario: "Order ka SMS bhejne ki wajah se \"Place order\" mein 5 second lagte hain.",
      prompt: "Kya add karoge?",
      choices: [
        { text: "Queue: order abhi confirm, SMS background mein", why: "User ko sirf confirmation chahiye. Slow extras queue mein jaate hain.", best: true },
        { text: "Tez SMS provider", why: "Thoda fark padega, par user phir bhi ek aisi cheez ka wait karega jiski zaroorat nahi." },
        { text: "SMS bhejna band", why: "Users ko SMS chahiye. Bas unhe uska wait mat karwao." },
      ],
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
  video: { src: "/videos/system-design/day-0.mp4", poster: "/videos/system-design/day-0-poster.jpg", minutes: 3, lang: "Hinglish" },
  nextHref: "/system-design/day-1",
};
