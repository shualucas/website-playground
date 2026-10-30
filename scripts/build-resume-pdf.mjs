import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument, PDFName, PDFString, PDFArray, PDFDict } from "pdf-lib";
import { resume } from "../src/resume/profile.js";
import { paper, paperContacts } from "../src/resume/paper.js";

// The uploaded document is now the canonical PDF. Preserve its artwork and fonts;
// only add contact annotations, without typesetting or flattening its printed page.
const path = new URL("../public/resume/josh-lucas-resume.pdf", import.meta.url);
const pdf = await PDFDocument.load(await readFile(path));
if (pdf.getPageCount() !== 1) throw new Error("The floating résumé requires one PDF page.");
const page = pdf.getPage(0), size = page.getSize();
if (Math.abs(size.width-paper.width) > 1 || Math.abs(size.height-paper.height) > 1) throw new Error("Re-export the matching artwork and contact coordinates for this PDF size.");
const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray) || pdf.context.obj([]);
const urls = annotations.asArray().flatMap(ref => {
  const action = pdf.context.lookup(ref, PDFDict).lookupMaybe(PDFName.of("A"), PDFDict);
  const uri = action?.get(PDFName.of("URI"));
  return uri instanceof PDFString ? [uri.decodeText()] : [];
});
let changed = false;
for (const contact of paperContacts) {
  if (urls.includes(contact.href)) continue;
  annotations.push(pdf.context.register(pdf.context.obj({ Type:"Annot", Subtype:"Link", Rect:[contact.x,paper.height-contact.y-contact.height,contact.x+contact.width,paper.height-contact.y], Border:[0,0,0], A:{ Type:"Action", S:"URI", URI:PDFString.of(contact.href) } })));
  changed = true;
}
if (changed) {
  page.node.set(PDFName.of("Annots"), annotations);
  pdf.setTitle(`${resume.name} — Résumé`); pdf.setAuthor(resume.name);
  pdf.setModificationDate(new Date("2026-10-29T00:00:00Z"));
  await writeFile(path, await pdf.save());
}
for (const width of [1200, 2400]) {
  const png = await readFile(new URL(`../public/resume/resume-art-${width}.png`, import.meta.url));
  if (png.readUInt32BE(16) !== width || Math.abs(png.readUInt32BE(20) / width - paper.height / paper.width) > 0.002) throw new Error("Résumé preview dimensions do not match the PDF.");
}
console.log("Verified original résumé PDF, artwork sizes, and clickable contacts.");
