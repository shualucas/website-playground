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
  summary: "In 2026 I defined the design, principles, and triggering-logic for a follow-up system in Google Search, aligning 10+ product teams that previously used one-off patterns, into one approach.",
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
      copy: "AI answers often ended with a useful next question written as plain text—and on ~70% of searches, it was hidden behind “Show more.” People had to type follow-ups by hand, while 10+ teams were building separate follow-up UIs. We needed one shared way to make the next step effortless without crowding the answer.",
      visual: { title: "Where the conversation stopped", caption: "Before: an unclickable follow-up behind “Show more,” alongside early team explorations.", placeholder: true, type: "image", src: "" },
    },
    {
      id: "system",
      label: "The shared framework",
      copy: "I defined three patterns: plain text for open-ended replies, inline links for a clear next step, and clarification cards for choices like budget or dates. Inline nudges have shipped globally in AI Overviews; clarification cards are in live testing.",
      visual: { title: "Three patterns, one task", caption: "Plain text, a shipped inline nudge, and a clarification card in testing, using the same task.", placeholder: true, type: "image", src: "" },
    },
    {
      id: "input",
      label: "One place to type",
      copy: "Early cards had a “Something else” input and a Skip button. I removed both to keep the card compact and “Ask anything” as the one place to type. The smaller card could sit closer to the answer.",
      visual: { title: "One clear input", caption: "The early card and current testing design, showing the competing inputs and difference in height.", placeholder: true, type: "image", src: "" },
    },
    {
      id: "model",
      label: "Reliable links in natural answers",
      copy: "Asking the main model to generate clickable follow-ups compromised answer quality. We pivoted to a lightweight second model that identified actionable offers after the answer was written. I designed links for both sentences and bullet lists, accommodating natural variations in the response.",
      visual: { title: "From answer to action", caption: "Answer generated → follow-up identified → inline link added. Show sentence and bullet-list examples.", placeholder: true, type: "image", src: "" },
    },
    {
      id: "collapsed",
      label: "Follow-ups before expansion",
      copy: "Coded prototypes showed that full follow-ups could overwhelm a collapsed mobile answer. A divider and a two-line limit made the next step visible before expansion while keeping the answer in focus.",
      visual: { title: "A next step before expansion", caption: "A mobile prototype moving from the collapsed answer and two-line follow-up to the expanded state.", placeholder: true, type: "video", src: "" },
    },
  ],
  results: {
    title: "Shipped, and still evolving",
    copy: "Inline nudges launched globally in AI Overviews in October 2026, increasing follow-up engagement and bringing more people into AI Mode.",
    guardrail: "Multi-turn conversations increased 1.50%. Clicks to external websites held steady.",
    testing: "Separately, early vertical testing of selectable quiz options reduced manual query retyping by 21.9%, informing the clarification-card framework now in testing.",
    note: "Measurement details to add: experiment window, metric definitions, and whether the percentage lifts are relative increases.",
  },
  next: "Next, I’m exploring visited states for earlier turns and ways to combine a selected card option with a typed detail, so people can refine their intent without starting over.",
};
