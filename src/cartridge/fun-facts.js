export const funFacts = [
  "A random fact about me: I owe a surprising amount of my career to World of Warcraft.",
  "A random thing about me: I have an ongoing obsession with orange wine.",
  "A random thing about me: checking out a new coffee shop is my favorite sunday activity.",
  "A random fact about me: I became a designer because I couldn't draw, but still wanted to make things.",
];

/** Pick once per load, avoiding the previous fact when session storage is available. */
export function pickFunFact() {
  let previous = "";
  try { previous = sessionStorage.getItem("portfolio-last-fact") || ""; } catch {}
  const choices = funFacts.filter((fact) => fact !== previous);
  const fact = choices[Math.floor(Math.random() * choices.length)];
  try { sessionStorage.setItem("portfolio-last-fact", fact); } catch {}
  return fact;
}
