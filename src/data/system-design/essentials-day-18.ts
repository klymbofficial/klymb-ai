/**
 * Day 18 of "System Design Essentials": RAG and hybrid search.
 * Built from the Day 18 video script. The support documents and error code E-204
 * are fictional teaching examples.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Day 18 · RAG and hybrid search",
  hookLines: [
    "A user asks: “What’s the return policy?”",
    "The company updated the policy yesterday.",
    "Will the model automatically know?",
  ],
  question: "How does an assistant answer from current company documents, and why is that still no guarantee?",

  pre: [
    {
      id: "pre-1",
      scenario: "A company’s policy document was updated yesterday.",
      prompt: "Will the model automatically know the latest policy?",
      choices: [
        { text: "Not necessarily: it can retrieve the relevant information before answering", why: "Right. That approach is RAG.", best: true },
        { text: "Yes: models update themselves from company documents", why: "It doesn’t automatically have your documents." },
        { text: "Yes, if the policy is important", why: "Importance doesn’t put it in the context." },
      ],
    },
    {
      id: "pre-2",
      scenario: "A student opens the textbook to the relevant page before answering an exam question.",
      prompt: "Is their answer now guaranteed to be right?",
      choices: [
        { text: "No: they could read the wrong page or misunderstand it", why: "Yes. RAG is the same: useful, but no guarantee.", best: true },
        { text: "Yes: an open book means a correct answer", why: "It can still be the wrong page." },
        { text: "Yes, if the page has a citation", why: "A citation doesn’t prove the answer used it correctly." },
      ],
    },
    {
      id: "pre-3",
      scenario: "Search finds a relevant but restricted document.",
      prompt: "Can you give it to the model and write “don’t tell the user” in the prompt?",
      choices: [
        { text: "No: authorization must stop unauthorized content reaching the context at all", why: "Right. A prompt line isn’t a permission system.", best: true },
        { text: "Yes: the model follows instructions", why: "That isn’t enforcement." },
        { text: "Yes, if the document is marked secret", why: "The content still reached the context." },
      ],
    },
  ],

  revealTitle: "Find it first, then answer",
  revealSub: "fictional support documents, simplified",
  reveal: [
    { when: "Two journeys", what: "Ingestion makes documents searchable. Question answering finds useful authorized information and generates an answer. Keep them apart. Record each document’s owner and access permission. When documents change or are deleted, update the search index too, or the assistant can use an old policy." },
    { when: "Chunks", what: "Divide a long document into smaller passages called chunks: the user wants the relevant paragraph, not a hundred-page manual. Too small can miss context; too big can bring in irrelevant information. Chunk size is a design choice." },
    { when: "Embeddings", what: "An embedding model can turn each chunk into a list of numbers. A vector index can help find text with similar meaning. It isn’t magic understanding or perfect similarity. Keep the original passage, a source reference and its permissions alongside." },
    { when: "Answering", what: "The application establishes the user and access context. Search only considers sources they can see. Relevant passages go to the model as context, and showing a source lets the user verify. No suitable authorized passage? Say so, rather than guessing, and offer support." },
    { when: "Keyword, semantic, hybrid", what: "Keyword search suits exact words and codes, like E-204. Semantic search tries to find related meaning: “parcel wapas” can find “return shipment”. Hybrid combines both, with a merge and ranking strategy. It doesn’t always give the best result, so test on real examples." },
    { when: "When it’s wrong", what: "Don’t just say “the model is bad”. The right document may never have been indexed, search may have chosen the wrong chunk, or the model may have seen the right chunk and still answered wrongly. Evaluate retrieval and answer quality separately. Treat retrieved documents as data, not trusted instructions." },
  ],

  explain: {
    title: "The words from today",
    items: [
      { term: "RAG", what: "Retrieval-augmented generation: retrieve information, give it to the model as context, then generate an answer.", example: "Opening the textbook before answering" },
      { term: "Ingestion", what: "The journey that makes documents searchable.", example: "Documents, chunks, embeddings, index" },
      { term: "Chunk", what: "A smaller passage of a long document.", example: "The relevant paragraph, not the whole manual" },
      { term: "Embedding", what: "A list of numbers that represents text.", example: "Used to find similar meaning" },
      { term: "Vector index", what: "A structure that can help find text with similar meaning, using embeddings.", example: "Not perfect similarity" },
      { term: "Hybrid search", what: "Combining keyword and semantic results, with a merge and ranking strategy.", example: "E-204 and “parcel wapas” both work" },
    ],
  },

  concept: {
    cards: [{
      name: "Ingestion lane",
      examples: ["Chunks and embeddings", "A search index"],
      moves: ["Record owner and permissions", "Choose a chunk size", "Update the index when documents change"],
    }, {
      name: "Question lane",
      examples: ["Authorized search", "Model, answer and source"],
      moves: ["Establish access first", "Show the source to verify", "Say so if nothing suitable is found"],
    }],
    rule: "A source link doesn’t make an answer correct: check that the answer accurately represents the source.",
  },

  post: [
    {
      id: "post-1",
      prompt: "What’s the risk if the search index isn’t updated when a policy changes?",
      choices: [
        { text: "The assistant can use the old policy", why: "Right. Updates and deletions both need a process.", best: true },
        { text: "Nothing: the model will notice", why: "It only sees what retrieval gives it." },
        { text: "The document is deleted", why: "The problem is an out-of-date index." },
      ],
    },
    {
      id: "post-2",
      prompt: "What’s the trade-off in chunk size?",
      choices: [
        { text: "Too small can miss context; too big can bring in irrelevant information", why: "Yes. It’s a design choice.", best: true },
        { text: "Smaller is always better", why: "It can lose context." },
        { text: "Bigger is always better", why: "It can bring in irrelevant information." },
      ],
    },
    {
      id: "post-3",
      scenario: "A user searches for the exact error code E-204.",
      prompt: "Which approach is useful here?",
      choices: [
        { text: "Keyword search: it’s useful for exact words and codes", why: "Right. Semantic search helps more with paraphrases.", best: true },
        { text: "Only semantic search, since it always wins", why: "An exact code match is valuable here." },
        { text: "Neither: codes can’t be searched", why: "They can, by keyword." },
      ],
    },
    {
      id: "post-4",
      scenario: "No suitable authorized passage is found.",
      prompt: "What should the system do?",
      choices: [
        { text: "Say reliable information wasn’t found, and offer support or clarification", why: "Yes. Not a confident guess.", best: true },
        { text: "Answer from general knowledge, confidently", why: "That’s a guess the user can’t verify." },
        { text: "Use a restricted document instead", why: "Unauthorized content must not reach the context." },
      ],
    },
    {
      id: "post-5",
      scenario: "The assistant gave a wrong answer.",
      prompt: "What’s the better way to debug it?",
      choices: [
        { text: "Evaluate retrieval and answer quality separately", why: "Right. It may be the index, the chunk, or the answer.", best: true },
        { text: "Decide the model is bad and replace it", why: "The right document may never have been indexed." },
        { text: "Add “be correct” to the prompt", why: "That doesn’t tell you what went wrong." },
      ],
    },
  ],

  build: {
    title: "Build both RAG lanes",
    intro: "Drag each piece to the job it does. You can also tap one, then tap a slot.",
    given: "“Answer from company documents”",
    rows: [["chunks", "embed", "index"], ["auth", "hybrid", "source"]],
    rowLabels: ["Ingestion", "Answering a question"],
    slots: {
      chunks: { role: "Split a long document into smaller passages", answer: "chunks" },
      embed: { role: "Turn each passage into a list of numbers", answer: "embed" },
      index: { role: "Help find text with a similar meaning", answer: "index" },
      auth: { role: "Keep restricted content out of the context", answer: "auth" },
      hybrid: { role: "Find both exact codes and paraphrases", answer: "hybrid" },
      source: { role: "Let the user verify the answer", answer: "source" },
    },
    chips: [
      { id: "source", label: "Source reference", does: "showing where the answer came from" },
      { id: "prompt", label: "“Don’t tell the user” in the prompt", does: "an instruction, which isn’t a permission system" },
      { id: "index", label: "Vector index", does: "searching embeddings for similar meaning" },
      { id: "chunks", label: "Chunking", does: "dividing documents into smaller passages" },
      { id: "hybrid", label: "Hybrid search", does: "combining keyword and semantic results" },
      { id: "embed", label: "Embedding model", does: "representing text as a list of numbers" },
      { id: "auth", label: "Authorization in retrieval", does: "considering only the sources a user may see" },
    ],
    done: "Chunks, embeddings and an index for ingestion; authorization, hybrid search and a source for answering.",
  },

  canvas: {
    title: "Draw it from scratch: the question lane",
    brief: "Draw how a question is answered. The client asks the app server. The server asks retrieval for authorized passages, retrieval searches the source store, and the server gives those passages to the AI model as context.",
    parts: ["client", "server", "retrieval", "source", "model", "cache", "queue"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.1, y: 0.5 }, { id: "s", part: "server", x: 0.4, y: 0.5 },
        { id: "r", part: "retrieval", x: 0.66, y: 0.18 }, { id: "o", part: "source", x: 0.92, y: 0.18 },
        { id: "m", part: "model", x: 0.66, y: 0.84 },
      ],
      edges: [["c", "s"], ["s", "r"], ["r", "o"], ["s", "m"]],
    },
    why: {
      "client>server": "The application receives the question and establishes the user and their access context.",
      "server>retrieval": "The server asks for relevant passages, considering only the sources this user can see.",
      "retrieval>source": "Retrieval searches the indexed documents, and the authorization is enforced here too.",
      "server>model": "The relevant authorized passages go to the model as context, and it generates the answer.",
    },
    done: "The application stays in the middle: it gets authorized passages from retrieval and sends them to the model. Unauthorized text never reaches the model’s context.",
  },

  followUps: [
    {
      q: "“Design an assistant that answers from company documents.”",
      answer: [
        "Draw two lanes. Process documents into chunks and a searchable index.",
        "On a query, enforce the user’s permissions and consider keyword and semantic search.",
        "Give relevant authorized passages to the model, show the source, and plan for the no-result case.",
      ],
      say: "“Chunks and an index, permissions enforced on search, keyword plus semantic, authorized passages to the model, sources shown, and a no-result plan.”",
    },
    {
      q: "“Exact code or paraphrase: how do you handle both?”",
      answer: [
        "Keyword search suits exact codes, like E-204.",
        "Semantic search suits paraphrases, like “parcel wapas” for “return shipment”.",
        "Hybrid combines them with a ranking strategy. Test it on real examples.",
      ],
      say: "“Hybrid search, tested on real examples, because it doesn’t always give the best result.”",
    },
    {
      q: "“What if a document contains a malicious instruction?”",
      answer: [
        "Treat retrieved documents as data, not the application’s trusted instructions.",
        "A malicious instruction can try to confuse the model.",
        "We’ll handle this risk in detail on Day 20.",
      ],
      say: "“Retrieved text is data, not a trusted instruction.”",
      deeper: "Day 20",
    },
  ],

  faq: [
    { q: "Does RAG guarantee a correct answer?", a: "No. Search can find the wrong passage, or the model can misrepresent the right one. Check both." },
    { q: "Is hybrid search always the best choice?", a: "No. It doesn’t always give the best result for every question, so test retrieval on real examples." },
    { q: "Do embeddings mean the system understands the text?", a: "No. It’s a useful representation for finding similar meaning, not magic understanding or perfect similarity." },
    { q: "Are these real documents?", a: "No. The documents and the examples are fictional." },
  ],

  interview: [
    "Draw two lanes: ingestion and question answering.",
    "Process documents into chunks and a searchable index.",
    "Enforce the user’s permissions on the query.",
    "Consider keyword and semantic search, and give authorized passages to the model.",
    "Show the source, and handle the no-result case.",
  ],

  cheatsheet: {
    title: "Day 18 · RAG and hybrid search",
    points: [
      "Retrieve, give context, then generate",
      "Ingestion and question answering are separate journeys",
      "Chunk size is a design choice",
      "Keep the source and permissions with each chunk",
      "Keyword for exact codes, semantic for meaning, hybrid for both",
      "Authorization keeps content out of the context",
      "Nothing found: say so, don’t guess",
    ],
  },

  linkedin:
    "Day 18/21 of System Design Essentials with Klymb.\n\nRAG: find the relevant information, give it to the model as context, then generate the answer. Like opening the textbook before writing.\n\nBut you can still open the wrong page. So enforce permissions before the context, show sources, and evaluate retrieval and answers separately.\n\n#SystemDesign #Klymb",

  nextDay: "Day 19: as users grow, why might responses get slow and expensive? Latency, tokens and model choices.",
};

const hi: DayCopy = {
  tag: "Day 18 · RAG aur hybrid search",
  hookLines: [
    "User poochta hai: “Return policy kya hai?”",
    "Company ne policy kal hi update ki.",
    "Kya model ko automatically pata hogi?",
  ],
  question: "Assistant current company documents se answer kaise deta hai, aur yeh phir bhi guarantee kyun nahi?",

  pre: [
    {
      id: "pre-1",
      scenario: "Company ka policy document kal update hua.",
      prompt: "Kya model ko latest policy automatically pata hogi?",
      choices: [
        { text: "Zaroori nahi: woh answer se pehle relevant information retrieve kar sakta hai", why: "Sahi. Yahi approach RAG hai.", best: true },
        { text: "Haan: models company documents se khud update hote hain", why: "Aapke documents use automatically nahi milte." },
        { text: "Haan, agar policy important hai", why: "Important hone se woh context mein nahi aati." },
      ],
    },
    {
      id: "pre-2",
      scenario: "Student exam mein answer likhne se pehle textbook ka relevant page kholta hai.",
      prompt: "Kya uska answer ab guaranteed sahi hai?",
      choices: [
        { text: "Nahi: woh galat page padh sakta hai ya galat samajh sakta hai", why: "Haan. RAG bhi aisa hi hai: useful, par guarantee nahi.", best: true },
        { text: "Haan: khuli kitaab matlab sahi answer", why: "Page galat ho sakta hai." },
        { text: "Haan, agar page par citation hai", why: "Citation prove nahi karta ki answer ne use sahi use kiya." },
      ],
    },
    {
      id: "pre-3",
      scenario: "Search ko ek relevant par restricted document milta hai.",
      prompt: "Kya use model ko dekar prompt mein “user ko mat batana” likh sakte ho?",
      choices: [
        { text: "Nahi: authorization ko unauthorized content context tak pahunchne se hi rokna chahiye", why: "Sahi. Prompt ki line permission system nahi hai.", best: true },
        { text: "Haan: model instructions follow karta hai", why: "Yeh enforcement nahi." },
        { text: "Haan, agar document secret mark ho", why: "Content phir bhi context tak pahunch gaya." },
      ],
    },
  ],

  revealTitle: "Pehle dhoondho, phir answer do",
  revealSub: "fictional support documents, simplified",
  reveal: [
    { when: "Do journeys", what: "Ingestion documents ko searchable banata hai. Question answering useful authorized information dhoondhkar answer generate karta hai. Dono alag rakho. Har document ka owner aur access permission record karo. Documents update ya delete hon toh search index bhi update karo, warna assistant purani policy use kar sakta hai." },
    { when: "Chunks", what: "Long document ko smaller passages, yaani chunks, mein divide karo: user ko hundred-page manual nahi, relevant paragraph chahiye. Bahut chhota toh context miss, bahut bada toh irrelevant information. Chunk size design choice hai." },
    { when: "Embeddings", what: "Embedding model har chunk ko numbers ki list mein badal sakta hai. Vector index similar meaning wala text dhoondhne mein madad kar sakta hai. Yeh magic understanding ya perfect similarity nahi. Saath mein original passage, source reference aur permissions rakho." },
    { when: "Answer dena", what: "Application user aur access context establish karti hai. Search sirf woh sources dekhta hai jo user dekh sakta hai. Relevant passages model ko context ke roop mein jaate hain, aur source dikhane se user verify kar sakta hai. Suitable authorized passage nahi? Guess nahi, batao aur support do." },
    { when: "Keyword, semantic, hybrid", what: "Keyword search exact words aur codes ke liye, jaise E-204. Semantic search related meaning dhoondhne ki koshish karta hai: “parcel wapas” se “return shipment” mil sakta hai. Hybrid dono ko merge aur ranking strategy se jodta hai. Best result hamesha nahi, toh real examples par test karo." },
    { when: "Jab galat ho", what: "Sirf “model kharab hai” mat bolo. Sahi document index hi nahi hua ho sakta, search ne galat chunk chuna ho sakta, ya model ne sahi chunk dekhkar bhi galat answer diya ho sakta. Retrieval aur answer quality alag evaluate karo. Retrieved documents ko data samjho, trusted instruction nahi." },
  ],

  explain: {
    title: "Aaj ke words",
    items: [
      { term: "RAG", what: "Retrieval-augmented generation: information retrieve karo, model ko context do, phir answer generate karo.", example: "Answer se pehle textbook kholna" },
      { term: "Ingestion", what: "Documents ko searchable banane ki journey.", example: "Documents, chunks, embeddings, index" },
      { term: "Chunk", what: "Long document ka chhota passage.", example: "Poora manual nahi, relevant paragraph" },
      { term: "Embedding", what: "Numbers ki list jo text ko represent karti hai.", example: "Similar meaning dhoondhne ke liye" },
      { term: "Vector index", what: "Structure jo embeddings se similar meaning wala text dhoondhne mein madad karta hai.", example: "Perfect similarity nahi" },
      { term: "Hybrid search", what: "Keyword aur semantic results ko merge aur ranking strategy se jodna.", example: "E-204 aur “parcel wapas” dono chalein" },
    ],
  },

  concept: {
    cards: [{
      name: "Ingestion lane",
      examples: ["Chunks aur embeddings", "Search index"],
      moves: ["Owner aur permissions record karo", "Chunk size chuno", "Documents badlein toh index update karo"],
    }, {
      name: "Question lane",
      examples: ["Authorized search", "Model, answer aur source"],
      moves: ["Pehle access establish karo", "Verify ke liye source dikhao", "Kuch suitable na mile toh batao"],
    }],
    rule: "Source link se answer sahi nahi ho jaata: check karo ki answer source ko accurately represent karta hai.",
  },

  post: [
    {
      id: "post-1",
      prompt: "Policy badalne par search index update na ho toh risk kya hai?",
      choices: [
        { text: "Assistant purani policy use kar sakta hai", why: "Sahi. Updates aur deletions dono ko process chahiye.", best: true },
        { text: "Kuch nahi: model notice kar lega", why: "Use sirf wahi dikhta hai jo retrieval deta hai." },
        { text: "Document delete ho jaata hai", why: "Problem purana index hai." },
      ],
    },
    {
      id: "post-2",
      prompt: "Chunk size ka trade-off kya hai?",
      choices: [
        { text: "Bahut chhota context miss kar sakta hai; bahut bada irrelevant information la sakta hai", why: "Haan. Yeh design choice hai.", best: true },
        { text: "Chhota hamesha behtar", why: "Context kho sakta hai." },
        { text: "Bada hamesha behtar", why: "Irrelevant information aa sakti hai." },
      ],
    },
    {
      id: "post-3",
      scenario: "User exact error code E-204 search karta hai.",
      prompt: "Yahan kaunsa approach useful hai?",
      choices: [
        { text: "Keyword search: exact words aur codes ke liye useful", why: "Sahi. Semantic search paraphrases mein zyada madad karta hai.", best: true },
        { text: "Sirf semantic search, woh hamesha jeetta hai", why: "Yahan exact code match valuable hai." },
        { text: "Koi nahi: codes search nahi ho sakte", why: "Ho sakte hain, keyword se." },
      ],
    },
    {
      id: "post-4",
      scenario: "Koi suitable authorized passage nahi mila.",
      prompt: "System ko kya karna chahiye?",
      choices: [
        { text: "Batana chahiye ki reliable information nahi mili, aur support ya clarification dena chahiye", why: "Haan. Confident guess nahi.", best: true },
        { text: "General knowledge se confidently answer do", why: "Yeh guess hai jise user verify nahi kar sakta." },
        { text: "Uski jagah restricted document use karo", why: "Unauthorized content context tak nahi pahunchna chahiye." },
      ],
    },
    {
      id: "post-5",
      scenario: "Assistant ne galat answer diya.",
      prompt: "Debug karne ka behtar tareeka kya hai?",
      choices: [
        { text: "Retrieval aur answer quality alag evaluate karo", why: "Sahi. Index, chunk ya answer, kuch bhi ho sakta hai.", best: true },
        { text: "Model ko kharab maan kar badal do", why: "Sahi document index hi nahi hua ho sakta." },
        { text: "Prompt mein “sahi bolo” add karo", why: "Isse pata nahi chalta kya galat hua." },
      ],
    },
  ],

  build: {
    title: "RAG ki dono lanes banao",
    intro: "Har piece ko uske kaam par drag karo. Ya ek tap karo, phir slot tap karo.",
    given: "“Company documents se answer do”",
    rows: [["chunks", "embed", "index"], ["auth", "hybrid", "source"]],
    rowLabels: ["Ingestion", "Question ka answer"],
    slots: {
      chunks: { role: "Long document ko chhote passages mein baanto", answer: "chunks" },
      embed: { role: "Har passage ko numbers ki list banao", answer: "embed" },
      index: { role: "Similar meaning wala text dhoondhne mein madad karo", answer: "index" },
      auth: { role: "Restricted content ko context se bahar rakho", answer: "auth" },
      hybrid: { role: "Exact codes aur paraphrases dono dhoondho", answer: "hybrid" },
      source: { role: "User ko answer verify karne do", answer: "source" },
    },
    chips: [
      { id: "source", label: "Source reference", does: "dikhana ki answer kahan se aaya" },
      { id: "prompt", label: "Prompt mein “user ko mat batana”", does: "ek instruction, jo permission system nahi" },
      { id: "index", label: "Vector index", does: "embeddings mein similar meaning search karna" },
      { id: "chunks", label: "Chunking", does: "documents ko chhote passages mein baantna" },
      { id: "hybrid", label: "Hybrid search", does: "keyword aur semantic results jodna" },
      { id: "embed", label: "Embedding model", does: "text ko numbers ki list se represent karna" },
      { id: "auth", label: "Retrieval mein authorization", does: "sirf woh sources dekhna jo user dekh sakta hai" },
    ],
    done: "Ingestion ke liye chunks, embeddings aur index; answer ke liye authorization, hybrid search aur source.",
  },

  canvas: {
    title: "Scratch se draw karo: question lane",
    brief: "Draw karo question ka answer kaise banta hai. Client app server se poochta hai. Server retrieval se authorized passages maangta hai, retrieval source store mein search karta hai, aur server woh passages AI model ko context ke roop mein deta hai.",
    parts: ["client", "server", "retrieval", "source", "model", "cache", "queue"],
    model: {
      nodes: [
        { id: "c", part: "client", x: 0.1, y: 0.5 }, { id: "s", part: "server", x: 0.4, y: 0.5 },
        { id: "r", part: "retrieval", x: 0.66, y: 0.18 }, { id: "o", part: "source", x: 0.92, y: 0.18 },
        { id: "m", part: "model", x: 0.66, y: 0.84 },
      ],
      edges: [["c", "s"], ["s", "r"], ["r", "o"], ["s", "m"]],
    },
    why: {
      "client>server": "Application question leti hai aur user aur uska access context establish karti hai.",
      "server>retrieval": "Server relevant passages maangta hai, sirf woh sources jo yeh user dekh sakta hai.",
      "retrieval>source": "Retrieval indexed documents mein search karta hai, aur authorization yahan bhi enforce hota hai.",
      "server>model": "Relevant authorized passages context ke roop mein model ko jaate hain, aur woh answer generate karta hai.",
    },
    done: "Application beech mein rehti hai: retrieval se authorized passages lekar model ko deti hai. Unauthorized text kabhi model ke context tak nahi pahunchta.",
  },

  followUps: [
    {
      q: "“Company documents se answer dene wala assistant design karo.”",
      answer: [
        "Do lanes draw karo. Documents ko chunks aur searchable index mein process karo.",
        "Query par user ki permissions enforce karo, aur keyword aur semantic search consider karo.",
        "Relevant authorized passages model ko do, source dikhao, aur no-result case ka plan rakho.",
      ],
      say: "“Chunks aur index, search par permissions, keyword plus semantic, authorized passages model ko, sources dikhana, aur no-result plan.”",
    },
    {
      q: "“Exact code ya paraphrase: dono kaise handle karoge?”",
      answer: [
        "Keyword search exact codes ke liye, jaise E-204.",
        "Semantic search paraphrases ke liye, jaise “return shipment” ke liye “parcel wapas”.",
        "Hybrid dono ko ranking strategy se jodta hai. Real examples par test karo.",
      ],
      say: "“Hybrid search, real examples par tested, kyunki best result hamesha nahi milta.”",
    },
    {
      q: "“Document mein malicious instruction ho toh?”",
      answer: [
        "Retrieved documents ko data samjho, application ka trusted instruction nahi.",
        "Malicious instruction model ko confuse karne ki koshish kar sakti hai.",
        "Is risk ko Day 20 mein detail mein handle karenge.",
      ],
      say: "“Retrieved text data hai, trusted instruction nahi.”",
      deeper: "Day 20",
    },
  ],

  faq: [
    { q: "Kya RAG correct answer guarantee karta hai?", a: "Nahi. Search galat passage dhoondh sakta hai, ya model sahi passage ko galat represent kar sakta hai. Dono check karo." },
    { q: "Kya hybrid search hamesha best hai?", a: "Nahi. Har question ka best result hamesha nahi milta, toh real examples par retrieval test karo." },
    { q: "Kya embeddings ka matlab system text samajhta hai?", a: "Nahi. Yeh similar meaning dhoondhne ke liye useful representation hai, magic understanding ya perfect similarity nahi." },
    { q: "Kya yeh real documents hain?", a: "Nahi. Documents aur examples fictional hain." },
  ],

  interview: [
    "Do lanes draw karo: ingestion aur question answering.",
    "Documents ko chunks aur searchable index mein process karo.",
    "Query par user ki permissions enforce karo.",
    "Keyword aur semantic search consider karo, authorized passages model ko do.",
    "Source dikhao, aur no-result case handle karo.",
  ],

  cheatsheet: {
    title: "Day 18 · RAG aur hybrid search",
    points: [
      "Retrieve karo, context do, phir generate karo",
      "Ingestion aur question answering alag journeys hain",
      "Chunk size design choice hai",
      "Har chunk ke saath source aur permissions rakho",
      "Exact codes ke liye keyword, meaning ke liye semantic, dono ke liye hybrid",
      "Authorization content ko context se bahar rakhta hai",
      "Kuch na mile toh batao, guess mat karo",
    ],
  },

  linkedin:
    "Day 18/21: System Design Essentials with Klymb.\n\nRAG: relevant information dhoondho, model ko context do, phir answer generate karo. Jaise likhne se pehle textbook kholna.\n\nPar galat page bhi khul sakta hai. Isliye context se pehle permissions enforce karo, sources dikhao, aur retrieval aur answers alag evaluate karo.\n\n#SystemDesign #Klymb",

  nextDay: "Day 19: users badhne par response slow aur expensive kyun ho sakta hai? Latency, tokens aur model choices.",
};

export const essentialsDayEighteen: Day = {
  day: 18,
  of: 21,
  app: "A document assistant",
  minutes: 18,
  hook: { date: "Fictional example" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/essentials-day-18.mp4", poster: "/videos/system-design/essentials-day-18-poster.jpg", minutes: 5, lang: "Hinglish",
    // One horizontal cut with the captions burned in: it plays in the wide frame, and with no caption lines there's no subtitle switch.
    wide: { src: "/api/video/essentials-day-18.mp4", poster: "/videos/system-design/essentials-day-18-poster.jpg" },
  },
};
