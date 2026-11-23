/** Copy supplied by Josh; keep the design partner anonymous. */
export const searchLabsCaseStudy = {
  layout: "showcase",
  heroCartridge: "search",
  eyebrow: "Google Search Labs",
  subtitle: "From a waitlist to a global AI playground.",
  role: "Core Product Designer",
  scope: "0-to-1 platform, design system & growth",
  summary: "From 2023 to 2025, I was one of two designers on Google's Search Labs. While the other designer owned the brand, I owned the interaction framework and design system.",
  highlights: [
    { value: "+47M", label: "Net-new users" },
    { value: "5M", label: "Daily active users" },
  ],
  hero: { title: "Search Labs overview", type: "image", src: "" },
  story: [
    {
      id: "problem", label: "Explorations and the shipped card system",
      copy: "Search needed a place to test experimental AI features without disrupting the core experience. Version 1 of Search Labs was a scrappy waitlist and toggle built within a sprint for Google I/O. It worked for launch week, then ran out of room as there was increasing demand from teams to launch experiments on the platform. I designed richer layouts for Labs I really loved, but almost none survived the continuous re-scoping of the project. With a small engineering squad and many internal teams waiting to launch, the nice prototypes went on a shelf so we could build a launchable MVP instead.",
      visual: { title: "Explorations and the shipped card system", caption: "The barebones I/O waitlist page, early cut explorations, and the shipped card system.", type: "image", src: "" },
    },
    {
      id: "opt-in", label: "Four opt-in models",
      copy: "The difficult part wasn't visual craft, it was policy thrash. Leadership changed the opt-in rules several times: individual switches, membership, themed bundles, and finally one \"Turn on\" button that enabled everything across the board. Because UX didn't get the final vote, I kept card content separate from the opt-in controls so we could swap mechanics without rebuilding the page.",
      visual: { title: "Four opt-in flows", caption: "A diagram of the four opt-in pivots", type: "image", src: "" },
    },
    {
      id: "try-example", label: "From opt-in to trying an experiment",
      copy: "After clicking, \"Turn on\" swapped to \"Try an example\" so Labs would lead users straight into the experience. Previously, nearly a quarter of users flicked switches on and off like a fidget toy. Moving toggles to Settings cut those quick turn-offs by 80%, and when we tested putting toggles back on cards, clicks into live features dropped 15.5%. Above-the-fold buttons lifted mobile opt-ins 5%, and hero promos drove 67% more daily conversions.",
      visual: { title: "From opt-in to a live Search query", caption: "Enabling an experiment, \"Turn on\" swapping into \"Try an example\".", type: "image", src: "" },
    },
    {
      id: "design-system", label: "Self-serve launches and mobile performance",
      copy: "To stop being a bottleneck, I packaged everything into a self-serve kit (card specs, file size limits, branding requirements) so partner teams could ship new experiments across 120+ countries without custom front-end work every time.",
      visual: { title: "A self-serve design system", caption: "Design system, asset specs, and branding requirements.", type: "image", src: "" },
    },
  ],
  results: {
    copy: "It isn't how I'd design it today, and it isn't going in a museum. Keeping it simple is just how we survived while the rules kept shifting underneath us. Labs added +47 million net-new users and hit 5M daily active users, giving AI Overviews and AI Mode room to grow.",
  },
};
