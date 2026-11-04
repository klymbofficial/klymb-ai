/**
 * Day 11 of "System Design Essentials": design a notification system.
 * Built from the Day 11 video script. The shopping app is a fictional teaching
 * example, not any company's real design.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Day 11 · Notification system",
  hookLines: [
    "A user’s order is confirmed. Send them a message.",
    "Email, SMS or push: which channel?",
    "And what if the provider goes slow?",
  ],
  question: "How do you get a message to the right user, and honestly know how far it got?",

  pre: [
    {
      id: "pre-1",
      scenario: "Your system accepted a notification request.",
      prompt: "What does that tell you?",
      choices: [
        { text: "Only that it was accepted: it doesn’t mean the notification reached the user", why: "Right. Accepted, provider accepted and delivered are separate stages.", best: true },
        { text: "The user has definitely read it", why: "Accepted says nothing about the user’s device." },
        { text: "The provider has delivered it", why: "The provider may not even have seen it yet." },
      ],
    },
    {
      id: "pre-2",
      scenario: "A call to the provider times out.",
      prompt: "What do you know about the message?",
      choices: [
        { text: "Not much: the provider may have accepted it and the response never reached you", why: "Yes. A timeout doesn’t mean a rejection, which is where duplicates come from.", best: true },
        { text: "The provider definitely rejected it", why: "It may have accepted it. You just didn’t hear back." },
        { text: "The user definitely received it", why: "A timeout can’t tell you that." },
      ],
    },
    {
      id: "pre-3",
      scenario: "A send fails because the address is invalid.",
      prompt: "Should you keep retrying?",
      choices: [
        { text: "No: a permanent issue like this won’t improve with repeated retries", why: "Right. Limited retries with backoff are for temporary failures.", best: true },
        { text: "Yes: retry until it works", why: "An invalid address won’t fix itself." },
        { text: "Yes, and as quickly as possible", why: "That only adds load, and the address is still invalid." },
      ],
    },
  ],

  revealTitle: "From order to phone",
  revealSub: "a fictional shopping app, simplified",
  reveal: [
    { when: "Requirements", what: "Send a confirmed-order notification, respect the user’s channel preferences, track status, and retry temporary provider failures. Marketing and critical messages can have different rules, so state assumptions and confirm them." },
    { when: "The flow", what: "The order service sends a confirmed-order event to the notification service. That checks preferences and rules, then creates a channel-specific task. The task is safely recorded in durable storage or a queue, and a worker sends it to the right provider." },
    { when: "Honest statuses", what: "Keep separate statuses: accepted, provider accepted, and delivered when a reliable receipt is available. Without a receipt, the honest status may be unknown or provider accepted. It’s better than a vague ‘sent successfully’." },
    { when: "When a provider fails", what: "Set timeouts. Temporary failures get limited retries with backoff. Permanent ones, like an invalid address, don’t. Keep exhausted tasks in a separate failed-task list for the team to investigate." },
    { when: "Duplicates", what: "A task can be delivered again, so give each one a stable ID. A processing record and atomic rules reduce repeated work, and the provider’s idempotency key helps if it’s supported. If it isn’t and the result is unknown, removing the duplicate risk completely can be difficult." },
    { when: "Preferences and monitoring", what: "A preference can change while a task waits, so you can check the latest at dispatch under the applicable rules. Watch the oldest task’s wait, provider errors, and receipts where channels offer them, not just the total count." },
  ],

  explain: {
    title: "The words from today",
    items: [
      { term: "Durable", what: "Designed so an accepted task’s record survives a system restart. The specific guarantee depends on the storage and its configuration.", example: "A task kept in durable storage or a queue" },
      { term: "Provider accepted", what: "The provider took the request. That doesn’t guarantee it showed on the phone.", example: "A stage between accepted and delivered" },
      { term: "Delivery receipt", what: "A confirmation of delivery from a channel. Some offer one; in other cases the final status stays unknown.", example: "Mark delivered only with a reliable receipt" },
      { term: "Failed-task list", what: "A separate place for tasks that used up their retries, so the team can investigate them.", example: "Exhausted tasks, kept aside" },
      { term: "Queue age", what: "How long the oldest task has been waiting.", example: "Alert if it keeps growing" },
    ],
  },

  concept: {
    cards: [{
      name: "Get it there",
      examples: ["Event, then a channel-specific task", "A durable task, a worker and a provider"],
      moves: ["Check preferences and rules", "Record the task safely", "Use limited retries for temporary failures"],
    }, {
      name: "Say how far it got",
      examples: ["Accepted", "Provider accepted", "Delivered, with a receipt"],
      moves: ["Keep the stages separate", "Allow an unknown status", "Don’t say ‘sent successfully’ vaguely"],
    }],
    rule: "Before you say exactly once, you’d have to prove the guarantee end to end.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Which status is honest when a provider accepted a message and no receipt has come?",
      choices: [
        { text: "Provider accepted, or unknown", why: "Right. Delivered needs a reliable receipt.", best: true },
        { text: "Delivered", why: "You don’t have the evidence for that." },
        { text: "Failed", why: "Nothing says it failed." },
      ],
    },
    {
      id: "post-2",
      prompt: "Which pair of failures should be handled differently?",
      choices: [
        { text: "A temporary 503 gets limited retries with backoff; an invalid address doesn’t", why: "Yes. Repeating a permanent failure isn’t useful.", best: true },
        { text: "Neither: retry everything forever", why: "That wastes work and adds load." },
        { text: "Neither: never retry anything", why: "Temporary failures can be worth a limited retry." },
      ],
    },
    {
      id: "post-3",
      scenario: "A provider doesn’t support idempotency keys, and the result of an attempt is unknown.",
      prompt: "What’s true?",
      choices: [
        { text: "Completely removing the risk of a duplicate can be difficult", why: "Right. A stable ID and a processing record reduce repeats, but don’t prove exactly once.", best: true },
        { text: "Your database guarantees no duplicates", why: "It can’t see what the provider did." },
        { text: "Duplicates can’t happen with a queue", why: "A task can be delivered again." },
      ],
    },
    {
      id: "post-4",
      scenario: "While a task was queued, the user turned off email.",
      prompt: "What should you do?",
      choices: [
        { text: "Check the latest preference at dispatch, under the applicable rules, which can differ by message type", why: "Yes. Transactional and marketing rules may differ, so discuss it rather than assume.", best: true },
        { text: "Always send: the task was already created", why: "That ignores a change the user made." },
        { text: "Treat every kind of message the same way", why: "Avoid a one-size-fits-all assumption." },
      ],
    },
    {
      id: "post-5",
      scenario: "Tasks are being accepted, but the age of the oldest task keeps growing.",
      prompt: "What does it suggest?",
      choices: [
        { text: "The system may be silently delaying messages behind its accepted responses", why: "Right. So watch queue age, not just the total count.", best: true },
        { text: "Everything is healthy, because tasks are being accepted", why: "Accepted doesn’t mean sent." },
        { text: "Users have received their messages faster", why: "A growing wait means the opposite." },
      ],
    },
  ],

  build: {
    title: "Follow one notification",
    intro: "Drag each piece to the job it does. You can also tap one, then tap a slot.",
    given: "An order is confirmed",
    rows: [["service", "task", "worker"], ["status", "retry", "key"]],
    rowLabels: ["The path", "Staying honest and safe"],
    slots: {
      service: { role: "Check preferences and rules, and create the task", answer: "service" },
      task: { role: "Keep the task safe across a restart", answer: "task" },
      worker: { role: "Pick up the task and call the right provider", answer: "worker" },
      status: { role: "Say how far the message really got", answer: "status" },
      retry: { role: "Respond to a temporary provider failure", answer: "retry" },
      key: { role: "Reduce repeats when a task arrives again", answer: "key" },
    },
    chips: [
      { id: "key", label: "Stable task ID", does: "identifying a task, with a processing record and the provider’s key if supported" },
      { id: "sent", label: "One ‘sent successfully’ status", does: "hiding which stage the message actually reached" },
      { id: "worker", label: "Worker", does: "taking tasks and sending them to the provider" },
      { id: "service", label: "Notification service", does: "applying preferences and rules, then creating channel-specific tasks" },
      { id: "retry", label: "Limited retries with backoff", does: "trying temporary failures again, with growing waits" },
      { id: "task", label: "Durable task", does: "a record designed to survive a restart" },
      { id: "status", label: "Separate statuses", does: "accepted, provider accepted, and delivered with a receipt" },
    ],
    done: "A service, a durable task and a worker for the path, with separate statuses, limited retries and a stable ID to keep it honest and safe.",
  },

  design: {
    title: "An order notification system",
    brief: "An interviewer says: “Design an order notification system.” Write your answer: the requirements, the flow, the statuses, and how you’d handle failures and duplicates.",
    constraints: [
      "Respect the user’s channel preferences",
      "A provider can be slow or fail temporarily",
      "Be honest about how far a message got",
    ],
    minChars: 100,
    walkthrough: [
      { heading: "One possible answer", points: ["Clarify the channels and delivery requirements.", "Create a notification task durably from the confirmed order.", "Workers send to the provider.", "Keep accepted, provider accepted and delivered as separate statuses."] },
      { heading: "When things fail", points: ["Bounded retries for temporary failures.", "Consider idempotency for duplicates.", "Watch queue age, provider errors and delivery receipts where available."] },
    ],
    checklist: [
      "I clarified the channels and requirements",
      "I made the task durable and used workers",
      "I kept the statuses separate",
      "I used bounded retries for temporary failures",
      "I addressed duplicates without promising exactly once",
    ],
  },

  followUps: [
    {
      q: "“Design an order notification system.”",
      answer: [
        "Clarify the channels and delivery requirements first.",
        "From the confirmed order, create a notification task durably; workers send it to the provider.",
        "Keep accepted, provider accepted and delivered separate, with bounded retries and idempotency for duplicates.",
      ],
      say: "“A durable task from the confirmed order, workers to send it, three separate statuses, bounded retries, and idempotency for duplicates.”",
    },
    {
      q: "“Can you guarantee exactly-once delivery?”",
      answer: [
        "A task can be delivered again, and a timeout doesn’t mean the provider rejected it.",
        "A stable ID, atomic rules and a provider key, if supported, reduce the repeats.",
        "Without provider support and with an unknown result, the duplicate risk can’t be easily removed.",
      ],
      say: "“Before saying exactly once, I’d have to prove it end to end. I’d reduce duplicates and be honest about what’s left.”",
      deeper: "Day 8",
    },
    {
      q: "“What would you monitor?”",
      answer: [
        "How long the oldest task in the queue has waited.",
        "The provider’s error rate.",
        "Delivery status, on channels that give receipts. Not just the total sent.",
      ],
      say: "“Queue age, provider errors and receipts, because accepted tasks can quietly be running late.”",
    },
  ],

  faq: [
    { q: "What’s the difference between accepted and delivered?", a: "Accepted means your system took the request. Provider accepted means the provider took it. Delivered needs a reliable receipt, and some cases stay unknown." },
    { q: "What does durable guarantee, exactly?", a: "It means designed so an accepted task’s record survives a restart. The specific guarantee depends on the storage and its configuration." },
    { q: "Why might the outbox pattern help here?", a: "It can reduce the gap between saving the order and recording the event, as you saw on Day 8." },
    { q: "Is the shopping app a real design?", a: "No. It’s a fictional teaching example." },
  ],

  interview: [
    "Clarify the channels and delivery requirements.",
    "Create the task durably from the confirmed order.",
    "Workers send it to the right provider.",
    "Keep accepted, provider accepted and delivered separate.",
    "Bounded retries for temporary failures, and idempotency for duplicates.",
  ],

  cheatsheet: {
    title: "Day 11 · Notification system",
    points: [
      "Event, service, durable task, worker, provider",
      "Accepted, provider accepted and delivered aren’t the same",
      "Delivered needs a reliable receipt; unknown is honest",
      "Limited retries with backoff, for temporary failures only",
      "A timeout doesn’t mean a rejection",
      "Stable IDs reduce duplicates; don’t promise exactly once",
      "Watch queue age, provider errors and receipts",
    ],
  },

  linkedin:
    "Day 11/21 of System Design Essentials with Klymb.\n\nDesigned an order notification system today. The lesson that stuck: accepted, provider accepted and delivered are three different things, and ‘sent successfully’ hides which one you’ve got.\n\nA timeout doesn’t mean a rejection either, so duplicates need a plan.\n\n#SystemDesign #Klymb",

  nextDay: "Day 12: a social media feed. When a creator has lakhs of followers, should you write to every feed at once?",
};

const hi: DayCopy = {
  tag: "Day 11 · Notification system",
  hookLines: [
    "User ka order confirm hua. Use message bhejna hai.",
    "Email, SMS ya push: kaunsa channel?",
    "Aur agar provider slow ho gaya toh?",
  ],
  question: "Sahi user tak message kaise pahunchao, aur imaandari se kaise jaano ki woh kahan tak pahuncha?",

  pre: [
    {
      id: "pre-1",
      scenario: "Aapke system ne notification request accept ki.",
      prompt: "Isse kya pata chalta hai?",
      choices: [
        { text: "Sirf itna ki accept hui: iska matlab notification user tak pahunch gayi nahi", why: "Sahi. Accepted, provider accepted aur delivered alag stages hain.", best: true },
        { text: "User ne use definitely padh liya", why: "Accepted user ke device ke baare mein kuch nahi batata." },
        { text: "Provider ne use deliver kar diya", why: "Provider ne shayad use abhi dekha bhi nahi." },
      ],
    },
    {
      id: "pre-2",
      scenario: "Provider ko ki gayi call timeout ho jaati hai.",
      prompt: "Message ke baare mein kya pata hai?",
      choices: [
        { text: "Zyada nahi: provider ne accept kar li ho sakti hai aur response aap tak na aaya ho", why: "Haan. Timeout ka matlab reject nahi, aur duplicates yahin se aate hain.", best: true },
        { text: "Provider ne definitely reject kar di", why: "Usne accept ki ho sakti hai. Bas jawab nahi mila." },
        { text: "User ko definitely mil gayi", why: "Timeout yeh nahi bata sakta." },
      ],
    },
    {
      id: "pre-3",
      scenario: "Invalid address ki wajah se send fail hota hai.",
      prompt: "Kya retry karte rehna chahiye?",
      choices: [
        { text: "Nahi: aisa permanent issue baar baar retry se theek nahi hota", why: "Sahi. Backoff ke saath limited retries temporary failures ke liye hain.", best: true },
        { text: "Haan: jab tak chal na jaye retry karo", why: "Invalid address apne aap theek nahi hoga." },
        { text: "Haan, aur jitna tez ho sake", why: "Isse bas load badhta hai, address phir bhi invalid rahega." },
      ],
    },
  ],

  revealTitle: "Order se phone tak",
  revealSub: "ek fictional shopping app, simplified",
  reveal: [
    { when: "Requirements", what: "Confirmed order ki notification bhejo, user ki channel preferences ka respect karo, status track karo, aur temporary provider failure par retry karo. Marketing aur critical messages ke rules alag ho sakte hain, toh assumptions bolkar confirm karo." },
    { when: "Flow", what: "Order service confirmed order ka event notification service ko bhejti hai. Woh preferences aur rules dekhkar channel-specific task banati hai. Task durable storage ya queue mein safely record hota hai, aur worker use sahi provider ko bhejta hai." },
    { when: "Honest statuses", what: "Alag statuses rakho: accepted, provider accepted, aur delivered jab reliable receipt ho. Receipt nahi toh honest status unknown ya provider accepted ho sakta hai. Yeh vague ‘sent successfully’ se behtar hai." },
    { when: "Jab provider fail ho", what: "Timeouts set karo. Temporary failures ko backoff ke saath limited retries milte hain. Invalid address jaise permanent issues ko nahi. Exhausted tasks ko separate failed-task list mein rakho, taaki team investigate kar sake." },
    { when: "Duplicates", what: "Task dobara deliver ho sakta hai, toh har ek ko stable ID do. Processing record aur atomic rules repeated work kam karte hain, aur provider ka idempotency key support ho toh madad karta hai. Support na ho aur result unknown ho, toh duplicate ka risk poori tarah hatana mushkil ho sakta hai." },
    { when: "Preferences aur monitoring", what: "Task ke wait karte hue preference badal sakti hai, toh applicable rules ke hisaab se dispatch ke time latest check kar sakte ho. Sirf total count nahi: oldest task ka wait, provider errors, aur jin channels mein receipts hain unka status dekho." },
  ],

  explain: {
    title: "Aaj ke words",
    items: [
      { term: "Durable", what: "Aise design kiya gaya ki accepted task ka record system restart ke baad bhi bache. Specific guarantee storage aur configuration par depend karti hai.", example: "Durable storage ya queue mein rakha task" },
      { term: "Provider accepted", what: "Provider ne request le li. Iska guarantee nahi ki phone par dikh gayi.", example: "Accepted aur delivered ke beech ka stage" },
      { term: "Delivery receipt", what: "Channel se delivery ki confirmation. Kuch dete hain; baaki cases mein final status unknown rehta hai.", example: "Delivered sirf reliable receipt par" },
      { term: "Failed-task list", what: "Un tasks ke liye alag jagah jinke retries khatam ho gaye, taaki team investigate kar sake.", example: "Exhausted tasks, alag rakhe" },
      { term: "Queue age", what: "Oldest task kitni der se wait kar raha hai.", example: "Badhta rahe toh alert" },
    ],
  },

  concept: {
    cards: [{
      name: "Pahunchao",
      examples: ["Event, phir channel-specific task", "Durable task, worker aur provider"],
      moves: ["Preferences aur rules dekho", "Task safely record karo", "Temporary failures par limited retries"],
    }, {
      name: "Batao kahan tak pahuncha",
      examples: ["Accepted", "Provider accepted", "Delivered, receipt ke saath"],
      moves: ["Stages alag rakho", "Unknown status allow karo", "Vague ‘sent successfully’ mat bolo"],
    }],
    rule: "Exactly once bolne se pehle end-to-end guarantee prove karni padegi.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Provider ne message accept kiya aur receipt nahi aayi. Kaunsa status honest hai?",
      choices: [
        { text: "Provider accepted, ya unknown", why: "Sahi. Delivered ke liye reliable receipt chahiye.", best: true },
        { text: "Delivered", why: "Iska saboot nahi hai." },
        { text: "Failed", why: "Kuch nahi kehta ki fail hua." },
      ],
    },
    {
      id: "post-2",
      prompt: "Kaunse failures ko alag tarah handle karna chahiye?",
      choices: [
        { text: "Temporary 503 ko backoff ke saath limited retries milte hain; invalid address ko nahi", why: "Haan. Permanent failure ko repeat karna useful nahi.", best: true },
        { text: "Koi nahi: sab kuch hamesha retry karo", why: "Isse kaam waste hota hai aur load badhta hai." },
        { text: "Koi nahi: kabhi kuch retry mat karo", why: "Temporary failures par limited retry useful ho sakta hai." },
      ],
    },
    {
      id: "post-3",
      scenario: "Provider idempotency keys support nahi karta, aur ek attempt ka result unknown hai.",
      prompt: "Kya sach hai?",
      choices: [
        { text: "Duplicate ka risk poori tarah hatana mushkil ho sakta hai", why: "Sahi. Stable ID aur processing record repeats kam karte hain, par exactly once prove nahi karte.", best: true },
        { text: "Aapka database duplicates na hone ki guarantee deta hai", why: "Use nahi pata provider ne kya kiya." },
        { text: "Queue ke saath duplicates ho hi nahi sakte", why: "Task dobara deliver ho sakta hai." },
      ],
    },
    {
      id: "post-4",
      scenario: "Task queue mein tha aur user ne email band kar diya.",
      prompt: "Kya karna chahiye?",
      choices: [
        { text: "Applicable rules ke hisaab se dispatch ke time latest preference dekho, jo message type ke hisaab se alag ho sakte hain", why: "Haan. Transactional aur marketing rules alag ho sakte hain, toh assume mat karo, discuss karo.", best: true },
        { text: "Hamesha bhejo: task pehle ban chuka hai", why: "Isse user ka change ignore hota hai." },
        { text: "Har tarah ke message ko same treat karo", why: "One-size-fits-all assumption mat banao." },
      ],
    },
    {
      id: "post-5",
      scenario: "Tasks accept ho rahe hain, par oldest task ki age badhti ja rahi hai.",
      prompt: "Isse kya pata chalta hai?",
      choices: [
        { text: "System accepted responses ke peeche messages ko silently delay kar raha ho sakta hai", why: "Sahi. Isliye sirf total count nahi, queue age dekho.", best: true },
        { text: "Sab healthy hai, kyunki tasks accept ho rahe hain", why: "Accepted ka matlab bheja gaya nahi." },
        { text: "Users ko messages zyada tez mil rahe hain", why: "Badhta wait iska ulta batata hai." },
      ],
    },
  ],

  build: {
    title: "Ek notification ko follow karo",
    intro: "Har piece ko uske kaam par drag karo. Ya ek tap karo, phir slot tap karo.",
    given: "Order confirm hua",
    rows: [["service", "task", "worker"], ["status", "retry", "key"]],
    rowLabels: ["Raasta", "Honest aur safe rehna"],
    slots: {
      service: { role: "Preferences aur rules dekho, aur task banao", answer: "service" },
      task: { role: "Task ko restart ke baad bhi safe rakho", answer: "task" },
      worker: { role: "Task uthakar sahi provider ko call karo", answer: "worker" },
      status: { role: "Batao message sach mein kahan tak pahuncha", answer: "status" },
      retry: { role: "Temporary provider failure ka jawab do", answer: "retry" },
      key: { role: "Task dobara aaye toh repeats kam karo", answer: "key" },
    },
    chips: [
      { id: "key", label: "Stable task ID", does: "task ko identify karna, processing record aur provider key ke saath agar support ho" },
      { id: "sent", label: "Ek ‘sent successfully’ status", does: "yeh chhupana ki message kis stage tak pahuncha" },
      { id: "worker", label: "Worker", does: "tasks lekar provider ko bhejna" },
      { id: "service", label: "Notification service", does: "preferences aur rules lagakar channel-specific tasks banana" },
      { id: "retry", label: "Backoff ke saath limited retries", does: "temporary failures ko badhte waits ke saath dobara try karna" },
      { id: "task", label: "Durable task", does: "restart ke baad bhi bachne ke liye design kiya record" },
      { id: "status", label: "Alag statuses", does: "accepted, provider accepted, aur receipt ke saath delivered" },
    ],
    done: "Raaste ke liye service, durable task aur worker, aur honest aur safe rehne ke liye alag statuses, limited retries aur stable ID.",
  },

  design: {
    title: "Order notification system",
    brief: "Interviewer kehta hai: “Design an order notification system.” Apna answer likho: requirements, flow, statuses, aur failures aur duplicates kaise handle karoge.",
    constraints: [
      "User ki channel preferences ka respect karo",
      "Provider slow ho sakta hai ya temporary fail ho sakta hai",
      "Message kahan tak pahuncha, iske baare mein honest raho",
    ],
    minChars: 100,
    walkthrough: [
      { heading: "Ek possible answer", points: ["Channels aur delivery requirements clarify karo.", "Confirmed order se notification task durably banao.", "Workers provider ko bhejte hain.", "Accepted, provider accepted aur delivered alag statuses rakho."] },
      { heading: "Jab kuch fail ho", points: ["Temporary failures par bounded retries.", "Duplicates ke liye idempotency consider karo.", "Queue age, provider errors aur jahan ho wahan delivery receipts dekho."] },
    ],
    checklist: [
      "Maine channels aur requirements clarify kiye",
      "Maine task durable banaya aur workers use kiye",
      "Maine statuses alag rakhe",
      "Maine temporary failures par bounded retries rakhe",
      "Maine exactly once ka promise kiye bina duplicates address kiye",
    ],
  },

  followUps: [
    {
      q: "“Design an order notification system.”",
      answer: [
        "Pehle channels aur delivery requirements clarify karo.",
        "Confirmed order se notification task durably banao; workers use provider ko bhejte hain.",
        "Accepted, provider accepted aur delivered alag rakho, bounded retries aur duplicates ke liye idempotency ke saath.",
      ],
      say: "“Confirmed order se durable task, bhejne ke liye workers, teen alag statuses, bounded retries, aur duplicates ke liye idempotency.”",
    },
    {
      q: "“Kya exactly-once delivery guarantee kar sakte ho?”",
      answer: [
        "Task dobara deliver ho sakta hai, aur timeout ka matlab provider ka reject karna nahi.",
        "Stable ID, atomic rules aur provider key, agar support ho, repeats kam karte hain.",
        "Provider support na ho aur result unknown ho toh duplicate risk hatana mushkil hai.",
      ],
      say: "“Exactly once bolne se pehle use end to end prove karna padega. Main duplicates kam karunga aur jo bacha hai uske baare mein honest rahunga.”",
      deeper: "Day 8",
    },
    {
      q: "“Kya monitor karoge?”",
      answer: [
        "Queue ka oldest task kitni der se wait kar raha hai.",
        "Provider ka error rate.",
        "Jin channels mein receipts milti hain, unka delivery status. Sirf total sent nahi.",
      ],
      say: "“Queue age, provider errors aur receipts, kyunki accepted tasks chupchaap late ho sakte hain.”",
    },
  ],

  faq: [
    { q: "Accepted aur delivered mein kya farak hai?", a: "Accepted matlab aapke system ne request li. Provider accepted matlab provider ne li. Delivered ke liye reliable receipt chahiye, aur kuch cases unknown rehte hain." },
    { q: "Durable exactly kya guarantee karta hai?", a: "Matlab aise design kiya gaya ki accepted task ka record restart ke baad bache. Specific guarantee storage aur configuration par depend karti hai." },
    { q: "Outbox pattern yahan kyun useful ho sakta hai?", a: "Woh order save aur event record ke beech ka gap kam kar sakta hai, jaisa Day 8 mein dekha." },
    { q: "Kya shopping app ek real design hai?", a: "Nahi. Yeh ek fictional teaching example hai." },
  ],

  interview: [
    "Channels aur delivery requirements clarify karo.",
    "Confirmed order se task durably banao.",
    "Workers use sahi provider ko bhejte hain.",
    "Accepted, provider accepted aur delivered alag rakho.",
    "Temporary failures par bounded retries, duplicates ke liye idempotency.",
  ],

  cheatsheet: {
    title: "Day 11 · Notification system",
    points: [
      "Event, service, durable task, worker, provider",
      "Accepted, provider accepted aur delivered same nahi",
      "Delivered ko reliable receipt chahiye; unknown honest hai",
      "Backoff ke saath limited retries, sirf temporary failures par",
      "Timeout ka matlab reject nahi",
      "Stable IDs duplicates kam karte hain; exactly once ka promise mat karo",
      "Queue age, provider errors aur receipts dekho",
    ],
  },

  linkedin:
    "Day 11/21: System Design Essentials with Klymb.\n\nAaj order notification system design kiya. Jo baat yaad reh gayi: accepted, provider accepted aur delivered teen alag cheezein hain, aur ‘sent successfully’ chhupa deta hai ki aapke paas kaunsi hai.\n\nTimeout ka matlab reject bhi nahi, isliye duplicates ka plan chahiye.\n\n#SystemDesign #Klymb",

  nextDay: "Day 12: social media feed. Jab creator ke lakhon followers hon, kya sabke feed par ek saath write karna best hoga?",
};

export const essentialsDayEleven: Day = {
  day: 11,
  of: 21,
  app: "A shopping app",
  minutes: 18,
  hook: { date: "Fictional example" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/essentials-day-11.mp4", poster: "/videos/system-design/essentials-day-11-poster.jpg", minutes: 5, lang: "Hinglish",
    // One horizontal cut with the captions burned in: it plays in the wide frame, and with no caption lines there's no subtitle switch.
    wide: { src: "/api/video/essentials-day-11.mp4", poster: "/videos/system-design/essentials-day-11-poster.jpg" },
  },
};
