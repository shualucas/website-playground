/** Copy supplied by Josh; shipped inline-nudge results stay separate from card testing. */
export const aiModeCaseStudy = {
  layout: "showcase",
  heroCartridge: "search",
  eyebrow: "Google Search & AI Mode",
  title: "AI Mode Nudges",
  overview: "Helping people follow-up on answers across Google Search.",
  role: "Lead Product Designer",
  team: "Search Product Framework",
  year: "2026",
  scope: "Google Search AI Overviews & AI Mode",
  summary: "In 2026, I defined the design, principles, and rules for a shared follow-up system across AI Overviews and AI Mode in Google Search—bringing 10+ product teams from one-off patterns onto one approach.",
  highlights: [
    { value: "+3.87%", label: "follow-ups" },
    { value: "+1.84%", label: "AI Mode DAU's" },
    { value: "21.9%", label: "reduction in manual typing" },
  ],
  hero: {
    src: "/videos/nudges/nudges-hero-1920.mp4",
    srcSmall: "/videos/nudges/nudges-hero-1280.mp4",
    poster: "/videos/nudges/nudges-hero-poster.jpg",
    label: "Planning a Jeju trip in AI Mode, then refining the answer with a questionnaire and a rainy-day follow-up nudge",
  },
  story: [
    {
      id: "problem",
      label: "The problem",
      copy: "AI answers often ended with a suggested next step written as plain text, forcing people to retype the suggestion or phrase the next question themselves. Meanwhile, 10+ vertical teams—across Shopping, Travel, Finance, and Education—were each designing separate buttons, chips, and quizzes at the bottom of answers.",
      visual: { title: "Where the conversation stopped", caption: "Before: plain-text follow-ups at the end of an answer, alongside competing UI explorations from different Search teams.", placeholder: true, type: "image", src: "" },
    },
    {
      id: "system",
      label: "The shared framework",
      copy: "I defined three patterns based on the kind of follow-up needed: plain text for open-ended replies, inline nudges for a clear next step, and clarification cards for narrowing down choices like budget, pace, or dates. All three live strictly at the bottom of the answer so tappable follow-ups never get confused with web citation links inside the response.",
      visual: { title: "Three patterns, one task", caption: "Plain text, a shipped inline nudge, and a clarification card in testing, shown on the same task.", placeholder: true, type: "image", src: "" },
    },
    {
      id: "input",
      label: "One place to type",
      copy: "Early clarification cards included a \"Something else\" text box and a \"Skip\" button. We removed both so the card wouldn’t compete with the main \"Ask anything\" input bar—and so the card stayed short enough to sit above the action bar and web links, before people stop scrolling on mobile.",
      visual: { title: "One clear input", caption: "An early card with a second text box versus the current compact card above the action bar.", placeholder: true, type: "image", src: "" },
    },
    {
      id: "model",
      label: "Reliable links in natural answers",
      copy: "Asking the main AI model to write answers and tag clickable follow-ups at the same time hurt answer quality across multiple experiments. We pivoted to a lightweight post-processing step that spots actionable offers after the answer is written, leaving the wording untouched. Because the AI naturally switches between closing sentences and bullet lists, I designed inline nudges to work cleanly in both.",
      visual: { title: "From answer to action", caption: "Answer written → follow-up offer spotted → inline nudge added, working across both sentences and bullet lists.", placeholder: true, type: "image", src: "" },
    },
  ],
  results: {
    title: "Shipped, and still evolving",
    copy: "Inline nudges launched globally in AI Overviews in October 2026—increasing follow-up engagement, driving more multi-turn conversations into AI Mode, and keeping clicks to external websites steady—while AI Mode inline nudges and clarification cards moved into live testing.",
  },
  next: "Before this project, 10+ teams were each inventing their own way to ask follow-up questions. Today, they share one set of rules for when to use plain text, when to use inline nudges, and when to show a clarification card. The biggest takeaway for me was restraint: when an AI interface tries too hard to help, it crowds the answer. The best follow-up stays small, keeps one clear place to type, and makes the next step effortless.",
};
