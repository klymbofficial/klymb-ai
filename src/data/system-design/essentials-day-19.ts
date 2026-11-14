/**
 * Day 19 of "System Design Essentials": AI latency, cost and model choices.
 * Built from the Day 19 video script. Models A and B and every number here are
 * hypothetical: no real price, performance or ranking is claimed.
 */

import type { Day, DayCopy } from "./types";

const en: DayCopy = {
  tag: "Day 19 · AI latency and cost",
  hookLines: [
    "The answer is taking a long time.",
    "The team says: “The AI model is slow.”",
    "Did anyone measure where the delay is?",
  ],
  question: "Where does an AI request’s time and cost really go, and what can you change without hurting the answers?",

  pre: [
    {
      id: "pre-1",
      scenario: "Answers are slow and the team wants to replace the model.",
      prompt: "What should come first?",
      choices: [
        { text: "Measure the request in stages: queue, retrieval and model", why: "Right. If retrieval is slow, replacing the model may not solve it.", best: true },
        { text: "Replace the model straight away", why: "The delay may be somewhere else." },
        { text: "Send more context, so it thinks better", why: "That can add tokens without helping." },
      ],
    },
    {
      id: "pre-2",
      scenario: "You turn on streaming, so the answer’s first part shows as soon as it’s ready.",
      prompt: "Does that cut the total time?",
      choices: [
        { text: "Not guaranteed: first visible output and complete answer are separate metrics", why: "Yes. The user sees progress sooner, and that’s a different number.", best: true },
        { text: "Yes: streaming always reduces total work", why: "It doesn’t guarantee that." },
        { text: "Yes: the answer gets shorter", why: "Streaming doesn’t shorten it." },
      ],
    },
    {
      id: "pre-3",
      scenario: "Answers come from a public FAQ, and another feature gives private, user-specific answers.",
      prompt: "Which is safer to consider for caching across users?",
      choices: [
        { text: "The public FAQ, with a freshness policy; reusing a private answer can be a data leak", why: "Right. Permissions, tenant boundaries and expiry all matter.", best: true },
        { text: "The private answers, as they’re the most valuable", why: "Showing them to someone else is a leak." },
        { text: "Both: similar questions always mean the same thing", why: "They don’t always have the same meaning or access rights." },
      ],
    },
  ],

  revealTitle: "Measure, then choose",
  revealSub: "hypothetical numbers and models, no real prices",
  reveal: [
    { when: "The request’s journey", what: "A request can wait, documents can be retrieved, and the model generates a response. Measure total time in pieces. Streaming shows the first part as soon as it’s ready, so the user sees progress sooner. First output and complete answer are separate metrics." },
    { when: "Input and output tokens", what: "Input can hold the question and supplied context; output is the generated answer. In a hypothetical request, 300 + 200 = 500. Billing and limits vary by provider, so measure them separately. Irrelevant documents add tokens without improving the answer. Cut too hard and you can miss a policy condition." },
    { when: "Token rate limits", what: "A rate limit caps allowed usage in a period. Request-count and token limits differ: two requests are two counts but can use very different tokens. With a simplified 1,000-token budget a minute, two 400-token requests leave 200. Over budget: queue, reject or suggest a retry. An unlimited queue isn’t safe either." },
    { when: "Model routing", what: "Routing means choosing among available models by a rule or decision. In a hypothetical case, model A suffices for straightforward formatting, and model B was evaluated for complex questions. Consider quality, response time, cost and data handling. Don’t say “small is always enough” without a representative test set." },
    { when: "Fallback", what: "If the primary is unavailable, a fallback may be an alternative. Check that it meets the same privacy requirements, that quality is acceptable, and how cost and latency change. If none suits, an honest unavailable message beats a silently unsafe path. Keep retries bounded." },
    { when: "Caching and monitoring", what: "A public FAQ answer can be cached with a freshness policy. A private answer reused for someone else can be a data leak. Monitor first output time, total time, input and output tokens, errors and representative answer quality. A win on one metric can quietly damage another." },
  ],

  explain: {
    title: "The words from today",
    items: [
      { term: "Streaming", what: "Showing the first part of an answer as soon as it’s ready, rather than waiting for all of it.", example: "Progress appears sooner" },
      { term: "First output time", what: "How long until the user sees the first part of the answer. It’s separate from the complete answer’s time.", example: "Two clocks on one request" },
      { term: "Token rate limit", what: "A limit on the tokens allowed in a period. It’s different from a request-count limit.", example: "A simplified 1,000 tokens a minute" },
      { term: "Model routing", what: "Choosing among available models by a rule or decision.", example: "Hypothetical model A or B" },
      { term: "Fallback model", what: "An alternative when the primary model is unavailable, if it meets the requirements.", example: "It must be privacy-compatible" },
    ],
  },

  concept: {
    cards: [{
      name: "Measure it",
      examples: ["Queue, retrieval and model stages", "Input and output tokens", "Answer quality"],
      moves: ["Find where the delay is", "Separate first output from total time", "Keep quality in the same view"],
    }, {
      name: "Control it",
      examples: ["Context selection and token limits", "Routing, fallback and caching"],
      moves: ["Test routes on representative cases", "Check a fallback’s privacy", "Don’t share a private cached answer"],
    }],
    rule: "If improving one metric quietly damages another, the design hasn’t succeeded.",
  },

  post: [
    {
      id: "post-1",
      scenario: "Retrieval takes most of the request’s time.",
      prompt: "Will just replacing the model solve it?",
      choices: [
        { text: "It may not: measuring the stages shows retrieval is the slow part", why: "Right. Fix what’s slow.", best: true },
        { text: "Yes: the model is always the issue", why: "That’s the assumption to avoid." },
        { text: "Yes, if the new model is more expensive", why: "Cost doesn’t fix retrieval." },
      ],
    },
    {
      id: "post-2",
      prompt: "Two requests each count as one request. What about their tokens?",
      choices: [
        { text: "Their token usage can be very different", why: "Yes. That’s why request-count and token limits are separate.", best: true },
        { text: "They always use the same tokens", why: "Size varies with the question and context." },
        { text: "Tokens don’t apply to rate limits", why: "A token limit is one kind of rate limit." },
      ],
    },
    {
      id: "post-3",
      scenario: "To save money, you cut the context down aggressively.",
      prompt: "What’s the risk?",
      choices: [
        { text: "An important policy condition can be missed, so measure answer quality too", why: "Right. Cost may fall while correct answers fall too.", best: true },
        { text: "None: less context is always better", why: "It can remove what the answer needs." },
        { text: "Costs go up", why: "The concern here is quality." },
      ],
    },
    {
      id: "post-4",
      scenario: "The primary model is down, and the available fallback doesn’t meet your privacy requirements.",
      prompt: "What should you do?",
      choices: [
        { text: "Show an honest unavailable message", why: "Yes. That’s better than a silently unsafe path.", best: true },
        { text: "Use the fallback quietly", why: "That’s the unsafe path." },
        { text: "Retry forever", why: "Retries should be bounded." },
      ],
    },
    {
      id: "post-5",
      prompt: "Is “a small model is always enough for simple requests” a sound rule?",
      choices: [
        { text: "No: a simple-looking request can matter, so test on a representative set", why: "Right. Use measurable outcomes, not an assumption.", best: true },
        { text: "Yes: small is always enough", why: "That’s the claim to avoid." },
        { text: "Yes, and bigger is never worthwhile", why: "We claim no ranking either way." },
      ],
    },
  ],

  estimates: [
    {
      id: "est-1",
      prompt: "In a simplified budget of 1,000 tokens a minute, two requests use 400 tokens each. How many are left?",
      given: ["A budget of 1,000 tokens a minute (illustrative)", "2 requests of 400 tokens each"],
      unit: "tokens",
      answer: 200,
      tolerance: 0,
      working: ["2 × 400 = 800 tokens used.", "1,000 − 800 = 200 left.", "Real accounting and time windows depend on the provider or the design."],
    },
  ],

  build: {
    title: "Handle the spike and the budget",
    intro: "Drag each piece to the job it does. You can also tap one, then tap a slot.",
    given: "Traffic spikes, and there’s a budget",
    rows: [["stages", "stream", "limit"], ["route", "fallback", "cache"]],
    rowLabels: ["See it and pace it", "Choose and reuse"],
    slots: {
      stages: { role: "Find out where the delay really is", answer: "stages" },
      stream: { role: "Show the user progress sooner", answer: "stream" },
      limit: { role: "Control excessive token consumption", answer: "limit" },
      route: { role: "Send each request to a tested, suitable model", answer: "route" },
      fallback: { role: "Keep going if the primary is unavailable", answer: "fallback" },
      cache: { role: "Reuse an answer to a public FAQ", answer: "cache" },
    },
    chips: [
      { id: "cache", label: "Cache with a freshness policy", does: "reusing suitable results, within the permissions" },
      { id: "queue", label: "An unlimited queue", does: "letting the wait keep growing" },
      { id: "stream", label: "Streaming", does: "showing the first part as soon as it’s ready" },
      { id: "route", label: "Model routing", does: "choosing among models by a rule or decision" },
      { id: "stages", label: "Measuring each stage", does: "timing queue, retrieval and model separately" },
      { id: "fallback", label: "Privacy-compatible fallback", does: "an alternative that meets the same requirements" },
      { id: "limit", label: "Token rate limit", does: "capping the tokens allowed in a period" },
    ],
    done: "Measurement, streaming and token limits to see and pace it; tested routing, a privacy-compatible fallback and careful caching to choose and reuse.",
  },

  design: {
    title: "A traffic spike on a budget",
    brief: "An interviewer says: “Design an AI assistant under a traffic spike and a cost budget.” Write your answer: what you’d measure, what you’d control, and one trade-off.",
    constraints: [
      "Traffic can spike suddenly",
      "There’s a stated budget",
      "Answer quality still has to hold up",
    ],
    minChars: 100,
    walkthrough: [
      { heading: "One possible answer", points: ["Clarify the workload and latency requirements.", "Measure token usage and the request’s stages.", "Set token limits.", "Consider tested routing and a privacy-compatible fallback."] },
      { heading: "The trade-off", points: ["Evaluate changes in speed and cost against answer quality.", "For example, reducing context can lower cost, and lower correct answers too."] },
    ],
    checklist: [
      "I clarified the workload and latency",
      "I measured stages and tokens",
      "I set token limits",
      "I mentioned tested routing and a compatible fallback",
      "I evaluated against answer quality",
    ],
  },

  followUps: [
    {
      q: "“Design an AI assistant under a traffic spike and a cost budget.”",
      answer: [
        "Clarify the workload and latency requirements.",
        "Measure token usage and request stages, and set token limits.",
        "Consider tested routing and a privacy-compatible fallback, evaluating speed and cost against answer quality.",
      ],
      say: "“I’d clarify, measure stages and tokens, set limits, test routing and fallback, and evaluate everything against answer quality.”",
    },
    {
      q: "“The budget ran out. What now?”",
      answer: [
        "Depending on requirements, you can queue, reject, or suggest the user retries.",
        "An unlimited queue isn’t safe: the wait keeps growing.",
        "Be clear with the user about what’s happening.",
      ],
      say: "“Queue, reject or suggest a retry, based on requirements, but never an unlimited queue.”",
    },
    {
      q: "“Would you cache the answers?”",
      answer: [
        "A public FAQ answer can be cached with a suitable freshness policy.",
        "Reusing a private, user-specific answer for someone else can be a data leak.",
        "Similar-sounding questions don’t always have the same meaning or access rights.",
      ],
      say: "“Public answers with a freshness policy, yes. Private answers across users, no.”",
      deeper: "Day 20",
    },
  ],

  faq: [
    { q: "Are the token numbers real prices?", a: "No. They’re hypothetical. Billing and limits vary by provider, so don’t read them as real product pricing." },
    { q: "Is model A or B better?", a: "Neither is claimed to be. They’re hypothetical, and a choice needs a representative test set and measurable outcomes." },
    { q: "Does streaming make the model faster?", a: "It isn’t guaranteed to reduce total work or the final answer’s time. It shows progress sooner." },
    { q: "What’s the first thing to monitor?", a: "Together: first output time, total response time, input and output tokens, errors and representative answer quality." },
  ],

  interview: [
    "Clarify the workload and latency requirements.",
    "Measure the request’s stages and its token usage.",
    "Set token limits, and a plan when they’re reached.",
    "Consider tested routing and a privacy-compatible fallback.",
    "Evaluate speed and cost changes against answer quality.",
  ],

  cheatsheet: {
    title: "Day 19 · AI latency and cost",
    points: [
      "Measure queue, retrieval and model separately",
      "First output and complete answer are separate metrics",
      "Input and output tokens: measure them separately",
      "Request-count and token limits are different",
      "Routing needs a representative test set",
      "A fallback must meet the same privacy requirements",
      "Never reuse a private answer for someone else",
    ],
  },

  linkedin:
    "Day 19/21 of System Design Essentials with Klymb.\n\n“The AI model is slow.” Maybe. But did you measure the queue, the retrieval and the model separately?\n\nStreaming, token limits, tested routing and privacy-compatible fallbacks all help. And if cutting context saves money but loses correct answers, the design hasn’t succeeded.\n\n#SystemDesign #Klymb",

  nextDay: "Day 20: is the answer trustworthy, and could the assistant see another company’s private document?",
};

const hi: DayCopy = {
  tag: "Day 19 · AI latency aur cost",
  hookLines: [
    "Answer aane mein kaafi time lagta hai.",
    "Team kehti hai: “AI model slow hai.”",
    "Kya kisi ne measure kiya ki delay kahan hai?",
  ],
  question: "AI request ka time aur cost sach mein kahan jaata hai, aur answers bigaade bina kya badal sakte ho?",

  pre: [
    {
      id: "pre-1",
      scenario: "Answers slow hain aur team model badalna chahti hai.",
      prompt: "Pehle kya hona chahiye?",
      choices: [
        { text: "Request ko stages mein measure karo: queue, retrieval aur model", why: "Sahi. Retrieval slow hai toh sirf model badalne se solve nahi hoga.", best: true },
        { text: "Turant model badal do", why: "Delay kahin aur ho sakta hai." },
        { text: "Zyada context bhejo, taaki woh behtar soche", why: "Isse bina fayde tokens badh sakte hain." },
      ],
    },
    {
      id: "pre-2",
      scenario: "Aapne streaming on ki, toh answer ka first part ready hote hi dikhta hai.",
      prompt: "Kya isse total time kam hota hai?",
      choices: [
        { text: "Guarantee nahi: first visible output aur complete answer alag metrics hain", why: "Haan. User ko progress jaldi dikhti hai, par woh alag number hai.", best: true },
        { text: "Haan: streaming hamesha total work kam karti hai", why: "Yeh guarantee nahi." },
        { text: "Haan: answer chhota ho jaata hai", why: "Streaming use chhota nahi karti." },
      ],
    },
    {
      id: "pre-3",
      scenario: "Kuch answers public FAQ se aate hain, aur ek feature private, user-specific answers deta hai.",
      prompt: "Users ke beech caching ke liye kaunsa safer hai?",
      choices: [
        { text: "Public FAQ, freshness policy ke saath; private answer reuse karna data leak ho sakta hai", why: "Sahi. Permissions, tenant boundaries aur expiry zaroori hain.", best: true },
        { text: "Private answers, woh sabse valuable hain", why: "Kisi aur ko dikhana leak hai." },
        { text: "Dono: similar questions ka matlab hamesha same hota hai", why: "Meaning ya access rights hamesha same nahi hote." },
      ],
    },
  ],

  revealTitle: "Measure karo, phir chuno",
  revealSub: "hypothetical numbers aur models, real prices nahi",
  reveal: [
    { when: "Request ki journey", what: "Request wait kar sakti hai, documents retrieve ho sakte hain, aur model response generate karta hai. Total time pieces mein measure karo. Streaming first part ready hote hi dikhati hai, toh progress jaldi dikhti hai. First output aur complete answer alag metrics hain." },
    { when: "Input aur output tokens", what: "Input mein question aur supplied context; output generated answer. Hypothetical request mein 300 + 200 = 500. Billing aur limits provider se badalte hain, toh alag measure karo. Irrelevant documents bina fayde tokens badhate hain. Bahut zyada kaato toh policy condition miss ho sakti hai." },
    { when: "Token rate limits", what: "Rate limit ek period mein allowed usage cap karta hai. Request-count aur token limit alag hain: do requests do counts hain par tokens bahut alag ho sakte hain. Simplified 1,000-token budget mein do 400-token requests ke baad 200 bachte hain. Budget khatam: queue, reject ya retry suggest. Unlimited queue bhi safe nahi." },
    { when: "Model routing", what: "Routing matlab rule ya decision se available models mein se chunna. Hypothetical case mein straightforward formatting ke liye model A sufficient, aur complex question ke liye model B evaluated. Quality, response time, cost aur data handling dekho. Representative test set ke bina “small is always enough” mat bolo." },
    { when: "Fallback", what: "Primary unavailable ho toh fallback alternative ho sakta hai. Check karo: same privacy requirements, acceptable quality, aur cost aur latency kaise badlenge. Suitable na ho toh honest unavailable message silently unsafe path se behtar hai. Retries bounded rakho." },
    { when: "Caching aur monitoring", what: "Public FAQ answer freshness policy ke saath cache ho sakta hai. Private answer kisi aur ke liye reuse karna data leak ho sakta hai. First output time, total time, input-output tokens, errors aur representative answer quality monitor karo. Ek metric ki jeet doosre ko chupchaap bigaad sakti hai." },
  ],

  explain: {
    title: "Aaj ke words",
    items: [
      { term: "Streaming", what: "Poore answer ka wait kiye bina first part ready hote hi dikhana.", example: "Progress jaldi dikhti hai" },
      { term: "First output time", what: "User ko answer ka first part dikhne tak ka time. Complete answer ke time se alag.", example: "Ek request par do clocks" },
      { term: "Token rate limit", what: "Ek period mein allowed tokens ki limit. Request-count limit se alag.", example: "Simplified 1,000 tokens per minute" },
      { term: "Model routing", what: "Rule ya decision se available models mein se chunna.", example: "Hypothetical model A ya B" },
      { term: "Fallback model", what: "Primary unavailable hone par alternative, agar requirements meet kare.", example: "Privacy-compatible hona chahiye" },
    ],
  },

  concept: {
    cards: [{
      name: "Measure karo",
      examples: ["Queue, retrieval aur model stages", "Input aur output tokens", "Answer quality"],
      moves: ["Dhoondho delay kahan hai", "First output ko total time se alag rakho", "Quality ko saath mein dekho"],
    }, {
      name: "Control karo",
      examples: ["Context selection aur token limits", "Routing, fallback aur caching"],
      moves: ["Routes representative cases par test karo", "Fallback ki privacy check karo", "Private cached answer share mat karo"],
    }],
    rule: "Ek metric improve karke doosra chupchaap bigad raha ho, toh design successful nahi.",
  },

  post: [
    {
      id: "post-1",
      scenario: "Request ka zyada time retrieval leta hai.",
      prompt: "Kya sirf model badalne se solve hoga?",
      choices: [
        { text: "Shayad nahi: stages measure karne se dikhta hai ki retrieval slow hai", why: "Sahi. Jo slow hai use theek karo.", best: true },
        { text: "Haan: issue hamesha model hota hai", why: "Isi assumption se bachna hai." },
        { text: "Haan, agar naya model mehnga ho", why: "Cost se retrieval theek nahi hota." },
      ],
    },
    {
      id: "post-2",
      prompt: "Do requests ek-ek request count hoti hain. Unke tokens ka kya?",
      choices: [
        { text: "Unka token usage bahut alag ho sakta hai", why: "Haan. Isliye request-count aur token limits alag hain.", best: true },
        { text: "Tokens hamesha same hote hain", why: "Size question aur context se badalta hai." },
        { text: "Rate limits par tokens lagte hi nahi", why: "Token limit ek tarah ki rate limit hai." },
      ],
    },
    {
      id: "post-3",
      scenario: "Paise bachane ke liye aapne context aggressively kaat diya.",
      prompt: "Risk kya hai?",
      choices: [
        { text: "Important policy condition miss ho sakti hai, toh answer quality bhi measure karo", why: "Sahi. Cost ghat sakti hai, correct answers bhi.", best: true },
        { text: "Koi nahi: kam context hamesha behtar", why: "Answer ko jo chahiye woh hat sakta hai." },
        { text: "Cost badh jaati hai", why: "Yahan chinta quality ki hai." },
      ],
    },
    {
      id: "post-4",
      scenario: "Primary model down hai, aur available fallback aapki privacy requirements meet nahi karta.",
      prompt: "Kya karna chahiye?",
      choices: [
        { text: "Honest unavailable message dikhao", why: "Haan. Yeh silently unsafe path se behtar hai.", best: true },
        { text: "Chupchaap fallback use karo", why: "Yahi unsafe path hai." },
        { text: "Hamesha retry karte raho", why: "Retries bounded hone chahiye." },
      ],
    },
    {
      id: "post-5",
      prompt: "Kya “simple requests ke liye small model hamesha enough hai” sound rule hai?",
      choices: [
        { text: "Nahi: simple dikhne wali request important ho sakti hai, toh representative set par test karo", why: "Sahi. Assumption nahi, measurable outcomes use karo.", best: true },
        { text: "Haan: small hamesha enough hai", why: "Isi claim se bachna hai." },
        { text: "Haan, aur bada kabhi worth nahi", why: "Hum kisi taraf ranking claim nahi karte." },
      ],
    },
  ],

  estimates: [
    {
      id: "est-1",
      prompt: "1,000 tokens per minute ke simplified budget mein do requests 400-400 tokens leti hain. Kitne bache?",
      given: ["1,000 tokens per minute ka budget (illustrative)", "400 tokens ki 2 requests"],
      unit: "tokens",
      answer: 200,
      tolerance: 0,
      working: ["2 × 400 = 800 tokens use hue.", "1,000 − 800 = 200 bache.", "Real accounting aur time windows provider ya design par depend karte hain."],
    },
  ],

  build: {
    title: "Spike aur budget sambhalo",
    intro: "Har piece ko uske kaam par drag karo. Ya ek tap karo, phir slot tap karo.",
    given: "Traffic spike hai, aur budget bhi hai",
    rows: [["stages", "stream", "limit"], ["route", "fallback", "cache"]],
    rowLabels: ["Dekho aur pace karo", "Chuno aur reuse karo"],
    slots: {
      stages: { role: "Dhoondho delay sach mein kahan hai", answer: "stages" },
      stream: { role: "User ko progress jaldi dikhao", answer: "stream" },
      limit: { role: "Excessive token consumption control karo", answer: "limit" },
      route: { role: "Har request ko tested, suitable model par bhejo", answer: "route" },
      fallback: { role: "Primary unavailable ho toh chalte raho", answer: "fallback" },
      cache: { role: "Public FAQ ka answer reuse karo", answer: "cache" },
    },
    chips: [
      { id: "cache", label: "Freshness policy ke saath cache", does: "permissions ke andar suitable results reuse karna" },
      { id: "queue", label: "Unlimited queue", does: "wait ko badhte rehne dena" },
      { id: "stream", label: "Streaming", does: "first part ready hote hi dikhana" },
      { id: "route", label: "Model routing", does: "rule ya decision se model chunna" },
      { id: "stages", label: "Har stage measure karna", does: "queue, retrieval aur model ka time alag dekhna" },
      { id: "fallback", label: "Privacy-compatible fallback", does: "same requirements meet karne wala alternative" },
      { id: "limit", label: "Token rate limit", does: "ek period mein allowed tokens cap karna" },
    ],
    done: "Dekhne aur pace karne ke liye measurement, streaming aur token limits; chunne aur reuse ke liye tested routing, privacy-compatible fallback aur careful caching.",
  },

  design: {
    title: "Budget ke saath traffic spike",
    brief: "Interviewer kehta hai: “AI assistant ko traffic spike aur cost budget ke under design karo.” Apna answer likho: kya measure karoge, kya control karoge, aur ek trade-off.",
    constraints: [
      "Traffic achanak badh sakta hai",
      "Budget stated hai",
      "Answer quality bani rehni chahiye",
    ],
    minChars: 100,
    walkthrough: [
      { heading: "Ek possible answer", points: ["Workload aur latency requirements clarify karo.", "Token usage aur request stages measure karo.", "Token limits set karo.", "Tested routing aur privacy-compatible fallback consider karo."] },
      { heading: "Trade-off", points: ["Speed aur cost ke changes ko answer quality ke against evaluate karo.", "Jaise context kam karne se cost ghat sakti hai, aur correct answers bhi."] },
    ],
    checklist: [
      "Maine workload aur latency clarify ki",
      "Maine stages aur tokens measure kiye",
      "Maine token limits set ki",
      "Maine tested routing aur compatible fallback mention kiya",
      "Maine answer quality ke against evaluate kiya",
    ],
  },

  followUps: [
    {
      q: "“AI assistant ko traffic spike aur cost budget ke under design karo.”",
      answer: [
        "Workload aur latency requirements clarify karo.",
        "Token usage aur request stages measure karo, aur token limits set karo.",
        "Tested routing aur privacy-compatible fallback consider karo, speed aur cost ko answer quality ke against evaluate karte hue.",
      ],
      say: "“Clarify karunga, stages aur tokens measure karunga, limits lagaunga, routing aur fallback test karunga, aur sab answer quality ke against evaluate karunga.”",
    },
    {
      q: "“Budget khatam ho gaya. Ab?”",
      answer: [
        "Requirements ke hisaab se queue, reject ya user ko retry suggest kar sakte ho.",
        "Unlimited queue safe nahi: wait badhta jaata hai.",
        "User ko clearly batao kya ho raha hai.",
      ],
      say: "“Requirements ke hisaab se queue, reject ya retry suggest, par unlimited queue kabhi nahi.”",
    },
    {
      q: "“Kya answers cache karoge?”",
      answer: [
        "Public FAQ answer suitable freshness policy ke saath cache ho sakta hai.",
        "Private, user-specific answer kisi aur ke liye reuse karna data leak ho sakta hai.",
        "Similar-sounding questions ka meaning ya access rights hamesha same nahi hote.",
      ],
      say: "“Public answers freshness policy ke saath, haan. Users ke beech private answers, nahi.”",
      deeper: "Day 20",
    },
  ],

  faq: [
    { q: "Kya token numbers real prices hain?", a: "Nahi. Yeh hypothetical hain. Billing aur limits provider se badalte hain, toh inhe real product pricing mat samjho." },
    { q: "Model A behtar hai ya B?", a: "Kisi ka claim nahi. Dono hypothetical hain, aur choice ke liye representative test set aur measurable outcomes chahiye." },
    { q: "Kya streaming model ko fast banati hai?", a: "Total work ya final answer ka time kam hone ki guarantee nahi. Woh progress jaldi dikhati hai." },
    { q: "Sabse pehle kya monitor karein?", a: "Saath mein: first output time, total response time, input-output tokens, errors aur representative answer quality." },
  ],

  interview: [
    "Workload aur latency requirements clarify karo.",
    "Request ke stages aur token usage measure karo.",
    "Token limits set karo, aur limit par plan rakho.",
    "Tested routing aur privacy-compatible fallback consider karo.",
    "Speed aur cost ke changes answer quality ke against evaluate karo.",
  ],

  cheatsheet: {
    title: "Day 19 · AI latency aur cost",
    points: [
      "Queue, retrieval aur model alag measure karo",
      "First output aur complete answer alag metrics hain",
      "Input aur output tokens alag measure karo",
      "Request-count aur token limits alag hain",
      "Routing ko representative test set chahiye",
      "Fallback same privacy requirements meet kare",
      "Private answer kisi aur ke liye kabhi reuse nahi",
    ],
  },

  linkedin:
    "Day 19/21: System Design Essentials with Klymb.\n\n“AI model slow hai.” Shayad. Par kya queue, retrieval aur model alag measure kiye?\n\nStreaming, token limits, tested routing aur privacy-compatible fallbacks madad karte hain. Aur context kaatne se paise bache par correct answers gaye, toh design successful nahi.\n\n#SystemDesign #Klymb",

  nextDay: "Day 20: kya answer trustworthy hai, aur kya assistant doosri company ka private document dekh sakta hai?",
};

export const essentialsDayNineteen: Day = {
  day: 19,
  of: 21,
  app: "A document assistant",
  minutes: 18,
  hook: { date: "Fictional example" },
  copy: { en, hi },
  sources: [],
  video: {
    src: "/api/video/essentials-day-19.mp4", poster: "/videos/system-design/essentials-day-19-poster.jpg", minutes: 6, lang: "Hinglish",
    // One horizontal cut with the captions burned in: it plays in the wide frame, and with no caption lines there's no subtitle switch.
    wide: { src: "/api/video/essentials-day-19.mp4", poster: "/videos/system-design/essentials-day-19-poster.jpg" },
  },
};
