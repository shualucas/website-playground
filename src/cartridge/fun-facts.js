export const funFacts = [
  "A random fact about me: I owe a surprising amount of my career to World of Warcraft.",
  "A random thing about me: I have an ongoing obsession with orange wine.",
  "A random thing about me: The first celebrity I met was Akon back when I worked at a movie theater.",
  "A random fact about me: I played percussion for 5 years which has caused a need for me to paradiddle on surfaces constantly.",
  "A random fact about me: I've won numerous fantasy football championships.",
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
