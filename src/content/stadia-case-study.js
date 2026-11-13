/** Initial Stadia storefront story and outcomes supplied by Josh. */
export const stadiaCaseStudy = {
  layout: "showcase",
  heroCartridge: "stadia",
  eyebrow: "Google Stadia",
  subtitle: "Helping players choose their next game.",
  role: "Lead Product Designer",
  scope: "Storefront strategy, product detail pages & controller UX",
  summary: "In 2022, I led the redesign of the Stadia Store, opening a locked storefront to the public and turning a tangle of separate game, bundle, and add-on pages into one layout across web, mobile, and TV.",
  highlights: [
    { value: "+12.7%", label: "Game sales" },
    { value: "+20%", label: "Store traffic" },
    { value: "+5%", label: "New accounts" },
  ],
  hero: {
    src: "/videos/stadia/lilycove-hero-1920.mp4",
    srcSmall: "/videos/stadia/lilycove-hero-1280.mp4",
    poster: "/videos/stadia/lilycove-hero-poster.jpg",
    label: "Stadia Store Redesign motion study",
    caption: "One store page template across Destiny 2, Red Dead Redemption 2, and Cyberpunk 2077.",
  },
  story: [
    {
      id: "problem", label: "The old game details page",
      copy: "In fairness to the old game page, it launched with Stadia and did what a launch version has to do: give the user a way to buy the game. It just never got the quality-of-life love a store needs once the game catalog increases. Every game edition or bundle had its own separate page, so comparing two editions meant going back and forth remembering what was in each one. A few major games couldn't even be bought by themselves, only inside a bundle, which meant you could land on the main page for *Red Dead Redemption 2* and find no way to actually buy it.",
      visual: { title: "Old game details page", caption: "Before: old game details page", type: "image", src: "" },
    },
    {
      id: "controller", label: "Designing for the D-pad first",
      copy: "Before deciding what the new page looked like, I had to decide what it was allowed to assume. The store had to work with a mouse, a phone screen, and a TV controller, and engineering definitely did not want to maintain 3 separate stores. So I designed it prioritizing a d-pad first experience. The primary buttons stayed above the fold, in the exact same spot from SKU to SKU, even when a long title wrapped to two or more lines. If the layout worked well with four arrows and one button, it was going to work across the board.",
      visual: { title: "Controller focus grid", caption: "Buttons stay pinned in the same spot across games, whether you're using a mouse, a phone, or a controller.", type: "video", loop: true, src: "/videos/stadia/lilycove-dpad-hero-1920.mp4", srcSmall: "/videos/stadia/lilycove-dpad-hero-1280.mp4", poster: "/videos/stadia/lilycove-dpad-ui-poster.jpg" },
    },
    {
      id: "game-page", label: "One parent page per game",
      copy: "With that grid in place, I kept what worked on the old page and collapsed the rest into one parent page per game. The left rail holds every way in, whether that's a free trial, a Pro claim, a Ubisoft+ subscription, or a standard purchase. All editions sit right below it so you can compare them without leaving the page, and selecting one updates the pricing in the rail. Product and engineering were nervous that switching bundles inline would confuse people, so I built a prototype, ran it through a UXR study, and the results settled the argument; it was intuitive.",
      visual: { title: "Game Details: free trial, Pro claim, Ubisoft+, and bundle states", caption: "One parent page per game, with every way to play or buy in the left column.", type: "video", loop: true, src: "/videos/stadia/lilycove-onepage-hero-1920.mp4", srcSmall: "/videos/stadia/lilycove-onepage-hero-1280.mp4", poster: "/videos/stadia/lilycove-onepage-ui-poster.jpg" },
    },
    {
      id: "store-access", label: "Opening the store to the public",
      copy: "A better game page doesn't help much if nobody can reach it. For the first couple of years, Stadia had a funny way of running a store: you weren't allowed to look inside until you made an account. Because the entire catalog lived behind a login screen, Stadia games weren't showing up in Google Search, and marketing had to build custom landing pages for every big release. We moved the sign-in wall behind the store and gave every game a normal, readable URL, so people could search for a game, land on it's page, watch the trailers, check the price, and try a free demo before deciding they wanted to sign-up.",
      visual: { title: "Four points of friction to get into a game page", caption: "Before: 4 points of friction to get into a game page", type: "video", loop: true, src: "/videos/stadia/lilycove-anon-browsing-hero-1920.mp4", srcSmall: "/videos/stadia/lilycove-anon-browsing-hero-1280.mp4", poster: "/videos/stadia/lilycove-anon-browsing-ui-poster.jpg" },
    },
    {
      id: "age-gating", label: "Age gating mature media",
      copy: "Making the store public meant we also had to be age-rating compliant for mature games. The standard move is a full-screen age gate, which is a great way to make people close the tab immediately, or have them bend the truth. Instead, I only gated the mature media in the carousel. Visitors could still read about the game, see the price, and compare editions. The rating board liked the approach enough that they asked to show our mocks to other studios as a reference.",
      visual: { title: "Inline age gating for mature media", caption: "Gating mature trailers inline instead of blocking the entire store page.", type: "image", src: "" },
    },
  ],
  results: {
    copy: "Opening the store and cleaning up the game pages drove a +12.7% increase in game sales, alongside a projected +20% lift in store traffic and +5% increase in new accounts. It also meant marketing could finally stop building one-off promo pages from scratch.",
  },
  next: "Before this project, I used to treat things like controller navigation or legal age gates as annoying constraints you sand down at the end. Designing for a D-pad first actually fixed the web layout too, mostly because a controller refuses to let you hide bad hierarchy behind hover states and tiny links. Now, whenever a page has too many competing things going on, I start with the most restrictive input first. It's the fastest way to find out what doesn't need to be there.",
};
