/**
 * Day 8 of "System Design Essentials": queues and background work.
 * Built from the Day 8 video script. The shopping app is a fictional teaching
 * example, not any company's real design.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Day 8 · Queues and background work",
  hookLines: [
    "You placed an order and the payment succeeded.",
    "The service that sends the confirmation email is slow.",
    "Should the order screen wait for the email?",
  ],
  question: "Which work must the user wait for, and which can safely happen later?",

  pre: [
    {
      id: "pre-1",
      scenario: "The order is complete, but the email service is slow, and the screen is still showing a spinner.",
      prompt: "What’s the problem with making the screen wait?",
      choices: [
        { text: "One slow background task makes the whole experience confusing, and the user may tap again", why: "Right. The screen doesn’t need to hold until the email has gone.", best: true },
        { text: "Nothing: the user should always wait for every step", why: "Not every step needs the user waiting. The email can be handled later." },
        { text: "The order gets cancelled by the spinner", why: "A spinner doesn’t cancel anything. It just leaves the user unsure." },
      ],
    },
    {
      id: "pre-2",
      scenario: "The system has only accepted the order request. Payment is still processing.",
      prompt: "What should the screen say?",
      choices: [
        { text: "Processing: show confirmed only once the required order and payment steps really finish", why: "Yes. Moving work to the background must not make the status untrue.", best: true },
        { text: "Confirmed, because the request was accepted", why: "Accepted isn’t confirmed. That tells the user something that hasn’t happened." },
        { text: "Nothing at all, until the email arrives", why: "The order status and the email are separate. Show the real status." },
      ],
    },
    {
      id: "pre-3",
      scenario: "A worker is sending an email and crashes before it reports that it finished.",
      prompt: "What can happen to that task?",
      choices: [
        { text: "Depending on the queue’s design, it can become available again, so a second attempt is possible", why: "Right. That’s useful for failures, and it’s also how duplicates appear.", best: true },
        { text: "It’s always lost for good", why: "A queue can make it available again, depending on its design." },
        { text: "It’s guaranteed to run exactly once", why: "Don’t promise that without understanding the whole flow." },
      ],
    },
  ],

  revealTitle: "Handing work to a queue",
  revealSub: "a fictional shopping app, simplified",
  reveal: [
    { when: "Synchronous and asynchronous", what: "Synchronous means waiting for the response to the request you sent. Asynchronous means handing a task over to be handled later. Not everything belongs in the background: the order’s real status must be accurate." },
    { when: "Queue and worker", what: "A queue is a waiting line that holds tasks. A worker is a program that picks up a task and processes it. Here, after a valid confirmed order, a notification task enters the queue and a worker asks the email provider to send it." },
    { when: "Acknowledgement and retries", what: "After processing a task successfully, the worker sends an acknowledgement. If it crashes first, the task can become available again. Retries help, but not forever: something like an invalid email address will keep failing, so keep those tasks aside for review." },
    { when: "The same task twice", what: "The provider may accept the email and the worker crash before acknowledging, so the task runs again. Idempotency avoids unwanted duplicate effects: a stable notification ID, a processing record, atomic rules in storage, and the provider’s idempotency key if it offers one." },
    { when: "Transactional outbox", what: "The order saves, then the service crashes before queueing the task: now there’s an order and no notification. An outbox saves an event record in the same database transaction as the order, and a separate process publishes it later. Publishing can repeat, so consumers must handle duplicates." },
    { when: "Backlog", what: "A queue smooths load, but it doesn’t create unlimited speed. If tasks arrive faster than workers finish them, the line grows. Watch the queue’s length and how long the oldest task has waited. More workers only help when worker capacity is the bottleneck." },
  ],

  explain: {
    title: "The words from today",
    items: [
      { term: "Synchronous", what: "Waiting for the response to a request before moving on.", example: "Showing the order’s real status" },
      { term: "Asynchronous", what: "Handing a task over to be handled later.", example: "Sending the confirmation email" },
      { term: "Queue and worker", what: "A queue is a waiting line of tasks. A worker is a program that takes tasks from it and processes them.", example: "Like tickets in a kitchen, but saving and failure must be handled" },
      { term: "Acknowledgement", what: "The worker telling the queue that the task has been handled.", example: "Sent after successful processing, not before" },
      { term: "Idempotency", what: "Repeating the same operation without an unwanted duplicate effect.", example: "A stable notification ID and a processing record" },
      { term: "Transactional outbox", what: "Saving an event record in the same database transaction as the data, for a separate process to publish later.", example: "Order and outbox event saved together" },
    ],
  },

  concept: {
    cards: [{
      name: "The user waits",
      examples: ["The order’s real status", "Required order and payment steps"],
      moves: ["Report what really happened", "Say processing while it’s processing", "Don’t call an accepted request confirmed"],
    }, {
      name: "A worker handles it later",
      examples: ["The confirmation email", "Tasks that can safely run after the response"],
      moves: ["Acknowledge after success", "Keep retries limited", "Expect the same task twice"],
    }],
    rule: "Don’t just name a queue: say why it’s there, where it can fail, and how you’d handle that.",
  },

  post: [
    {
      id: "post-1",
      prompt: "When should a worker send its acknowledgement?",
      choices: [
        { text: "After it has processed the task successfully", why: "Right. It tells the queue the task was handled.", best: true },
        { text: "As soon as it picks the task up", why: "If it then crashes, the work is lost while the queue thinks it’s done." },
        { text: "Only when the task has failed", why: "That’s the opposite of what it’s for." },
      ],
    },
    {
      id: "post-2",
      scenario: "An email task fails again and again because the address is invalid.",
      prompt: "What’s the sensible handling?",
      choices: [
        { text: "Stop after limited retries and keep the task aside for review", why: "Yes. Some failures repeat every time, so endless retries don’t help.", best: true },
        { text: "Retry it forever", why: "An invalid address won’t fix itself." },
        { text: "Add more workers", why: "The problem is the address, not the capacity." },
      ],
    },
    {
      id: "post-3",
      scenario: "The provider accepted an email, then the worker crashed before acknowledging. The task comes back.",
      prompt: "What’s true about duplicates here?",
      choices: [
        { text: "A duplicate email is possible; a stable ID helps, but with an unknown provider result it’s hard to prevent completely", why: "Right. So don’t promise exactly once without understanding the whole flow.", best: true },
        { text: "A duplicate is impossible, because the queue tracks everything", why: "The queue can’t know what the provider did." },
        { text: "Checking a record first solves every race condition", why: "Just checking doesn’t. Storage needs atomic rules." },
      ],
    },
    {
      id: "post-4",
      scenario: "The order saved, then the service crashed before the notification task reached the queue.",
      prompt: "Which pattern addresses this gap?",
      choices: [
        { text: "Transactional outbox: save an event with the order, in one transaction, and publish it later", why: "Yes. Publishing can repeat, so consumers still handle duplicates.", best: true },
        { text: "Add a read replica", why: "A replica doesn’t connect the order to the queue." },
        { text: "Show a longer spinner", why: "The task still never got recorded." },
      ],
    },
    {
      id: "post-5",
      scenario: "The queue is growing. The workers are idle much of the time, waiting on the email provider’s limit.",
      prompt: "Will adding more workers fix it?",
      choices: [
        { text: "No: if the provider’s limit is the bottleneck, more workers won’t solve it", why: "Right. More workers help only when worker capacity is the bottleneck.", best: true },
        { text: "Yes: more workers always mean more speed", why: "Not past the limit of what they depend on." },
        { text: "Yes: a queue creates unlimited speed", why: "A queue smooths load. It doesn’t create speed." },
      ],
    },
  ],

  build: {
    title: "Send the email in the background",
    intro: "Drag each piece to the job it does. You can also tap one, then tap a slot.",
    given: "A confirmed order needs an email",
    rows: [["queue", "worker"], ["ack", "retry"], ["id", "outbox"]],
    rowLabels: ["The path", "When it fails", "Against gaps and duplicates"],
    slots: {
      queue: { role: "Hold the notification task in a waiting line", answer: "queue" },
      worker: { role: "Pick up the task and call the email provider", answer: "worker" },
      ack: { role: "Tell the queue the task was handled", answer: "ack" },
      retry: { role: "Try a failed task a limited number of times", answer: "retry" },
      id: { role: "Spot the same task when it arrives twice", answer: "id" },
      outbox: { role: "Save an event in the same transaction as the order", answer: "outbox" },
    },
    chips: [
      { id: "outbox", label: "Transactional outbox", does: "saving an event with the order in one transaction, to publish later" },
      { id: "retry", label: "Bounded retries", does: "retrying a limited number of times" },
      { id: "wait", label: "Hold the screen for the email", does: "making the user wait for a task that can happen later" },
      { id: "queue", label: "Queue", does: "a waiting line that holds tasks" },
      { id: "id", label: "Stable notification ID", does: "identifying a task so a repeat can be recognised" },
      { id: "worker", label: "Worker", does: "a program that takes tasks from the queue and processes them" },
      { id: "ack", label: "Acknowledgement", does: "telling the queue the task has been handled" },
    ],
    done: "A queue and a worker for the path, an acknowledgement and bounded retries for failures, and a stable ID and an outbox for duplicates and gaps.",
  },

  canvas: {
    title: "Draw it from scratch: email in the background",
    brief: "The order is confirmed and the customer should get an email without the screen waiting. Draw the app server saving the order, the queue that holds the notification task, and the worker that picks it up.",
    parts: ["client", "server", "database", "queue", "worker", "cache", "cdn"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.1, y: 0.5 }, { id: "s", part: "server", x: 0.36, y: 0.5 },
        { id: "d", part: "database", x: 0.64, y: 0.18 }, { id: "q", part: "queue", x: 0.64, y: 0.82 },
        { id: "w", part: "worker", x: 0.9, y: 0.82 },
      ],
      edges: [["c", "s"], ["s", "d"], ["s", "q"], ["w", "q"]],
    },
    why: {
      "client>server": "The customer’s app sends the order to the app server and gets its real status back.",
      "server>database": "The order is saved in the database, so the status shown to the customer is accurate.",
      "server>queue": "After a valid confirmed order, the server puts a notification task in the queue rather than making the screen wait.",
      "worker>queue": "The worker takes tasks from the queue, calls the email provider, and acknowledges after success.",
    },
    done: "The order is saved and answered on the spot, while the email goes through the queue and a worker. Add bounded retries and duplicate handling when you explain it.",
  },

  followUps: [
    {
      q: "“How would you send notifications after a confirmed order?”",
      answer: [
        "Record a notification task durably for the confirmed order.",
        "A worker takes it from the queue and sends it to the provider, with bounded retries and duplicate handling.",
        "Track order confirmation and email delivery as separate statuses.",
      ],
      say: "“I’d record the task durably, have a worker send it with bounded retries and duplicate handling, and track confirmation and delivery separately.”",
      deeper: "Day 11",
    },
    {
      q: "“Can you guarantee the email goes out exactly once?”",
      answer: [
        "A task can arrive twice, for example when the worker crashes before acknowledging.",
        "A stable ID, a processing record, atomic storage rules and a provider idempotency key all reduce duplicates.",
        "If the provider’s result is unknown, preventing a duplicate completely can be difficult.",
      ],
      say: "“I wouldn’t promise exactly once without understanding the whole flow. I’d design for repeats and reduce duplicates.”",
    },
    {
      q: "“The queue keeps growing. What do you do?”",
      answer: [
        "Monitor both the queue’s length and how long the oldest task has waited.",
        "Find the bottleneck before adding anything.",
        "More workers help if worker capacity is the limit, not if the provider’s limit is.",
      ],
      say: "“First I’d find the bottleneck. More workers only help if worker capacity is what’s limiting us.”",
    },
  ],

  faq: [
    { q: "Should all work go to the background?", a: "No. The order’s real status must be accurate for the user. Background work suits tasks the screen doesn’t need to wait for, like sending the email." },
    { q: "Does a queue make the system faster?", a: "It can smooth the load, but it doesn’t create unlimited speed. If tasks arrive faster than workers finish them, the line grows." },
    { q: "Does an outbox stop all duplicates?", a: "No. It closes the gap between saving the order and recording the event. Publishing can repeat, so consumers must handle duplicates." },
    { q: "Is the shopping app a real design?", a: "No. It’s a fictional teaching example." },
  ],

  interview: [
    "Keep the order’s real status accurate, and don’t make it wait for the email.",
    "Record the notification task durably for the confirmed order.",
    "A worker takes it from the queue and sends it to the provider.",
    "Bounded retries on failure, and handling for duplicates.",
    "Track confirmation and delivery separately, and watch the backlog.",
  ],

  cheatsheet: {
    title: "Day 8 · Queues and background work",
    points: [
      "Synchronous waits for the response; asynchronous hands the task over",
      "A queue holds tasks; a worker processes them",
      "Acknowledge after successful processing",
      "Retries are limited; some failures need review",
      "A task can arrive twice: design for idempotency",
      "An outbox saves the event with the data in one transaction",
      "Watch queue length and the oldest task’s wait",
    ],
  },

  linkedin:
    "Day 8/21 of System Design Essentials with Klymb.\n\nYour order screen shouldn’t wait for a slow email service. A queue holds the task and a worker handles it later, with an acknowledgement after success and limited retries.\n\nThe catch: the same task can arrive twice, so design for idempotency, and don’t promise exactly once without understanding the whole flow.\n\n#SystemDesign #Klymb",

  nextDay: "Day 9: a repeatable interview framework, used on a URL shortener.",
};

const hi: DayCopy = {
  tag: "Day 8 · Queues aur background work",
  hookLines: [
    "Aapne order place kiya aur payment successful hui.",
    "Confirmation email bhejne wali service slow hai.",
    "Kya order screen ko email ka wait karna chahiye?",
  ],
  question: "User ko kis kaam ka wait karna chahiye, aur kaunsa kaam safely baad mein ho sakta hai?",

  pre: [
    {
      id: "pre-1",
      scenario: "Order complete ho chuka hai, par email service slow hai aur screen par abhi bhi spinner ghoom raha hai.",
      prompt: "Screen ko wait karwane mein problem kya hai?",
      choices: [
        { text: "Ek slow background task poore experience ko confusing bana deta hai, aur user dobara tap kar sakta hai", why: "Sahi. Email jaane tak screen ko hold karna zaroori nahi.", best: true },
        { text: "Kuch nahi: user ko hamesha har step ka wait karna chahiye", why: "Har step ke liye user ka wait zaroori nahi. Email baad mein handle ho sakta hai." },
        { text: "Spinner order ko cancel kar deta hai", why: "Spinner kuch cancel nahi karta. Bas user ko confuse karta hai." },
      ],
    },
    {
      id: "pre-2",
      scenario: "System ne sirf order request accept ki hai. Payment abhi process ho rahi hai.",
      prompt: "Screen par kya dikhna chahiye?",
      choices: [
        { text: "Processing: confirmed tabhi dikhao jab required order aur payment steps sach mein complete hon", why: "Haan. Kaam ko background mein bhejne se status galat nahi hona chahiye.", best: true },
        { text: "Confirmed, kyunki request accept ho gayi", why: "Accepted ka matlab confirmed nahi. Yeh user ko woh batata hai jo hua hi nahi." },
        { text: "Kuch nahi, jab tak email na aa jaye", why: "Order status aur email alag hain. Asli status dikhao." },
      ],
    },
    {
      id: "pre-3",
      scenario: "Worker email bhej raha hai aur finish report karne se pehle crash ho jaata hai.",
      prompt: "Us task ka kya ho sakta hai?",
      choices: [
        { text: "Queue ke design ke hisaab se woh dobara available ho sakta hai, toh doosra attempt possible hai", why: "Sahi. Failure mein yeh useful hai, aur duplicates bhi aise hi aate hain.", best: true },
        { text: "Woh hamesha ke liye kho jaata hai", why: "Queue ke design ke hisaab se woh dobara available ho sakta hai." },
        { text: "Woh guaranteed exactly once chalega", why: "Poora flow samjhe bina yeh promise mat karo." },
      ],
    },
  ],

  revealTitle: "Kaam queue ko dena",
  revealSub: "ek fictional shopping app, simplified",
  reveal: [
    { when: "Synchronous aur asynchronous", what: "Synchronous matlab jis kaam ki request bheji, uske response tak wait karna. Asynchronous matlab task ko baad mein handle karne ke liye hand over karna. Har kaam background ka nahi: order ka asli status accurate hona chahiye." },
    { when: "Queue aur worker", what: "Queue ek waiting line hai jismein tasks rakhe jaate hain. Worker ek program hai jo task uthakar process karta hai. Yahan valid confirmed order ke baad notification task queue mein jaata hai aur worker email provider ko request bhejta hai." },
    { when: "Acknowledgement aur retries", what: "Task successfully process karne ke baad worker acknowledgement deta hai. Usse pehle crash ho toh task dobara available ho sakta hai. Retries useful hain, par infinite nahi: invalid email address jaisa failure baar baar hoga, toh aise tasks alag review ke liye rakho." },
    { when: "Same task do baar", what: "Provider email accept kar le aur worker acknowledge karne se pehle crash ho jaye, toh task phir chalega. Idempotency unwanted duplicate effect se bachati hai: stable notification ID, processing record, storage mein atomic rules, aur provider ka idempotency key agar woh support kare." },
    { when: "Transactional outbox", what: "Order save hua, aur task queue mein jaane se pehle service crash ho gayi: ab order hai, notification nahi. Outbox order ke saath ek event record same database transaction mein save karta hai, aur ek separate process use baad mein publish karta hai. Publishing repeat ho sakti hai, toh consumers ko duplicates handle karne honge." },
    { when: "Backlog", what: "Queue load smooth karti hai, unlimited speed nahi banati. Tasks workers se tez aayein toh line badhegi. Queue length aur oldest task ka wait dono dekho. Zyada workers tabhi useful hain jab bottleneck worker capacity ho." },
  ],

  explain: {
    title: "Aaj ke words",
    items: [
      { term: "Synchronous", what: "Aage badhne se pehle request ke response ka wait karna.", example: "Order ka asli status dikhana" },
      { term: "Asynchronous", what: "Task ko baad mein handle karne ke liye hand over karna.", example: "Confirmation email bhejna" },
      { term: "Queue aur worker", what: "Queue tasks ki waiting line hai. Worker ek program hai jo usse tasks lekar process karta hai.", example: "Kitchen ke tickets jaisa, par saving aur failure handle karne padte hain" },
      { term: "Acknowledgement", what: "Worker ka queue ko batana ki task handle ho gaya.", example: "Successful processing ke baad, pehle nahi" },
      { term: "Idempotency", what: "Same operation repeat hone par unwanted duplicate effect se bachna.", example: "Stable notification ID aur processing record" },
      { term: "Transactional outbox", what: "Data ke saath same database transaction mein ek event record save karna, jise separate process baad mein publish kare.", example: "Order aur outbox event saath save" },
    ],
  },

  concept: {
    cards: [{
      name: "User wait karta hai",
      examples: ["Order ka asli status", "Required order aur payment steps"],
      moves: ["Jo sach mein hua woh batao", "Processing ke time processing dikhao", "Accepted request ko confirmed mat bolo"],
    }, {
      name: "Worker baad mein karta hai",
      examples: ["Confirmation email", "Woh tasks jo response ke baad safely chal sakte hain"],
      moves: ["Success ke baad acknowledge karo", "Retries limited rakho", "Same task do baar aane ki umeed rakho"],
    }],
    rule: "Sirf queue ka naam mat lo: batao kyun hai, kahan fail ho sakti hai, aur kaise handle karoge.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Worker ko acknowledgement kab dena chahiye?",
      choices: [
        { text: "Task successfully process karne ke baad", why: "Sahi. Yeh queue ko batata hai ki task handle ho gaya.", best: true },
        { text: "Task uthate hi", why: "Phir crash hua toh kaam kho jayega aur queue use done samjhegi." },
        { text: "Sirf task fail hone par", why: "Iska kaam iska ulta hai." },
      ],
    },
    {
      id: "post-2",
      scenario: "Invalid address ki wajah se ek email task baar baar fail ho raha hai.",
      prompt: "Sensible handling kya hai?",
      choices: [
        { text: "Limited retries ke baad ruko aur task ko review ke liye alag rakho", why: "Haan. Kuch failures har baar hote hain, toh endless retries se fayda nahi.", best: true },
        { text: "Hamesha retry karte raho", why: "Invalid address apne aap theek nahi hoga." },
        { text: "Aur workers add karo", why: "Problem address hai, capacity nahi." },
      ],
    },
    {
      id: "post-3",
      scenario: "Provider ne email accept kar li, phir worker acknowledge karne se pehle crash ho gaya. Task wapas aaya.",
      prompt: "Yahan duplicates ke baare mein kya sach hai?",
      choices: [
        { text: "Duplicate email possible hai; stable ID madad karta hai, par provider ka result unknown ho toh poori tarah rokna mushkil hai", why: "Sahi. Isliye poora flow samjhe bina exactly once ka promise mat karo.", best: true },
        { text: "Duplicate impossible hai, kyunki queue sab track karti hai", why: "Queue ko nahi pata provider ne kya kiya." },
        { text: "Pehle record check karne se har race condition solve ho jaati hai", why: "Sirf check karne se nahi. Storage mein atomic rules chahiye." },
      ],
    },
    {
      id: "post-4",
      scenario: "Order save ho gaya, phir notification task queue tak pahunchne se pehle service crash ho gayi.",
      prompt: "Kaunsa pattern is gap ko address karta hai?",
      choices: [
        { text: "Transactional outbox: order ke saath event ek transaction mein save karo aur baad mein publish karo", why: "Haan. Publishing repeat ho sakti hai, toh consumers phir bhi duplicates handle karte hain.", best: true },
        { text: "Read replica add karo", why: "Replica order ko queue se nahi jodta." },
        { text: "Lamba spinner dikhao", why: "Task phir bhi record nahi hua." },
      ],
    },
    {
      id: "post-5",
      scenario: "Queue badh rahi hai. Workers zyada tar email provider ki limit par wait kar rahe hain.",
      prompt: "Kya aur workers add karne se theek hoga?",
      choices: [
        { text: "Nahi: bottleneck provider ki limit ho toh aur workers se solve nahi hoga", why: "Sahi. Zyada workers tabhi useful hain jab bottleneck worker capacity ho.", best: true },
        { text: "Haan: zyada workers matlab hamesha zyada speed", why: "Jis par depend karte hain uski limit ke aage nahi." },
        { text: "Haan: queue unlimited speed banati hai", why: "Queue load smooth karti hai. Speed nahi banati." },
      ],
    },
  ],

  build: {
    title: "Email ko background mein bhejo",
    intro: "Har piece ko uske kaam par drag karo. Ya ek tap karo, phir slot tap karo.",
    given: "Confirmed order ke liye email bhejna hai",
    rows: [["queue", "worker"], ["ack", "retry"], ["id", "outbox"]],
    rowLabels: ["Raasta", "Jab fail ho", "Gaps aur duplicates ke liye"],
    slots: {
      queue: { role: "Notification task ko waiting line mein rakho", answer: "queue" },
      worker: { role: "Task uthakar email provider ko call karo", answer: "worker" },
      ack: { role: "Queue ko batao ki task handle ho gaya", answer: "ack" },
      retry: { role: "Failed task ko limited baar try karo", answer: "retry" },
      id: { role: "Do baar aaye same task ko pehchano", answer: "id" },
      outbox: { role: "Order ke same transaction mein event save karo", answer: "outbox" },
    },
    chips: [
      { id: "outbox", label: "Transactional outbox", does: "order ke saath event ek transaction mein save karna, baad mein publish ke liye" },
      { id: "retry", label: "Bounded retries", does: "limited baar retry karna" },
      { id: "wait", label: "Email tak screen hold karo", does: "user ko us task ka wait karwana jo baad mein ho sakta hai" },
      { id: "queue", label: "Queue", does: "tasks rakhne wali waiting line" },
      { id: "id", label: "Stable notification ID", does: "task ko identify karna taaki repeat pehchana ja sake" },
      { id: "worker", label: "Worker", does: "program jo queue se tasks lekar process karta hai" },
      { id: "ack", label: "Acknowledgement", does: "queue ko batana ki task handle ho gaya" },
    ],
    done: "Raaste ke liye queue aur worker, failures ke liye acknowledgement aur bounded retries, aur duplicates aur gaps ke liye stable ID aur outbox.",
  },

  canvas: {
    title: "Scratch se draw karo: background mein email",
    brief: "Order confirm ho gaya aur customer ko bina screen wait karwaye email milna chahiye. App server draw karo jo order save kare, queue jo notification task rakhe, aur worker jo use uthaye.",
    parts: ["client", "server", "database", "queue", "worker", "cache", "cdn"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.1, y: 0.5 }, { id: "s", part: "server", x: 0.36, y: 0.5 },
        { id: "d", part: "database", x: 0.64, y: 0.18 }, { id: "q", part: "queue", x: 0.64, y: 0.82 },
        { id: "w", part: "worker", x: 0.9, y: 0.82 },
      ],
      edges: [["c", "s"], ["s", "d"], ["s", "q"], ["w", "q"]],
    },
    why: {
      "client>server": "Customer ki app order app server ko bhejti hai aur uska asli status wapas paati hai.",
      "server>database": "Order database mein save hota hai, taaki customer ko dikhne wala status accurate ho.",
      "server>queue": "Valid confirmed order ke baad server notification task queue mein daalta hai, screen ko wait nahi karwata.",
      "worker>queue": "Worker queue se tasks leta hai, email provider ko call karta hai, aur success ke baad acknowledge karta hai.",
    },
    done: "Order wahin save aur answer hota hai, aur email queue aur worker se jaata hai. Explain karte waqt bounded retries aur duplicate handling add karo.",
  },

  followUps: [
    {
      q: "“Confirmed order ke baad notifications kaise bhejoge?”",
      answer: [
        "Confirmed order ke liye notification task durably record karo.",
        "Worker queue se lekar provider ko bhejta hai, bounded retries aur duplicate handling ke saath.",
        "Order confirmation aur email delivery ko alag statuses ke roop mein track karo.",
      ],
      say: "“Main task durably record karunga, worker bounded retries aur duplicate handling ke saath bhejega, aur confirmation aur delivery alag track karunga.”",
      deeper: "Day 11",
    },
    {
      q: "“Kya guarantee de sakte ho ki email exactly once jayega?”",
      answer: [
        "Task do baar aa sakta hai, jaise worker acknowledge karne se pehle crash ho jaye.",
        "Stable ID, processing record, atomic storage rules aur provider idempotency key duplicates kam karte hain.",
        "Provider ka result unknown ho toh duplicate ko poori tarah rokna mushkil ho sakta hai.",
      ],
      say: "“Poora flow samjhe bina exactly once ka promise nahi karunga. Main repeats ke liye design karunga aur duplicates kam karunga.”",
    },
    {
      q: "“Queue badhti ja rahi hai. Kya karoge?”",
      answer: [
        "Queue length aur oldest task ka wait, dono monitor karo.",
        "Kuch add karne se pehle bottleneck dhoondho.",
        "Worker capacity limit ho toh zyada workers madad karte hain, provider ki limit ho toh nahi.",
      ],
      say: "“Pehle bottleneck dhoondhunga. Zyada workers tabhi madad karte hain jab limit worker capacity ho.”",
    },
  ],

  faq: [
    { q: "Kya saara kaam background mein jana chahiye?", a: "Nahi. Order ka asli status user ke liye accurate hona chahiye. Background un tasks ke liye hai jinka screen ko wait nahi karna, jaise email bhejna." },
    { q: "Kya queue system ko fast bana deti hai?", a: "Woh load smooth kar sakti hai, par unlimited speed nahi banati. Tasks workers se tez aayein toh line badhegi." },
    { q: "Kya outbox saare duplicates rok deta hai?", a: "Nahi. Woh order save karne aur event record karne ke beech ka gap band karta hai. Publishing repeat ho sakti hai, toh consumers ko duplicates handle karne honge." },
    { q: "Kya shopping app ek real design hai?", a: "Nahi. Yeh ek fictional teaching example hai." },
  ],

  interview: [
    "Order ka asli status accurate rakho, aur use email ka wait mat karwao.",
    "Confirmed order ke liye notification task durably record karo.",
    "Worker queue se lekar provider ko bhejta hai.",
    "Failure par bounded retries, aur duplicates ki handling.",
    "Confirmation aur delivery alag track karo, aur backlog dekho.",
  ],

  cheatsheet: {
    title: "Day 8 · Queues aur background work",
    points: [
      "Synchronous response ka wait karta hai; asynchronous task hand over karta hai",
      "Queue tasks rakhti hai; worker unhe process karta hai",
      "Successful processing ke baad acknowledge karo",
      "Retries limited; kuch failures ko review chahiye",
      "Task do baar aa sakta hai: idempotency ke liye design karo",
      "Outbox event ko data ke saath ek transaction mein save karta hai",
      "Queue length aur oldest task ka wait dekho",
    ],
  },

  linkedin:
    "Day 8/21: System Design Essentials with Klymb.\n\nOrder screen ko slow email service ka wait nahi karna chahiye. Queue task rakhti hai aur worker use baad mein handle karta hai, success ke baad acknowledgement aur limited retries ke saath.\n\nCatch yeh hai: same task do baar aa sakta hai, toh idempotency ke liye design karo, aur poora flow samjhe bina exactly once ka promise mat karo.\n\n#SystemDesign #Klymb",

  nextDay: "Day 9: ek repeatable interview framework, URL shortener par.",
};

export const essentialsDayEight: Day = {
  day: 8,
  of: 21,
  app: "A shopping app",
  minutes: 18,
  hook: { date: "Fictional example" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/essentials-day-8.mp4", poster: "/videos/system-design/essentials-day-8-poster.jpg", minutes: 5, lang: "Hinglish",
    // One horizontal cut with the captions burned in: it plays in the wide frame, and with no caption lines there's no subtitle switch.
    wide: { src: "/api/video/essentials-day-8.mp4", poster: "/videos/system-design/essentials-day-8-poster.jpg" },
  },
};
