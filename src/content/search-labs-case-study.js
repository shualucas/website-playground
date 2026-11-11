/** Copy supplied by Josh; keep the design partner anonymous. */
export const searchLabsCaseStudy = {
  layout: "showcase",
  heroCartridge: "search",
  eyebrow: "Google Search Labs",
  subtitle: "From a waitlist to a global AI playground.",
  role: "Core Product Designer",
  scope: "0-to-1 platform, design system & growth",
  summary: "From 2023 to 2025, I was one of two designers on Google Search Labs. Another designer owned the brand, and I owned the UX, interaction framework, and design system. Together we took it from a ~1M US waitlist to 48M+ people testing early AI in Search.",
  highlights: [
    { value: "+47M", label: "Net-new users" },
    { value: "5M", label: "Daily active users" },
  ],
  hero: { title: "Search Labs overview", type: "image", src: "" },
  story: [
    {
      id: "problem", label: "Explorations and the shipped card system",
      copy: [
        "In 2023, Google needed a way to test unfinished AI in public without breaking main Search (which, among other things, pays the bills). Search Labs was the place where curious people could opt in, try early versions of AI Overviews and AI Mode, and know up front that things might get weird.",
        "Early on, I designed a bunch of richer, more expressive layouts that I really loved. Almost none of them survived. We had a tiny engineering team, a hard deadline, and more than twenty internal teams lined up waiting to launch their experiments. So the fancy mocks went on a shelf, and I built a strict, repeatable card system that teams could actually get out the door.",
      ],
      visual: { title: "Explorations and the shipped card system", caption: "Early editorial explorations next to the leaner card system we shipped.", type: "image", src: "" },
    },
    {
      id: "opt-in", label: "Four opt-in models",
      copy: [
        "Most of the job here was not visual polish. It was surviving policy thrash.",
        "Because putting experimental AI into Search made legal and leadership understandably nervous, the rules for opting in changed four times, and UX didn't get the final vote. First, people were going to turn on individual experiments a la carte. Then leadership wanted a \"membership\" that turned everything on at once. Then it was themed bundles. Then bundles died, and we landed on a single \"Turn on\" button (in the header or on any card) that enabled every active experiment at once, with individual off-switches tucked away in Settings.",
        "After the second pivot, I built the cards so the content and the opt-in controls lived separately. Every time the rules changed, we could swap how the buttons worked without tearing up the page. Tightening the mobile header so the first \"Turn on\" button sat above the fold lifted mobile opt-ins by +50%, the unified opt-in redesign bumped new users by +42% (+97% during badged launches), and adding hero promos later drove +67% more daily conversions (>135K a day).",
      ],
      visual: { title: "Four opt-in flows", caption: "A flow diagram mapping four opt-in pivots across the same card layout.", type: "image", src: "" },
    },
    {
      id: "try-example", label: "From opt-in to trying an experiment",
      copy: [
        "Once someone tapped \"Turn on\", the button didn't turn into an on/off switch. It changed to \"Try an example\" and dropped you straight into a live Google Search query.",
        "Leads hated the idea of Labs turning into a glorified settings page, and the data backed them up. When we tested putting toggles directly on the cards, \"Try an example\" clicks dropped -15.5%, and nearly a quarter of people just flicked switches on and off within twenty seconds like a fidget toy. Swapping toggles for example queries cut accidental turn-offs by -80% and actually got people into the features, helping big launches pull in +52,000 opt-ins in a single day.",
      ],
      visual: { title: "From opt-in to a live Search query", caption: "Tapping \"Turn on\" flips the card button to \"Try an example\".", type: "image", src: "" },
    },
    {
      id: "design-system", label: "Self-serve launches and mobile performance",
      copy: "With a small team, we couldn't hand-hold every launch. I put together a self-serve design system covering card layouts, detail pages, 48px tap targets, and the little lab-beaker badge inside Search results. A surprising amount of my nights went into policing file sizes (500KB max for images, 1MB for video previews) so twenty different teams shipping animated demos wouldn't tank load times across 120+ countries. Partner teams shipped +17 new AI experiments through that kit without needing custom frontend work from us.",
      visual: { title: "A self-serve design system", caption: "The Search Labs design system, card specs, and in-product beaker badging.", type: "image", src: "" },
    },
  ],
  results: {
    copy: "Over two years, Search Labs added +47M net-new users and hit 5M daily active users, with 71% of users saying Google Search felt more innovative after trying it. More importantly, it gave AI Overviews (now at 1B+ users) and AI Mode room to grow up in public before moving into core Search.",
  },
  next: "If I'm being honest, the final UI isn't my favorite thing I've ever designed, and it isn't how I'd build it today. It's a little plain. But keeping it simple is why twenty teams could ship on time while the rules kept changing underneath us. Eventually AI Mode matured enough that we deleted the Labs beaker from Search altogether, which felt like the right ending.",
};
