// The majority format sets the physical page ratio; source JPGs stay untouched.
export const flyerPage = { width: 1110, height: 1280 };
export const flyers = [
  { id: "wavform", title: "Wavform", src: "/zines/rave-flyers/wavform.jpg", background: "#ffffff", alt: "Wavform boat-party flyer with blue halftone waves and the DJ lineup." },
  { id: "metronome", title: "Metronome", src: "/zines/rave-flyers/metronome.jpg", background: "#b8b1c4", alt: "Metronome dance-party flyer with orange pixel lettering and red halftone artwork." },
  { id: "ghosts-n-stuff", title: "Ghosts ’n’ Stuff", src: "/zines/rave-flyers/ghosts-n-stuff.jpg", background: "#242424", alt: "Ghosts ’n’ Stuff Halloween flyer with orange bubble lettering and a cartoon ghost." },
  { id: "jornada-coffee", title: "Jornada Coffee Pop-up", src: "/zines/rave-flyers/jornada-coffee.jpg", background: "#209a45", alt: "Green and yellow Jornada coffee pop-up flyer with a seated figure holding a Brazilian coffee cup." },
  { id: "picnic", title: "Kiteclub.fm Picnic", src: "/zines/rave-flyers/picnic.jpg", background: "#fff5f3", alt: "Kiteclub.fm Picnic flyer with a soft blue and lime gradient and playful green lettering." },
];

function pageBackground(color) {
  const canvas = document.createElement("canvas");
  canvas.width = flyerPage.width; canvas.height = flyerPage.height;
  const tile = document.createElement("canvas"); tile.width = tile.height = 128;
  const tileContext = tile.getContext("2d"), pixels = tileContext.createImageData(128, 128);
  const rgb = color.match(/\w{2}/g).map(channel => parseInt(channel, 16));
  let seed = 381;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed % 9) - 4;
    for (let channel = 0; channel < 3; channel++) pixels.data[i + channel] = Math.max(0, Math.min(255, rgb[channel] + noise));
    pixels.data[i + 3] = 255;
  }
  tileContext.putImageData(pixels, 0, 0);
  const context = canvas.getContext("2d");
  context.fillStyle = context.createPattern(tile, "repeat"); context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function prepareFlyerPages() {
  const pages = await Promise.all(flyers.map(async flyer => {
    const image = new Image(); image.src = flyer.src; await image.decode();
    const canvas = pageBackground(flyer.background), context = canvas.getContext("2d");
    const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    const x = (canvas.width - width) / 2, y = (canvas.height - height) / 2;
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
    context.drawImage(image, x, y, width, height);
    canvas.dataset.flyerId = flyer.id;
    canvas.dataset.fit = JSON.stringify({ x, y, width, height, sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight });
    return canvas;
  }));
  // A final unprinted inside-back page completes the last physical spread.
  pages.push(pageBackground("#f7f5ef"));
  return Array.from({ length: pages.length / 2 }, (_, index) => ({ left: pages[index * 2], right: pages[index * 2 + 1] }));
}

export const flyerSpreads = Array.from({ length: 3 }, (_, index) => ({
  id: `flyer-spread-${index}`, kind: "blank", label: flyers[index * 2].title, theme: "about",
  title: "", subtitle: "", description: "", role: "", team: "", year: "", disciplines: [], note: "",
}));
