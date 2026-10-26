/**
 * Day 3 of "System Design in 21 Days": Hotstar's IPL final -> video upload, storage and CDN.
 * Hotstar facts come only from the source in `sources` (Hotstar's IPL 2019 press release).
 * The upload, transcoding and delivery pipeline is the general industry pattern and is
 * never presented as Hotstar's internals.
 */
import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  hookLines: [
    "IPL 2019 final. Mumbai vs Chennai, down to the last ball.",
    "On Hotstar: 1.86 crore people watching at the same moment.",
    "91% of them on a phone, from Kashmir to Kanyakumari.",
  ],
  question: "How does one live match reach 1.86 crore phones without buffering?",

  pre: [
    {
      id: "d3-pre-1",
      scenario: "Your video servers are in Mumbai. During the final, a viewer in Guwahati buffers every few seconds.",
      prompt: "Best first fix?",
      choices: [
        {
          text: "Serve the video from CDN servers in a city near the viewer",
          why: "The problem is distance, and one place serving everyone. A nearby edge cuts the trip, and the origin sends each piece once per edge instead of once per viewer. Trade-off: you pay the CDN, and new pieces take a moment to reach every edge.",
          best: true,
        },
        { text: "Give the Mumbai servers more bandwidth", why: "More capacity helps, but every byte still travels about 2,500 km, and every viewer still pulls from one place." },
        { text: "Lower the video quality for everyone", why: "Fixes buffering for some and ruins it for viewers on good Wi-Fi. Better: let each player pick the quality its network can handle." },
      ],
    },
    {
      id: "d3-pre-2",
      scenario: "A creator uploads a 2 GB match analysis on mobile data. The connection drops at 90%.",
      prompt: "What should the app do?",
      choices: [
        {
          text: "Resume from the last piece that arrived",
          why: "Upload in small chunks (say 10 MB) and the server remembers which ones landed. Only the missing 10% goes again. Trade-off: a little bookkeeping on both sides.",
          best: true,
        },
        { text: "Start the upload again from zero", why: "1.8 GB thrown away, and on patchy data it may never finish." },
        { text: "Ask the creator to switch to Wi-Fi and try again", why: "Pushes the problem onto the user, and many creators only have mobile data." },
      ],
    },
    {
      id: "d3-pre-3",
      prompt: "Where should uploaded video files live?",
      choices: [
        {
          text: "In object storage (like S3), with only the video's details in the database",
          why: "Object storage is cheap, huge and built for big files. The database keeps the title, the owner and where the file is. Trade-off: two systems to keep in step.",
          best: true,
        },
        { text: "In the database, as one big binary column", why: "It works for small files, but videos bloat backups, slow the database and cost far more per GB." },
        { text: "On the disk of the server that received the upload", why: "Gone if that server dies, and the other servers can't see it." },
      ],
    },
  ],

  revealTitle: "IPL 2019 final, and how video is usually delivered",
  revealSub: "Hotstar's public numbers, then the standard pattern",
  sourceNote: "Hotstar figures: Hotstar's IPL 2019 press release (StreamingMedia, May 2019). The last two rows are the general industry pattern, not a claim about Hotstar's internals.",
  reveal: [
    { when: "IPL 2019 final", what: "Hotstar reported a peak of 18.6 million people watching at once, and about 11.1 million on average." },
    { when: "A year earlier", what: "The 2018 final had peaked at 10.3 million: more than 80% growth in one year." },
    { when: "On which device", what: "About 91% of viewers of the final watched on a phone." },
    { when: "Delivery", what: "Hotstar streamed the final over Akamai's CDN, which serves video from edge servers close to viewers." },
    { when: "The usual design: watching", what: "Video cut into short segments in several qualities. The player picks what its network can handle. Segments are cached at CDN edges, with a middle cache shielding the origin." },
    { when: "The usual design: uploading", what: "Resumable uploads in chunks into object storage. A job queue converts each video into many qualities in the background." },
  ],

  explain: {
    title: "Video at scale, explained",
    items: [
      { term: "Object storage", what: "Cheap, huge storage for files. The database keeps only where each file is.", example: "S3, Google Cloud Storage" },
      { term: "Chunked upload", what: "A big file goes up in small pieces; a dropped connection resumes from the last piece.", example: "10 MB chunks" },
      { term: "Transcoding", what: "Turning one upload into many qualities and formats, as background jobs.", example: "1080p, 720p, 480p, 240p" },
      { term: "Adaptive bitrate", what: "Video in 2–6 second segments; the player switches quality as the network changes.", example: "HLS or DASH" },
      { term: "CDN edge", what: "Servers in many cities that keep copies of popular files near viewers.", example: "Guwahati served from Kolkata" },
      { term: "Cache hit ratio", what: "The share of requests the edge answers by itself. Every miss goes back to the origin.", example: "99% hit = 1 in 100 reaches the origin" },
    ],
  },

  concept: {
    cards: [
      {
        name: "Getting video in",
        examples: ["Chunked upload", "Object storage", "Transcoding queue"],
        moves: ["Upload in chunks; resume, don't restart", "Files in object storage, details in the database", "Convert once into many qualities, in the background"],
      },
      {
        name: "Getting video out",
        examples: ["Segments", "Adaptive bitrate", "CDN edges"],
        moves: ["Short segments, several qualities", "The player picks quality for its network", "Serve from the edge; protect the origin"],
      },
    ],
    rule: "Store once, convert once, cache everywhere: the origin should see each segment once per edge, not once per viewer.",
  },

  post: [
    {
      id: "d3-post-1",
      scenario: "The score card updates every ball. 1 crore phones ask for it every 5 seconds.",
      prompt: "How do you stop your servers melting?",
      choices: [
        { text: "Cache the score at the CDN edge for 2–3 seconds", why: "Each edge asks your servers once every few seconds instead of every phone asking. Trade-off: the score can be 2 seconds old, which is fine for a scoreboard.", best: true },
        { text: "Add more servers behind the score API", why: "You'd need hundreds just to answer the same tiny file again and again." },
        { text: "Make phones ask every 30 seconds instead", why: "Cuts the load, but a wicket shows up 30 seconds late. A short edge cache gets you both." },
      ],
    },
    {
      id: "d3-post-2",
      scenario: "A popular segment's cache copy expires at every edge at the same moment. Lakhs of requests miss together and rush to the origin.",
      prompt: "What is this, and the fix?",
      choices: [
        { text: "A cache stampede. Let one request fetch from the origin while the rest wait for it", why: "Request coalescing, or a middle \"shield\" cache, turns lakhs of misses into one fetch. Trade-off: the waiting requests pause for a moment.", best: true },
        { text: "A DDoS attack. Block the IP addresses", why: "These are your real viewers. Blocking them blocks your audience." },
        { text: "Normal traffic. Add origin servers", why: "The misses arrive as a one-second spike; you'd be paying all year for a single second." },
      ],
    },
    {
      id: "d3-post-3",
      scenario: "You convert every upload into 6 qualities.",
      prompt: "What does that cost, and why do it?",
      choices: [
        { text: "About 6× the storage and conversion work per video; worth it so every network gets a smooth stream", why: "Storage is cheap next to viewers leaving over buffering. Some apps convert rarely used qualities only when someone asks.", best: true },
        { text: "Nothing much: conversion is basically free", why: "It's one of the biggest computing costs of any video platform." },
        { text: "It makes the creator wait longer to upload", why: "It runs in the background after the upload; the creator isn't waiting for it." },
      ],
    },
    {
      id: "d3-post-4",
      scenario: "Mid-match, a viewer's phone drops from Wi-Fi to weak 4G.",
      prompt: "What should happen?",
      choices: [
        { text: "From the next segment on, the player fetches a lower quality", why: "That's adaptive bitrate: every segment is a fresh choice. Trade-off: the picture gets softer for a while instead of freezing.", best: true },
        { text: "The server notices and starts sending a smaller file", why: "With HLS or DASH the player decides. The server just offers every quality." },
        { text: "The stream pauses and reconnects", why: "That's exactly what short segments are designed to avoid." },
      ],
    },
    {
      id: "d3-post-5",
      scenario: "Profile photos are served straight from object storage in Mumbai. Pages load slowly for users in the US.",
      prompt: "Simplest fix?",
      choices: [
        { text: "Put a CDN in front of object storage, so photos are cached near each user", why: "Same idea as video: serve from the edge. Trade-off: when someone changes their photo, the old one can show until the cache expires or is cleared.", best: true },
        { text: "Copy the whole storage to a US data centre", why: "It works, but you run and pay for two full copies. A CDN caches just what's popular, automatically." },
        { text: "Store the photos in the database instead", why: "That moves the bytes, not the distance, and big files slow the database down." },
      ],
    },
  ],

  estimates: [
    {
      id: "d3-est-1",
      given: ["1.86 crore viewers at once", "An average stream of about 1 Mbps (megabits per second)"],
      prompt: "Total bandwidth, in Tbps (terabits per second)?",
      unit: "Tbps",
      answer: 18.6,
      tolerance: 0.3,
      working: ["1.86 crore = 18.6 million viewers", "18.6 million × 1 Mbps = 18.6 million Mbps", "= 18.6 Tbps. No single data centre serves that: it has to come from CDN edges across the country."],
    },
    {
      id: "d3-est-2",
      given: ["1 crore phones ask for the score", "Every 5 seconds"],
      prompt: "Requests per second to the score API?",
      unit: "requests/sec",
      answer: 2000000,
      tolerance: 0.2,
      working: ["1 crore ÷ 5 = 20 lakh requests a second", "Without an edge cache, every one of them reaches your servers", "With a 2-second edge cache, each edge asks once every 2 seconds"],
    },
    {
      id: "d3-est-3",
      given: ["A 2 GB upload", "Sent in 10 MB chunks", "The connection drops at 90%"],
      prompt: "How many chunks still need to go after resuming?",
      unit: "chunks",
      answer: 20,
      tolerance: 0.15,
      working: ["2 GB ≈ 2,000 MB ÷ 10 = 200 chunks", "90% done = 180 chunks already there", "Resume sends just 20 chunks, about 200 MB, instead of all 2 GB again"],
    },
  ],

  build: {
    title: "Build the life of a video",
    intro: "Drag each box to the job it does. You can also tap a box, then tap a slot.",
    given: "Creator's phone",
    rows: [["upload"], ["storage", "db"], ["queue", "transcode"], ["shield", "cdn"]],
    slots: {
      upload: { role: "Sends the file in small, resumable pieces", answer: "upload" },
      storage: { role: "Keeps the original and every quality", answer: "storage" },
      db: { role: "Keeps the title, owner and where the files are", answer: "db" },
      queue: { role: "Lines up videos waiting to be converted", answer: "queue" },
      transcode: { role: "Turns one upload into 1080p…240p segments", answer: "transcode" },
      shield: { role: "Shields the origin: one fetch per segment", answer: "shield" },
      cdn: { role: "Serves segments from a city near the viewer", answer: "cdn" },
    },
    chips: [
      { id: "cdn", label: "CDN edges", does: "servers in many cities that serve segments near the viewer" },
      { id: "fourk", label: "One 4K file for all", does: "not a box here: too heavy for 4G, so every weak connection buffers" },
      { id: "queue", label: "Job queue", does: "lines up conversion work so nothing is lost and workers take it at their pace" },
      { id: "upload", label: "Chunked upload", does: "sends a big file in small pieces that can resume" },
      { id: "db", label: "Database", does: "keeps the video's details, not the video itself" },
      { id: "shield", label: "Middle cache", does: "sits between the edges and the origin so a popular segment is fetched once" },
      { id: "storage", label: "Object storage", does: "cheap, huge storage for the video files" },
      { id: "transcode", label: "Transcoders", does: "workers that convert one upload into many qualities" },
    ],
    done: "That's the life of a video: in through chunks, converted on a queue, out through the edge.",
  },

  design: {
    title: "Design YouTube-style uploads and playback",
    brief: "Creators upload videos of up to 2 GB from their phones. Lakhs of viewers watch on everything from Wi-Fi to weak 4G. Design upload, storage, processing and playback.",
    constraints: [
      "Uploads must survive dropped connections",
      "A new video should be watchable within a few minutes",
      "Smooth playback on 4G and Wi-Fi",
      "1 crore views a day, mostly of popular videos",
    ],
    minChars: 120,
    walkthrough: [
      { heading: "Requirements and numbers", points: ["Core: upload, process, watch. Comments and likes can wait.", "1 crore views a day ≈ 115 a second on average, peaks several times higher. Most views hit a small set of popular videos, which is what makes caching work."] },
      { heading: "Upload", points: ["The app opens an upload session, then sends 10 MB chunks straight to object storage, resuming from the last good chunk.", "When the last chunk lands, save the video's details in the database and put a job on a queue."] },
      { heading: "Processing", points: ["Workers take jobs off the queue and convert the video into several qualities, cut into short segments with a playlist.", "Mark it ready when the first qualities finish; add the rest after."] },
      { heading: "Playback", points: ["The player fetches the playlist, then segments from the nearest CDN edge, switching quality as the network changes.", "A middle cache shields object storage, and coalescing stops a popular video's misses from stampeding."] },
      { heading: "Trade-offs to say out loud", points: ["Many qualities cost storage and compute; convert rare ones on demand.", "A longer edge cache means fewer origin hits but slower takedowns: keep a way to purge.", "Ready in minutes means low qualities first, the full set later."] },
    ],
    checklist: [
      "I uploaded in resumable chunks",
      "I put files in object storage and details in the database",
      "I converted videos on a queue, in the background",
      "I served segments from a CDN with adaptive bitrate",
      "I protected the origin from a cache stampede",
      "I named at least one trade-off",
    ],
  },

  followUps: [
    {
      q: "\"Now the score API gets 1 crore requests every 5 seconds. What do you change?\"",
      answer: [
        "That's 20 lakh requests a second, all asking for the same tiny file.",
        "Cache it at the edge for 2–3 seconds: your servers see one request per edge every few seconds.",
        "If seconds really matter later, push updates over a live connection; the edge cache is the cheap first win.",
      ],
      say: "\"A short cache at the edge for data everyone shares; push only if a few seconds of delay really matter.\"",
      deeper: "Days 10 and 11",
    },
    {
      q: "\"Now your CDN provider has an outage in the middle of the final. What happens?\"",
      answer: [
        "Viewers served by that CDN start buffering.",
        "Big streamers use more than one CDN and shift traffic between them by health and cost.",
        "The player can also retry a segment from a backup CDN address.",
      ],
      say: "\"Several CDNs with health-based switching, and players that fall back to a second one.\"",
      deeper: "Day 18",
    },
    {
      q: "\"Now a creator deletes a viral video, but the edges keep serving it. Why, and what do you do?\"",
      answer: [
        "Each edge serves its cached copy until it expires.",
        "Purge it across the CDN, and use signed links that expire, so old links stop working.",
        "Trade-off: long cache times protect the origin but slow down removals.",
      ],
      say: "\"Purge across the CDN, signed expiring links, and cache times chosen with takedowns in mind.\"",
      deeper: "Day 7",
    },
    {
      q: "\"Now the match starts and 50 lakh people press play in the same minute. What protects you?\"",
      answer: [
        "The start time is known (Day 1): warm the edges with the first segments and scale up before it.",
        "Coalesce at the middle cache so each segment is fetched once per region.",
        "Start everyone at a lower quality and step up as the rush settles.",
      ],
      say: "\"Warm and scale before a known start, coalesce misses, and start low quality then step up.\"",
      deeper: "Day 1",
    },
  ],

  interview: [
    "Clarify: upload sizes, views a day, live or on demand, which devices.",
    "Upload in resumable chunks straight to object storage; details in the database.",
    "Convert on a job queue into several qualities, as short segments.",
    "Play with adaptive bitrate; serve segments from CDN edges, with a middle cache shielding the origin.",
    "Watch the cache hit ratio, and coalesce misses so a popular segment is fetched once.",
  ],

  cheatsheet: {
    title: "Day 3 · Video, storage & CDN",
    points: [
      "Files go to object storage, not the database",
      "Upload in chunks; resume, don't restart",
      "Convert once into many qualities, in the background",
      "Short segments + adaptive bitrate = no freezing",
      "Serve from the edge; hit ratio is the metric",
      "Coalesce misses so a popular segment is fetched once",
    ],
  },

  linkedin:
    "Day 3/21 of System Design with Klymb.\n\nThe 2019 IPL final peaked at 18.6 million people watching at once on Hotstar, 91% of them on a phone. No single server can do that.\n\nWhat I learned: files live in object storage, uploads go in resumable chunks, every video is converted into several qualities, and short segments are served from CDN edges near the viewer, with the player picking the quality its network can handle.\n\n#SystemDesign #Klymb",

  nextDay: "Paytm wallet vs Instagram likes: why money and hearts need different databases.",
};

const hi: DayCopy = {
  hookLines: [
    "IPL 2019 final. Mumbai vs Chennai, aakhri ball tak.",
    "Hotstar pe: 1.86 crore log ek hi pal mein dekh rahe.",
    "Unmein se 91% phone pe, Kashmir se Kanyakumari tak.",
  ],
  question: "Ek live match 1.86 crore phones tak bina buffering ke kaise pahunchta hai?",

  pre: [
    {
      id: "d3-pre-1",
      scenario: "Tumhare video servers Mumbai mein hain. Final ke dauraan Guwahati ka viewer har kuch second buffer karta hai.",
      prompt: "Sabse pehla fix?",
      choices: [
        {
          text: "Viewer ke paas wale shehar ke CDN servers se video do",
          why: "Problem doori hai, aur ek jagah se sabko serve karna. Paas ka edge safar chhota karta hai, aur origin har piece ek baar per edge bhejta hai, har viewer ko nahi. Trade-off: CDN ka paisa, aur naye pieces ko har edge tak pahunchne mein thoda time.",
          best: true,
        },
        { text: "Mumbai servers ki bandwidth badhao", why: "Capacity badhti hai, par har byte phir bhi lagbhag 2,500 km chalta hai, aur har viewer ek hi jagah se kheenchta hai." },
        { text: "Sabke liye video quality kam karo", why: "Kuch logon ki buffering theek, par achhe Wi-Fi walon ka mazaa kharab. Behtar: har player apne network ke hisaab se quality chune." },
      ],
    },
    {
      id: "d3-pre-2",
      scenario: "Ek creator mobile data pe 2 GB ka match analysis upload kar raha hai. 90% pe connection toota.",
      prompt: "App ko kya karna chahiye?",
      choices: [
        {
          text: "Jo aakhri piece pahuncha, wahan se resume",
          why: "Chhote chunks (jaise 10 MB) mein upload, server yaad rakhta hai kaunse pahunche. Sirf bacha 10% dobara jaata hai. Trade-off: dono taraf thoda hisaab-kitaab.",
          best: true,
        },
        { text: "Upload zero se dobara shuru", why: "1.8 GB barbaad, aur kamzor data pe shayad kabhi poora hi na ho." },
        { text: "Creator ko bolo Wi-Fi pe jaake dobara try karo", why: "Problem user pe daal di, aur bahut creators ke paas sirf mobile data hai." },
      ],
    },
    {
      id: "d3-pre-3",
      prompt: "Upload hui video files kahan rehni chahiye?",
      choices: [
        {
          text: "Object storage (jaise S3) mein, database mein sirf video ki details",
          why: "Object storage sasta, bahut bada, aur badi files ke liye bana hai. Database title, owner aur file kahan hai rakhta hai. Trade-off: do systems ko sync mein rakhna.",
          best: true,
        },
        { text: "Database mein, ek bade binary column mein", why: "Chhoti files ke liye chalta hai, par videos backups phula dete hain, database slow karte hain aur per GB kaafi mehenga." },
        { text: "Jis server pe upload aaya, uski disk pe", why: "Woh server gira toh file gayi, aur baaki servers use dekh hi nahi sakte." },
      ],
    },
  ],

  revealTitle: "IPL 2019 final, aur video aksar kaise deliver hota hai",
  revealSub: "Hotstar ke public numbers, phir standard pattern",
  sourceNote: "Hotstar figures: Hotstar ki IPL 2019 press release (StreamingMedia, May 2019). Aakhri do rows general industry pattern hain, Hotstar ke andar ka claim nahi.",
  reveal: [
    { when: "IPL 2019 final", what: "Hotstar ne bataya ki peak pe 18.6 million log ek saath dekh rahe the, aur average lagbhag 11.1 million." },
    { when: "Ek saal pehle", what: "2018 final ka peak 10.3 million tha: ek saal mein 80% se zyada badhat." },
    { when: "Kis device pe", what: "Final ke lagbhag 91% viewers phone pe dekh rahe the." },
    { when: "Delivery", what: "Hotstar ne final Akamai ke CDN se stream kiya, jo viewers ke paas wale edge servers se video deta hai." },
    { when: "Aam design: dekhna", what: "Video chhote segments mein, kai qualities mein. Player apne network ke hisaab se chunta hai. Segments CDN edges pe cache, beech ka cache origin ko bachata hai." },
    { when: "Aam design: upload", what: "Chunks mein resumable upload, object storage mein. Job queue har video ko background mein kai qualities mein badalti hai." },
  ],

  explain: {
    title: "Video at scale, aasaan bhasha mein",
    items: [
      { term: "Object storage", what: "Files ke liye sasta, bahut bada storage. Database sirf yeh rakhta hai ki file kahan hai.", example: "S3, Google Cloud Storage" },
      { term: "Chunked upload", what: "Badi file chhote pieces mein jaati hai; connection toote toh aakhri piece se resume.", example: "10 MB chunks" },
      { term: "Transcoding", what: "Ek upload ko kai qualities aur formats mein badalna, background jobs mein.", example: "1080p, 720p, 480p, 240p" },
      { term: "Adaptive bitrate", what: "Video 2–6 second ke segments mein; network badle toh player quality badalta hai.", example: "HLS ya DASH" },
      { term: "CDN edge", what: "Kai shehron ke servers jo popular files ki copies viewers ke paas rakhte hain.", example: "Guwahati ko Kolkata se" },
      { term: "Cache hit ratio", what: "Kitni requests edge khud answer karta hai. Har miss origin tak jaata hai.", example: "99% hit = 100 mein se 1 origin tak" },
    ],
  },

  concept: {
    cards: [
      {
        name: "Video andar lana",
        examples: ["Chunked upload", "Object storage", "Transcoding queue"],
        moves: ["Chunks mein upload; resume, restart nahi", "Files object storage mein, details database mein", "Ek baar kai qualities mein convert, background mein"],
      },
      {
        name: "Video bahar bhejna",
        examples: ["Segments", "Adaptive bitrate", "CDN edges"],
        moves: ["Chhote segments, kai qualities", "Player apne network ke hisaab se quality chune", "Edge se serve; origin ko bachao"],
      },
    ],
    rule: "Ek baar store, ek baar convert, har jagah cache: origin ko har segment ek baar per edge dikhe, har viewer ke liye nahi.",
  },

  post: [
    {
      id: "d3-post-1",
      scenario: "Score card har ball pe update hota hai. 1 crore phones har 5 second mein use maangte hain.",
      prompt: "Servers ko pighalne se kaise bachaoge?",
      choices: [
        { text: "Score ko CDN edge pe 2–3 second ke liye cache karo", why: "Har phone ki jagah har edge kuch second mein ek baar poochta hai. Trade-off: score 2 second purana ho sakta hai, scoreboard ke liye theek.", best: true },
        { text: "Score API ke peeche aur servers", why: "Ek hi chhoti file baar baar dene ke liye sainkdon servers lagenge." },
        { text: "Phones ko har 30 second mein poochne do", why: "Load kam, par wicket 30 second late dikhega. Chhota edge cache dono deta hai." },
      ],
    },
    {
      id: "d3-post-2",
      scenario: "Ek popular segment ki cache copy har edge pe ek hi pal mein expire hui. Lakhon requests ek saath miss karke origin ki taraf bhaagti hain.",
      prompt: "Yeh kya hai, aur fix?",
      choices: [
        { text: "Cache stampede. Ek request origin se laaye, baaki uska wait karein", why: "Request coalescing, ya beech ka \"shield\" cache, lakhon misses ko ek fetch bana deta hai. Trade-off: wait karne wali requests thoda rukti hain.", best: true },
        { text: "DDoS attack. IP addresses block karo", why: "Yeh tumhare asli viewers hain. Block kiya toh audience hi block." },
        { text: "Normal traffic. Origin servers badhao", why: "Misses ek second ka spike hain; ek second ke liye saal bhar paisa bharoge." },
      ],
    },
    {
      id: "d3-post-3",
      scenario: "Tum har upload ko 6 qualities mein convert karte ho.",
      prompt: "Iski keemat kya hai, aur kyun karte ho?",
      choices: [
        { text: "Har video pe lagbhag 6 guna storage aur kaam; worth it taaki har network pe smooth stream mile", why: "Buffering se bhaagte viewers ke saamne storage sasta hai. Kuch apps rare qualities tabhi banate hain jab koi maange.", best: true },
        { text: "Kuch khaas nahi: conversion lagbhag free hai", why: "Kisi bhi video platform ka yeh sabse bade computing kharchon mein se ek hai." },
        { text: "Creator ko upload ke liye zyada wait karna padta hai", why: "Yeh upload ke baad background mein chalta hai; creator iska wait nahi karta." },
      ],
    },
    {
      id: "d3-post-4",
      scenario: "Match ke beech viewer ka phone Wi-Fi se kamzor 4G pe aa gaya.",
      prompt: "Kya hona chahiye?",
      choices: [
        { text: "Agle segment se player kam quality laata hai", why: "Yahi adaptive bitrate hai: har segment ek naya choice. Trade-off: thodi der picture halki, par freeze nahi.", best: true },
        { text: "Server samajh ke chhoti file bhejne lagta hai", why: "HLS ya DASH mein player decide karta hai. Server bas har quality offer karta hai." },
        { text: "Stream ruk ke dobara connect hota hai", why: "Chhote segments isi se bachane ke liye bane hain." },
      ],
    },
    {
      id: "d3-post-5",
      scenario: "Profile photos seedha Mumbai ke object storage se aati hain. US ke users ke liye pages slow load hote hain.",
      prompt: "Sabse simple fix?",
      choices: [
        { text: "Object storage ke aage CDN lagao, taaki photos har user ke paas cache hon", why: "Video wala hi idea: edge se serve karo. Trade-off: koi photo badle toh cache expire ya clear hone tak purani dikh sakti hai.", best: true },
        { text: "Poora storage US ke data centre mein copy karo", why: "Chalta hai, par do poori copies chalani aur bharni padti hain. CDN sirf popular cheezein apne aap cache karta hai." },
        { text: "Photos database mein rakho", why: "Isse bytes shift hote hain, doori nahi, aur badi files database ko slow karti hain." },
      ],
    },
  ],

  estimates: [
    {
      id: "d3-est-1",
      given: ["1.86 crore viewers ek saath", "Average stream lagbhag 1 Mbps (megabits per second)"],
      prompt: "Kul bandwidth, Tbps (terabits per second) mein?",
      unit: "Tbps",
      answer: 18.6,
      tolerance: 0.3,
      working: ["1.86 crore = 18.6 million viewers", "18.6 million × 1 Mbps = 18.6 million Mbps", "= 18.6 Tbps. Koi ek data centre itna nahi de sakta: yeh desh bhar ke CDN edges se aana chahiye."],
    },
    {
      id: "d3-est-2",
      given: ["1 crore phones score maangte hain", "Har 5 second mein"],
      prompt: "Score API pe requests per second?",
      unit: "requests/sec",
      answer: 2000000,
      tolerance: 0.2,
      working: ["1 crore ÷ 5 = 20 lakh requests per second", "Edge cache ke bina, har ek tumhare servers tak", "2 second ke edge cache se, har edge 2 second mein ek baar poochta hai"],
    },
    {
      id: "d3-est-3",
      given: ["2 GB ka upload", "10 MB ke chunks mein", "90% pe connection toota"],
      prompt: "Resume ke baad kitne chunks bache?",
      unit: "chunks",
      answer: 20,
      tolerance: 0.15,
      working: ["2 GB ≈ 2,000 MB ÷ 10 = 200 chunks", "90% done = 180 chunks pahunch chuke", "Resume sirf 20 chunks bhejta hai, lagbhag 200 MB, poore 2 GB nahi"],
    },
  ],

  build: {
    title: "Ek video ki zindagi banao",
    intro: "Har box ko uske kaam wali jagah pe drag karo. Ya box tap karo, phir slot tap karo.",
    given: "Creator ka phone",
    rows: [["upload"], ["storage", "db"], ["queue", "transcode"], ["shield", "cdn"]],
    slots: {
      upload: { role: "File ko chhote, resumable pieces mein bhejta hai", answer: "upload" },
      storage: { role: "Original aur har quality rakhta hai", answer: "storage" },
      db: { role: "Title, owner aur files kahan hain, rakhta hai", answer: "db" },
      queue: { role: "Convert hone ka wait karti videos ki line", answer: "queue" },
      transcode: { role: "Ek upload ko 1080p…240p segments mein badalta hai", answer: "transcode" },
      shield: { role: "Origin ko bachata hai: har segment ek fetch", answer: "shield" },
      cdn: { role: "Viewer ke paas ke shehar se segments deta hai", answer: "cdn" },
    },
    chips: [
      { id: "cdn", label: "CDN edges", does: "kai shehron ke servers jo viewer ke paas segments dete hain" },
      { id: "fourk", label: "Sabke liye ek 4K file", does: "is design ka box nahi: 4G ke liye bahut bhaari, har kamzor connection buffer karega" },
      { id: "queue", label: "Job queue", does: "conversion ka kaam line mein, kuch nahi khota, workers apni speed se uthate hain" },
      { id: "upload", label: "Chunked upload", does: "badi file chhote pieces mein jo resume ho sakein" },
      { id: "db", label: "Database", does: "video ki details rakhta hai, video nahi" },
      { id: "shield", label: "Beech ka cache", does: "edges aur origin ke beech, taaki popular segment ek baar fetch ho" },
      { id: "storage", label: "Object storage", does: "video files ke liye sasta, bahut bada storage" },
      { id: "transcode", label: "Transcoders", does: "workers jo ek upload ko kai qualities mein badalte hain" },
    ],
    done: "Yeh hai ek video ki zindagi: chunks se andar, queue pe convert, edge se bahar.",
  },

  design: {
    title: "YouTube jaise uploads aur playback design karo",
    brief: "Creators phone se 2 GB tak ki videos upload karte hain. Lakhon viewers Wi-Fi se kamzor 4G tak sab pe dekhte hain. Upload, storage, processing aur playback design karo.",
    constraints: [
      "Connection toote toh bhi upload bache",
      "Nayi video kuch minutes mein dekhne layak ho",
      "4G aur Wi-Fi dono pe smooth playback",
      "Roz 1 crore views, zyada tar popular videos ke",
    ],
    minChars: 120,
    walkthrough: [
      { heading: "Requirements aur numbers", points: ["Core: upload, process, dekhna. Comments aur likes ruk sakte hain.", "Roz 1 crore views ≈ average 115 per second, peak kai guna. Zyada tar views kuch popular videos pe, isi se caching kaam karti hai."] },
      { heading: "Upload", points: ["App upload session kholta hai, phir 10 MB chunks seedha object storage mein, aakhri achhe chunk se resume.", "Aakhri chunk pahunche toh video ki details database mein, aur queue pe ek job."] },
      { heading: "Processing", points: ["Workers queue se jobs uthake video ko kai qualities mein convert karte hain, chhote segments aur playlist ke saath.", "Pehli qualities ban jaayein toh ready mark karo; baaki baad mein."] },
      { heading: "Playback", points: ["Player playlist laata hai, phir paas ke CDN edge se segments, network ke hisaab se quality badalte hue.", "Beech ka cache object storage ko bachata hai, aur coalescing popular video ke misses ko stampede nahi banne deti."] },
      { heading: "Trade-offs jo bolke batao", points: ["Kai qualities ka storage aur compute kharcha; rare wali demand pe banao.", "Lamba edge cache matlab origin pe kam hits, par takedown slow: purge ka raasta rakho.", "Minutes mein ready matlab pehle kam qualities, poora set baad mein."] },
    ],
    checklist: [
      "Maine resumable chunks mein upload kiya",
      "Maine files object storage mein, details database mein rakhi",
      "Maine videos queue pe, background mein convert ki",
      "Maine segments CDN se adaptive bitrate ke saath diye",
      "Maine origin ko cache stampede se bachaya",
      "Maine kam se kam ek trade-off bataya",
    ],
  },

  followUps: [
    {
      q: "\"Ab score API pe har 5 second mein 1 crore requests. Kya badloge?\"",
      answer: [
        "Yeh 20 lakh requests per second hai, sab ek hi chhoti file maang rahe.",
        "Edge pe 2–3 second ke liye cache: tumhare servers ko har edge se kuch second mein ek request.",
        "Agar baad mein seconds sach mein maayne rakhein, toh live connection pe push; edge cache sasta pehla jeet hai.",
      ],
      say: "\"Jo data sab share karte hain uska edge pe chhota cache; push tabhi jab kuch second ki deri sach mein maayne rakhe.\"",
      deeper: "Days 10 aur 11",
    },
    {
      q: "\"Ab final ke beech tumhare CDN provider ka outage. Kya hoga?\"",
      answer: [
        "Us CDN se serve hone wale viewers buffer karne lagenge.",
        "Bade streamers ek se zyada CDN use karte hain aur health aur kharche ke hisaab se traffic shift karte hain.",
        "Player bhi segment backup CDN address se dobara try kar sakta hai.",
      ],
      say: "\"Kai CDNs, health ke hisaab se switching, aur players jo doosre pe fall back karein.\"",
      deeper: "Day 18",
    },
    {
      q: "\"Ab creator ne viral video delete ki, par edges use dikhate rehte hain. Kyun, aur kya karoge?\"",
      answer: [
        "Har edge apni cached copy expire hone tak dikhata hai.",
        "Poore CDN pe purge karo, aur expire hone wale signed links use karo, taaki purane links band ho jaayein.",
        "Trade-off: lamba cache origin ko bachata hai par removal slow karta hai.",
      ],
      say: "\"Poore CDN pe purge, signed expiring links, aur takedown ko dhyan mein rakh ke cache time.\"",
      deeper: "Day 7",
    },
    {
      q: "\"Ab match shuru aur 50 lakh log ek hi minute mein play dabaate hain. Kya bachayega?\"",
      answer: [
        "Shuru hone ka time pata hai (Day 1): pehle segments se edges warm karo aur pehle scale up.",
        "Beech ke cache pe coalescing, taaki har segment har region mein ek baar fetch ho.",
        "Sabko kam quality se shuru karo, rush thame toh upar.",
      ],
      say: "\"Pata hue start se pehle warm aur scale, misses coalesce, aur kam quality se shuru karke upar.\"",
      deeper: "Day 1",
    },
  ],

  interview: [
    "Pehle poocho: upload size, roz kitne views, live ya on demand, kaunse devices.",
    "Resumable chunks mein seedha object storage; details database mein.",
    "Job queue pe kai qualities mein convert, chhote segments ke roop mein.",
    "Adaptive bitrate se play; segments CDN edges se, beech ka cache origin ko bachaye.",
    "Cache hit ratio dekho, aur misses coalesce karo taaki popular segment ek baar fetch ho.",
  ],

  cheatsheet: {
    title: "Day 3 · Video, storage & CDN",
    points: [
      "Files object storage mein, database mein nahi",
      "Chunks mein upload; resume, restart nahi",
      "Ek baar kai qualities mein convert, background mein",
      "Chhote segments + adaptive bitrate = freeze nahi",
      "Edge se serve karo; hit ratio hi metric hai",
      "Misses coalesce karo taaki popular segment ek baar fetch ho",
    ],
  },

  linkedin:
    "Day 3/21: System Design with Klymb.\n\nIPL 2019 final mein Hotstar pe peak pe 18.6 million log ek saath dekh rahe the, 91% phone pe. Koi ek server yeh nahi kar sakta.\n\nMera takeaway: files object storage mein, uploads resumable chunks mein, har video kai qualities mein convert, aur chhote segments viewer ke paas wale CDN edges se, jahan player apne network ke hisaab se quality chunta hai.\n\n#SystemDesign #Klymb",

  nextDay: "Paytm wallet vs Instagram likes: paise aur hearts ko alag databases kyun chahiye.",
};

export const dayThree: Day = {
  day: 3,
  of: 21,
  app: "Hotstar",
  minutes: 15,
  hook: { date: "12 May 2019 · 1.86 crore watching" },
  copy: { en, hi },
  sources: [
    { label: "Hotstar press release: 18.6 million concurrent viewers, IPL 2019 final (StreamingMedia)", href: "https://www.streamingmedia.com/PressRelease/With-18.6-Million-Simultaneous-Viewers-Streaming-VIVO-IPL-Hotstar-Shatters-Viewership-Record-Again_49306.aspx" },
  ],
  video: {
    src: "/api/video/day-3-wide.mp4", poster: "/videos/system-design/day-3-wide-poster.jpg", minutes: 3, lang: "Hinglish",
    wide: { src: "/api/video/day-3-wide.mp4", poster: "/videos/system-design/day-3-wide-poster.jpg" },
  },
  prevHref: "/system-design/day-2",
};
