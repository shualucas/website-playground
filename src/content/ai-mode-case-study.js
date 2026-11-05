/** Copy supplied by Josh; shipped inline-nudge results stay separate from card testing. */
export const aiModeCaseStudy = {
  eyebrow: "Google Search & AI Mode",
  title: "Turning AI answers into conversations",
  overview: "I designed a shared follow-up system for Google Search and AI Mode, helping people move from an initial answer to a useful next step.",
  role: "Lead Product Designer",
  team: "Search Product Framework",
  year: "2026",
  scope: "Google Search AI Overviews & AI Mode",
  summary: "I defined the shared nudge framework, designed its interaction patterns, and built browser prototypes for expanded and collapsed answers.",
  hero: {
    src: "/videos/nudges/nudges-hero-1920.mp4",
    srcSmall: "/videos/nudges/nudges-hero-1280.mp4",
    poster: "/videos/nudges/nudges-hero-poster.jpg",
    label: "Planning a Jeju trip in AI Mode, then refining the answer with a questionnaire and a rainy-day follow-up nudge",
    caption: "Watch a questionnaire refine a Jeju trip, then an inline nudge continue the conversation.",
  },
  outcomes: [
    { value: "+3.87%", label: "Follow-up engagement" },
    { value: "+1.84%", label: "AI Mode daily active users" },
    { value: "10+", label: "Product teams aligned" },
  ],
  impact: "Inline nudges shipped globally in AI Overviews in October 2026. Clarification cards are in live testing.",
  challenge: [
    "Google’s AI answers could suggest a useful next step, but people still had to type it themselves. Questions like “Want me to compare nonstop flights?” appeared as plain text. Acting on them meant finding the input and entering another query.",
    "Many follow-ups also sat behind “Show more,” where a large share of mobile users never reached them. Meanwhile, 10+ teams—including Shopping, Travel, Finance, and Education—were developing separate follow-up experiences.",
  ],
  task: "Make a next step easy to take through one shared system, while keeping the answer itself central to the experience.",
  system: {
    title: "One system, three ways to continue",
    copy: "The framework matched the interaction to the kind of response someone needed to give.",
    patterns: [
      { title: "Plain-text nudges", copy: "Open-ended questions that benefit from a personal, typed response." },
      { title: "Inline tappable nudges", copy: "A clear next step embedded directly in a sentence or bullet list.", status: "Shipped globally" },
      { title: "Clarification cards", copy: "Compact questions with selectable options for narrowing details such as budget, dates, or preferences.", status: "In live testing" },
    ],
  },
  decisionsTitle: "Key decisions",
  decisions: [
    {
      title: "Keep one place to type",
      copy: "Early clarification cards included a “Something else” input and a Skip button. Together, they made the card taller and introduced a second typing area alongside “Ask anything.” I removed both controls so the smaller card could sit closer to the answer, while the main input remained the consistent place for a custom response.",
    },
    {
      title: "Support natural answers without compromising their quality",
      copy: "Early engineering approaches asked the main model to generate clickable follow-ups while composing its answer. Repeated attempts compromised answer quality. We pivoted to a lightweight second model that identified actionable offers after the answer was written. I designed the interaction for both sentences and bulleted lists, so links could work across natural variations in the response.",
    },
    {
      title: "Make follow-ups visible without overwhelming the answer",
      copy: "Coded prototypes revealed that full-length follow-ups could dominate a collapsed mobile answer. We introduced a divider and a two-line limit, exposing a next step before expansion while preserving the answer’s visual priority.",
    },
  ],
  visuals: [
    { title: "Where the conversation stopped", caption: "An original mobile answer with an unclickable follow-up behind “Show more,” alongside early explorations from different teams.", stage: "situation", placeholder: true, type: "image", src: "" },
    { title: "Three patterns, one task", caption: "Show plain-text nudges, inline tappable nudges, and clarification cards using the same example task. Distinguish shipped interactions from those in testing.", stage: "system", placeholder: true, type: "image", src: "" },
    { title: "One clear input", caption: "Compare the early card and current testing design at the same viewport size. Annotate the competing inputs and difference in height.", afterDecision: 0, placeholder: true, type: "image", src: "" },
    { title: "From answer to action", caption: "A simple flow: answer generated → actionable follow-up identified → inline link added. Include sentence and bullet-list examples.", afterDecision: 1, placeholder: true, type: "image", src: "" },
    { title: "A next step before expansion", caption: "A short mobile recording showing the collapsed answer, the two-line follow-up, and the expanded state.", afterDecision: 2, placeholder: true, type: "video", src: "" },
  ],
  results: {
    title: "What changed",
    copy: "Inline tappable nudges launched globally in AI Overviews in October 2026, delivering:",
    outcomes: [
      { value: "+3.87%", label: "follow-up engagement" },
      { value: "+1.84%", label: "AI Mode daily active users" },
      { value: "+1.50%", label: "multi-turn conversations" },
    ],
    guardrail: "Clicks to external websites held steady.",
    testing: "Separately, early vertical testing of selectable quiz options reduced manual query retyping by 21.9%, informing the shared clarification-card framework now in testing.",
    note: "Measurement details to add: experiment window, metric definitions, and whether the percentage lifts are relative increases.",
  },
  next: "A visited state could help people recognize paths they have already explored. I’m also exploring how a selected card option can work alongside a typed detail, letting people refine their intent without starting over.",
};
