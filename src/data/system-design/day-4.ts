/**
 * Day 4 of "System Design in 21 Days": a wallet payment vs a like -> SQL vs NoSQL.
 * No Paytm or Instagram internals are claimed: the wallet and likes are framed as
 * "a wallet app" and "a photo app". The real-world example is Discord's own
 * engineering write-up, listed in `sources`.
 */
import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  hookLines: [
    "Two taps on your phone, one second apart.",
    "A heart on a photo. And ₹500 sent from your wallet.",
    "Lose the like, nobody notices. Lose the ₹500, it's a complaint, maybe a regulator.",
  ],
  question: "Should a wallet payment and a like live in the same kind of database?",

  pre: [
    {
      id: "d4-pre-1",
      scenario: "A wallet transfer: debit ₹500 from Asha, credit ₹500 to Ravi. The server crashes between the two steps.",
      prompt: "Which database setup protects you?",
      choices: [
        {
          text: "A relational (SQL) database, with both steps in one transaction",
          why: "A transaction is all or nothing: either both rows change or neither does, even after a crash. Trade-off: transactions need coordination, which makes huge write volumes harder to scale.",
          best: true,
        },
        { text: "A NoSQL store, writing the debit and the credit as two quick separate writes", why: "Fast, but a crash in between leaves ₹500 debited and never credited. Some NoSQL stores now offer transactions too, but you have to choose and use them deliberately." },
        { text: "Any database, plus a nightly job that finds and fixes mismatches", why: "Reconciliation is a good safety net, but a whole day of wrong balances is not acceptable for money." },
      ],
    },
    {
      id: "d4-pre-2",
      scenario: "A photo app gets crores of likes a day. Each like is tiny, and if one is lost, nobody really notices.",
      prompt: "What matters most when you pick its store?",
      choices: [
        {
          text: "Handling a huge volume of small writes, spread across many machines",
          why: "Likes are high volume and loss-tolerant, so a store built to scale writes horizontally fits. Trade-off: you give up some guarantees, like joins and strict transactions.",
          best: true,
        },
        { text: "Strong transactions across every like", why: "That's protection money needs. For likes it costs scale and buys almost nothing." },
        { text: "Being able to join likes with every other table", why: "Joins help reporting, but the hot path is \"count likes for this post\", which doesn't need them." },
      ],
    },
    {
      id: "d4-pre-3",
      scenario: "You're about to pick a database for a new feature.",
      prompt: "What should you decide first?",
      choices: [
        {
          text: "How the data will be read and written: which queries, how often, how big",
          why: "Access patterns decide the schema and the store. The same data can need a different design if it's read by user, by time or by place.",
          best: true,
        },
        { text: "Whichever database the team knows best", why: "Familiarity matters for running it, but if the access pattern doesn't fit, no amount of skill makes it fast." },
        { text: "Whatever the biggest companies use", why: "They chose for their access patterns and their scale, which are probably not yours." },
      ],
    },
  ],

  revealTitle: "What a real system did, and how the choice is usually made",
  revealSub: "Discord's public account, then the standard pattern",
  sourceNote: "Discord facts: Discord's engineering blog, \"How Discord Stores Trillions of Messages\" (March 2023). The wallet and likes rows are the general industry pattern, not a claim about any Indian company's internals.",
  reveal: [
    { when: "Discord, 2017 → 2022", what: "The message store grew from billions of messages to trillions." },
    { when: "How it's laid out", what: "Messages are partitioned by channel and a time \"bucket\", so one conversation's recent messages sit together." },
    { when: "What broke", what: "A very busy channel became a \"hot partition\" whose slowness spread to other queries on the same machines." },
    { when: "What they did", what: "Moved from Cassandra (177 nodes) to ScyllaDB (72 nodes), and added services that query the database once when many users ask for the same row." },
    { when: "The result", what: "p99 latency to fetch old messages fell from 40–125 ms to 15 ms." },
    { when: "The usual design", what: "Money in a relational database with transactions; huge, loss-tolerant data (likes, messages, feeds) in a store that scales writes; each picked by how it's read." },
  ],

  explain: {
    title: "SQL vs NoSQL, explained",
    items: [
      { term: "ACID transaction", what: "A group of changes that happens completely or not at all, and stays correct even after a crash.", example: "Debit and credit together" },
      { term: "Relational (SQL)", what: "Tables with a fixed structure, joins between them, and strong transactions.", example: "PostgreSQL, MySQL" },
      { term: "Key-value", what: "Look up a value by its key, very fast. No joins.", example: "Redis, DynamoDB" },
      { term: "Document", what: "Flexible JSON-like records, each one self-contained.", example: "MongoDB" },
      { term: "Wide-column", what: "Rows grouped by a partition key and sorted inside it, spread across many machines.", example: "Cassandra, ScyllaDB" },
      { term: "Partition key", what: "Decides which machine holds a row. Pick it from how you read the data.", example: "channel + time bucket" },
    ],
  },

  concept: {
    cards: [
      {
        name: "Needs SQL + transactions",
        examples: ["Wallet balances", "Payments, refunds", "Orders and stock", "Seat bookings"],
        moves: ["Every rupee must add up", "All-or-nothing changes", "Joins for reports and audits", "Scale with replicas, then shards"],
      },
      {
        name: "Fits a scale-out NoSQL store",
        examples: ["Likes and views", "Chat messages", "Feeds", "Activity logs"],
        moves: ["Huge volume of small writes", "Losing one is not a disaster", "Read in one known way", "Partition by how you read it"],
      },
    ],
    rule: "Start from how the data is read and how wrong it's allowed to be. One app can, and usually does, use several databases.",
  },

  post: [
    {
      id: "d4-post-1",
      scenario: "A chat app stores billions of messages, always read as \"the latest 50 messages of one conversation\".",
      prompt: "Which store, and which partition key?",
      choices: [
        { text: "A wide-column store, partitioned by conversation and a time bucket", why: "One read hits one partition, already sorted by time. That's what Discord describes. Trade-off: a very busy conversation can become a hot partition.", best: true },
        { text: "One big SQL table with an index on conversation", why: "Works at first; at billions of rows on one primary, writes and storage become the ceiling." },
        { text: "A key-value store keyed by message ID", why: "Fetching \"latest 50 of a conversation\" would mean 50 lookups and no ordering: wrong key for the read." },
      ],
    },
    {
      id: "d4-post-2",
      scenario: "Your like counts live in a scale-out store that replicates asynchronously. Two people see a post at the same moment: one sees 1,204 likes, the other 1,201.",
      prompt: "Is this a bug?",
      choices: [
        { text: "No: that's eventual consistency, and it's fine for likes", why: "Replicas catch up within moments. You accept it for scale and speed. Trade-off: never accept it for a wallet balance.", best: true },
        { text: "Yes: every reader must always see the same number", why: "That needs strong consistency on every read, which costs latency and scale for something nobody needs to be exact." },
        { text: "Yes: the database lost 3 likes", why: "The likes aren't lost; one replica just hasn't caught up yet." },
      ],
    },
    {
      id: "d4-post-3",
      scenario: "A refund must add ₹500 back to the wallet AND write a ledger entry. Your team suggests a NoSQL store \"because it scales\".",
      prompt: "What do you say?",
      choices: [
        { text: "Keep it in a relational database with one transaction for both writes", why: "Money needs both writes or neither, and a ledger you can audit with joins. Wallet volume per second is far below what scaling forces you off SQL.", best: true },
        { text: "Agree: scale matters more than anything", why: "A refund that adds money without a ledger entry (or the reverse) is a real loss, not a slow page." },
        { text: "Use both: write to SQL, then copy to NoSQL", why: "Two systems to keep in sync, and the copy adds nothing for this access pattern." },
      ],
    },
    {
      id: "d4-post-4",
      scenario: "You moved likes from SQL to a scale-out NoSQL store.",
      prompt: "What did you trade away?",
      choices: [
        { text: "Joins and strict transactions: \"likes by friends of this user\" is now harder to ask", why: "You gain write scale and lose flexible queries. Plan the questions you need up front, or keep a separate copy for analytics.", best: true },
        { text: "Speed: NoSQL is slower than SQL", why: "For its designed access pattern it's usually very fast. The cost is flexibility, not speed." },
        { text: "Nothing: NoSQL is SQL plus scale", why: "Every store gives something up. Here it's joins, ad-hoc queries and strict transactions." },
      ],
    },
    {
      id: "d4-post-5",
      scenario: "A shopping cart: users add and remove items many times, losing a cart now and then is annoying but not a disaster, and it's always read by user ID.",
      prompt: "What fits best?",
      choices: [
        { text: "A key-value store, keyed by user ID", why: "One key, one fast read, easy to scale. Trade-off: when the order is placed, write it to the relational orders database inside a transaction.", best: true },
        { text: "The relational orders database, with a transaction for every cart change", why: "Safe, but heavy for data that changes all the time and can be rebuilt." },
        { text: "A search index", why: "Built for finding records by words, not for fetching one user's cart." },
      ],
    },
  ],

  estimates: [
    {
      id: "d4-est-1",
      given: ["10 crore likes a day", "Each like row is about 100 bytes"],
      prompt: "New like data per day, in GB?",
      unit: "GB/day",
      answer: 10,
      tolerance: 0.3,
      working: ["10 crore = 100 million likes", "100 million × 100 bytes = 10,000 million bytes", "≈ 10 GB a day, about 3.6 TB a year: big, but it's the write rate that pushes you to scale out"],
    },
    {
      id: "d4-est-2",
      given: ["10 crore likes a day", "Evening peak is 5× the average"],
      prompt: "Likes per second at the peak?",
      unit: "likes/sec",
      answer: 5800,
      tolerance: 0.3,
      working: ["10 crore ÷ 86,400 ≈ 1,160 likes a second on average", "× 5 at the peak ≈ 5,800 a second", "Thousands of tiny writes a second, every second: a job for a store that spreads writes"],
    },
    {
      id: "d4-est-3",
      given: ["50 lakh wallet transfers a day", "Each transfer writes 3 rows: debit, credit, ledger entry"],
      prompt: "Rows written per second, on average?",
      unit: "rows/sec",
      answer: 174,
      tolerance: 0.3,
      working: ["50 lakh × 3 = 1.5 crore rows a day", "1.5 crore ÷ 86,400 ≈ 174 rows a second", "Well within one good SQL primary: money doesn't need NoSQL for scale"],
    },
  ],

  build: {
    title: "Pick a store for each part of one app",
    intro: "Drag each database to the data it should hold. You can also tap a box, then tap a slot.",
    given: "One super-app",
    rows: [["wallet", "orders"], ["likes", "chat"], ["sessions", "search"]],
    slots: {
      wallet: { role: "Wallet balances and transfers", answer: "sql" },
      orders: { role: "Orders and stock (must add up)", answer: "sql2" },
      likes: { role: "Crores of likes and view counts", answer: "kv" },
      chat: { role: "Billions of messages, read latest-first", answer: "wide" },
      sessions: { role: "Logged-in sessions, read on every request", answer: "cache" },
      search: { role: "Search by any word in a product name", answer: "searchidx" },
    },
    chips: [
      { id: "wide", label: "Wide-column store", does: "rows grouped by a partition key and sorted, spread over many machines" },
      { id: "sql", label: "SQL + transactions", does: "tables, joins and all-or-nothing changes" },
      { id: "json", label: "One JSON file", does: "not a box here: no concurrency, no transactions, no scale" },
      { id: "cache", label: "In-memory key-value", does: "very fast lookups by key, kept in memory" },
      { id: "kv", label: "Scale-out key-value", does: "huge volumes of small writes, spread across machines" },
      { id: "searchidx", label: "Search index", does: "finds records by any word in them" },
      { id: "sql2", label: "SQL (orders DB)", does: "a relational database where stock and orders must stay correct" },
    ],
    done: "One app, several databases, each picked by how its data is read and how wrong it may be. That's polyglot persistence.",
  },

  design: {
    title: "Design the database for a photo app",
    brief: "Users, posts, likes, follows and comments for a photo-sharing app with crores of users. Choose a store for each, and say how each is read.",
    constraints: [
      "Crores of users; lakhs of new posts a day",
      "A popular post can get lakhs of likes in an hour",
      "Feed: latest posts from people you follow",
      "Account and follow data must never get mixed up",
    ],
    minChars: 120,
    walkthrough: [
      { heading: "Access patterns first", points: ["Profile by user ID; posts by user, newest first; like count per post; who follows whom; comments per post, oldest first.", "Write the queries down before choosing any store."] },
      { heading: "Users, posts, follows: relational", points: ["Accounts and the follow graph need correctness and some joins: a relational database, later sharded by user ID.", "Photos themselves go to object storage (Day 3); the database keeps only their location."] },
      { heading: "Likes: scale-out, with counters", points: ["Store likes in a scale-out store keyed by post. Keep a running like count instead of counting rows on every view.", "Slightly stale counts are fine (eventual consistency)."] },
      { heading: "Feed and comments", points: ["Feed: a precomputed list per user in a wide-column store, partitioned by user and time.", "Comments: partitioned by post, sorted by time, so one read gets a page."] },
      { heading: "Trade-offs to say out loud", points: ["Several databases mean more to run and keep in sync.", "Counters can drift slightly; reconcile them in the background.", "A celebrity's post is a hot key: split or cache its counter (Day 6)."] },
    ],
    checklist: [
      "I listed how each kind of data is read before picking stores",
      "I kept accounts and follows in a relational database",
      "I put likes in a scale-out store with a counter",
      "I partitioned feeds or comments by how they're read",
      "I kept photos out of the database",
      "I named at least one trade-off",
    ],
  },

  followUps: [
    {
      q: "\"Now finance wants a daily report: total wallet top-ups by city. Your wallet DB is busy all day. What do you do?\"",
      answer: [
        "Don't run heavy reports on the primary that serves payments.",
        "Run them on a read replica, or copy the data into an analytics store overnight.",
        "Keep the ledger the single source of truth; reports read from copies.",
      ],
      say: "\"Reports go to a replica or an analytics copy; the payment primary only does payments.\"",
      deeper: "Day 5",
    },
    {
      q: "\"Now a celebrity post gets 10 lakh likes in an hour. One partition is melting. What changes?\"",
      answer: [
        "That's a hot key: every like for that post lands on the same partition.",
        "Split the counter into several shards (post ID + 0…N) and add them up when reading.",
        "Cache the displayed count for a few seconds; exactness doesn't matter here.",
      ],
      say: "\"Shard the hot counter, sum on read, and cache the displayed count.\"",
      deeper: "Day 6",
    },
    {
      q: "\"Now product wants 'likes from people you follow' on every post. Your likes store has no joins. What do you say?\"",
      answer: [
        "That query wasn't in the access patterns, and the store wasn't designed for it.",
        "Precompute it: when a like happens, also write it into the follower-facing view, or build it in a background job.",
        "Or show it only where it matters, with a short cache. New questions can mean new data shapes.",
      ],
      say: "\"Precompute that view at write time or in the background, because the likes store was shaped for counting, not joins.\"",
      deeper: "Days 8 and 15",
    },
    {
      q: "\"Now the wallet must work in two regions at once. Can you just let both regions accept writes?\"",
      answer: [
        "Two regions accepting writes to the same balance can both approve a spend: that's a double spend.",
        "Keep one primary per account (route each user's writes to their home region), with the other region as a standby.",
        "Accept a little extra latency for some users in exchange for balances that are always right.",
      ],
      say: "\"One home region per account for writes, standby in the other: correctness first for money.\"",
      deeper: "Day 17",
    },
  ],

  interview: [
    "Ask how the data is read and written: queries, volume, and how wrong it may be.",
    "Money, orders, bookings: a relational database with transactions.",
    "Huge, loss-tolerant writes (likes, messages, feeds): a scale-out store, partitioned by how you read it.",
    "Say the trade-off: you give up joins and strict transactions for write scale.",
    "One app can use several databases; that's normal.",
  ],

  cheatsheet: {
    title: "Day 4 · SQL vs NoSQL",
    points: [
      "Money: SQL + transactions",
      "Huge, loss-tolerant writes: a scale-out store",
      "Start from how you'll read the data",
      "Partition key = how you read it",
      "Eventual consistency is fine for likes, never for balances",
      "One app can use several databases",
    ],
  },

  linkedin:
    "Day 4/21 of System Design with Klymb.\n\nLose one like and nobody notices. Lose one rupee and it's a complaint. That's why a wallet and a like shouldn't live in the same kind of database.\n\nWhat I learned: money goes in a relational database with transactions; huge, loss-tolerant data goes in a store that scales writes, partitioned by how you read it. Discord, for example, partitions trillions of messages by channel and time.\n\n#SystemDesign #Klymb",

  nextDay: "Myntra's sale: lakhs filtering by brand, size and price. How do reads stay fast?",
};

const hi: DayCopy = {
  hookLines: [
    "Tumhare phone pe do taps, ek second ke farak pe.",
    "Ek photo pe heart. Aur wallet se ₹500 bheje.",
    "Like kho gaya, kisi ko pata nahi. ₹500 kho gaye, toh complaint, shayad regulator bhi.",
  ],
  question: "Kya wallet payment aur like ek hi tarah ke database mein rehne chahiye?",

  pre: [
    {
      id: "d4-pre-1",
      scenario: "Wallet transfer: Asha se ₹500 debit, Ravi ko ₹500 credit. Dono steps ke beech server crash.",
      prompt: "Kaunsa database setup tumhe bachata hai?",
      choices: [
        {
          text: "Relational (SQL) database, dono steps ek transaction mein",
          why: "Transaction sab ya kuch nahi: ya dono rows badlengi ya koi nahi, crash ke baad bhi. Trade-off: transactions ko coordination chahiye, isse bahut zyada writes scale karna mushkil.",
          best: true,
        },
        { text: "NoSQL store, debit aur credit do alag tez writes mein", why: "Tez hai, par beech mein crash hua toh ₹500 kate aur kabhi credit nahi hue. Kuch NoSQL stores ab transactions dete hain, par unhe soch samajh ke chunna aur use karna padta hai." },
        { text: "Koi bhi database, aur raat ko ek job jo mismatch dhoondh ke theek kare", why: "Reconciliation achha safety net hai, par paison ke liye poore din galat balance chal nahi sakta." },
      ],
    },
    {
      id: "d4-pre-2",
      scenario: "Photo app pe roz crores likes. Har like chhota hai, aur ek kho jaaye toh kisi ko fark nahi padta.",
      prompt: "Iska store chunte waqt sabse zyada kya maayne rakhta hai?",
      choices: [
        {
          text: "Bahut saari chhoti writes sambhalna, kai machines pe phaila ke",
          why: "Likes high volume aur loss-tolerant hain, toh writes ko horizontally scale karne wala store fit hai. Trade-off: kuch guarantees chhodni padti hain, jaise joins aur strict transactions.",
          best: true,
        },
        { text: "Har like pe strong transactions", why: "Yeh suraksha paison ko chahiye. Likes ke liye scale ki keemat aur fayda lagbhag zero." },
        { text: "Likes ko har table ke saath join kar paana", why: "Joins reports mein kaam aate hain, par hot path hai \"is post ke likes gino\", jise join nahi chahiye." },
      ],
    },
    {
      id: "d4-pre-3",
      scenario: "Naye feature ke liye database chunne wale ho.",
      prompt: "Sabse pehle kya decide karoge?",
      choices: [
        {
          text: "Data kaise padha aur likha jaayega: kaunsi queries, kitni baar, kitna bada",
          why: "Access patterns schema aur store decide karte hain. Wahi data user se, time se ya jagah se padha jaaye toh design alag ho sakta hai.",
          best: true,
        },
        { text: "Jo database team sabse achha jaanti hai", why: "Chalane ke liye familiarity zaroori hai, par access pattern fit nahi toh kitni bhi skill use tez nahi banayegi." },
        { text: "Jo sabse badi companies use karti hain", why: "Unhone apne access patterns aur scale ke hisaab se chuna, jo shayad tumhare nahi hain." },
      ],
    },
  ],

  revealTitle: "Ek asli system ne kya kiya, aur choice aksar kaise hoti hai",
  revealSub: "Discord ka public account, phir standard pattern",
  sourceNote: "Discord facts: Discord ka engineering blog, \"How Discord Stores Trillions of Messages\" (March 2023). Wallet aur likes wali rows general industry pattern hain, kisi Indian company ke andar ka claim nahi.",
  reveal: [
    { when: "Discord, 2017 → 2022", what: "Message store billions se trillions messages tak pahuncha." },
    { when: "Data kaise rakha", what: "Messages channel aur ek time \"bucket\" se partition hote hain, taaki ek conversation ke naye messages saath rahein." },
    { when: "Kya toota", what: "Ek bahut busy channel \"hot partition\" ban gaya, aur uski slowness unhi machines ki baaki queries tak phail gayi." },
    { when: "Unhone kya kiya", what: "Cassandra (177 nodes) se ScyllaDB (72 nodes) pe gaye, aur aisi services jodi jo bahut log ek hi row maangein toh database se ek hi baar poochein." },
    { when: "Nateeja", what: "Purane messages laane ki p99 latency 40–125 ms se 15 ms ho gayi." },
    { when: "Aam design", what: "Paise transactions wale relational database mein; bahut bada, loss-tolerant data (likes, messages, feeds) writes scale karne wale store mein; har ek padhne ke tareeke se chuna." },
  ],

  explain: {
    title: "SQL vs NoSQL, aasaan bhasha mein",
    items: [
      { term: "ACID transaction", what: "Changes ka group jo poora hota hai ya bilkul nahi, aur crash ke baad bhi sahi rehta hai.", example: "Debit aur credit saath" },
      { term: "Relational (SQL)", what: "Fixed structure wali tables, unke beech joins, aur strong transactions.", example: "PostgreSQL, MySQL" },
      { term: "Key-value", what: "Key se value dhoondho, bahut tez. Joins nahi.", example: "Redis, DynamoDB" },
      { term: "Document", what: "Flexible JSON jaise records, har ek apne aap mein poora.", example: "MongoDB" },
      { term: "Wide-column", what: "Rows partition key se group, andar sorted, kai machines pe phaili.", example: "Cassandra, ScyllaDB" },
      { term: "Partition key", what: "Decide karti hai row kis machine pe. Ise padhne ke tareeke se chuno.", example: "channel + time bucket" },
    ],
  },

  concept: {
    cards: [
      {
        name: "SQL + transactions chahiye",
        examples: ["Wallet balances", "Payments, refunds", "Orders aur stock", "Seat bookings"],
        moves: ["Har rupaya hisaab mein", "Sab ya kuch nahi wale changes", "Reports aur audit ke liye joins", "Replicas se scale, phir shards"],
      },
      {
        name: "Scale-out NoSQL store fit",
        examples: ["Likes aur views", "Chat messages", "Feeds", "Activity logs"],
        moves: ["Bahut saari chhoti writes", "Ek kho jaaye toh aafat nahi", "Ek tay tareeke se padha jaata hai", "Padhne ke tareeke se partition"],
      },
    ],
    rule: "Shuru karo is se ki data kaise padha jaata hai aur kitna galat ho sakta hai. Ek app kai databases use kar sakta hai, aur aksar karta hai.",
  },

  post: [
    {
      id: "d4-post-1",
      scenario: "Chat app mein billions messages, hamesha aise padhe jaate hain: \"ek conversation ke latest 50 messages\".",
      prompt: "Kaunsa store, aur kaunsi partition key?",
      choices: [
        { text: "Wide-column store, conversation aur time bucket se partitioned", why: "Ek read ek partition pe, time se pehle se sorted. Discord yahi batata hai. Trade-off: bahut busy conversation hot partition ban sakti hai.", best: true },
        { text: "Ek badi SQL table, conversation pe index", why: "Shuru mein chalta hai; ek primary pe billions rows ke baad writes aur storage ceiling ban jaate hain." },
        { text: "Message ID se key-value store", why: "\"Conversation ke latest 50\" matlab 50 lookups aur koi order nahi: read ke liye galat key." },
      ],
    },
    {
      id: "d4-post-2",
      scenario: "Like counts ek scale-out store mein hain jo asynchronously replicate karta hai. Do log ek hi pal post dekhte hain: ek ko 1,204 likes, doosre ko 1,201.",
      prompt: "Kya yeh bug hai?",
      choices: [
        { text: "Nahi: yeh eventual consistency hai, aur likes ke liye theek hai", why: "Replicas kuch pal mein pakad lete hain. Scale aur speed ke liye yeh accept karte ho. Trade-off: wallet balance ke liye kabhi nahi.", best: true },
        { text: "Haan: har reader ko hamesha same number dikhna chahiye", why: "Uske liye har read pe strong consistency, jo latency aur scale khaati hai, aisi cheez ke liye jise exact hone ki zaroorat nahi." },
        { text: "Haan: database ne 3 likes kho diye", why: "Likes khoye nahi; bas ek replica abhi pakad nahi paaya." },
      ],
    },
    {
      id: "d4-post-3",
      scenario: "Refund ko wallet mein ₹500 wapas daalne hain AUR ledger entry likhni hai. Team kehti hai NoSQL lo \"kyunki woh scale karta hai\".",
      prompt: "Kya bologe?",
      choices: [
        { text: "Relational database mein rakho, dono writes ek transaction mein", why: "Paison ko dono writes chahiye ya koi nahi, aur ledger jise joins se audit kar sako. Wallet ka per second volume SQL chhodne layak scale se bahut neeche hai.", best: true },
        { text: "Maan lo: scale sabse zyada zaroori hai", why: "Bina ledger entry ke paise daal dena (ya ulta) asli nuksaan hai, slow page nahi." },
        { text: "Dono use karo: SQL mein likho, phir NoSQL mein copy", why: "Do systems sync mein rakhne padenge, aur is access pattern ke liye copy kuch nahi jodti." },
      ],
    },
    {
      id: "d4-post-4",
      scenario: "Tumne likes SQL se scale-out NoSQL store pe shift kar diye.",
      prompt: "Kya trade off kiya?",
      choices: [
        { text: "Joins aur strict transactions: \"is user ke dosto ke likes\" ab poochna mushkil", why: "Write scale mila, flexible queries gayi. Jo sawaal chahiye unka plan pehle, ya analytics ke liye alag copy.", best: true },
        { text: "Speed: NoSQL SQL se slow hai", why: "Apne designed access pattern pe aksar bahut tez. Keemat flexibility hai, speed nahi." },
        { text: "Kuch nahi: NoSQL matlab SQL plus scale", why: "Har store kuch chhodta hai. Yahan joins, ad-hoc queries aur strict transactions." },
      ],
    },
    {
      id: "d4-post-5",
      scenario: "Shopping cart: users baar baar items daalte aur hatate hain, kabhi cart kho jaaye toh pareshani hai par aafat nahi, aur hamesha user ID se padha jaata hai.",
      prompt: "Sabse achha fit kya hai?",
      choices: [
        { text: "User ID se keyed key-value store", why: "Ek key, ek tez read, scale karna aasaan. Trade-off: order place hote hi use relational orders database mein transaction ke andar likho.", best: true },
        { text: "Relational orders database, har cart change pe transaction", why: "Safe, par us data ke liye bhaari jo hamesha badalta hai aur dobara ban sakta hai." },
        { text: "Search index", why: "Shabdon se records dhoondhne ke liye bana hai, ek user ka cart laane ke liye nahi." },
      ],
    },
  ],

  estimates: [
    {
      id: "d4-est-1",
      given: ["Roz 10 crore likes", "Har like row lagbhag 100 bytes"],
      prompt: "Roz kitna naya like data, GB mein?",
      unit: "GB/day",
      answer: 10,
      tolerance: 0.3,
      working: ["10 crore = 100 million likes", "100 million × 100 bytes = 10,000 million bytes", "≈ 10 GB roz, saal mein lagbhag 3.6 TB: bada, par scale out ki wajah write rate hai"],
    },
    {
      id: "d4-est-2",
      given: ["Roz 10 crore likes", "Shaam ka peak average ka 5 guna"],
      prompt: "Peak pe likes per second?",
      unit: "likes/sec",
      answer: 5800,
      tolerance: 0.3,
      working: ["10 crore ÷ 86,400 ≈ average 1,160 likes per second", "Peak pe × 5 ≈ 5,800 per second", "Har second hazaaron chhoti writes: writes phailane wale store ka kaam"],
    },
    {
      id: "d4-est-3",
      given: ["Roz 50 lakh wallet transfers", "Har transfer 3 rows likhta hai: debit, credit, ledger entry"],
      prompt: "Average kitni rows per second?",
      unit: "rows/sec",
      answer: 174,
      tolerance: 0.3,
      working: ["50 lakh × 3 = 1.5 crore rows roz", "1.5 crore ÷ 86,400 ≈ 174 rows per second", "Ek achhe SQL primary ke liye aaraam se: paison ko scale ke liye NoSQL nahi chahiye"],
    },
  ],

  build: {
    title: "Ek app ke har hisse ke liye store chuno",
    intro: "Har database ko us data pe drag karo jo use rakhna chahiye. Ya box tap karo, phir slot tap karo.",
    given: "Ek super-app",
    rows: [["wallet", "orders"], ["likes", "chat"], ["sessions", "search"]],
    slots: {
      wallet: { role: "Wallet balances aur transfers", answer: "sql" },
      orders: { role: "Orders aur stock (hisaab milna chahiye)", answer: "sql2" },
      likes: { role: "Crores likes aur view counts", answer: "kv" },
      chat: { role: "Billions messages, latest pehle padhe jaate", answer: "wide" },
      sessions: { role: "Logged-in sessions, har request pe padhe jaate", answer: "cache" },
      search: { role: "Product naam ke kisi bhi shabd se search", answer: "searchidx" },
    },
    chips: [
      { id: "wide", label: "Wide-column store", does: "partition key se grouped, sorted rows, kai machines pe" },
      { id: "sql", label: "SQL + transactions", does: "tables, joins aur sab-ya-kuch-nahi changes" },
      { id: "json", label: "Ek JSON file", does: "is design ka box nahi: na concurrency, na transactions, na scale" },
      { id: "cache", label: "In-memory key-value", does: "key se bahut tez lookup, memory mein" },
      { id: "kv", label: "Scale-out key-value", does: "bahut saari chhoti writes, machines pe phaili" },
      { id: "searchidx", label: "Search index", does: "records ko unke kisi bhi shabd se dhoondhta hai" },
      { id: "sql2", label: "SQL (orders DB)", does: "relational database jahan stock aur orders sahi rehne chahiye" },
    ],
    done: "Ek app, kai databases, har ek is se chuna ki data kaise padha jaata hai aur kitna galat ho sakta hai. Ise polyglot persistence kehte hain.",
  },

  design: {
    title: "Photo app ka database design karo",
    brief: "Crores users wale photo-sharing app ke users, posts, likes, follows aur comments. Har ek ke liye store chuno, aur batao har ek kaise padha jaata hai.",
    constraints: [
      "Crores users; roz lakhon naye posts",
      "Popular post ko ek ghante mein lakhon likes",
      "Feed: jinhe follow karte ho unke latest posts",
      "Account aur follow data kabhi gadbad na ho",
    ],
    minChars: 120,
    walkthrough: [
      { heading: "Pehle access patterns", points: ["User ID se profile; user ke posts, naye pehle; har post ka like count; kaun kise follow karta hai; har post ke comments, purane pehle.", "Koi store chunne se pehle queries likh lo."] },
      { heading: "Users, posts, follows: relational", points: ["Accounts aur follow graph ko correctness aur kuch joins chahiye: relational database, baad mein user ID se sharded.", "Photos khud object storage mein (Day 3); database sirf unki location rakhta hai."] },
      { heading: "Likes: scale-out, counters ke saath", points: ["Likes post se keyed scale-out store mein. Har view pe rows ginne ki jagah chalta hua like count rakho.", "Thode purane counts chalte hain (eventual consistency)."] },
      { heading: "Feed aur comments", points: ["Feed: har user ki pehle se bani list, wide-column store mein, user aur time se partitioned.", "Comments: post se partitioned, time se sorted, taaki ek read mein ek page mile."] },
      { heading: "Trade-offs jo bolke batao", points: ["Kai databases matlab chalane aur sync rakhne ko zyada.", "Counters thoda khisak sakte hain; background mein milao.", "Celebrity ka post hot key hai: uska counter baanto ya cache karo (Day 6)."] },
    ],
    checklist: [
      "Maine stores chunne se pehle har data ke padhne ka tareeka likha",
      "Maine accounts aur follows relational database mein rakhe",
      "Maine likes counter ke saath scale-out store mein rakhe",
      "Maine feeds ya comments padhne ke tareeke se partition kiye",
      "Maine photos database se bahar rakhi",
      "Maine kam se kam ek trade-off bataya",
    ],
  },

  followUps: [
    {
      q: "\"Ab finance ko roz ki report chahiye: shehar ke hisaab se wallet top-ups. Wallet DB din bhar busy hai. Kya karoge?\"",
      answer: [
        "Payments serve karne wale primary pe bhaari reports mat chalao.",
        "Read replica pe chalao, ya raat mein data analytics store mein copy karo.",
        "Ledger hi single source of truth; reports copies se padhein.",
      ],
      say: "\"Reports replica ya analytics copy pe; payment primary sirf payments karta hai.\"",
      deeper: "Day 5",
    },
    {
      q: "\"Ab ek celebrity post ko ek ghante mein 10 lakh likes. Ek partition pighal raha hai. Kya badlega?\"",
      answer: [
        "Yeh hot key hai: us post ka har like ek hi partition pe girta hai.",
        "Counter ko kai shards mein baanto (post ID + 0…N) aur padhte waqt jodo.",
        "Dikhne wala count kuch second cache karo; yahan exact hona zaroori nahi.",
      ],
      say: "\"Garam counter ko shard karo, read pe jodo, aur dikhne wala count cache karo.\"",
      deeper: "Day 6",
    },
    {
      q: "\"Ab product chahta hai har post pe 'jinhe tum follow karte ho unke likes'. Likes store mein joins nahi. Kya bologe?\"",
      answer: [
        "Yeh query access patterns mein thi hi nahi, aur store iske liye bana nahi.",
        "Pehle se banao: like hote hi follower wale view mein bhi likho, ya background job mein banao.",
        "Ya sirf wahan dikhao jahan zaroori ho, chhote cache ke saath. Naye sawaal matlab naye data shapes.",
      ],
      say: "\"Woh view write ke waqt ya background mein pehle se banao, kyunki likes store ginne ke liye bana hai, joins ke liye nahi.\"",
      deeper: "Days 8 aur 15",
    },
    {
      q: "\"Ab wallet do regions mein ek saath chalna chahiye. Kya dono regions ko writes lene do?\"",
      answer: [
        "Ek hi balance pe dono regions writes lein toh dono ek kharcha approve kar sakte hain: double spend.",
        "Har account ka ek primary (user ki writes uske home region pe), doosra region standby.",
        "Kuch users ke liye thodi extra latency, badle mein balance hamesha sahi.",
      ],
      say: "\"Har account ka ek home region writes ke liye, doosre mein standby: paison ke liye pehle correctness.\"",
      deeper: "Day 17",
    },
  ],

  interview: [
    "Poocho data kaise padha aur likha jaata hai: queries, volume, aur kitna galat ho sakta hai.",
    "Paise, orders, bookings: transactions wala relational database.",
    "Bahut badi, loss-tolerant writes (likes, messages, feeds): scale-out store, padhne ke tareeke se partitioned.",
    "Trade-off bolo: write scale ke liye joins aur strict transactions chhodte ho.",
    "Ek app kai databases use kar sakta hai; yeh normal hai.",
  ],

  cheatsheet: {
    title: "Day 4 · SQL vs NoSQL",
    points: [
      "Paise: SQL + transactions",
      "Bahut badi, loss-tolerant writes: scale-out store",
      "Shuru karo is se ki data kaise padhoge",
      "Partition key = padhne ka tareeka",
      "Likes ke liye eventual consistency theek, balance ke liye kabhi nahi",
      "Ek app kai databases use kar sakta hai",
    ],
  },

  linkedin:
    "Day 4/21: System Design with Klymb.\n\nEk like kho jaaye toh kisi ko pata nahi. Ek rupaya kho jaaye toh complaint. Isliye wallet aur like ek hi tarah ke database mein nahi rehne chahiye.\n\nMera takeaway: paise transactions wale relational database mein; bahut bada, loss-tolerant data writes scale karne wale store mein, padhne ke tareeke se partitioned. Jaise Discord trillions messages ko channel aur time se partition karta hai.\n\n#SystemDesign #Klymb",

  nextDay: "Myntra ki sale: lakhon log brand, size aur price se filter kar rahe. Reads tez kaise rahein?",
};

export const dayFour: Day = {
  day: 4,
  of: 21,
  app: "Wallet vs likes",
  minutes: 15,
  hook: { date: "₹500 vs one heart" },
  copy: { en, hi },
  sources: [
    { label: "Discord engineering blog: How Discord Stores Trillions of Messages (March 2023)", href: "https://discord.com/blog/how-discord-stores-trillions-of-messages" },
  ],
  video: {
    src: "/videos/system-design/day-4-wide.mp4", poster: "/videos/system-design/day-4-wide-poster.jpg", minutes: 3, lang: "Hinglish",
    wide: { src: "/videos/system-design/day-4-wide.mp4", poster: "/videos/system-design/day-4-wide-poster.jpg" },
  },
  prevHref: "/system-design/day-3",
};
