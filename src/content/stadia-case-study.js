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
      id: "problem", heading: "Selling games behind a locked door",
      copy: "For the first couple of years, Stadia had a funny way of running a store: you weren't allowed to look inside until you made an account and handed over a payment method. Because the entire catalog lived behind a login screen, Stadia games didn't show up in Google Search, and marketing had to build custom landing pages by hand for every big release. We moved the sign-in wall behind the store and gave every game a normal, readable URL so people could watch trailers, check the price, and try a free demo before deciding if they wanted an account.",
      visual: { title: "Mandatory sign-in versus an open game page", caption: "Before: clicking a Stadia link dropped you onto a login wall before you could see a single game or price.", type: "image", src: "" },
    },
    {
      id: "game-page", heading: "One page per game (finally)",
      copy: "Once you got past the login screen, every edition, bundle, and add-on lived on its own separate page. A few major games couldn't even be bought by themselves, only inside a bundle, which meant you could land on the main page for Red Dead Redemption 2 and find no way to actually buy it. I collapsed everything into one parent page per game. The left rail holds every way in, whether that's a free trial, a Pro claim, a Ubisoft+ subscription, or a standard purchase, and all the editions sit right below it.",
      visual: { title: "Game Details: free trial, Pro claim, Ubisoft+, and bundle states", caption: "One parent page per game, with every way to play or buy in the left column.", type: "image", src: "" },
    },
    {
      id: "controller", heading: "Designing for the D-pad first",
      copy: "The store had to work with a mouse, a phone screen, and a TV controller, and engineering definitely did not want to maintain three separate stores. So I designed the whole page around a D-pad grid first. The primary buttons stay locked in the exact same spot from game to game, even when a long title wraps to two lines and grows upward, and selected bundles get a loud orange outline you can see from a couch. Product and engineering were nervous that inline bundle switching would confuse people, so I threw together a prototype with user research, proved people actually preferred it, and got the feature unblocked.",
      visual: { title: "Controller focus grid and bundle edition switcher", caption: "Buttons stay pinned in the same spot across games, whether you're using a mouse, a phone, or a controller.", type: "image", src: "" },
    },
    {
      id: "age-gating", heading: "Blurring the explosions, not the buy button",
      copy: "Making the store public meant we also had to fix years of overdue age-rating compliance for mature games. The standard move is a full-screen age gate, which is a great way to make people close the tab immediately. Instead, I only gated the mature trailers and screenshots inside the media carousel. Visitors could still read about the game, see the price, and compare editions right away. The rating board liked the approach enough that they asked to show our mocks to other studios as a reference.",
      visual: { title: "Inline blurred trailer with the purchase rail visible", caption: "Gating mature trailers inline instead of blocking the entire store page.", type: "image", src: "" },
    },
  ],
  results: {
    title: "What shipped, and what stuck",
    copy: "Opening the store and cleaning up the game pages drove a +12.7% increase in game sales, alongside a projected +20% lift in store traffic and +5% increase in new accounts. It also meant marketing could finally stop building one-off promo pages from scratch.",
  },
  next: "Before this project, I used to treat things like controller navigation or legal age gates as annoying constraints you sand down at the end. Designing for a D-pad first actually fixed the web layout too, mostly because a controller refuses to let you hide bad hierarchy behind hover states and tiny links. Now, whenever a page has too many competing things going on, I start with the most restrictive input first. It's the fastest way to find out what doesn't need to be there.",
};
