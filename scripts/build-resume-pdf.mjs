import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PDFDocument, PDFName, PDFString, PDFArray, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { resume } from "../src/resume/profile.js";

const pdf = await PDFDocument.create();
pdf.setTitle(`${resume.name} — Résumé`); pdf.setAuthor(resume.name);
pdf.setSubject("Product design experience"); pdf.setCreator("Josh Lucas portfolio");
// Stable metadata keeps builds reproducible; content and links share the web source.
pdf.setCreationDate(new Date("2026-10-29T00:00:00Z")); pdf.setModificationDate(new Date("2026-10-29T00:00:00Z"));
pdf.registerFontkit(fontkit);
const fontBytes = weight => readFile(new URL(`../node_modules/@fontsource/dm-sans/files/dm-sans-latin-${weight}-normal.woff`, import.meta.url));
const regular = await pdf.embedFont(await fontBytes(400), { subset: true }), bold = await pdf.embedFont(await fontBytes(500), { subset: true });
const page = pdf.addPage([612, 792]), left = 48, right = 564;
const ink = rgb(.09,.09,.10), muted = rgb(.36,.36,.39), rule = rgb(.82,.82,.83);
function text(value, x, y, size = 11, font = regular, color = ink) { page.drawText(value, { x, y, size, font, color }); }
function lines(value, x, y, maxWidth, size = 10.5, leading = 15) {
  let line = "";
  for (const word of value.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && regular.widthOfTextAtSize(candidate, size) > maxWidth) { text(line,x,y,size); y -= leading; line = word; }
    else line = candidate;
  }
  if (line) { text(line,x,y,size); y -= leading; }
  return y;
}
function link(label, url, x, y) {
  const size=9.5,width=regular.widthOfTextAtSize(label,size);
  text(label,x,y,size,regular,muted);
  const annotation = pdf.context.register(pdf.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x,y-2,x+width,y+11], Border: [0,0,0], A: { Type: "Action", S: "URI", URI: PDFString.of(url) } }));
  const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
  if (annotations) annotations.push(annotation); else page.node.set(PDFName.of("Annots"),pdf.context.obj([annotation]));
  return x+width+19;
}
text(resume.name,left,739,30,bold);
text(resume.title,left,714,13,regular,muted);
text(resume.location,left,695,10,regular,muted);
let contactX=left;
contactX=link(resume.email,`mailto:${resume.email}`,contactX,674);
for(const url of [resume.links.portfolio,resume.links.linkedin,resume.links.x]) contactX=link(url.replace(/^https:\/\//,""),url,contactX,674);
if(contactX-19>right) throw new Error("Résumé contact links exceed the page width.");
page.drawLine({ start:{x:left,y:655},end:{x:right,y:655},thickness:.6,color:rule });
text("PROFILE",left,633,9,bold,muted);
let y=lines(resume.summary,left,612,right-left,11,16)-25;
text("EXPERIENCE",left,y,9,bold,muted);y-=25;
for(const job of resume.experience) {
  text(job.role,left,y,12.5,bold);
  text(job.period,right-regular.widthOfTextAtSize(job.period,9.5),y,9.5,regular,muted);y-=18;
  text(job.company,left,y,10.5);
  text(job.location,right-regular.widthOfTextAtSize(job.location,9.5),y,9.5,regular,muted);y-=22;
  for(const work of job.work) {
    text("•",left,y,10.2,regular,muted);
    y=lines(work,left+12,y,right-left-12,10.2,14)-5;
  }
  y-=23;
}
text("SKILLS",left,y,9,bold,muted);y-=20;
y=lines(resume.skills.join(" / "),left,y,right-left,9.5,14)-12;
text("TOOLS",left,y,9,bold,muted);y-=20;
y=lines(resume.tools.join(" / "),left,y,right-left,9.5,14);
if(y<62) throw new Error("Résumé content needs another PDF page; do not clip the final role.");
page.drawLine({ start:{x:left,y:56},end:{x:right,y:56},thickness:.6,color:rule });
text("Portfolio and selected work",left,39,9,regular,muted);
link("joshglucas.com",resume.links.portfolio,right-regular.widthOfTextAtSize("joshglucas.com",9.5),39);
const directory=fileURLToPath(new URL("../public/resume/",import.meta.url));
await mkdir(directory,{recursive:true});await writeFile(`${directory}/josh-lucas-resume.pdf`,await pdf.save());
console.log("Generated public/resume/josh-lucas-resume.pdf");
