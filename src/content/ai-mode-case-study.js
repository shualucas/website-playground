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
      copy: "AI answers often ended with a question written as plain text, requiring people to 1) know what they wanted to ask, and 2) type the follow-up question manually.",
      visual: { title: "Where the conversation stopped", caption: "Before: an unclickable follow-up behind “Show more,” alongside early team explorations.", placeholder: true, type: "image", src: "" },
    },
    {
      id: "system",
      label: "The shared framework",
      copy: "I defined three patterns: plain conversational text for open-ended replies, inline tappables for a clear next step, and clarification cards for choices like budget, dates, or points that could use refinement.",
      visual: { title: "Three patterns, one task", caption: "Plain text, a shipped inline nudge, and a clarification card in testing, using the same task.", placeholder: true, type: "image", src: "" },
    },
    {
      id: "input",
      label: "One place to type",
      copy: "Early designs had a \"something else\" input that would allow for an open-ended answer, but we removed it to keep the card compact and leave the emphasis on the input plate as the one place to type.",
      visual: { title: "One clear input", caption: "The early card and current testing design, showing the competing inputs and difference in height.", placeholder: true, type: "image", src: "" },
    },
    {
      id: "model",
      label: "Reliable links in natural answers",
      copy: "Asking the model to generate clickable follow-ups compromised answer quality, so we pivoted to a different approach that uses post-processing. This allows the model to identify actionable offers after the answer was written. I designed both paragraph-style and list-style formats to accommodate the natural variations of the response.",
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
  },
  next: "Before this project, 10+ teams were each inventing their own way to ask follow-up questions. Today, they share one set of rules for when to use plain text, tappable in-line elements, and when to show an interactive question. The biggest takeaway for me was restraint: when an AI interface tries too hard to help, it crowds the answer. The best follow-up stays small, keeps one clear place to type, and makes the next step frictionless.",
};
