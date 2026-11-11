/** Initial Stadia storefront story and outcomes supplied by Josh. */
export const stadiaCaseStudy = {
  layout: "showcase",
  heroCartridge: "stadia",
  eyebrow: "Google Stadia",
  subtitle: "Helping players choose their next game.",
  role: "Lead Product Designer",
  scope: "Storefront strategy, product detail pages & controller UX",
  summary: "I led the storefront and game-page redesign, opened signed-out browsing, and designed controller navigation and purchase flows.",
  highlights: [
    { value: "+12%", label: "Game sales" },
    { value: "2", label: "Major milestones" },
    { value: "~6 mo.", label: "Redesign timeline" },
  ],
  hero: {
    src: "/videos/stadia/lilycove-hero-1920.mp4",
    srcSmall: "/videos/stadia/lilycove-hero-1280.mp4",
    poster: "/videos/stadia/lilycove-hero-poster.jpg",
    label: "Stadia Store Redesign motion study",
  },
  story: [
    {
      id: "problem", label: "The problem",
      copy: "The store required sign-up to browse, and game pages were awkward to navigate with a TV controller. Players researched games elsewhere. The goal was to let players research, compare, and buy games on Stadia before or after signing in.",
      visual: { title: "Game pages, before and after", caption: "Demonstrate controller focus paths through the redesigned game pages.", type: "video", src: "" },
    },
    {
      id: "open-browsing", label: "Opening the store",
      copy: "I made Store Home and game pages accessible before sign-up, including prices, trailers, ratings, and free timed trials.",
      visual: { title: "An open Store Home", caption: "Show shelves, category chips, and browsing before sign-up.", type: "video", src: "" },
    },
    {
      id: "controller", label: "Designed for the D-pad",
      copy: "I rebuilt focus paths and separated trials, purchases, and Pro claims in one clear purchase panel.",
      visual: { title: "Clear paths to play", caption: "Compare trial, purchase, and claim-with-Pro options in the purchase panel.", type: "image", src: "" },
    },
    {
      id: "store-widgets", label: "Simplifying and scaling",
      copy: "I added smart defaults for multi-edition bundles and partnered with UX Engineering on reusable store widgets.",
      visual: { title: "A reusable storefront system", caption: "Show multi-edition bundle defaults and the reusable store widgets.", type: "image", src: "" },
    },
  ],
  results: {
    title: "A stronger storefront",
    copy: "The store became a primary engagement driver, with reusable widgets and design standards adopted across Stadia.",
  },
  next: "The redesign brought research, comparison, and purchase into one experience, with signed-out browsing and controller navigation designed as part of the same system.",
};
