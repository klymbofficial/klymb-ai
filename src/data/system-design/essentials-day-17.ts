/**
 * Day 17 of "System Design Essentials": design a simple AI assistant.
 * Built from the Day 17 video script. The shopping app's assistant is a fictional
 * teaching example and the token numbers are arithmetic only, not real usage or prices.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Day 17 · A simple AI assistant",
  hookLines: [
    "“Design an AI support assistant.”",
    "A user asks: “Where’s my order?”",
    "Does the model automatically know?",
  ],
  question: "What really happens between the application and the model, and which one is responsible for what?",

  pre: [
    {
      id: "pre-1",
      scenario: "A user asks a support assistant, “Where’s my order?”",
      prompt: "Does the model automatically know about their account and latest order?",
      choices: [
        { text: "No: the answer depends on the information the application provides", why: "Right. The model works from what it’s supplied.", best: true },
        { text: "Yes: AI models know every user’s data", why: "It doesn’t automatically have the user’s account." },
        { text: "Yes, if the question is polite", why: "Tone doesn’t give it data." },
      ],
    },
    {
      id: "pre-2",
      scenario: "This first version has no real-time order status, and the user asks for it.",
      prompt: "What should the assistant do?",
      choices: [
        { text: "Say it doesn’t have that information now, and offer a suitable support path", why: "Yes. Guessing would give a confident but unsupported answer.", best: true },
        { text: "Make a good guess", why: "A confident tone isn’t proof of accuracy." },
        { text: "Show an infinite spinner", why: "That helps nobody." },
      ],
    },
    {
      id: "pre-3",
      prompt: "Who is responsible for checking what a user may access?",
      choices: [
        { text: "The application: the model isn’t a trusted replacement for authorization", why: "Right. The app decides access and failure behaviour.", best: true },
        { text: "The model, if it’s told to be careful", why: "An instruction isn’t a permission system." },
        { text: "The user", why: "Users can’t authorize themselves." },
      ],
    },
  ],

  revealTitle: "Application and model",
  revealSub: "a fictional shopping app’s assistant, simplified",
  reveal: [
    { when: "Scope", what: "A basic assistant generates responses to general support questions. Real-time order status isn’t available in this version. A future version could have the application fetch an authenticated user’s authorized status from its own service. We aren’t building that today." },
    { when: "The flow", what: "The question goes from the client to the application server. The server does basic validation and applicable access checks, then sends the app’s instructions and the question to an existing model service. It receives the response and shows it. We aren’t training a foundation model." },
    { when: "Context", what: "Context is the information made available to the model for its response: the current question, selected earlier messages and the app’s instructions. Capacity is limited, and the exact limit depends on the model, so decide what to send." },
    { when: "Tokens", what: "Tokens are text’s processing units. One may be a whole word, part of a word, or punctuation: each word isn’t exactly one token. Usage varies with the model and the text, and matters for latency and cost. In a hypothetical request, 300 input + 200 output = 500 tokens." },
    { when: "When it’s slow", what: "No infinite spinner: use a timeout and a clear message. A timeout doesn’t guarantee the provider didn’t process the request. Before retrying, understand attempt limits and cost. Request IDs can avoid duplicate entries. This assistant generates answers and doesn’t execute actions." },
    { when: "When it’s wrong", what: "A model can give a convincing answer that’s factually wrong or unsupported by what it was given, sometimes called a hallucination. Safe instructions and response checks help, but no single instruction guarantees accuracy. Understand authorization, minimization and data handling before sending real customer data." },
  ],

  explain: {
    title: "The words from today",
    items: [
      { term: "Model service", what: "An existing AI model your application calls. You aren’t training it.", example: "The server sends instructions and a question, and gets a response" },
      { term: "Context", what: "The information made available to the model when it generates a response.", example: "The question, selected messages and app instructions" },
      { term: "Token", what: "A processing unit of text: a word, part of a word, or punctuation.", example: "Each word isn’t exactly one token" },
      { term: "Hallucination", what: "A convincing answer that’s factually wrong or unsupported by the information provided.", example: "A made-up order status" },
      { term: "Minimization", what: "Sending only the data that’s actually needed.", example: "Think before sending real customer data to the model" },
    ],
  },

  concept: {
    cards: [{
      name: "The application decides",
      examples: ["How a request is handled", "What the user may access", "What happens on failure"],
      moves: ["Validate and check access", "Choose the context", "Set timeouts and honest messages"],
    }, {
      name: "The model generates",
      examples: ["Output from the supplied input", "Limited by its context capacity"],
      moves: ["Don’t assume it knows your data", "Don’t treat confidence as accuracy", "Don’t make it your authorization"],
    }],
    rule: "The screen says AI, but the approach stays the same: requirements, flow, failures and trade-offs.",
  },

  post: [
    {
      id: "post-1",
      prompt: "What does the application server do before calling the model service?",
      choices: [
        { text: "Basic validation and applicable access checks", why: "Right. Then it calls the model with instructions and the question.", best: true },
        { text: "Trains the model on the question", why: "We use an existing model." },
        { text: "Nothing: the client calls the model and the app stays out", why: "The application decides how requests are handled." },
      ],
    },
    {
      id: "post-2",
      prompt: "What’s true about tokens?",
      choices: [
        { text: "A token can be a word, part of a word, or punctuation, and usage varies", why: "Yes. There’s no rule that each word is exactly one token.", best: true },
        { text: "Every word is exactly one token", why: "That isn’t a rule." },
        { text: "Only output counts", why: "Input and output tokens are both used." },
      ],
    },
    {
      id: "post-3",
      scenario: "A conversation has grown very long.",
      prompt: "What’s a sensible approach to the history?",
      choices: [
        { text: "Select recent messages or summarize the history, accepting that useful context could be missed", why: "Right. Sending everything isn’t always needed or possible.", best: true },
        { text: "Always send everything: more context always means a better answer", why: "It isn’t always better, and it uses more tokens." },
        { text: "Never send earlier messages", why: "Earlier messages can be useful context." },
      ],
    },
    {
      id: "post-4",
      scenario: "The call to the model service times out.",
      prompt: "What do you know?",
      choices: [
        { text: "You didn’t get a response in time; the provider may still have processed it", why: "Yes. So understand limits and cost before retrying.", best: true },
        { text: "The provider definitely did nothing", why: "A timeout doesn’t guarantee that." },
        { text: "The answer was wrong", why: "You don’t have an answer." },
      ],
    },
    {
      id: "post-5",
      prompt: "A model gives a very confident answer. What does the confidence prove?",
      choices: [
        { text: "Nothing about accuracy", why: "Right. Safe instructions and checks help, but no single instruction guarantees it.", best: true },
        { text: "That it’s correct", why: "A confident tone isn’t proof." },
        { text: "That it checked your database", why: "It only has what it was given." },
      ],
    },
  ],

  estimates: [
    {
      id: "est-1",
      prompt: "A hypothetical request uses 300 input and 200 output tokens. How many in total?",
      given: ["300 input tokens", "200 output tokens", "Just an arithmetic example, not real usage or pricing"],
      unit: "tokens",
      answer: 500,
      tolerance: 0,
      working: ["300 + 200 = 500 tokens processed.", "Real cost depends on the provider, the model, and input and output pricing."],
    },
  ],

  build: {
    title: "Who does what?",
    intro: "Drag each piece to the job it does. You can also tap one, then tap a slot.",
    given: "A user asks a support question",
    rows: [["server", "model", "context"], ["timeout", "unknown", "request"]],
    rowLabels: ["The flow", "When things go wrong"],
    slots: {
      server: { role: "Validate the request and check access", answer: "server" },
      model: { role: "Generate output from the supplied input", answer: "model" },
      context: { role: "Choose the information the model gets", answer: "context" },
      timeout: { role: "Avoid an infinite spinner on a slow response", answer: "timeout" },
      unknown: { role: "Answer when the order status isn’t available", answer: "unknown" },
      request: { role: "Avoid duplicate entries when a question repeats", answer: "request" },
    },
    chips: [
      { id: "request", label: "Request ID", does: "identifying a request so a repeat can be handled" },
      { id: "guess", label: "A confident guess", does: "an answer unsupported by the information provided" },
      { id: "model", label: "Model service", does: "generating a response from its input" },
      { id: "unknown", label: "An honest ‘I don’t have that’", does: "saying what’s unavailable, and offering a next step" },
      { id: "server", label: "Application server", does: "handling requests, access and failure behaviour" },
      { id: "timeout", label: "Timeout and clear message", does: "limiting the wait, and telling the user" },
      { id: "context", label: "Context selection", does: "deciding what to send within a limited capacity" },
    ],
    done: "The server, the model and the context selection in the flow, then a timeout, an honest answer and a request ID for when things go wrong.",
  },

  canvas: {
    title: "Draw it from scratch: the basic assistant",
    brief: "Draw the basic flow. The client sends the question to the application server. The server calls an existing model service. The answer comes back the same way.",
    parts: ["client", "server", "model", "database", "cache", "cdn"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.12, y: 0.5 }, { id: "s", part: "server", x: 0.5, y: 0.5 },
        { id: "m", part: "model", x: 0.88, y: 0.5 },
      ],
      edges: [["c", "s"], ["s", "m"]],
    },
    why: {
      "client>server": "The question goes to the application first, which does validation and access checks and later shows the response.",
      "server>model": "The server sends the app’s instructions, the question and selected context to an existing model service.",
    },
    done: "Client to application to model. The model doesn’t talk to the client directly, so the application stays in charge of access, context and failures.",
  },

  followUps: [
    {
      q: "“Design an AI support assistant.”",
      answer: [
        "Clarify first: general help, or private account data too?",
        "The client sends the question to the server, which validates, checks access, and calls the model service with suitable context.",
        "Explain how you’d handle timeouts, token usage and unsupported answers.",
      ],
      say: "“Client to server, validation and access checks, the model with suitable context, and a plan for timeouts, tokens and unsupported answers.”",
    },
    {
      q: "“Should you send more conversation history?”",
      answer: [
        "More history can give helpful context.",
        "It can also raise token usage and the exposure of sensitive information.",
        "So select context based on the requirements.",
      ],
      say: "“More history can help, but it costs tokens and exposes more, so I’d select based on requirements.”",
      deeper: "Day 19",
    },
    {
      q: "“How would you add live order status later?”",
      answer: [
        "The application fetches the authenticated user’s authorized status from its own service.",
        "The permission check stays with the application.",
        "Then it provides that status in the assistant’s flow.",
      ],
      say: "“The app fetches what the user is authorized to see, then passes it in. The model doesn’t replace authorization.”",
      deeper: "Day 20",
    },
  ],

  faq: [
    { q: "Are we training an AI model?", a: "No. We’re using an existing model in an application, not training a foundation model." },
    { q: "How many tokens does a word take?", a: "There’s no fixed rule. A token can be a whole word, part of a word or punctuation, and usage varies by model and text." },
    { q: "Is 500 tokens a real price or usage figure?", a: "No. It’s only an arithmetic example. Real cost depends on the provider, the model, and input and output pricing." },
    { q: "Is this a real assistant?", a: "No. It’s a fictional teaching example." },
  ],

  interview: [
    "Clarify: general help, or private account data too?",
    "Client to application server, with validation and access checks.",
    "Call the model service with appropriate context; show the response.",
    "Handle timeouts, token usage and unsupported answers.",
    "Name a trade-off: more history helps, and costs tokens and exposure.",
  ],

  cheatsheet: {
    title: "Day 17 · A simple AI assistant",
    points: [
      "The model only has what the application provides",
      "The application decides access and failure behaviour",
      "Context is limited, so choose what to send",
      "A token isn’t exactly one word",
      "A timeout doesn’t mean the provider did nothing",
      "A confident tone isn’t proof of accuracy",
      "Unavailable data: say so, and offer a next step",
    ],
  },

  linkedin:
    "Day 17/21 of System Design Essentials with Klymb.\n\nThe question says AI, but the approach stays the same: requirements, flow, failures, trade-offs.\n\nThe model only knows what the application gives it, the application stays in charge of access, and a confident tone isn’t proof of accuracy.\n\n#SystemDesign #Klymb",

  nextDay: "Day 18: RAG. How does the assistant find the right company document, and why doesn’t a source guarantee a correct answer?",
};

const hi: DayCopy = {
  tag: "Day 17 · Simple AI assistant",
  hookLines: [
    "“Design an AI support assistant.”",
    "User poochta hai: “Mera order kahan hai?”",
    "Kya model ko automatically pata hai?",
  ],
  question: "Application aur model ke beech actually kya hota hai, aur kiski zimmedari kya hai?",

  pre: [
    {
      id: "pre-1",
      scenario: "User support assistant se poochta hai, “Mera order kahan hai?”",
      prompt: "Kya model ko automatically uske account aur latest order ka pata hai?",
      choices: [
        { text: "Nahi: answer us information par depend karta hai jo application provide kare", why: "Sahi. Model supplied input par kaam karta hai.", best: true },
        { text: "Haan: AI models ko har user ka data pata hota hai", why: "User ka account use automatically nahi milta." },
        { text: "Haan, agar question polite ho", why: "Tone se data nahi milta." },
      ],
    },
    {
      id: "pre-2",
      scenario: "Is pehle version mein real-time order status nahi hai, aur user wahi poochta hai.",
      prompt: "Assistant ko kya karna chahiye?",
      choices: [
        { text: "Batana chahiye ki abhi woh information nahi hai, aur suitable support path dena chahiye", why: "Haan. Guess karne se confident par unsupported answer milega.", best: true },
        { text: "Achha sa guess karna chahiye", why: "Confident tone accuracy ka proof nahi." },
        { text: "Infinite spinner dikhana chahiye", why: "Isse kisi ko madad nahi." },
      ],
    },
    {
      id: "pre-3",
      prompt: "User kya access kar sakta hai, yeh check karne ki zimmedari kiski hai?",
      choices: [
        { text: "Application ki: model authorization ka trusted replacement nahi hai", why: "Sahi. App access aur failure behaviour decide karti hai.", best: true },
        { text: "Model ki, agar use careful rehne ko kaha ho", why: "Instruction permission system nahi hai." },
        { text: "User ki", why: "User khud ko authorize nahi kar sakta." },
      ],
    },
  ],

  revealTitle: "Application aur model",
  revealSub: "ek fictional shopping app ka assistant, simplified",
  reveal: [
    { when: "Scope", what: "Basic assistant general support questions ka response generate karta hai. Real-time order status is version mein nahi hai. Future version mein application authenticated user ka authorized status apni service se la sakti hai. Aaj hum woh nahi bana rahe." },
    { when: "Flow", what: "Question client se application server ko jaata hai. Server basic validation aur applicable access checks karke app ke instructions aur question existing model service ko bhejta hai. Response lekar user ko dikhata hai. Hum foundation model train nahi kar rahe." },
    { when: "Context", what: "Context woh information hai jo response ke liye model ko di jaati hai: current question, selected earlier messages aur app instructions. Capacity limited hai, aur exact limit model par depend karti hai, toh decide karo kya bhejna hai." },
    { when: "Tokens", what: "Tokens text ke processing units hain. Ek token poora word, word ka part ya punctuation ho sakta hai: har word exactly ek token nahi. Usage model aur text se badalta hai, aur latency aur cost mein relevant hai. Hypothetical request mein 300 input + 200 output = 500 tokens." },
    { when: "Jab slow ho", what: "Infinite spinner nahi: timeout aur clear message. Timeout guarantee nahi karta ki provider ne process nahi kiya. Retry se pehle attempt limit aur cost samjho. Request IDs duplicate entries se bacha sakte hain. Yeh assistant answer generate karta hai, action execute nahi karta." },
    { when: "Jab galat ho", what: "Model convincing answer de sakta hai jo factually galat ho ya provided information se supported na ho. Ise kabhi hallucination kehte hain. Safe instructions aur response checks madad karte hain, par koi single instruction accuracy guarantee nahi karti. Real customer data bhejne se pehle authorization, minimization aur data handling samjho." },
  ],

  explain: {
    title: "Aaj ke words",
    items: [
      { term: "Model service", what: "Existing AI model jise aapki application call karti hai. Aap use train nahi kar rahe.", example: "Server instructions aur question bhejta hai, response paata hai" },
      { term: "Context", what: "Woh information jo response generate karte waqt model ko di jaati hai.", example: "Question, selected messages aur app instructions" },
      { term: "Token", what: "Text ka processing unit: word, word ka part ya punctuation.", example: "Har word exactly ek token nahi" },
      { term: "Hallucination", what: "Convincing answer jo factually galat ho ya provided information se supported na ho.", example: "Banaya hua order status" },
      { term: "Minimization", what: "Sirf utna data bhejna jitna sach mein chahiye.", example: "Model ko real customer data bhejne se pehle socho" },
    ],
  },

  concept: {
    cards: [{
      name: "Application decide karti hai",
      examples: ["Request kaise handle hogi", "User kya access kar sakta hai", "Failure par kya hoga"],
      moves: ["Validate aur access check karo", "Context chuno", "Timeouts aur honest messages rakho"],
    }, {
      name: "Model generate karta hai",
      examples: ["Supplied input se output", "Context capacity se limited"],
      moves: ["Mat maano ki use aapka data pata hai", "Confidence ko accuracy mat samjho", "Use apna authorization mat banao"],
    }],
    rule: "Screen par AI likha hai, par approach wahi hai: requirements, flow, failures aur trade-offs.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Model service call karne se pehle application server kya karta hai?",
      choices: [
        { text: "Basic validation aur applicable access checks", why: "Sahi. Phir woh instructions aur question ke saath model call karta hai.", best: true },
        { text: "Question par model ko train karta hai", why: "Hum existing model use karte hain." },
        { text: "Kuch nahi: client model call karta hai aur app bahar rehti hai", why: "Requests kaise handle hongi, yeh application decide karti hai." },
      ],
    },
    {
      id: "post-2",
      prompt: "Tokens ke baare mein kya sach hai?",
      choices: [
        { text: "Token word, word ka part ya punctuation ho sakta hai, aur usage badalta hai", why: "Haan. Har word exactly ek token, aisa rule nahi.", best: true },
        { text: "Har word exactly ek token hai", why: "Aisa rule nahi hai." },
        { text: "Sirf output count hota hai", why: "Input aur output dono tokens use hote hain." },
      ],
    },
    {
      id: "post-3",
      scenario: "Conversation bahut lambi ho gayi hai.",
      prompt: "History ke liye sensible approach kya hai?",
      choices: [
        { text: "Recent messages select karo ya history summarize karo, yeh maan kar ki useful context chhoot sakta hai", why: "Sahi. Sab bhejna hamesha zaroori ya possible nahi.", best: true },
        { text: "Hamesha sab bhejo: zyada context matlab hamesha better answer", why: "Hamesha better nahi, aur tokens zyada lagte hain." },
        { text: "Kabhi earlier messages mat bhejo", why: "Earlier messages useful context ho sakte hain." },
      ],
    },
    {
      id: "post-4",
      scenario: "Model service ki call timeout ho jaati hai.",
      prompt: "Aapko kya pata hai?",
      choices: [
        { text: "Response time par nahi mila; provider ne phir bhi process kiya ho sakta hai", why: "Haan. Isliye retry se pehle limits aur cost samjho.", best: true },
        { text: "Provider ne definitely kuch nahi kiya", why: "Timeout yeh guarantee nahi karta." },
        { text: "Answer galat tha", why: "Aapke paas answer hi nahi hai." },
      ],
    },
    {
      id: "post-5",
      prompt: "Model bahut confident answer deta hai. Confidence kya prove karta hai?",
      choices: [
        { text: "Accuracy ke baare mein kuch nahi", why: "Sahi. Safe instructions aur checks madad karte hain, par koi single instruction guarantee nahi deti.", best: true },
        { text: "Ki answer sahi hai", why: "Confident tone proof nahi." },
        { text: "Ki usne aapka database check kiya", why: "Uske paas sirf wahi hai jo use diya gaya." },
      ],
    },
  ],

  estimates: [
    {
      id: "est-1",
      prompt: "Hypothetical request mein 300 input aur 200 output tokens hain. Total kitne?",
      given: ["300 input tokens", "200 output tokens", "Sirf arithmetic example, real usage ya pricing nahi"],
      unit: "tokens",
      answer: 500,
      tolerance: 0,
      working: ["300 + 200 = 500 tokens process hue.", "Real cost provider, model aur input-output pricing par depend karti hai."],
    },
  ],

  build: {
    title: "Kaun kya karta hai?",
    intro: "Har piece ko uske kaam par drag karo. Ya ek tap karo, phir slot tap karo.",
    given: "User support question poochta hai",
    rows: [["server", "model", "context"], ["timeout", "unknown", "request"]],
    rowLabels: ["Flow", "Jab kuch galat ho"],
    slots: {
      server: { role: "Request validate karo aur access check karo", answer: "server" },
      model: { role: "Supplied input se output generate karo", answer: "model" },
      context: { role: "Chuno ki model ko kya information mile", answer: "context" },
      timeout: { role: "Slow response par infinite spinner se bacho", answer: "timeout" },
      unknown: { role: "Order status na ho toh jawab do", answer: "unknown" },
      request: { role: "Question repeat ho toh duplicate entries se bacho", answer: "request" },
    },
    chips: [
      { id: "request", label: "Request ID", does: "request ko identify karna taaki repeat handle ho" },
      { id: "guess", label: "Confident guess", does: "provided information se unsupported answer" },
      { id: "model", label: "Model service", does: "input se response generate karna" },
      { id: "unknown", label: "Honest ‘mere paas nahi hai’", does: "batana kya unavailable hai, aur next step dena" },
      { id: "server", label: "Application server", does: "requests, access aur failure behaviour handle karna" },
      { id: "timeout", label: "Timeout aur clear message", does: "wait limit karna, aur user ko batana" },
      { id: "context", label: "Context selection", does: "limited capacity mein decide karna kya bhejna hai" },
    ],
    done: "Flow mein server, model aur context selection, phir galat hone par timeout, honest answer aur request ID.",
  },

  canvas: {
    title: "Scratch se draw karo: basic assistant",
    brief: "Basic flow draw karo. Client question application server ko bhejta hai. Server existing model service ko call karta hai. Answer usi raaste wapas aata hai.",
    parts: ["client", "server", "model", "database", "cache", "cdn"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.12, y: 0.5 }, { id: "s", part: "server", x: 0.5, y: 0.5 },
        { id: "m", part: "model", x: 0.88, y: 0.5 },
      ],
      edges: [["c", "s"], ["s", "m"]],
    },
    why: {
      "client>server": "Question pehle application ko jaata hai, jo validation aur access checks karti hai aur baad mein response dikhati hai.",
      "server>model": "Server app ke instructions, question aur selected context existing model service ko bhejta hai.",
    },
    done: "Client se application se model. Model client se directly baat nahi karta, isliye access, context aur failures application ke haath mein rehte hain.",
  },

  followUps: [
    {
      q: "“Design an AI support assistant.”",
      answer: [
        "Pehle clarify karo: general help, ya private account data bhi?",
        "Client question server ko bhejta hai, jo validate karta hai, access check karta hai, aur suitable context ke saath model service call karta hai.",
        "Timeouts, token usage aur unsupported answers ka approach explain karo.",
      ],
      say: "“Client se server, validation aur access checks, suitable context ke saath model, aur timeouts, tokens aur unsupported answers ka plan.”",
    },
    {
      q: "“Kya zyada conversation history bhejni chahiye?”",
      answer: [
        "Zyada history helpful context de sakti hai.",
        "Token usage aur sensitive information ka exposure bhi badha sakti hai.",
        "Isliye context selection requirements ke basis par karo.",
      ],
      say: "“Zyada history madad kar sakti hai, par tokens aur exposure badhata hai, toh requirements ke hisaab se chunuga.”",
      deeper: "Day 19",
    },
    {
      q: "“Baad mein live order status kaise add karoge?”",
      answer: [
        "Application authenticated user ka authorized status apni service se laati hai.",
        "Permission check application ki zimmedari rehti hai.",
        "Phir woh status assistant ke flow mein deti hai.",
      ],
      say: "“App wahi laati hai jo user dekh sakta hai, phir use aage deti hai. Model authorization ko replace nahi karta.”",
      deeper: "Day 20",
    },
  ],

  faq: [
    { q: "Kya hum AI model train kar rahe hain?", a: "Nahi. Hum existing model ko application mein use kar rahe hain, foundation model train nahi kar rahe." },
    { q: "Ek word mein kitne tokens hote hain?", a: "Koi fixed rule nahi. Token poora word, word ka part ya punctuation ho sakta hai, aur usage model aur text se badalta hai." },
    { q: "Kya 500 tokens real price ya usage hai?", a: "Nahi. Yeh sirf arithmetic example hai. Real cost provider, model aur input-output pricing par depend karti hai." },
    { q: "Kya yeh real assistant hai?", a: "Nahi. Yeh ek fictional teaching example hai." },
  ],

  interview: [
    "Clarify karo: general help, ya private account data bhi?",
    "Client se application server, validation aur access checks ke saath.",
    "Appropriate context ke saath model service call karo; response dikhao.",
    "Timeouts, token usage aur unsupported answers handle karo.",
    "Trade-off bolo: zyada history madad karti hai, aur tokens aur exposure badhati hai.",
  ],

  cheatsheet: {
    title: "Day 17 · Simple AI assistant",
    points: [
      "Model ke paas sirf wahi hai jo application de",
      "Application access aur failure behaviour decide karti hai",
      "Context limited hai, toh chuno kya bhejna hai",
      "Token exactly ek word nahi hota",
      "Timeout ka matlab provider ne kuch nahi kiya, yeh nahi",
      "Confident tone accuracy ka proof nahi",
      "Data unavailable ho toh batao, aur next step do",
    ],
  },

  linkedin:
    "Day 17/21: System Design Essentials with Klymb.\n\nQuestion mein AI likha hai, par approach wahi hai: requirements, flow, failures, trade-offs.\n\nModel ko sirf wahi pata hai jo application de, access application ke haath mein rehta hai, aur confident tone accuracy ka proof nahi.\n\n#SystemDesign #Klymb",

  nextDay: "Day 18: RAG. Assistant sahi company document kaise dhoondhega, aur source milna correct answer ki guarantee kyun nahi?",
};

export const essentialsDaySeventeen: Day = {
  day: 17,
  of: 21,
  app: "An AI support assistant",
  minutes: 18,
  hook: { date: "Fictional example" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/essentials-day-17.mp4", poster: "/videos/system-design/essentials-day-17-poster.jpg", minutes: 6, lang: "Hinglish",
    // One horizontal cut with the captions burned in: it plays in the wide frame, and with no caption lines there's no subtitle switch.
    wide: { src: "/api/video/essentials-day-17.mp4", poster: "/videos/system-design/essentials-day-17-poster.jpg" },
  },
};
