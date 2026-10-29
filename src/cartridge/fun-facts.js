export const funFacts = [
  "A random fact about me: I owe a surprising amount of my career to World of Warcraft.",
  "A random thing about me: I have an ongoing obsession with orange wine.",
  "A random fact about me: I became a designer because I couldn't draw, but still wanted to make things.",
  "A random thing about my life: The first celebrity I met was Akon when I was working my high-school movie theater job.",
  "A random fact about me: I played percussion for 5 years which has caused a need for me to paradiddle on the surfaces regularly.",
  "A random fact about me: I've won numerous fantasy football championships.",
  "A random fact about me: My first concert was seeing Kaskade.",
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
