// Set this URL after adding your licensed Quincy CF Regular Italic webfont.
// Example: "/fonts/QuincyCF-RegularItalic.woff2"
export const quincyFontUrl = "";
export const titleFontFamily =
  '"Quincy CF", "Cormorant Garamond", Georgia, serif';
export async function prepareTitleFont() {
  if (quincyFontUrl) {
    try {
      if (!document.getElementById("quincy-font-face")) {
        const style = document.createElement("style");
        style.id = "quincy-font-face";
        style.textContent = `@font-face{font-family:"Quincy CF";font-style:italic;font-weight:400;font-display:swap;src:url(${JSON.stringify(quincyFontUrl)})}`;
        document.head.append(style);
      }
      await document.fonts.load('italic 400 76px "Quincy CF"');
    } catch {
      /* The bundled italic serif remains readable if the custom font fails. */
    }
  }
  await document.fonts.load('italic 400 76px "Cormorant Garamond"');
}
