/**
 * Content for the System Design course app (/learn/system-design).
 *
 * The course is "System Design in 21 Days": a Day 0 start, then three weeks.
 * Built days carry their full lesson (video, questions, practice) from
 * src/data/system-design/day-N.ts via LESSON_DAYS; the rest are listed as
 * coming soon. The six-question baseline and its diagrams are course-wide.
 */
import { dayZero } from "./day-0";
import { dayOne } from "./day-1";
import type { Day } from "./types";

export interface CourseModule {
  title: string;
  /** Three labels animated on the player's thumbnail while the video plays. */
  flow: [string, string, string];
  /** [title, duration "m:ss"] */
  lessons: [string, string][];
}

export const MODULES: CourseModule[] = [
  { title: "Start here", flow: ["Phone", "Servers", "Database"], lessons: [["Raju ka dhaba: what system design is", "3:22"]] },
  {
    title: "Week 1 · Handling scale",
    flow: ["Users", "Load balancer", "Servers"],
    lessons: [
      ["Flipkart Big Billion Day: predictable vs sudden load", "2:46"],
      ["Swiggy dinner rush: load balancing", "0:00"],
      ["Hotstar IPL final: video, storage and CDN", "0:00"],
      ["Paytm vs Instagram likes: SQL vs NoSQL", "0:00"],
      ["Myntra sale: indexing and read replicas", "0:00"],
      ["CSK 10 lakh views: sharding and hot keys", "0:00"],
      ["OTP login: rate limiting and auth", "0:00"],
    ],
  },
  {
    title: "Week 2 · Real-time and reliability",
    flow: ["Event", "Queue", "Worker"],
    lessons: [
      ["Zepto orders: microservices and queues", "0:00"],
      ["Cricbuzz wicket: notification fan-out", "0:00"],
      ["WhatsApp ticks: real-time connections", "0:00"],
      ["Uber nearby drivers: geo systems", "0:00"],
      ["BookMyShow seats: locking and concurrency", "0:00"],
      ["UPI double tap: idempotency", "0:00"],
      ["Mock round: design a URL shortener", "0:00"],
    ],
  },
  {
    title: "Week 3 · Advanced and AI-era",
    flow: ["Query", "Retrieve", "LLM"],
    lessons: [
      ["Instagram celebrity post: feeds and ranking", "0:00"],
      ["Flipkart search: autocomplete", "0:00"],
      ["Wallet vs likes: consistency and CAP", "0:00"],
      ["Netflix outage: failures and circuit breakers", "0:00"],
      ["AI support bot: RAG", "0:00"],
      ["ChatGPT-style app: LLM serving", "0:00"],
      ["Capstone: design Zepto end to end", "0:00"],
    ],
  },
];

/** The lessons that exist, by lesson id ("module-lesson", zero-based). Every other lesson is coming soon. */
export const LESSON_DAYS: Record<string, Day> = { "0-0": dayZero, "1-0": dayOne };

export type Question =
  | { type: "mcq" | "timed"; typeLabel: string; topic: string; prompt: string; options: string[]; ans: number }
  | { type: "multi"; typeLabel: string; topic: string; prompt: string; options: string[]; ans: number[] }
  | { type: "diagram"; typeLabel: string; topic: string; prompt: string; ans: number }
  | { type: "order"; typeLabel: string; topic: string; prompt: string; items: string[]; start: number[] }
  | { type: "text"; typeLabel: string; topic: string; prompt: string };

/** The pre- and post-assessment ask the same six questions, one of each type. */
export const QUESTIONS: Question[] = [
  { type: "mcq", typeLabel: "Multiple choice", topic: "Scaling", prompt: "A service gets 95% reads and 5% writes. What do you add first?", options: ["Read replicas and a cache", "Shard the write database", "A message queue in front of writes", "A bigger single server"], ans: 0 },
  { type: "multi", typeLabel: "Select all", topic: "Statelessness", prompt: "Which changes let a web service scale horizontally? Select all that apply.", options: ["Store sessions in a shared store like Redis", "Keep uploads on each server’s local disk", "Put instances behind a load balancer", "Hold counters in each server’s memory"], ans: [0, 2] },
  { type: "diagram", typeLabel: "Pick the diagram", topic: "Reliability", prompt: "Which setup keeps accepting writes if one database node fails?", ans: 1 },
  { type: "order", typeLabel: "Order the steps", topic: "Caching", prompt: "Put a cached read request in order, first to last.", items: ["DNS resolves the domain", "Load balancer picks a server", "App server handles the request", "Cache is checked", "Database is queried on a miss"], start: [2, 0, 4, 1, 3] },
  { type: "text", typeLabel: "Short answer", topic: "Consistency", prompt: "During a network partition, what does the CAP theorem make you choose between?" },
  { type: "timed", typeLabel: "Timed · 30s", topic: "Estimation", prompt: "10M daily users each make 20 requests. Roughly what is the average QPS?", options: ["~230", "~2,300", "~23,000", "~230,000"], ans: 1 },
];

/** Seconds allowed for the timed question. */
export const TIMED_SECONDS = 30;

/** Options for the "pick the diagram" question. Row 0 is the app tier. */
export const DIAGRAMS: { caption: string; rows: string[][] }[] = [
  { caption: "Single database", rows: [["App"], ["DB"]] },
  { caption: "Primary + replica, auto-failover", rows: [["App"], ["Primary", "Replica"]] },
  { caption: "Cache in front of one DB", rows: [["App"], ["Cache"], ["DB"]] },
];

export interface QuickCheck { q: string; opts: string[]; ans: number; why: string }

/** Ungraded in-video questions, by lesson id. None of the lessons has one yet. */
export const QUICK_CHECKS: Record<string, QuickCheck> = {};

/** The lesson recommended for each assessment topic the learner missed. Lesson ids are "module-lesson", zero-based. */
export const REVIEW_LESSON: Record<string, string> = {
  Scaling: "1-4",
  Statelessness: "1-1",
  Reliability: "3-3",
  Caching: "1-2",
  Consistency: "3-2",
  Estimation: "0-0",
};

/** Written transcripts, [seconds, line]: the lesson video's own captions. */
export const TRANSCRIPTS: Record<string, [number, string][]> = {
  "0-0": [
    [0, "Swiggy pe Order dabaya, aur ek second mein khana confirm."],
    [4, "Par us ek second mein tumhara order chhe alag systems se guzarta hai."],
    [7, "In systems ko chunna aur jodna, isi ko kehte hain system design."],
    [11, "Aaj ke baad tum yeh kisi ko bhi samjha paoge. Chalo shuru karte hain."],
    [16, "Pehle ek simple baat: code ek feature banata hai."],
    [18, "Jaise ek order button. Ek user ke liye, perfect chalega."],
    [22, "Par jab crores log ek saath dabayein? Wahi button crash ho jata hai."],
    [25, "System design matlab: woh feature crores logon ke liye chale, fast chale, aur kuch toote toh bhi chalta rahe."],
    [33, "Isko ek dhabe se samjho. Raju ka dhaba."],
    [36, "Shuru mein 10 customers. Raju khud banata hai, khud serve karta hai. Sab theek."],
    [42, "Dhaba famous ho gaya. Ab 1,000 customers. Raju akela? Line hi line."],
    [46, "Toh Raju ne aur cooks rakh liye. Ek bada cook nahi, kai cooks."],
    [51, "Par kaunsa customer kis cook ke paas jaaye? Darwaze pe ek manager, jo order baant-ta hai."],
    [55, "Chai aur samosa sab maangte hain. Toh woh pehle se bana ke counter pe rakh diye. Turant milte hain."],
    [60, "Har order aur stock ek register mein likha jata hai, taaki kuch bhoole nahi."],
    [64, "Delivery wale orders ki parchi line mein lagti hai, aur delivery boys ek-ek karke uthate hain."],
    [69, "Naye customers ko dhaba mile, iske liye Google Maps pe address."],
    [73, "Aur door ke logon ke liye, shehar mein ek nayi branch."],
    [76, "Ab magic dekho. Yahi dhaba har app ke andar hai."],
    [80, "Customer hai tumhara phone. Address hai DNS. Manager hai load balancer."],
    [85, "Cooks hain servers. Ready counter hai cache. Register hai database."],
    [90, "Parchi ki line hai queue, aur nayi branch hai CDN."],
    [93, "Ab Swiggy pe Order dabao: phone DNS se address leta hai, load balancer kisi server ko bhejta hai."],
    [98, "Server cache aur database check karta hai, aur rider aur SMS ka kaam queue mein daal deta hai."],
    [103, "Sab kuch ek second mein. Aur is course mein, har box ka apna ek din hai."],
    [108, "Achha system kaisa hota hai? Chaar shabd yaad rakho."],
    [111, "Available: kabhi band nahi. Raat 12 baje bhi UPI chalna chahiye."],
    [114, "Scalable: IPL final mein crowd das guna ho, phir bhi chale."],
    [118, "Reliable: tumhara paisa gayab nahi hona chahiye."],
    [120, "Fast: type karte hi suggestions aa jayein."],
    [123, "Interview mein ek cheez aur: pehle number nikalo."],
    [126, "Maan lo 1 crore users, har user din mein 10 requests."],
    [129, "Toh 10 crore requests roz. Din mein 86,400 second hote hain."],
    [134, "Matlab average 1,200 requests per second. Aur peak pe das guna, lagbhag 12,000."],
    [139, "Yeh number batata hai, kitne cooks, yaani kitne servers chahiye."],
    [144, "Yeh boxes aapas mein baat kaise karte hain?"],
    [146, "Phone request bhejta hai, jaise order ki parchi. Server response lautata hai, jaise khane ki plate. Yeh hai HTTP."],
    [155, "Apps se baat ke liye zyada tar REST. Servers aapas mein tez baat ke liye aksar gRPC."],
    [160, "TCP hai courier jaisa: har packet pahunchne ki pakki guarantee."],
    [163, "UDP hai live commentary jaisa: ek ball miss hui, toh ruk kar dobara nahi sunte. Video calls ke liye perfect."],
    [169, "Aur interview mein koi bhi design sawaal, saat steps mein:"],
    [172, "Requirements, estimates, API, data, design, deep dive, aur bottlenecks."],
    [177, "Har din hum isi saat step wale tareeke se sochenge."],
    [181, "Toh agar koi dost pooche, system design kya hai?"],
    [185, "Bolo: app ke parts chunna aur jodna, taaki crores log use karein, fast, aur kuch toote toh bhi chalta rahe."],
    [191, "Parts: load balancer, servers, cache, database, queue, CDN. Bas, tum ready ho."],
    [197, "Ab Day 1 mein chalo: Flipkart ka Big Billion Day crash."],
  ],
  "1-0": [
    [0, "6 October 2014. Flipkart ka pehla Big Billion Day."],
    [4, "Midnight hote hi lakhon log ek saath site par aaye."],
    [6, "Site slow hui. Pages par errors. Deals seconds mein sold out."],
    [10, "Aur phir dono founders ne har customer ko email kiya: sorry."],
    [14, "Ab socho, tum engineer ho."],
    [16, "Agle saal sale phir aa rahi hai. Kaise taiyaari karoge?"],
    [19, "System design interviews mein yeh common sawaal hai. 3 second socho."],
    [25, "Zyada tar log kehte hain: auto-scaling on kar do."],
    [27, "Traffic badhega, toh servers khud badh jayenge."],
    [29, "Sunne mein sahi lagta hai. Par timing dekho."],
    [32, "Midnight par traffic seconds mein kai guna ho jata hai."],
    [35, "Naya server boot aur warm hone mein minutes lagte hain."],
    [39, "Beech ka yeh gap? Wahi hain errors aur gussa customers."],
    [42, "Aur problem sirf web servers ki nahi hai."],
    [45, "Ek order cart, stock database, payment aur warehouse se guzarta hai."],
    [49, "Jo sabse kamzor kadi hai, wahi pehle tootegi."],
    [52, "Web server 10x sambhal le, par stock DB 2x pe ruk gaya, toh sale bhi 2x pe ruk gayi."],
    [58, "Toh 2015 mein Flipkart ne kya kiya? Unhone khud likha hai."],
    [62, "Taiyaari sale se lagbhag 4 mahine pehle shuru hui."],
    [65, "Lagbhag ek mahine tak saare systems ko projected traffic ke 5x par test kiya."],
    [69, "Phir systems ko tested limit se thoda neeche throttle kiya."],
    [72, "Orders ek async queue se gaye, taaki koi order message kho na jaye."],
    [77, "Aur har system ko utne hi orders mile, jitne woh sambhal sake."],
    [80, "Kuch fail ho, toh fallbacks aur hot standby machines ready."],
    [84, "Stock khatam? Turant out of stock mark karo, taaki koi woh na khareed sake jo hai hi nahi."],
    [89, "Aur sale ke time live dashboards, alerts aur 24x7 teams."],
    [94, "Yahan asli lesson ek sawaal hai:"],
    [95, "Kya tumhe pata hai ki peak kab aayega?"],
    [98, "Agar haan, toh yeh predictable load hai. Sale, IPL final, Tatkal 10 baje."],
    [103, "Iska jawab: forecast karo, pehle se scale karo, aur forecast se zyada load par test karo."],
    [109, "Agar nahi, toh yeh sudden load hai. Jaise koi celebrity tumhara link tweet kar de."],
    [113, "Yahan pre-scale ka time nahi. Toh auto-scale, rate limit, queue, aur faltu features band."],
    [118, "Aur real systems dono karte hain. Forecast ke liye taiyaari, aur forecast toote toh protection."],
    [124, "Par har cheez ki keemat hai."],
    [125, "Pre-scaling matlab khaali servers ka bill. Forecast zyada nikla toh paisa waste."],
    [131, "Queue matlab log wait karenge. Par wait, crash se behtar hai."],
    [134, "Aur rate limit kabhi kabhi genuine users ko bhi rok deta hai."],
    [138, "Interview mein yeh 2 minute mein aise bolo:"],
    [141, "Ek: pehle poocho, load predictable hai ya sudden?"],
    [145, "Do: predictable hai toh forecast, pre-scale, aur upar tak load test."],
    [149, "Teen: poori chain dekho, sabse kamzor kadi pehle."],
    [152, "Chaar: forecast toote toh rate limit, queue, aur graceful degradation."],
    [158, "Ab tumhari baari. Naya scenario: IRCTC Tatkal."],
    [160, "Neeche Prove it section mein jao, aur dikhao ki samajh aaya."],
  ],
};


export type NotifType = "reply" | "streak" | "badge" | "module" | "assess";
export type NotifTarget = "discuss" | "player" | "progress" | "course" | "preresults";

export interface Notif {
  id: number;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  group: "Today" | "Earlier";
  unread: boolean;
  go: NotifTarget;
}

/** No notifications until there is a backend to send them. */
export const NOTIFICATIONS: Notif[] = [];

export interface Reply { name: string; ini: string; ago: string; inst: boolean; text: string }
export interface Thread { id: string; name: string; ini: string; ago: string; t: number; text: string; votes: number; replies: Reply[] }

/** Lesson Q&A needs a backend; none yet. */
export const THREADS: Record<string, Thread[]> = {};

/** The welcome screen: what the course gives you, before Day 0. [title, detail] */
export const WELCOME: [string, string][] = [
  ["21 days, one real Indian app each day", "Flipkart, Swiggy, IRCTC, UPI, Hotstar and more: what broke, and how they fixed it."],
  ["A 3-minute Hinglish story video", "With subtitles you can switch on or off."],
  ["You answer first, then learn", "Make your call, then see what really happened and the idea behind it."],
  ["Practice that feels like the interview", "Estimates, drag-and-drop designs and full design problems."],
  ["Interviewer follow-ups", "What they ask next, and a 2-minute answer you can say out loud."],
  ["A cheatsheet every day, at your own pace", "15 minutes a day, on your phone: metro, cab or canteen."],
];
