import { profileLinks } from "../profile.js";

// Shared source for the web résumé and PDF. Experience, tools, skills, and email
// come from jlucas_resume_2026.pdf; the summary/location were supplied previously.
export const resume = {
  name: "Joshua Lucas",
  title: "Senior Product Designer at Google",
  location: "San Francisco, California",
  summary: "I'm a systems thinker with a knack for micro interactions and finer details. I like figuring out what should exist, what it should feel like, and how to make it happen.",
  email: "joshglucas@gmail.com",
  skills: ["Interaction design", "Responsive design", "Info architecture", "Prototyping", "Product strategy", "Visual design", "Brand identity", "Design systems"],
  tools: ["Figma", "Adobe Suite", "GIFSKI", "Principle"],
  links: profileLinks,
  experience: [
    { company: "Google", role: "Product Designer", period: "May 2019 - Present", location: "San Francisco, CA", work: [
      "Leading action strategies in AI Mode, by encouraging deeper interaction, reducing the effort required for users to get more information or take action on parts of the response, and making AI mode feel intuitive.",
      "Led UX for the Search Labs platform, a key piece in Google's AI innovation in Search. Defined and launched a new system for hosting and branding experiments within Google Search Labs, empowering teams across Google to seamlessly test innovations.",
      "Led the UX strategy and execution for a revamped Stadia storefront, resulting in a 12% increase to SKU sales. The project's success influenced platform-wide design enhancements, positioning the storefront as a key driver of the user experience.",
      "Played a key role in the Google Workspace launch, focusing on interaction design frameworks for desktop. Collaborated with cross-functional teams to deliver a user-centered design that streamlines productivity with Google Drive, Chat, and Gmail that enhances collaboration.",
      "Collaborated with xFN partners to bring Dark Mode to Gmail. Incorporated user feedback throughout the design process to ensure an accessible and visually appealing experience.",
    ] },
    { company: "Blizzard Entertainment", role: "UX Design Intern", period: "May - Sept 2017", location: "Irvine, CA", work: ["Led the onboarding experience for new Heroes of the Storm users."] },
  ],
};
