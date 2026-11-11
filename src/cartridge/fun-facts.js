export const funFacts = [
  "A fun fact about me: I owe a huge amount of my career to World of Warcraft.",
  "A fun fact about me: I have won multiple football championships (in fantasy land)",
  "A fun fact about me: I have an ongoing obsession with orange wine.",
  "A fun fact about me: My most listened to artist all-time is Above & Beyond.",
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
