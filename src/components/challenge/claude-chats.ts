/**
 * The Claude Challenge page's before/after conversations: for each of the five
 * skills, the same task asked the lazy way and the way the challenge teaches,
 * with what Claude answers each time. They are written out by hand (not live
 * calls) so the page is fast and every answer is one worth reading.
 *
 * The "after" prompts are written the way a person talks to Claude: who it
 * should be, who you are, what you want and what a good answer looks like.
 *
 * Text between ``` fences is shown as code.
 */

export type Turn = { role: "user" | "claude"; text: string };

export interface SkillChat {
  name: string;
  week: string;
  before: { title: string; chat: Turn[] };
  after: { title: string; chat: Turn[]; proof: string };
}

const code = (s: string) => "```\n" + s + "\n```";

export const SKILLS: SkillChat[] = [
  {
    name: "Prompting",
    week: "Week 1",
    before: {
      title: "You type a question and hope.",
      chat: [
        { role: "user", text: "explain prompt engineering" },
        { role: "claude", text: "Prompt engineering is the practice of designing inputs for AI models to get better outputs. It involves writing clear instructions, providing context, and iterating on the results. It is becoming an important skill as AI tools become more common." },
      ],
    },
    after: {
      title: "You write prompts that get it right first time.",
      chat: [
        {
          role: "user",
          text: "You are an AI educator who explains things to complete beginners without any jargon. Write me a LinkedIn post, under 150 words, that teaches prompt engineering. Show one weak prompt and one strong prompt side by side, then three benefits people will feel on day one. End with a question that gets comments, and add a one-line brief for an image to go with it.",
        },
        {
          role: "claude",
          text:
            "Most people use AI like a search bar, then wonder why the answers feel generic.\n\n" +
            "Weak: “Write about marketing.”\n" +
            "Strong: “You are a B2B copywriter. Write 3 subject lines for a webinar invite to HR managers. Under 8 words each. No emojis.”\n\n" +
            "Same tool. Only the second one is usable first time.\n\n" +
            "What changes on day one:\n" +
            "1. Fewer rewrites, so you finish sooner\n" +
            "2. Results you can repeat, not luck\n" +
            "3. Your judgment shows, not the tool's defaults\n\n" +
            "What's one prompt you'd rewrite today?\n\n" +
            "Image: split screen. Left, a one-line prompt and a messy reply. Right, a clear prompt and a clean reply. Caption: “Same AI. Better question.”",
        },
      ],
      proof: "Posted on LinkedIn",
    },
  },
  {
    name: "Context engineering",
    week: "Week 1",
    before: {
      title: "Same generic answer as everyone.",
      chat: [
        { role: "user", text: "Create a 30-day learning roadmap." },
        { role: "claude", text: "Here is a 30-day learning roadmap:\n\nWeek 1: Learn the basics\nWeek 2: Practise with small projects\nWeek 3: Build something bigger\nWeek 4: Review and share your work\n\nStay consistent and do not be afraid to ask questions!" },
      ],
    },
    after: {
      title: "Answers built around your goals.",
      chat: [
        {
          role: "user",
          text: "I'm a final-year B.Com student in Pune. I know Excel well and a little Python, and I can give one hour a day. I want a junior data analyst job by March. Make me a 30-day roadmap that builds on what I already know, skips what I don't need, and ends with one project I can talk through in an interview.",
        },
        {
          role: "claude",
          text:
            "You already think in spreadsheets, so I've mapped every new idea to the Excel feature you use today.\n\n" +
            "Days 1–8, SQL. GROUP BY is a pivot table, JOIN is VLOOKUP, WHERE is a filter. Analyst job posts ask for SQL more than Python.\n\n" +
            "Days 9–16, pandas. The same moves again in Python: load, clean, pivot, chart.\n\n" +
            "Days 17–26, your project. Take a public dataset of Indian retail sales and answer: which month sells most, which category is shrinking, where to spend next quarter's budget.\n\n" +
            "Days 27–30, show it. A one-page README, three charts, and a two-minute story you can tell in an interview.\n\n" +
            "Skipped on purpose: machine learning and Python syntax drills. Neither is asked of a junior analyst.",
        },
      ],
      proof: "Your personal roadmap",
    },
  },
  {
    name: "Artifacts",
    week: "Week 2",
    before: {
      title: "An idea for a portfolio. Someday.",
      chat: [
        { role: "user", text: "I should really make a portfolio website…" },
        { role: "claude", text: "That is a great idea! You could choose a website builder like Wix or WordPress, pick a template, and add your information. Would you like some tips on what to include in a portfolio?" },
      ],
    },
    after: {
      title: "A live portfolio site from one prompt.",
      chat: [
        {
          role: "user",
          text: "You are a front-end developer building my portfolio. I'm Asha, a final-year CS student, and I've built three things: a bus-route finder for Bengaluru, a hostel mess-menu app and a Kannada handwriting reader. Make me a single-page site I can host for free, fast on a phone, with a dark mode toggle. Build it as an artifact so I can see it straight away.",
        },
        {
          role: "claude",
          text:
            "Done. It's live in the preview beside this chat.\n\n" +
            "• A hero that says who you are in one line: “I build tools people in Bengaluru use every day.”\n" +
            "• Three project cards, each with the problem, what you built and a link slot\n" +
            "• Your skills pulled from the projects: React, Python, OCR, maps APIs\n" +
            "• A dark mode toggle that remembers the choice\n" +
            "• One index.html, under 30 KB, so it opens fast on mobile data\n\n" +
            "Next: paste your GitHub links into the three cards, then drop the file on GitHub Pages. That link goes at the top of your CV.",
        },
      ],
      proof: "Live link on your CV",
    },
  },
  {
    name: "Claude API",
    week: "Weeks 3–6",
    before: {
      title: "Copy, paste, repeat, by hand.",
      chat: [
        { role: "user", text: "Summarise this feedback: [pasted file 1 of 50]" },
        { role: "claude", text: "Summary: the customer liked the delivery speed but found the checkout confusing.\n\nPaste the next file whenever you are ready." },
      ],
    },
    after: {
      title: "Scripts that call Claude for you.",
      chat: [
        {
          role: "user",
          text: "You are a patient Python mentor. I have 50 customer-feedback files in a folder called reports. Write me a short script that uses the Claude API to summarise each one in two sentences, tag it as praise, complaint or idea, and save it all to a spreadsheet. Explain each part in one line so I learn it, not just copy it.",
        },
        {
          role: "claude",
          text:
            code(
              "import csv, pathlib\nimport anthropic\n\nclient = anthropic.Anthropic()\nask = (\"Summarise this feedback in 2 sentences. On the last line \"\n       \"write one tag: praise, complaint or idea.\\n\\n\")\n\nwith open(\"feedback.csv\", \"w\", newline=\"\") as out:\n    sheet = csv.writer(out)\n    sheet.writerow([\"file\", \"summary\", \"tag\"])\n    for f in sorted(pathlib.Path(\"reports\").glob(\"*.txt\")):\n        reply = client.messages.create(\n            model=\"claude-sonnet-5-5\",\n            max_tokens=300,\n            messages=[{\"role\": \"user\", \"content\": ask + f.read_text()}],\n        ).content[0].text\n        summary, _, tag = reply.strip().rpartition(\"\\n\")\n        sheet.writerow([f.name, summary.strip(), tag.strip()])",
            ) +
            "\n• client: one connection to Claude, reused for every file. It reads your ANTHROPIC_API_KEY.\n" +
            "• ask: the same instruction every time, so the tags stay consistent.\n" +
            "• rpartition: splits off the last line, which is the tag.\n" +
            "• feedback.csv opens straight in Excel or Google Sheets.\n\n" +
            "Try it on 3 files first, read the tags, then run all 50.",
        },
      ],
      proof: "Code on GitHub",
    },
  },
  {
    name: "Agents",
    week: "Weeks 6–8",
    before: {
      title: "You do every step yourself.",
      chat: [
        { role: "user", text: "Research three competitors, summarise them and email my manager." },
        { role: "claude", text: "I can help with parts of this. I cannot browse the web or send email from here, but if you paste in details about each competitor I can summarise them, and you can write the email yourself." },
      ],
    },
    after: {
      title: "An agent runs the workflow.",
      chat: [
        {
          role: "user",
          text: "You are my research assistant. Look up Acme, Globex and Initech, our three biggest competitors. For each, find their pricing, their newest feature and one complaint customers keep making. Then draft a short email to my manager comparing them, with one recommendation for us. Don't send anything: show me the draft and your sources first.",
        },
        {
          role: "claude",
          text:
            "Plan: research each company, compare, draft, then stop for you.\n\n" +
            "✓ Read 11 pages: pricing pages, changelogs, app-store reviews\n" +
            "✓ Compared pricing, newest feature and top complaint\n" +
            "✓ Drafted the email\n\n" +
            "Subject: Competitor snapshot, and one move for us\n" +
            "• Acme: cheapest at ₹499/month. New: AI search. Complaint: no mobile app.\n" +
            "• Globex: price only on a sales call. New: team dashboards. Complaint: slow onboarding.\n" +
            "• Initech: ₹899/month. New: integrations. Complaint: thin documentation.\n" +
            "Recommendation: publish our pricing and promise setup in a day. That answers two of the three complaints.\n\n" +
            "Sources are linked under each bullet. Nothing has been sent. Approve it and I'll send.",
        },
      ],
      proof: "Capstone you can demo",
    },
  },
];
