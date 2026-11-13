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
      copy: "Stadia launched missing the quality-of-life love a storefront needs to be successful. Every game edition/bundle had a separate page, leaving users without a proper way to compare. A few major games couldn't even be bought by themselves, only inside a bundle, meaning you could land on the main page for *Red Dead Redemption 2* and find no way to actually buy it.",
      visual: { title: "Old game details page", caption: "Before: old game details page", type: "image", images: [
        { src: "/images/stadia/old-game-bundles.png", alt: "Original Stadia game page showing separate Assassin's Creed Valhalla bundles and add-ons.", width: 4960, height: 2620 },
        { src: "/images/stadia/old-game-media.png", alt: "Original Stadia game page showing the Assassin's Creed Valhalla media carousel.", width: 4962, height: 2620 },
      ] },
    },
    {
      id: "controller", label: "Designing for the D-pad first",
      copy: "Because Stadia was cross-platform, I had to prioritize an accessible experience across all platforms. I led with a d-pad first UX that allowed users to view game information and buying options quickly, making it easy for anyone, anywhere to make a purchasing decision.",
      visual: { title: "Controller focus grid", caption: "D-pad first experience, controller navigating through the page.", type: "video", loop: true, src: "/videos/stadia/lilycove-dpad-hero-1920.mp4", srcSmall: "/videos/stadia/lilycove-dpad-hero-1280.mp4", poster: "/videos/stadia/lilycove-dpad-ui-poster.jpg" },
    },
    {
      id: "game-page", label: "One parent page per game",
      copy: "I designed a single game page to bring together editions and bundles that were spread across fragmented pages. The left panel showed every way to play: start a free trial, claim the game with Stadia Pro, access it through a third-party subscription, or buy it outright. I placed editions and bundles next to the purchase buttons so players could compare their options and buy without leaving the page.",
      visual: { title: "Game Details: free trial, Pro claim, Ubisoft+, and bundle states", caption: "One parent page per game, with every way to play or buy in the left column.", type: "video", loop: true, src: "/videos/stadia/lilycove-onepage-hero-1920.mp4", srcSmall: "/videos/stadia/lilycove-onepage-hero-1280.mp4", poster: "/videos/stadia/lilycove-onepage-ui-poster.jpg" },
    },
    {
      id: "store-access", label: "Opening the store to the public",
      copy: "With this newly designed page, we needed people to reach it. Stadia didn't allow users to look inside until you made an account. Because the entire game catalog lived behind a login screen, Stadia games didn't show up in Google Search, meaning marketing had to build custom web pages for every big release. To make it more accessible, we removed the sign-in requirement and gave it a normal URL for Google to index now. Players could now search for it organically, land on a game page, watch the trailers, check the price, and try a free demo before deciding they wanted to sign-up.",
      visual: { title: "From sign-in friction to an accessible game page", caption: "Before, friction to even view the game page. After, accessible by anyone.", type: "video", loop: true, src: "/videos/stadia/lilycove-anon-browsing-hero-1920.mp4", srcSmall: "/videos/stadia/lilycove-anon-browsing-hero-1280.mp4", poster: "/videos/stadia/lilycove-anon-browsing-ui-poster.jpg" },
    },
    {
      id: "age-gating", label: "Age gating mature media",
      copy: "Lastly, we needed to account for mature game content now that anyone could visit game pages. The standard move is a full-screen age gate, which is a great way to get people to bounce from the page, or bend the truth about their birthday. Instead, I only gated the mature media in the carousel. Users could still read about the game, see the price, and compare editions. The rating board liked the approach enough that they asked to show our mocks to other studios as a reference.",
      visual: { title: "Inline age gating for mature media", caption: "Gating mature trailers inline instead of blocking the entire store page.", type: "video", loop: true, src: "/videos/stadia/lilycove-agegate-hero-1920.mp4", srcSmall: "/videos/stadia/lilycove-agegate-hero-1280.mp4", poster: "/videos/stadia/lilycove-agegate-ui-poster.jpg" },
    },
  ],
  results: {
    copy: "This effort led to a 12.7% increase in game sales, alongside a roughly 20% lift in store traffic, and a 5% increase in new accounts. It also meant marketing could finally stop building one-off promo pages from scratch.",
  },
  next: "Leading with a d-pad first approach in this design made me recognize how many products today aren't accessible for some users, and that embodying good UX practices means designing not only a beautiful and intuitive experience, but an accessible one too.",
};
