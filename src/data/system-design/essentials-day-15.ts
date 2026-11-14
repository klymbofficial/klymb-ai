/**
 * Day 15 of "System Design Essentials": design a video streaming system.
 * Built from the Day 15 video script. The recorded-video platform is a fictional
 * teaching example, and 360p, 720p and 1080p are illustrative options.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Day 15 · Video streaming",
  hookLines: [
    "You’re watching a video and the internet slows down.",
    "It goes a little blurry, and it keeps playing.",
    "Had the app already downloaded the whole video?",
  ],
  question: "How does one upload become playback that survives a weak network?",

  pre: [
    {
      id: "pre-1",
      scenario: "A viewer is on fast Wi-Fi and another is on a weak mobile network.",
      prompt: "Should both get the creator’s original file?",
      choices: [
        { text: "No: their needs differ, so create playback versions from the original", why: "Right. That background work is transcoding.", best: true },
        { text: "Yes: the original is always best", why: "A weak network may not cope with it." },
        { text: "Yes, and the weak network just waits", why: "There’s a better option than a long wait." },
      ],
    },
    {
      id: "pre-2",
      scenario: "A creator’s upload just finished.",
      prompt: "Is the video ready to play?",
      choices: [
        { text: "Not automatically: mark it ready once the required outputs are successfully ready", why: "Yes. Show a processing status until then.", best: true },
        { text: "Yes: upload complete means ready", why: "The playback versions may not exist yet." },
        { text: "Yes, if the upload was fast", why: "Upload speed doesn’t produce the outputs." },
      ],
    },
    {
      id: "pre-3",
      scenario: "You put a CDN in front of a private video.",
      prompt: "Are permission checks now solved?",
      choices: [
        { text: "No: a CDN doesn’t automatically solve playback access", why: "Right. It can help with speed and origin load, but access must still be enforced.", best: true },
        { text: "Yes: a CDN checks everything", why: "Adding it doesn’t solve that on its own." },
        { text: "Yes: private videos are never cached", why: "That doesn’t enforce who can watch." },
      ],
    },
  ],

  revealTitle: "Two lanes: upload and playback",
  revealSub: "a fictional recorded-video platform, simplified",
  reveal: [
    { when: "Scope and upload", what: "Creators upload recorded videos and viewers play them at a suitable quality. Live and recommendations are out of scope. The app authenticates the creator. The file can go to object storage, a place for large files, with the video ID, owner and processing status in the database." },
    { when: "Transcoding", what: "Transcoding creates separately encoded playback versions from the original, called renditions. 360p, 720p and 1080p are illustrative options. A queue gives a worker the job, so the upload request doesn’t wait. Mark the video ready only once the required outputs are ready." },
    { when: "Segments and manifest", what: "A common approach provides video in small parts, called segments, and the player fetches them as needed. A manifest or playlist is a guide to the available versions and where their parts are. The exact files vary by streaming format." },
    { when: "Buffer and adaptive bitrate", what: "The player keeps some video loaded ahead in a buffer. If it runs out and the next segment is late, playback can pause. With adaptive bitrate, the player can pick a lower bitrate when the network slows. That doesn’t guarantee buffering is eliminated." },
    { when: "CDN", what: "A CDN can serve frequently requested content from closer locations. On a hit it comes from there; on a miss the CDN fetches from the origin. A hit isn’t guaranteed on every request, and private video still needs its access enforced." },
    { when: "Failure, and live", what: "If a transcoding worker crashes, keep the processing status, retry the job, and on repeated failure show a clear failed status and a path to investigate. Handle duplicate jobs’ outputs safely. In live, new segments are produced continuously, with trade-offs between delay, stability and buffering." },
  ],

  explain: {
    title: "The words from today",
    items: [
      { term: "Object storage", what: "A place to keep large files.", example: "The uploaded video file" },
      { term: "Transcoding and renditions", what: "Creating separately encoded versions from the original. Those versions are renditions.", example: "Illustrative 360p, 720p and 1080p" },
      { term: "Segment", what: "A small part of a video that the player fetches as needed.", example: "The player doesn’t need the whole file at once" },
      { term: "Manifest", what: "A guide telling the player the available versions and where their parts are.", example: "Read the guide, then request segments" },
      { term: "Buffer", what: "A temporary waiting area of video loaded ahead of the current position.", example: "Covers small network fluctuations" },
      { term: "Adaptive bitrate", what: "The player picking a suitable version based on network and playback conditions.", example: "Slow network, lower bitrate" },
    ],
  },

  concept: {
    cards: [{
      name: "Upload lane",
      examples: ["Object storage for the file", "A queue and transcoding workers"],
      moves: ["Keep details in the database", "Don’t make the upload wait for processing", "Mark ready only when outputs are"],
    }, {
      name: "Playback lane",
      examples: ["Manifest and segments", "Buffer, adaptive bitrate and a CDN"],
      moves: ["Check permission first", "Choose quality from the conditions", "Serve popular content from close by"],
    }],
    rule: "More renditions add quality flexibility, and they add encoding and storage cost.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Why does a queue sit between the upload and transcoding?",
      choices: [
        { text: "So the upload request doesn’t have to wait for all the processing", why: "Right. The worker takes the job in the background.", best: true },
        { text: "So the video plays before it’s processed", why: "Processing must finish before ready." },
        { text: "So no storage is needed", why: "The file still needs storing." },
      ],
    },
    {
      id: "post-2",
      prompt: "How does a player know which versions and segments exist?",
      choices: [
        { text: "It reads a manifest or playlist, then requests suitable segments", why: "Yes. The exact structure varies by streaming format.", best: true },
        { text: "It downloads every version first", why: "It doesn’t need to. That’s the point of segments." },
        { text: "The CDN guesses for it", why: "The manifest is the guide." },
      ],
    },
    {
      id: "post-3",
      scenario: "The network slows, and the player switches to a lower bitrate.",
      prompt: "What’s true?",
      choices: [
        { text: "It tries to keep playback going, with no guarantee that buffering is eliminated", why: "Right. It depends on the player’s logic and the available versions.", best: true },
        { text: "Buffering can now never happen", why: "If the buffer runs out, playback can still pause." },
        { text: "The server has re-encoded the video on the spot", why: "The player selects among versions that are available." },
      ],
    },
    {
      id: "post-4",
      scenario: "The segment a viewer requested isn’t cached on the CDN.",
      prompt: "What happens?",
      choices: [
        { text: "The CDN can fetch it from the origin", why: "Yes. A hit isn’t guaranteed on every request.", best: true },
        { text: "The viewer gets an error", why: "A miss goes to the origin." },
        { text: "The video is deleted from the origin", why: "A miss changes nothing there." },
      ],
    },
    {
      id: "post-5",
      scenario: "A transcoding worker crashes partway through a job.",
      prompt: "What’s the better handling?",
      choices: [
        { text: "Track the processing status, retry the job, and show failed after repeated failures", why: "Right. Marking it ready unchecked gives the viewer an error at play.", best: true },
        { text: "Mark it ready anyway, since the upload succeeded", why: "The viewer would press play and see an error." },
        { text: "Retry forever without telling anyone", why: "Repeated failure needs a clear status and a path to investigate." },
      ],
    },
  ],

  build: {
    title: "Build both lanes",
    intro: "Drag each piece to the job it does. You can also tap one, then tap a slot.",
    given: "A creator uploads and a viewer plays",
    rows: [["storage", "worker", "status"], ["manifest", "abr", "cdn"]],
    rowLabels: ["Upload lane", "Playback lane"],
    slots: {
      storage: { role: "Keep the large video file", answer: "storage" },
      worker: { role: "Create playback versions in the background", answer: "worker" },
      status: { role: "Say whether the video can be played yet", answer: "status" },
      manifest: { role: "Tell the player which versions and parts exist", answer: "manifest" },
      abr: { role: "Pick a suitable version for the network", answer: "abr" },
      cdn: { role: "Serve popular segments from closer locations", answer: "cdn" },
    },
    chips: [
      { id: "cdn", label: "CDN", does: "serving frequently requested content from closer locations" },
      { id: "original", label: "Send everyone the original file", does: "ignoring that viewers’ networks differ" },
      { id: "worker", label: "Transcoding worker", does: "creating renditions from the original" },
      { id: "manifest", label: "Manifest", does: "a guide to the available versions and their parts" },
      { id: "storage", label: "Object storage", does: "a place for large files" },
      { id: "abr", label: "Adaptive bitrate", does: "the player choosing a version from the conditions" },
      { id: "status", label: "Processing status", does: "tracking whether the required outputs are ready" },
    ],
    done: "Object storage, a transcoding worker and a status for upload; a manifest, adaptive bitrate and a CDN for playback.",
  },

  canvas: {
    title: "Draw it from scratch: upload and playback",
    brief: "Draw both lanes. The client talks to the app server, which records details in the database and queues a job. A worker takes the job and works on files in object storage. For playback, the client fetches segments from a CDN, which gets missing ones from storage.",
    parts: ["client", "server", "database", "queue", "worker", "objects", "cdn", "cache"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.08, y: 0.5 }, { id: "s", part: "server", x: 0.34, y: 0.2 },
        { id: "d", part: "database", x: 0.62, y: 0.08 }, { id: "q", part: "queue", x: 0.62, y: 0.36 },
        { id: "w", part: "worker", x: 0.9, y: 0.36 }, { id: "o", part: "objects", x: 0.9, y: 0.8 },
        { id: "n", part: "cdn", x: 0.46, y: 0.8 },
      ],
      edges: [["c", "s"], ["s", "d"], ["s", "q"], ["w", "q"], ["w", "o"], ["c", "n"], ["n", "o"]],
    },
    why: {
      "client>server": "The app authenticates the creator for upload, and gives the viewer permission and playback information.",
      "server>database": "The video ID, owner and processing status live in the database.",
      "server>queue": "A transcoding job goes in the queue, so the upload request doesn’t wait for the processing.",
      "worker>queue": "A worker takes the transcoding job from the queue.",
      "worker>objects": "The worker reads the original from object storage and writes the renditions there.",
      "client>cdn": "The player fetches the manifest and segments from a nearby CDN.",
      "cdn>objects": "On a miss, the CDN fetches the segment from the origin storage.",
    },
    done: "Two lanes: upload through the app, queue and worker, and playback through the CDN with storage as the origin. Remember the CDN doesn’t solve private access for you.",
  },

  followUps: [
    {
      q: "“Design a video streaming platform.”",
      answer: [
        "Draw two lanes: upload and playback.",
        "Keep video in object storage and use background workers to create playback renditions.",
        "Deliver a manifest and segments, with a CDN for popular content, and let the player choose a suitable quality.",
      ],
      say: "“Object storage, background workers for renditions, manifest and segments through a CDN, and a player that chooses the quality.”",
    },
    {
      q: "“What’s the trade-off with more renditions?”",
      answer: [
        "More renditions can give more quality flexibility.",
        "They also raise encoding and storage cost.",
        "So choose the versions the viewers need.",
      ],
      say: "“More renditions mean more flexibility, and more encoding and storage cost.”",
    },
    {
      q: "“What about live streaming?”",
      answer: [
        "In recorded video, the whole source can be available first.",
        "In live, new segments are continuously made and delivered during capture and encoding.",
        "That brings a trade-off between viewer delay, stability and buffering.",
      ],
      say: "“Live produces segments as it goes, so I’d be trading off delay against stability and buffering.”",
    },
  ],

  faq: [
    { q: "Must every video have 360p, 720p and 1080p?", a: "No. They’re illustrative options, not a requirement for every video." },
    { q: "Does adaptive bitrate end buffering?", a: "No. It tries to keep playback going, but it’s not a guarantee. It depends on the player’s logic and the available versions." },
    { q: "Must the upload go through the app server?", a: "No. The app can give a controlled link directly to storage. The exact path depends on the implementation." },
    { q: "Is this platform a real design?", a: "No. The product and its numbers are fictional examples." },
  ],

  interview: [
    "Draw two lanes: upload and playback.",
    "Keep the video in object storage, and details in a database.",
    "Create renditions with background workers; track the status.",
    "Deliver a manifest and segments, with a CDN for popular content.",
    "Let the player choose quality, and state the cost of more renditions.",
  ],

  cheatsheet: {
    title: "Day 15 · Video streaming",
    points: [
      "Upload and playback are two separate journeys",
      "Object storage for files; a database for details",
      "Upload complete doesn’t mean ready to play",
      "A manifest guides the player to its segments",
      "A buffer absorbs small fluctuations",
      "Adaptive bitrate helps but doesn’t eliminate buffering",
      "A CDN helps speed, but not private access by itself",
    ],
  },

  linkedin:
    "Day 15/21 of System Design Essentials with Klymb.\n\nWhy does a video go blurry instead of stopping when your internet slows? Renditions, segments, a manifest, a buffer, and a player that picks a suitable version.\n\nAnd two honest caveats: upload complete doesn’t mean ready, and a CDN doesn’t solve private access for you.\n\n#SystemDesign #Klymb",

  nextDay: "Day 16: revision. You design a whole system from scratch, on your own, before seeing one possible approach.",
};

const hi: DayCopy = {
  tag: "Day 15 · Video streaming",
  hookLines: [
    "Aap video dekh rahe ho aur internet slow ho jaata hai.",
    "Video thodi blurry hoti hai, aur chalti rehti hai.",
    "Kya app ne poori video pehle hi download kar li thi?",
  ],
  question: "Ek upload aisi playback kaise banta hai jo weak network mein bhi chalti rahe?",

  pre: [
    {
      id: "pre-1",
      scenario: "Ek viewer fast Wi-Fi par hai aur doosra weak mobile network par.",
      prompt: "Kya dono ko creator ki original file milni chahiye?",
      choices: [
        { text: "Nahi: unki needs alag hain, toh original se playback versions banao", why: "Sahi. Yeh background kaam transcoding hai.", best: true },
        { text: "Haan: original hamesha best hai", why: "Weak network use sambhal nahi paayega." },
        { text: "Haan, aur weak network bas wait kare", why: "Lambe wait se behtar option hai." },
      ],
    },
    {
      id: "pre-2",
      scenario: "Creator ka upload abhi complete hua.",
      prompt: "Kya video play ke liye ready hai?",
      choices: [
        { text: "Automatically nahi: required outputs successfully ready hon tab ready mark karo", why: "Haan. Tab tak processing status dikhao.", best: true },
        { text: "Haan: upload complete matlab ready", why: "Playback versions abhi bane nahi honge." },
        { text: "Haan, agar upload fast tha", why: "Upload speed se outputs nahi bante." },
      ],
    },
    {
      id: "pre-3",
      scenario: "Private video ke aage aapne CDN laga diya.",
      prompt: "Kya permission checks ab solve ho gaye?",
      choices: [
        { text: "Nahi: CDN laga dene se playback access automatically solve nahi hota", why: "Sahi. Woh speed aur origin load mein madad karta hai, par access phir bhi enforce karna hai.", best: true },
        { text: "Haan: CDN sab check karta hai", why: "Sirf lagane se yeh solve nahi hota." },
        { text: "Haan: private videos kabhi cache nahi hoti", why: "Isse enforce nahi hota ki kaun dekh sakta hai." },
      ],
    },
  ],

  revealTitle: "Do lanes: upload aur playback",
  revealSub: "ek fictional recorded-video platform, simplified",
  reveal: [
    { when: "Scope aur upload", what: "Creators recorded videos upload karte hain aur viewers suitable quality mein play karte hain. Live aur recommendations scope ke bahar. App creator ko authenticate karti hai. File object storage mein ja sakti hai, jo bade files ki jagah hai, aur video ID, owner aur processing status database mein." },
    { when: "Transcoding", what: "Transcoding original se alag encoded playback versions banata hai, jinhe renditions kehte hain. 360p, 720p aur 1080p illustrative options hain. Queue worker ko job deti hai, taaki upload request wait na kare. Video ready tabhi mark karo jab required outputs ready hon." },
    { when: "Segments aur manifest", what: "Common approach video ko chhote parts, yaani segments, mein deti hai, aur player zaroorat ke hisaab se fetch karta hai. Manifest ya playlist guide hai jo available versions aur unke parts ka address batati hai. Exact files streaming format par depend karti hain." },
    { when: "Buffer aur adaptive bitrate", what: "Player kuch video pehle se buffer mein rakhta hai. Buffer khatam ho aur next segment late ho toh playback ruk sakti hai. Adaptive bitrate mein network slow hone par player lower bitrate chun sakta hai. Yeh buffering khatam karne ki guarantee nahi." },
    { when: "CDN", what: "CDN frequently requested content ko closer locations se serve kar sakta hai. Hit par wahan se milta hai; miss par CDN origin se fetch karta hai. Har request par hit guarantee nahi, aur private video ka access phir bhi enforce karna hai." },
    { when: "Failure, aur live", what: "Transcoding worker crash ho toh processing status rakho, job retry karo, aur repeated failure par clear failed status aur investigation ka path rakho. Duplicate jobs ke outputs safely handle karo. Live mein naye segments continuously bante hain, aur delay, stability aur buffering ke beech trade-off aata hai." },
  ],

  explain: {
    title: "Aaj ke words",
    items: [
      { term: "Object storage", what: "Bade files rakhne ki jagah.", example: "Upload ki hui video file" },
      { term: "Transcoding aur renditions", what: "Original se alag encoded versions banana. Woh versions renditions hain.", example: "Illustrative 360p, 720p aur 1080p" },
      { term: "Segment", what: "Video ka chhota part jo player zaroorat ke hisaab se fetch karta hai.", example: "Player ko poori file ek saath nahi chahiye" },
      { term: "Manifest", what: "Guide jo player ko available versions aur unke parts ka address batati hai.", example: "Guide padho, phir segments maango" },
      { term: "Buffer", what: "Current position se aage load ki hui video ka temporary waiting area.", example: "Chhoti network fluctuation sambhalta hai" },
      { term: "Adaptive bitrate", what: "Player ka network aur playback conditions dekhkar suitable version chunna.", example: "Slow network, lower bitrate" },
    ],
  },

  concept: {
    cards: [{
      name: "Upload lane",
      examples: ["File ke liye object storage", "Queue aur transcoding workers"],
      moves: ["Details database mein rakho", "Upload ko processing ka wait mat karwao", "Outputs ready hon tabhi ready mark karo"],
    }, {
      name: "Playback lane",
      examples: ["Manifest aur segments", "Buffer, adaptive bitrate aur CDN"],
      moves: ["Pehle permission check karo", "Conditions se quality chuno", "Popular content paas se serve karo"],
    }],
    rule: "Zyada renditions quality flexibility badhati hain, aur encoding aur storage cost bhi.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Upload aur transcoding ke beech queue kyun hai?",
      choices: [
        { text: "Taaki upload request ko saari processing ka wait na karna pade", why: "Sahi. Worker job background mein leta hai.", best: true },
        { text: "Taaki video process hone se pehle play ho", why: "Ready se pehle processing poori honi chahiye." },
        { text: "Taaki storage ki zaroorat na ho", why: "File ko phir bhi rakhna hai." },
      ],
    },
    {
      id: "post-2",
      prompt: "Player ko kaise pata chalta hai kaunse versions aur segments hain?",
      choices: [
        { text: "Woh manifest ya playlist padhta hai, phir suitable segments maangta hai", why: "Haan. Exact structure streaming format par depend karta hai.", best: true },
        { text: "Pehle har version download karta hai", why: "Zaroorat nahi. Segments ka yahi point hai." },
        { text: "CDN uske liye guess karta hai", why: "Guide manifest hai." },
      ],
    },
    {
      id: "post-3",
      scenario: "Network slow hua, aur player lower bitrate par switch karta hai.",
      prompt: "Kya sach hai?",
      choices: [
        { text: "Woh playback chalane ki koshish karta hai, buffering khatam hone ki guarantee nahi", why: "Sahi. Yeh player ki logic aur available versions par depend karta hai.", best: true },
        { text: "Ab buffering kabhi nahi ho sakti", why: "Buffer khatam ho toh playback ruk sakti hai." },
        { text: "Server ne wahin video re-encode kar di", why: "Player available versions mein se chunta hai." },
      ],
    },
    {
      id: "post-4",
      scenario: "Viewer ka maanga segment CDN par cached nahi hai.",
      prompt: "Kya hota hai?",
      choices: [
        { text: "CDN use origin se fetch kar sakta hai", why: "Haan. Har request par hit guarantee nahi.", best: true },
        { text: "Viewer ko error milta hai", why: "Miss origin par jaata hai." },
        { text: "Video origin se delete ho jaati hai", why: "Miss wahan kuch nahi badalta." },
      ],
    },
    {
      id: "post-5",
      scenario: "Transcoding worker job ke beech crash ho jaata hai.",
      prompt: "Better handling kya hai?",
      choices: [
        { text: "Processing status track karo, job retry karo, aur repeated failures par failed dikhao", why: "Sahi. Bina check ready mark karne se viewer ko play par error milega.", best: true },
        { text: "Phir bhi ready mark karo, upload toh hua", why: "Viewer play dabayega aur error dekhega." },
        { text: "Bina bataye hamesha retry karo", why: "Repeated failure ko clear status aur investigation path chahiye." },
      ],
    },
  ],

  build: {
    title: "Dono lanes banao",
    intro: "Har piece ko uske kaam par drag karo. Ya ek tap karo, phir slot tap karo.",
    given: "Creator upload karta hai aur viewer play karta hai",
    rows: [["storage", "worker", "status"], ["manifest", "abr", "cdn"]],
    rowLabels: ["Upload lane", "Playback lane"],
    slots: {
      storage: { role: "Badi video file rakho", answer: "storage" },
      worker: { role: "Background mein playback versions banao", answer: "worker" },
      status: { role: "Batao video abhi play ho sakti hai ya nahi", answer: "status" },
      manifest: { role: "Player ko batao kaunse versions aur parts hain", answer: "manifest" },
      abr: { role: "Network ke liye suitable version chuno", answer: "abr" },
      cdn: { role: "Popular segments closer locations se do", answer: "cdn" },
    },
    chips: [
      { id: "cdn", label: "CDN", does: "frequently requested content closer locations se serve karna" },
      { id: "original", label: "Sabko original file bhejo", does: "yeh ignore karna ki viewers ke network alag hain" },
      { id: "worker", label: "Transcoding worker", does: "original se renditions banana" },
      { id: "manifest", label: "Manifest", does: "available versions aur unke parts ki guide" },
      { id: "storage", label: "Object storage", does: "bade files ki jagah" },
      { id: "abr", label: "Adaptive bitrate", does: "player ka conditions se version chunna" },
      { id: "status", label: "Processing status", does: "track karna ki required outputs ready hain ya nahi" },
    ],
    done: "Upload ke liye object storage, transcoding worker aur status; playback ke liye manifest, adaptive bitrate aur CDN.",
  },

  canvas: {
    title: "Scratch se draw karo: upload aur playback",
    brief: "Dono lanes draw karo. Client app server se baat karta hai, jo details database mein record karta hai aur job queue karta hai. Worker job lekar object storage ki files par kaam karta hai. Playback mein client CDN se segments leta hai, jo missing segments storage se laata hai.",
    parts: ["client", "server", "database", "queue", "worker", "objects", "cdn", "cache"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.08, y: 0.5 }, { id: "s", part: "server", x: 0.34, y: 0.2 },
        { id: "d", part: "database", x: 0.62, y: 0.08 }, { id: "q", part: "queue", x: 0.62, y: 0.36 },
        { id: "w", part: "worker", x: 0.9, y: 0.36 }, { id: "o", part: "objects", x: 0.9, y: 0.8 },
        { id: "n", part: "cdn", x: 0.46, y: 0.8 },
      ],
      edges: [["c", "s"], ["s", "d"], ["s", "q"], ["w", "q"], ["w", "o"], ["c", "n"], ["n", "o"]],
    },
    why: {
      "client>server": "App upload ke liye creator ko authenticate karti hai, aur viewer ko permission aur playback information deti hai.",
      "server>database": "Video ID, owner aur processing status database mein rehte hain.",
      "server>queue": "Transcoding job queue mein jaati hai, taaki upload request processing ka wait na kare.",
      "worker>queue": "Worker queue se transcoding job leta hai.",
      "worker>objects": "Worker object storage se original padhta hai aur renditions wahin likhta hai.",
      "client>cdn": "Player manifest aur segments nearby CDN se leta hai.",
      "cdn>objects": "Miss par CDN segment origin storage se laata hai.",
    },
    done: "Do lanes: upload app, queue aur worker se, aur playback CDN se, storage origin ke roop mein. Yaad rakho CDN private access solve nahi karta.",
  },

  followUps: [
    {
      q: "“Design a video streaming platform.”",
      answer: [
        "Do lanes draw karo: upload aur playback.",
        "Video object storage mein rakho aur background workers se playback renditions banao.",
        "Manifest aur segments deliver karo, popular content ke liye CDN, aur player suitable quality chune.",
      ],
      say: "“Object storage, renditions ke liye background workers, CDN se manifest aur segments, aur quality chunne wala player.”",
    },
    {
      q: "“Zyada renditions ka trade-off kya hai?”",
      answer: [
        "Zyada renditions quality flexibility badha sakti hain.",
        "Encoding aur storage cost bhi badhti hai.",
        "Isliye woh versions chuno jo viewers ko chahiye.",
      ],
      say: "“Zyada renditions matlab zyada flexibility, aur zyada encoding aur storage cost.”",
    },
    {
      q: "“Live streaming ka kya?”",
      answer: [
        "Recorded video mein poora source pehle available ho sakta hai.",
        "Live mein capture aur encode hote hue naye segments continuously bante aur deliver hote hain.",
        "Isse viewer delay, stability aur buffering ke beech trade-off aata hai.",
      ],
      say: "“Live chalte chalte segments banata hai, toh delay ko stability aur buffering ke against tolna padega.”",
    },
  ],

  faq: [
    { q: "Kya har video ke 360p, 720p aur 1080p zaroori hain?", a: "Nahi. Yeh illustrative options hain, har video ke liye zaroori nahi." },
    { q: "Kya adaptive bitrate buffering khatam kar deta hai?", a: "Nahi. Woh playback chalane ki koshish karta hai, par guarantee nahi. Yeh player ki logic aur available versions par depend karta hai." },
    { q: "Kya upload app server se hi jana chahiye?", a: "Nahi. App direct storage ka controlled link de sakti hai. Exact path implementation par depend karta hai." },
    { q: "Kya yeh platform real design hai?", a: "Nahi. Product aur numbers fictional examples hain." },
  ],

  interview: [
    "Do lanes draw karo: upload aur playback.",
    "Video object storage mein, details database mein.",
    "Background workers se renditions; status track karo.",
    "Manifest aur segments deliver karo, popular content ke liye CDN.",
    "Player quality chune, aur zyada renditions ki cost batao.",
  ],

  cheatsheet: {
    title: "Day 15 · Video streaming",
    points: [
      "Upload aur playback do alag journeys hain",
      "Files ke liye object storage; details ke liye database",
      "Upload complete ka matlab ready nahi",
      "Manifest player ko segments tak le jaata hai",
      "Buffer chhoti fluctuations sambhalta hai",
      "Adaptive bitrate madad karta hai par buffering khatam nahi",
      "CDN speed mein madad karta hai, private access mein akele nahi",
    ],
  },

  linkedin:
    "Day 15/21: System Design Essentials with Klymb.\n\nInternet slow hone par video rukti kyun nahi, bas blurry kyun hoti hai? Renditions, segments, manifest, buffer, aur suitable version chunne wala player.\n\nAur do honest baatein: upload complete ka matlab ready nahi, aur CDN private access solve nahi karta.\n\n#SystemDesign #Klymb",

  nextDay: "Day 16: revision. Aap ek poora system scratch se khud design karoge, ek possible approach dekhne se pehle.",
};

export const essentialsDayFifteen: Day = {
  day: 15,
  of: 21,
  app: "A video platform",
  minutes: 18,
  hook: { date: "Fictional example" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/essentials-day-15.mp4", poster: "/videos/system-design/essentials-day-15-poster.jpg", minutes: 6, lang: "Hinglish",
    // One horizontal cut with the captions burned in: it plays in the wide frame, and with no caption lines there's no subtitle switch.
    wide: { src: "/api/video/essentials-day-15.mp4", poster: "/videos/system-design/essentials-day-15-poster.jpg" },
  },
};
