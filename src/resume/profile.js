import { profileLinks } from "../profile.js";

// Shared source for the web résumé and PDF. Experience, tools, skills, and email
// come from jlucas_resume_2026.pdf; the summary/location were supplied previously.
export const resume = {
  name: "Joshua Lucas",
  title: "Senior Product Designer at Google",
  location: "San Francisco, California",
  summary: "I'm a systems thinker with a knack for micro interactions and finer details. I like figuring out what should exist, what it should feel like, and how to make it happen.",
  email: "joshglucas@gmail.com",
  skills: ["Interaction design", "Responsive design", "Information architecture", "Prototyping", "Product strategy", "Visual design", "Brand identity", "Design systems"],
  tools: ["Figma", "Adobe Suite", "GIFSKI", "Principle"],
  links: profileLinks,
  experience: [
    { company: "Google", role: "Product Designer", period: "May 2019 — present", location: "San Francisco, CA", work: [
      "Leading action strategies in AI Mode—encouraging deeper interaction, reducing the effort required to find more information or act on responses, and making AI Mode feel intuitive.",
      "Led UX for Search Labs, a key part of Google's AI innovation in Search. Defined and launched a system for hosting and branding experiments, enabling teams across Google to test new ideas.",
      "Led UX strategy and execution for a revamped Stadia storefront, increasing SKU sales by 12%. The work influenced platform-wide design enhancements and positioned the storefront as a key driver of the user experience.",
      "Played a key role in the Google Workspace launch, focusing on interaction design frameworks for desktop. Collaborated with cross-functional teams across Drive, Chat, and Gmail to improve productivity and collaboration.",
      "Collaborated with cross-functional partners to bring Dark Mode to Gmail, incorporating user feedback to create an accessible and visually appealing experience.",
    ] },
    { company: "Blizzard Entertainment", role: "UX Design Intern", period: "May — Sept 2017", location: "Irvine, CA", work: ["Led the onboarding experience for new Heroes of the Storm users."] },
  ],
};
