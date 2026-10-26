/**
 * Day 5 of "System Design in 21 Days": Myntra's End of Reason Sale -> indexing and read replicas.
 * Myntra facts come only from the source in `sources` (Myntra's EORS-10 results, June 2019).
 * The indexing and replica design is the general industry pattern and is never
 * presented as Myntra's internals.
 */
import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  hookLines: [
    "Myntra's End of Reason Sale, June 2019.",
    "At the peak: over 7,100 orders every minute, and traffic 3× a normal day.",
    "Behind every order, dozens of searches: brand, size, price under ₹999.",
  ],
  question: "Lakhs of people filtering the same catalogue at once. How do the reads stay fast?",

  pre: [
    {
      id: "d5-pre-1",
      scenario: "A filter query on brand + price takes 4 seconds on a 5 crore row products table.",
      prompt: "First move?",
      choices: [
        {
          text: "Check the query plan, then add an index that matches the filter",
          why: "Without an index the database reads all 5 crore rows. A matching index jumps straight to the right ones. Trade-off: every index slows writes a little and takes space.",
          best: true,
        },
        { text: "Move the database to a bigger server", why: "A full scan of 5 crore rows is slow on any machine. Bigger hardware buys a little time, at a big price." },
        { text: "Cache every possible filter result", why: "Brand × size × price × colour is millions of combinations. Cache the popular ones, but fix the query first." },
      ],
    },
    {
      id: "d5-pre-2",
      scenario: "Your index is on (price, brand). The query is: WHERE brand = 'Roadster' AND price < 999.",
      prompt: "Will the database use the index well?",
      choices: [
        {
          text: "Not well: put the equality column first, (brand, price)",
          why: "A composite index is sorted by its first column, then the next. With brand first, the database jumps to Roadster and reads its prices in order. Trade-off: column order serves some queries and not others.",
          best: true,
        },
        { text: "Yes: column order inside an index doesn't matter", why: "It matters a lot. With price first, it has to scan every cheap product of every brand." },
        { text: "Only if you add a separate index on each column", why: "Two single-column indexes are usually worse than one composite index in the right order." },
      ],
    },
    {
      id: "d5-pre-3",
      scenario: "The sale starts. 95% of database traffic is people browsing; 5% is orders being written.",
      prompt: "What helps most?",
      choices: [
        {
          text: "Read replicas: copies of the database that serve the browsing",
          why: "The main database (the primary) keeps the writes; replicas take the reads, and you can add more as browsing grows. Trade-off: replicas lag a little behind.",
          best: true,
        },
        { text: "Shard the database right away", why: "Sharding is powerful but complex. When reads are the problem, replicas are the simpler first step." },
        { text: "Send everything to the primary and hope", why: "One machine serving every read becomes the ceiling exactly when the sale peaks." },
      ],
    },
  ],

  revealTitle: "Myntra's sale, and how fast reads are usually built",
  revealSub: "Myntra's public numbers, then the standard pattern",
  sourceNote: "Myntra figures: Myntra's EORS-10 results (June 2019), as reported by Punekar News. The last rows are the general industry pattern, not a claim about Myntra's internals.",
  reveal: [
    { when: "EORS-10, June 2019", what: "Myntra called it the biggest End of Reason Sale so far: over 9 million items ordered by over 2 million customers." },
    { when: "At the peak", what: "Over 7,100 orders a minute, with traffic about 3× a normal day." },
    { when: "The usual design: indexes", what: "Indexes that match the filters and the sort, in the right column order, checked with the query plan." },
    { when: "The usual design: replicas", what: "The primary takes writes; read replicas serve browsing and search, and more are added for the sale." },
    { when: "The usual design: fresh reads", what: "Right after a user changes something, their own reads go to the primary for a short window." },
    { when: "And a cache in front", what: "Popular product pages and filter results cached for seconds, so most reads never reach the database." },
  ],

  explain: {
    title: "Indexes and replicas, explained",
    items: [
      { term: "Full table scan", what: "The database reads every row to find matches. Fine for 1,000 rows, painful for 5 crore.", example: "No index on brand" },
      { term: "B-tree index", what: "A sorted structure that jumps to matching rows in a few steps instead of reading all of them.", example: "Like a book's index" },
      { term: "Composite index", what: "One index on several columns, sorted by the first, then the next. Order matters.", example: "(brand, price)" },
      { term: "Query plan", what: "The database's own description of how it will run a query: scan or index, and the cost.", example: "EXPLAIN" },
      { term: "Read replica", what: "A copy of the database that serves reads, updated from the primary.", example: "Browse and search traffic" },
      { term: "Replication lag", what: "The delay before a change on the primary shows up on a replica.", example: "Usually milliseconds, sometimes seconds" },
    ],
  },

  concept: {
    cards: [
      {
        name: "Make each read cheap",
        examples: ["Indexes", "Composite order", "Query plan"],
        moves: ["Index the columns you filter and sort by", "Equality columns first, range last", "Read the query plan before buying hardware", "Every index costs a little on writes"],
      },
      {
        name: "Spread the reads",
        examples: ["Read replicas", "Cache", "Read-your-writes"],
        moves: ["Primary for writes, replicas for browsing", "Cache popular pages for seconds", "After a write, read your own data from the primary", "Watch replication lag"],
      },
    ],
    rule: "Query plan first, hardware last: fix the read, then spread the reads, then cache them.",
  },

  post: [
    {
      id: "d5-post-1",
      scenario: "A user updates their address, goes to checkout, and sees the OLD address. Nothing is broken.",
      prompt: "What happened, and the fix?",
      choices: [
        { text: "Checkout read from a replica that hadn't caught up; send that user's reads to the primary for a short window after a write", why: "That's read-your-writes. Trade-off: a little extra load on the primary, only for users who just changed something.", best: true },
        { text: "The database lost the update", why: "The update is safe on the primary. A replica just hadn't received it yet." },
        { text: "Turn off replicas during the sale", why: "Then the primary takes every read again, exactly when traffic peaks." },
      ],
    },
    {
      id: "d5-post-2",
      scenario: "To make every filter fast, someone adds 15 indexes to the orders table.",
      prompt: "What's the risk?",
      choices: [
        { text: "Every order now has to update 15 indexes, so writes slow down, just as orders peak", why: "Indexes speed reads and cost writes. Keep the ones your real queries use; drop the rest.", best: true },
        { text: "None: more indexes are always faster", why: "Faster reads, slower writes, more storage. On a write-heavy table that's a bad deal." },
        { text: "The database will pick the wrong index every time", why: "It usually picks well. The real cost is on every insert and update." },
      ],
    },
    {
      id: "d5-post-3",
      scenario: "Product listing pages are read crores of times during the sale, and change a few times a day.",
      prompt: "Cheapest big win?",
      choices: [
        { text: "Cache the listing results for a short time, in front of the replicas", why: "Most reads never reach the database. Trade-off: a price change can take a few seconds to show; clear the cache when it matters.", best: true },
        { text: "Add a replica for every 1,000 users", why: "Replicas help, but a cache in front saves far more for data that rarely changes." },
        { text: "Pre-render every product page as a file", why: "Workable for some pages, but stock and price change during a sale; a short cache is simpler." },
      ],
    },
    {
      id: "d5-post-4",
      scenario: "You moved all browsing to read replicas.",
      prompt: "What did you accept?",
      choices: [
        { text: "Slightly stale reads: a replica can be a little behind the primary", why: "Fine for browsing, not for a balance or the address at checkout. That's why read-your-writes exists.", best: true },
        { text: "Slower writes on the primary", why: "Writes stay on the primary as before; replicas copy them separately." },
        { text: "Losing data if a replica dies", why: "The primary still has everything. A dead replica just stops serving reads." },
      ],
    },
    {
      id: "d5-post-5",
      scenario: "A slow report runs every hour on the primary database, and checkout slows down whenever it runs.",
      prompt: "Best move?",
      choices: [
        { text: "Run the report on a read replica, or an analytics copy", why: "Reports are reads. Keep the primary for writes and checkout. Trade-off: the report can be a few seconds behind, which is fine for a report.", best: true },
        { text: "Add an index on every column the report uses", why: "It may speed up the report, but every index slows the writes checkout depends on." },
        { text: "Run it once a day instead", why: "Fewer slowdowns, but still one every day, and the numbers go stale." },
      ],
    },
  ],

  estimates: [
    {
      id: "d5-est-1",
      given: ["5 crore products", "A full scan reads about 1 crore rows a second", "An indexed lookup takes about 5 ms"],
      prompt: "How many seconds does the full scan take?",
      unit: "seconds",
      answer: 5,
      tolerance: 0.3,
      working: ["5 crore ÷ 1 crore per second = 5 seconds", "The index answers in about 5 ms", "That's about 1,000× faster, from one index"],
    },
    {
      id: "d5-est-2",
      given: ["20,000 database reads a second at the sale peak", "One replica handles 3,000 reads a second", "Keep one spare"],
      prompt: "How many read replicas?",
      unit: "replicas",
      answer: 8,
      tolerance: 0.25,
      working: ["20,000 ÷ 3,000 ≈ 6.7, so 7 replicas", "Plus one spare in case one fails: 8", "A cache in front would cut this a lot"],
    },
    {
      id: "d5-est-3",
      given: ["20,000 reads a second", "A cache answers 90% of them"],
      prompt: "Reads per second that still reach the database?",
      unit: "reads/sec",
      answer: 2000,
      tolerance: 0.15,
      working: ["10% of 20,000 = 2,000 reads a second", "One replica might handle that, instead of eight", "That's why the cache is usually the cheapest big win"],
    },
  ],

  build: {
    title: "Build the fast catalogue",
    intro: "Drag each box to the job it does. You can also tap a box, then tap a slot.",
    given: "Lakhs of shoppers",
    rows: [["cache"], ["index", "replicas"], ["primary", "ryw"]],
    slots: {
      cache: { role: "Answers popular pages for a few seconds", answer: "cache" },
      index: { role: "Turns a 5-second scan into a 5 ms lookup", answer: "index" },
      replicas: { role: "Copies that serve browsing and search", answer: "replicas" },
      primary: { role: "Takes every order and update", answer: "primary" },
      ryw: { role: "Sends a user's reads to the primary right after they write", answer: "ryw" },
    },
    chips: [
      { id: "replicas", label: "Read replicas", does: "copies of the database that serve reads" },
      { id: "bigger", label: "A bigger server", does: "not a box here: a full scan is slow on any machine" },
      { id: "primary", label: "Primary database", does: "the main copy, where every write goes" },
      { id: "cache", label: "Short cache", does: "keeps popular results for a few seconds" },
      { id: "ryw", label: "Read-your-writes", does: "routes a user's own reads to the primary for a short window" },
      { id: "index", label: "Composite index", does: "a sorted lookup on (brand, price) that skips the scan" },
    ],
    done: "That's a catalogue that survives a sale: cheap reads, spread across replicas, with a cache in front.",
  },

  design: {
    title: "Design the product catalogue for a fashion sale",
    brief: "Lakhs of products, lakhs of shoppers filtering by brand, size, colour and price, sorting by price or popularity. Design the catalogue service so browsing stays fast during a sale.",
    constraints: [
      "Lakhs of products; most traffic is browsing, not buying",
      "Filters: brand, size, colour, price; sort by price or popularity",
      "Prices and stock change during the sale",
      "Pages should load in under 300 ms at the peak",
    ],
    minChars: 120,
    walkthrough: [
      { heading: "Requirements and numbers", points: ["Reads far outnumber writes. List the top queries: filter by brand + price, sort by price, product page by ID.", "Estimate peak reads a second; that decides how many replicas and how much cache."] },
      { heading: "Make each query cheap", points: ["Composite indexes matching the top filters, equality columns first and the sort column last; confirm with the query plan.", "Free-text search and many-filter combinations go to a search index, not the main database."] },
      { heading: "Spread the reads", points: ["Primary for writes (price, stock, orders); read replicas for browsing, added for the sale.", "A short cache in front of popular listings and product pages."] },
      { heading: "Keep it correct", points: ["Read-your-writes: after a change, that user's reads go to the primary briefly.", "Stock at checkout is always checked on the primary, never a replica or cache."] },
      { heading: "Trade-offs to say out loud", points: ["More indexes, slower writes: keep only what real queries use.", "Replicas and cache are slightly stale; fine for browsing, not for checkout.", "A search index is one more system to keep in sync."] },
    ],
    checklist: [
      "I listed the top queries before adding indexes",
      "I put equality columns before range columns in composite indexes",
      "I sent browsing to read replicas and kept writes on the primary",
      "I added a short cache for popular pages",
      "I checked stock on the primary at checkout",
      "I named at least one trade-off",
    ],
  },

  followUps: [
    {
      q: "\"Now replication lag jumps to 30 seconds during the sale. What breaks, and what do you do?\"",
      answer: [
        "Browsing shows prices and stock up to 30 seconds old; users see items that are already gone.",
        "Find the cause: a heavy query or a burst of writes on the primary; add replicas or slow the writes.",
        "Check stock and price on the primary at checkout, and stop routing to a replica that lags too far.",
      ],
      say: "\"Route away from lagging replicas, fix the cause, and always confirm stock and price on the primary at checkout.\"",
      deeper: "Days 6 and 17",
    },
    {
      q: "\"Now users want to filter by any combination of 12 attributes. Indexes can't cover them all. What now?\"",
      answer: [
        "You can't index every combination in the main database.",
        "Copy the catalogue into a search index built for many filters and free text.",
        "Keep the main database as the source of truth; update the search index from changes.",
      ],
      say: "\"Many-filter search goes to a search index fed from the main database, which stays the source of truth.\"",
      deeper: "Day 16",
    },
    {
      q: "\"Now writes grow too: the primary itself is at its limit. Do more replicas help?\"",
      answer: [
        "No: replicas only take reads. Every write still lands on the one primary.",
        "Reduce writes (batch them, queue non-urgent ones), then split the data across several primaries: sharding.",
        "Pick the shard key carefully, so one popular brand doesn't land on one shard.",
      ],
      say: "\"Replicas scale reads, not writes; for writes it's batching, queues, and then sharding.\"",
      deeper: "Day 6",
    },
    {
      q: "\"Now a price drop goes live, but some users still see the old price for a minute. Is that OK?\"",
      answer: [
        "On the listing page, a few seconds is usually fine. A whole minute is too long during a sale.",
        "Clear the cache for that product when its price changes, and keep cache times short.",
        "At checkout, always charge the price read from the primary, and show it clearly before payment.",
      ],
      say: "\"Short cache times plus clearing the cache on change, and the primary's price at checkout.\"",
      deeper: "Day 3",
    },
  ],

  interview: [
    "Clarify: how read-heavy is it, which filters and sorts, how fresh must it be?",
    "Read the query plan; add composite indexes that match the filters, equality columns first.",
    "Primary for writes; read replicas for browsing; add more for the sale.",
    "Cache popular results for a few seconds in front of the replicas.",
    "Handle lag: read-your-writes, and always check stock and price on the primary at checkout.",
  ],

  cheatsheet: {
    title: "Day 5 · Indexing & read replicas",
    points: [
      "Query plan first, hardware last",
      "Index the columns you filter and sort by",
      "Composite index: equality columns first, range last",
      "Every index slows writes a little",
      "Replicas scale reads, not writes",
      "Replicas lag: plan for read-your-writes",
    ],
  },

  linkedin:
    "Day 5/21 of System Design with Klymb.\n\nAt the peak of its June 2019 End of Reason Sale, Myntra reported over 7,100 orders a minute and traffic 3× a normal day. Behind every order are dozens of searches and filters.\n\nWhat I learned: read the query plan before buying hardware, index the columns you filter and sort by (in the right order), send browsing to read replicas, cache what's popular, and plan for replica lag with read-your-writes.\n\n#SystemDesign #Klymb",

  nextDay: "CSK's 10 lakh views: when one database isn't enough, how do you split the data?",
};

const hi: DayCopy = {
  hookLines: [
    "Myntra ki End of Reason Sale, June 2019.",
    "Peak pe: har minute 7,100 se zyada orders, aur traffic normal din ka 3 guna.",
    "Har order ke peeche darjanon searches: brand, size, ₹999 se kam.",
  ],
  question: "Lakhon log ek saath ek hi catalogue filter kar rahe. Reads tez kaise rahein?",

  pre: [
    {
      id: "d5-pre-1",
      scenario: "5 crore rows wali products table pe brand + price ki filter query 4 second leti hai.",
      prompt: "Pehla kadam?",
      choices: [
        {
          text: "Query plan dekho, phir filter se match karta index lagao",
          why: "Bina index database saari 5 crore rows padhta hai. Match karta index seedha sahi rows pe jaata hai. Trade-off: har index writes ko thoda slow karta hai aur jagah leta hai.",
          best: true,
        },
        { text: "Database ko bade server pe le jao", why: "5 crore rows ka full scan kisi bhi machine pe slow hai. Bada hardware thoda time deta hai, badi keemat pe." },
        { text: "Har possible filter ka result cache karo", why: "Brand × size × price × colour matlab millions combinations. Popular wale cache karo, par pehle query theek karo." },
      ],
    },
    {
      id: "d5-pre-2",
      scenario: "Tumhara index (price, brand) pe hai. Query: WHERE brand = 'Roadster' AND price < 999.",
      prompt: "Kya database index achhe se use karega?",
      choices: [
        {
          text: "Achhe se nahi: equality column pehle rakho, (brand, price)",
          why: "Composite index pehle column se sorted, phir agle se. Brand pehle ho toh database Roadster pe jaake uske prices order mein padhta hai. Trade-off: column order kuch queries ke kaam aata hai, kuch ke nahi.",
          best: true,
        },
        { text: "Haan: index ke andar column order se fark nahi padta", why: "Bahut fark padta hai. Price pehle ho toh har brand ka har sasta product scan karna padta hai." },
        { text: "Tabhi jab har column pe alag index ho", why: "Do single-column indexes aksar sahi order wale ek composite index se bure hote hain." },
      ],
    },
    {
      id: "d5-pre-3",
      scenario: "Sale shuru. Database ka 95% traffic browsing hai; 5% orders likhe ja rahe.",
      prompt: "Sabse zyada kya madad karega?",
      choices: [
        {
          text: "Read replicas: database ki copies jo browsing sambhalein",
          why: "Main database (primary) writes rakhta hai; replicas reads lete hain, aur browsing badhe toh aur jodo. Trade-off: replicas thoda peeche rehte hain.",
          best: true,
        },
        { text: "Turant database shard karo", why: "Sharding powerful par complex hai. Jab problem reads ki ho, replicas simple pehla kadam hain." },
        { text: "Sab primary pe bhejo aur umeed karo", why: "Har read sambhalti ek machine theek sale ke peak pe ceiling ban jaati hai." },
      ],
    },
  ],

  revealTitle: "Myntra ki sale, aur tez reads aksar kaise bante hain",
  revealSub: "Myntra ke public numbers, phir standard pattern",
  sourceNote: "Myntra figures: Myntra ke EORS-10 results (June 2019), Punekar News mein. Aakhri rows general industry pattern hain, Myntra ke andar ka claim nahi.",
  reveal: [
    { when: "EORS-10, June 2019", what: "Myntra ne ise ab tak ki sabse badi End of Reason Sale kaha: 20 lakh se zyada customers ne 90 lakh se zyada items order kiye." },
    { when: "Peak pe", what: "Har minute 7,100 se zyada orders, traffic normal din ka lagbhag 3 guna." },
    { when: "Aam design: indexes", what: "Filters aur sort se match karte indexes, sahi column order mein, query plan se check kiye hue." },
    { when: "Aam design: replicas", what: "Primary writes leta hai; read replicas browsing aur search sambhalte hain, sale ke liye aur jodte hain." },
    { when: "Aam design: fresh reads", what: "User kuch badle toh thodi der uske apne reads primary pe jaate hain." },
    { when: "Aur aage cache", what: "Popular product pages aur filter results kuch second cache, taaki zyada tar reads database tak pahunchein hi nahi." },
  ],

  explain: {
    title: "Indexes aur replicas, aasaan bhasha mein",
    items: [
      { term: "Full table scan", what: "Database matches dhoondhne ke liye har row padhta hai. 1,000 rows ke liye theek, 5 crore ke liye dard.", example: "Brand pe index nahi" },
      { term: "B-tree index", what: "Sorted structure jo saari rows padhne ki jagah kuch steps mein matching rows pe jaata hai.", example: "Kitaab ke index jaisa" },
      { term: "Composite index", what: "Kai columns pe ek index, pehle se sorted, phir agle se. Order maayne rakhta hai.", example: "(brand, price)" },
      { term: "Query plan", what: "Database khud batata hai query kaise chalayega: scan ya index, aur kharcha.", example: "EXPLAIN" },
      { term: "Read replica", what: "Database ki copy jo reads sambhalti hai, primary se update hoti hai.", example: "Browse aur search traffic" },
      { term: "Replication lag", what: "Primary pe change ko replica pe dikhne mein lagne wala time.", example: "Aksar milliseconds, kabhi seconds" },
    ],
  },

  concept: {
    cards: [
      {
        name: "Har read sasta karo",
        examples: ["Indexes", "Composite order", "Query plan"],
        moves: ["Jin columns pe filter aur sort, unpe index", "Equality columns pehle, range aakhri", "Hardware se pehle query plan padho", "Har index writes pe thoda kharcha"],
      },
      {
        name: "Reads baanto",
        examples: ["Read replicas", "Cache", "Read-your-writes"],
        moves: ["Writes primary pe, browsing replicas pe", "Popular pages kuch second cache", "Write ke baad apna data primary se padho", "Replication lag pe nazar"],
      },
    ],
    rule: "Pehle query plan, hardware aakhri: read theek karo, phir reads baanto, phir unhe cache karo.",
  },

  post: [
    {
      id: "d5-post-1",
      scenario: "User address update karta hai, checkout pe jaata hai, aur PURANA address dikhta hai. Kuch toota nahi.",
      prompt: "Kya hua, aur fix?",
      choices: [
        { text: "Checkout ne aise replica se padha jo pakad nahi paaya tha; write ke baad thodi der us user ke reads primary pe bhejo", why: "Yahi read-your-writes hai. Trade-off: primary pe thoda extra load, sirf unke liye jinhone abhi kuch badla.", best: true },
        { text: "Database ne update kho diya", why: "Update primary pe safe hai. Bas ek replica tak abhi pahuncha nahi." },
        { text: "Sale ke dauraan replicas band karo", why: "Phir har read primary pe, theek tab jab traffic peak pe hai." },
      ],
    },
    {
      id: "d5-post-2",
      scenario: "Har filter tez karne ke liye kisi ne orders table pe 15 indexes laga diye.",
      prompt: "Khatra kya hai?",
      choices: [
        { text: "Ab har order ko 15 indexes update karne padte hain, toh writes slow, theek jab orders peak pe hain", why: "Indexes reads tez aur writes mehengi karte hain. Jo asli queries use karti hain unhe rakho, baaki hatao.", best: true },
        { text: "Koi nahi: zyada indexes hamesha tez", why: "Reads tez, writes slow, storage zyada. Write-heavy table pe yeh ghaate ka sauda hai." },
        { text: "Database har baar galat index chunega", why: "Aksar woh theek chunta hai. Asli kharcha har insert aur update pe hai." },
      ],
    },
    {
      id: "d5-post-3",
      scenario: "Sale mein product listing pages crores baar padhe jaate hain, aur din mein kuch hi baar badalte hain.",
      prompt: "Sabse sasta bada fayda?",
      choices: [
        { text: "Listing results thodi der cache karo, replicas ke aage", why: "Zyada tar reads database tak pahunchte hi nahi. Trade-off: price change dikhne mein kuch second lag sakte hain; zaroori ho toh cache clear karo.", best: true },
        { text: "Har 1,000 users pe ek replica", why: "Replicas madad karte hain, par kam badalne wale data ke liye aage ka cache kahin zyada bachata hai." },
        { text: "Har product page pehle se file bana do", why: "Kuch pages ke liye chalta hai, par sale mein stock aur price badalte hain; chhota cache simple hai." },
      ],
    },
    {
      id: "d5-post-4",
      scenario: "Tumne saari browsing read replicas pe bhej di.",
      prompt: "Kya accept kiya?",
      choices: [
        { text: "Thode purane reads: replica primary se thoda peeche ho sakta hai", why: "Browsing ke liye theek, balance ya checkout ke address ke liye nahi. Isiliye read-your-writes hai.", best: true },
        { text: "Primary pe slow writes", why: "Writes pehle jaise primary pe; replicas unhe alag se copy karte hain." },
        { text: "Replica mare toh data khona", why: "Primary ke paas sab hai. Mara replica bas reads dena band karta hai." },
      ],
    },
    {
      id: "d5-post-5",
      scenario: "Ek slow report har ghante primary database pe chalti hai, aur jab chalti hai checkout slow ho jaata hai.",
      prompt: "Best move?",
      choices: [
        { text: "Report read replica, ya analytics copy pe chalao", why: "Reports reads hain. Primary writes aur checkout ke liye rakho. Trade-off: report kuch second peeche ho sakti hai, report ke liye theek.", best: true },
        { text: "Report ke har column pe index lagao", why: "Report shayad tez ho, par har index un writes ko slow karta hai jin pe checkout tika hai." },
        { text: "Din mein ek baar chalao", why: "Slowdown kam, par phir bhi roz ek, aur numbers purane." },
      ],
    },
  ],

  estimates: [
    {
      id: "d5-est-1",
      given: ["5 crore products", "Full scan lagbhag 1 crore rows per second padhta hai", "Indexed lookup lagbhag 5 ms"],
      prompt: "Full scan kitne second leta hai?",
      unit: "seconds",
      answer: 5,
      tolerance: 0.3,
      working: ["5 crore ÷ 1 crore per second = 5 second", "Index lagbhag 5 ms mein jawab deta hai", "Ek index se lagbhag 1,000 guna tez"],
    },
    {
      id: "d5-est-2",
      given: ["Sale ke peak pe 20,000 database reads per second", "Ek replica 3,000 reads per second sambhalta hai", "Ek spare rakho"],
      prompt: "Kitne read replicas?",
      unit: "replicas",
      answer: 8,
      tolerance: 0.25,
      working: ["20,000 ÷ 3,000 ≈ 6.7, toh 7 replicas", "Ek gire toh ke liye ek spare: 8", "Aage cache ho toh yeh bahut kam ho jaata"],
    },
    {
      id: "d5-est-3",
      given: ["20,000 reads per second", "Cache unmein se 90% ka jawab deta hai"],
      prompt: "Kitne reads per second phir bhi database tak?",
      unit: "reads/sec",
      answer: 2000,
      tolerance: 0.15,
      working: ["20,000 ka 10% = 2,000 reads per second", "Aath ki jagah shayad ek replica kaafi", "Isiliye cache aksar sabse sasta bada fayda hai"],
    },
  ],

  build: {
    title: "Tez catalogue banao",
    intro: "Har box ko uske kaam wali jagah pe drag karo. Ya box tap karo, phir slot tap karo.",
    given: "Lakhon shoppers",
    rows: [["cache"], ["index", "replicas"], ["primary", "ryw"]],
    slots: {
      cache: { role: "Popular pages ka kuch second jawab deta hai", answer: "cache" },
      index: { role: "5 second ke scan ko 5 ms lookup banata hai", answer: "index" },
      replicas: { role: "Copies jo browsing aur search sambhalti hain", answer: "replicas" },
      primary: { role: "Har order aur update leta hai", answer: "primary" },
      ryw: { role: "Write ke turant baad user ke reads primary pe bhejta hai", answer: "ryw" },
    },
    chips: [
      { id: "replicas", label: "Read replicas", does: "database ki copies jo reads sambhalti hain" },
      { id: "bigger", label: "Bada server", does: "is design ka box nahi: full scan kisi bhi machine pe slow hai" },
      { id: "primary", label: "Primary database", does: "main copy, jahan har write jaati hai" },
      { id: "cache", label: "Chhota cache", does: "popular results kuch second rakhta hai" },
      { id: "ryw", label: "Read-your-writes", does: "user ke apne reads thodi der primary pe bhejta hai" },
      { id: "index", label: "Composite index", does: "(brand, price) pe sorted lookup jo scan bachata hai" },
    ],
    done: "Yeh hai sale jhelne wala catalogue: saste reads, replicas pe baante hue, aage cache ke saath.",
  },

  design: {
    title: "Fashion sale ke liye product catalogue design karo",
    brief: "Lakhon products, lakhon shoppers brand, size, colour aur price se filter karte, price ya popularity se sort karte. Catalogue service aisa design karo ki sale mein browsing tez rahe.",
    constraints: [
      "Lakhon products; zyada tar traffic browsing, kharidna kam",
      "Filters: brand, size, colour, price; sort price ya popularity se",
      "Sale ke dauraan price aur stock badalte hain",
      "Peak pe pages 300 ms se kam mein load hon",
    ],
    minChars: 120,
    walkthrough: [
      { heading: "Requirements aur numbers", points: ["Reads writes se kahin zyada. Top queries likho: brand + price filter, price se sort, ID se product page.", "Peak reads per second ka andaaza; usi se kitne replicas aur kitna cache."] },
      { heading: "Har query sasti", points: ["Top filters se match karte composite indexes, equality columns pehle aur sort column aakhri; query plan se confirm.", "Free-text search aur bahut saare filters ke combinations search index pe, main database pe nahi."] },
      { heading: "Reads baanto", points: ["Writes (price, stock, orders) primary pe; browsing read replicas pe, sale ke liye aur jodo.", "Popular listings aur product pages ke aage chhota cache."] },
      { heading: "Sahi rakho", points: ["Read-your-writes: change ke baad thodi der us user ke reads primary pe.", "Checkout pe stock hamesha primary pe check, kabhi replica ya cache pe nahi."] },
      { heading: "Trade-offs jo bolke batao", points: ["Zyada indexes, slow writes: sirf jo asli queries use karein.", "Replicas aur cache thode purane; browsing ke liye theek, checkout ke liye nahi.", "Search index ek aur system jise sync rakhna hai."] },
    ],
    checklist: [
      "Maine indexes se pehle top queries likhi",
      "Maine composite indexes mein equality columns range se pehle rakhe",
      "Maine browsing read replicas pe bheji aur writes primary pe rakhi",
      "Maine popular pages ke liye chhota cache joda",
      "Maine checkout pe stock primary pe check kiya",
      "Maine kam se kam ek trade-off bataya",
    ],
  },

  followUps: [
    {
      q: "\"Ab sale mein replication lag 30 second ho gaya. Kya tootega, aur kya karoge?\"",
      answer: [
        "Browsing mein price aur stock 30 second tak purane; users ko woh items dikhte hain jo khatam ho chuke.",
        "Wajah dhoondho: primary pe bhaari query ya writes ka burst; replicas jodo ya writes dheemi karo.",
        "Checkout pe stock aur price primary pe check karo, aur bahut peeche wale replica pe routing band karo.",
      ],
      say: "\"Peeche chal rahe replicas se routing hatao, wajah theek karo, aur checkout pe stock aur price hamesha primary pe confirm karo.\"",
      deeper: "Days 6 aur 17",
    },
    {
      q: "\"Ab users 12 attributes ke kisi bhi combination se filter karna chahte hain. Indexes sab cover nahi kar sakte. Ab?\"",
      answer: [
        "Main database mein har combination index nahi ho sakta.",
        "Catalogue ko search index mein copy karo jo kai filters aur free text ke liye bana hai.",
        "Main database source of truth rahe; search index changes se update ho.",
      ],
      say: "\"Kai-filter search, main database se bharte search index pe; main database source of truth.\"",
      deeper: "Day 16",
    },
    {
      q: "\"Ab writes bhi badh gaye: primary khud limit pe hai. Kya aur replicas madad karenge?\"",
      answer: [
        "Nahi: replicas sirf reads lete hain. Har write phir bhi ek primary pe.",
        "Writes kam karo (batch karo, jo urgent nahi woh queue), phir data kai primaries mein baanto: sharding.",
        "Shard key soch ke chuno, taaki ek popular brand ek hi shard pe na pade.",
      ],
      say: "\"Replicas reads scale karte hain, writes nahi; writes ke liye batching, queues, phir sharding.\"",
      deeper: "Day 6",
    },
    {
      q: "\"Ab price drop live hua, par kuch users ko ek minute tak purana price dikhta hai. Kya theek hai?\"",
      answer: [
        "Listing page pe kuch second aksar theek. Sale mein poora minute bahut zyada.",
        "Price badalte hi us product ka cache clear karo, aur cache time chhota rakho.",
        "Checkout pe hamesha primary se padha price lo, aur payment se pehle saaf dikhao.",
      ],
      say: "\"Chhota cache time, change pe cache clear, aur checkout pe primary ka price.\"",
      deeper: "Day 3",
    },
  ],

  interview: [
    "Pehle poocho: kitna read-heavy, kaunse filters aur sort, kitna fresh chahiye?",
    "Query plan padho; filters se match karte composite indexes, equality columns pehle.",
    "Writes primary pe; browsing read replicas pe; sale ke liye aur jodo.",
    "Replicas ke aage popular results kuch second cache.",
    "Lag sambhalo: read-your-writes, aur checkout pe stock aur price hamesha primary pe.",
  ],

  cheatsheet: {
    title: "Day 5 · Indexing & read replicas",
    points: [
      "Pehle query plan, hardware aakhri",
      "Jin columns pe filter aur sort, unpe index",
      "Composite index: equality pehle, range aakhri",
      "Har index writes ko thoda slow karta hai",
      "Replicas reads scale karte hain, writes nahi",
      "Replicas peeche rehte hain: read-your-writes plan karo",
    ],
  },

  linkedin:
    "Day 5/21: System Design with Klymb.\n\nJune 2019 ki End of Reason Sale ke peak pe Myntra ne har minute 7,100 se zyada orders aur normal din ka 3 guna traffic bataya. Har order ke peeche darjanon searches aur filters.\n\nMera takeaway: hardware se pehle query plan padho, jin columns pe filter aur sort hai unpe sahi order mein index lagao, browsing read replicas pe bhejo, popular cheezein cache karo, aur replica lag ke liye read-your-writes plan karo.\n\n#SystemDesign #Klymb",

  nextDay: "CSK ke 10 lakh views: jab ek database kaafi na ho, data kaise baantoge?",
};

export const dayFive: Day = {
  day: 5,
  of: 21,
  app: "Myntra",
  minutes: 15,
  hook: { date: "June 2019 · 7,100 orders a minute" },
  copy: { en, hi },
  sources: [
    { label: "Myntra EORS-10 results: 9 million items, 7,100+ orders per minute (Punekar News, June 2019)", href: "https://www.punekarnews.in/?p=39734" },
  ],
  video: {
    src: "/api/video/day-5-wide.mp4", poster: "/videos/system-design/day-5-wide-poster.jpg", minutes: 3, lang: "Hinglish",
    wide: { src: "/api/video/day-5-wide.mp4", poster: "/videos/system-design/day-5-wide-poster.jpg" },
  },
  prevHref: "/system-design/day-4",
};
