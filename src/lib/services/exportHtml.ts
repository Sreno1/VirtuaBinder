import type { AppState, BinderItem, PreviewSide } from '../types';
import { previewSlotPositionStyle } from '../domain/geometry';
import { displayItemDate, displayItemNotes, displayItemPeople, displayItemTitle } from '../domain/items';
import { locationForItem } from '../domain/locations';
import { buildPreviewSides } from '../domain/preview';
import { itemForSlot } from '../domain/project';
import { buildRamp, SHADES } from '../theme/palette';
import { findTheme } from '../theme/themes';
import { blobToDataUrl, getBlobById } from './storage';

type ExportedItem = {
  title: string;
  date: string;
  people: string;
  location: string | null;
  notes: string | null;
  front: string | null;
  back: string | null;
  gallery: string[];
};

type ExportedSlot = {
  style: string;
  itemIndex: number | null;
  label: string;
};

type ExportedSide = {
  image: string | null;
  label: string;
  emptyLabel: string;
  slots: ExportedSlot[] | null;
  looseItemIndex: number | null;
};

function locationLabel(item: BinderItem): string | null {
  const location = locationForItem(item);
  return location ? `${location.name}, ${location.region}` : null;
}

function sideLabel(side: PreviewSide): string {
  return side.kind === 'loose' && side.item ? `${displayItemTitle(side.item)} ${side.side}` : `${side.page?.title ?? 'Page'} ${side.side}`;
}

function sideEmptyLabel(side: PreviewSide): string {
  return side.kind === 'loose' && side.item
    ? `No ${side.side} image assigned for ${displayItemTitle(side.item)}.`
    : `No ${side.side} scan assigned for ${side.page?.title ?? 'this page'}.`;
}

/** Every item referenced by any preview side (loose sides, or a slot on a page side), deduped, first-seen order. */
function collectReferencedItems(project: AppState, sides: PreviewSide[]): BinderItem[] {
  const seen = new Set<string>();
  const items: BinderItem[] = [];
  const take = (item?: BinderItem) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  };

  for (const side of sides) {
    if (side.kind === 'loose') {
      take(side.item);
      continue;
    }
    if (!side.page) continue;
    const template = project.templates.find((candidate) => candidate.id === side.page?.templateId);
    if (!template) continue;
    for (const slot of template.slots) take(itemForSlot(project.items, side.page.id, slot.id));
  }
  return items;
}

async function resolveImage(id?: string): Promise<string | null> {
  if (!id) return null;
  const blob = await getBlobById(id);
  return blob ? blobToDataUrl(blob) : null;
}

function themeCss(themeId: string): string {
  const theme = findTheme(themeId);
  const families = ['neutral', 'teal', 'amber', 'red'] as const;
  const lines: string[] = [];
  for (const family of families) {
    const ramp = buildRamp(theme[family]);
    for (const shade of SHADES) lines.push(`  --c-${family}-${shade}: ${ramp[shade]};`);
  }
  return `:root {\n${lines.join('\n')}\n}`;
}

export async function exportShareableHtml(project: AppState, themeId: string) {
  const previewSides = buildPreviewSides(project.pages, project.items, project.assets);
  const referencedItems = collectReferencedItems(project, previewSides);
  const itemIndex = new Map(referencedItems.map((item, index) => [item.id, index]));

  const items: ExportedItem[] = await Promise.all(
    referencedItems.map(async (item) => ({
      title: displayItemTitle(item),
      date: displayItemDate(item),
      people: displayItemPeople(item),
      location: locationLabel(item),
      notes: item.notes.trim() ? displayItemNotes(item) : null,
      front: await resolveImage(item.frontScanId),
      back: await resolveImage(item.backScanId),
      gallery: await Promise.all((item.gallery ?? []).map(async (photo) => (await resolveImage(photo.id)) ?? ''))
    }))
  );

  const sides: ExportedSide[] = await Promise.all(
    previewSides.map(async (side): Promise<ExportedSide> => {
      const image = await resolveImage(side.asset?.id);
      const base: ExportedSide = {
        image,
        label: sideLabel(side),
        emptyLabel: sideEmptyLabel(side),
        slots: null,
        looseItemIndex: null
      };
      if (side.kind === 'loose' && side.item) {
        base.looseItemIndex = itemIndex.get(side.item.id) ?? null;
        return base;
      }
      if (side.kind === 'page' && side.page) {
        const template = project.templates.find((candidate) => candidate.id === side.page?.templateId);
        if (template) {
          base.slots = template.slots.map((slot) => {
            const item = itemForSlot(project.items, side.page!.id, slot.id);
            return {
              style: previewSlotPositionStyle(slot, side.side === 'back'),
              itemIndex: item ? (itemIndex.get(item.id) ?? null) : null,
              label: item ? displayItemTitle(item) : `Slot ${slot.label}`
            };
          });
        }
      }
      return base;
    })
  );

  const html = renderDocument(sides, items, themeCss(themeId));
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `virtuabinder-share-${new Date().toISOString().slice(0, 10)}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderDocument(sides: ExportedSide[], items: ExportedItem[], themeStyle: string): string {
  const payload = JSON.stringify({ sides, items }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>VirtuaBinder — shared binder</title>
<style>
${themeStyle}
* { box-sizing: border-box; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; background: rgb(var(--c-neutral-950)); color: rgb(var(--c-neutral-100)); }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; border: 1px solid rgb(var(--c-neutral-800)); background: rgb(var(--c-neutral-950)); border-radius: 0.5rem; padding: 0.65rem; margin: 1rem; }
.toolbar h1 { font-size: 1rem; font-weight: 600; margin: 0; color: rgb(var(--c-neutral-50)); }
.toolbar .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.seg { display: flex; border: 1px solid rgb(var(--c-neutral-700)); background: rgb(var(--c-neutral-950)); border-radius: 0.4rem; padding: 0.2rem; }
.seg button { border: none; background: transparent; color: rgb(var(--c-neutral-300)); font-size: 0.85rem; font-weight: 500; padding: 0.35rem 0.7rem; border-radius: 0.3rem; cursor: pointer; }
.seg button.active { background: rgb(var(--c-teal-400)); color: rgb(var(--c-neutral-950)); }
.toggle-btn { border: 1px solid rgb(var(--c-neutral-700)); background: transparent; color: rgb(var(--c-neutral-300)); font-size: 0.85rem; font-weight: 500; padding: 0.45rem 0.75rem; border-radius: 0.4rem; cursor: pointer; }
.toggle-btn.active { border-color: rgb(var(--c-teal-400)); background: rgb(var(--c-teal-400)); color: rgb(var(--c-neutral-950)); }
.iconbtn { border: 1px solid rgb(var(--c-neutral-700)); background: transparent; color: rgb(var(--c-neutral-100)); border-radius: 0.4rem; width: 2.3rem; height: 2.3rem; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1rem; }
.iconbtn:disabled { opacity: 0.35; cursor: default; }
.stage-wrap { background: black; padding: 0 1rem 1.5rem; }
.stage { max-width: 80rem; margin: 0 auto; }
.stage.double { display: grid; gap: 1rem; min-height: 60vh; grid-template-columns: 1fr; }
@media (min-width: 768px) { .stage.double { grid-template-columns: 1fr 1fr; } }
.stage.single { display: flex; min-height: 60vh; align-items: center; justify-content: center; background: rgb(var(--c-neutral-950)); border-radius: 0.5rem; padding: 1rem; }
.panel { position: relative; display: flex; min-height: 26rem; align-items: center; justify-content: center; overflow: hidden; border-radius: 0.4rem; background: rgb(var(--c-neutral-900)); }
.stage.single .panel { width: 100%; max-width: 56rem; }
.side-wrap { position: relative; display: inline-block; max-height: 78vh; max-width: 100%; }
.side-wrap img { display: block; max-height: 78vh; max-width: 100%; object-fit: contain; }
.slot-btn { position: absolute; border: 2px solid transparent; background: transparent; cursor: pointer; padding: 0; }
.slot-btn.bordered { border-color: rgb(var(--c-teal-300)); }
.slot-btn:hover { border-color: rgb(var(--c-amber-300)); }
.loose-btn { position: absolute; inset: 0; border: none; background: transparent; cursor: zoom-in; padding: 0; }
.empty-side { padding: 0 1.5rem; text-align: center; font-size: 0.85rem; color: rgb(var(--c-neutral-500)); }
.empty { padding: 3rem 1rem; text-align: center; color: rgb(var(--c-neutral-500)); margin: 1rem; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 50; display: none; flex-direction: column; align-items: center; justify-content: center; padding: 1.25rem; overflow: auto; }
.overlay.open { display: flex; }
.overlay-content { display: flex; flex-direction: column; align-items: center; gap: 0.9rem; width: 100%; max-width: 72rem; height: 100%; }
.meta-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1.5rem; row-gap: 0.25rem; text-align: center; font-size: 0.85rem; font-weight: 500; flex-shrink: 0; }
.meta-row .t { color: rgb(var(--c-neutral-100)); }
.meta-row .d { color: rgb(var(--c-teal-300)); }
.meta-row .l { color: rgb(var(--c-amber-200)); }
.meta-row .p { color: rgb(var(--c-neutral-300)); }
.flip-wrap { flex: 1 1 auto; min-height: 0; width: 100%; perspective: 1400px; cursor: pointer; }
.flip-inner { position: relative; width: 100%; height: 100%; transition: transform 0.26s ease; transform-style: preserve-3d; }
.flip-inner.flipped { transform: rotateY(180deg); }
.flip-face { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; backface-visibility: hidden; }
.flip-face img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 0.4rem; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.flip-face.back { transform: rotateY(180deg); }
.flip-face .fallback-card { background: rgb(var(--c-amber-100)); color: rgb(var(--c-neutral-950)); width: min(100%, 640px); aspect-ratio: 5/2; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.actions { display: flex; gap: 0.6rem; flex-shrink: 0; }
.actions .iconbtn { border-radius: 999px; width: 2.6rem; height: 2.6rem; background: rgba(0,0,0,0.4); }
.notes { max-width: 42rem; text-align: center; font-size: 0.85rem; color: rgb(var(--c-neutral-200)); white-space: pre-wrap; flex-shrink: 0; max-height: 4rem; overflow-y: auto; }
.gallery-strip { display: flex; gap: 0.5rem; overflow-x: auto; flex-shrink: 0; }
.gallery-strip img { height: 3.5rem; width: 3.5rem; object-fit: cover; border-radius: 0.4rem; border: 1px solid rgb(var(--c-neutral-700)); cursor: pointer; }
.gallery-strip img:hover { border-color: rgb(var(--c-teal-300)); }
.close-btn { position: fixed; top: 1.1rem; right: 1.1rem; z-index: 5; border-radius: 999px; width: 2.6rem; height: 2.6rem; background: rgba(0,0,0,0.4); }
.nav-btn { position: fixed; top: 50%; transform: translateY(-50%); z-index: 5; border-radius: 999px; width: 2.6rem; height: 2.6rem; background: rgba(0,0,0,0.4); }
.nav-btn.prev { left: 1.1rem; }
.nav-btn.next { right: 1.1rem; }
.lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 60; display: none; align-items: center; justify-content: center; flex-direction: column; gap: 1rem; padding: 1.5rem; }
.lightbox.open { display: flex; }
.lightbox img.full { max-width: 100%; max-height: 65vh; object-fit: contain; border-radius: 0.4rem; }
.lightbox .thumbs { display: flex; gap: 0.5rem; overflow-x: auto; }
.lightbox .thumbs img { height: 3.2rem; width: 3.2rem; object-fit: cover; border-radius: 0.35rem; border: 2px solid rgb(var(--c-neutral-700)); cursor: pointer; }
.lightbox .thumbs img.active { border-color: rgb(var(--c-teal-300)); }
</style>
</head>
<body>
<div class="toolbar">
  <h1>Shared VirtuaBinder</h1>
  <div class="controls">
    <div class="seg">
      <button id="mode-single" type="button">Single</button>
      <button id="mode-double" type="button">Double</button>
    </div>
    <button class="toggle-btn active" id="borders-btn" type="button">Borders</button>
    <button class="iconbtn" id="spread-prev" type="button" aria-label="Previous">‹</button>
    <button class="iconbtn" id="spread-next" type="button" aria-label="Next">›</button>
  </div>
</div>

<div class="stage-wrap">
  <div class="stage" id="stage"></div>
  <div class="empty" id="empty" style="display:none">The booklet does not have pages yet.</div>
</div>

<div class="overlay" id="overlay">
  <button class="iconbtn close-btn" id="close-btn" aria-label="Close">✕</button>
  <button class="iconbtn nav-btn prev" id="prev-btn" aria-label="Previous item">‹</button>
  <button class="iconbtn nav-btn next" id="next-btn" aria-label="Next item">›</button>
  <div class="overlay-content">
    <div class="meta-row" id="meta-row"></div>
    <div class="flip-wrap" id="flip-wrap">
      <div class="flip-inner" id="flip-inner">
        <div class="flip-face front" id="face-front"></div>
        <div class="flip-face back" id="face-back"></div>
      </div>
    </div>
    <div class="actions">
      <button class="iconbtn" id="flip-btn" aria-label="Flip" title="Flip">⇄</button>
    </div>
    <div class="gallery-strip" id="gallery-strip"></div>
    <div class="notes" id="notes"></div>
  </div>
</div>

<div class="lightbox" id="lightbox">
  <img class="full" id="lightbox-img" src="" alt="" />
  <div class="thumbs" id="lightbox-thumbs"></div>
</div>

<script type="application/json" id="binder-data">${payload}</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById('binder-data').textContent);
  var sides = data.sides;
  var items = data.items;

  var stage = document.getElementById('stage');
  var emptyEl = document.getElementById('empty');
  var modeSingleBtn = document.getElementById('mode-single');
  var modeDoubleBtn = document.getElementById('mode-double');
  var bordersBtn = document.getElementById('borders-btn');
  var prevSpreadBtn = document.getElementById('spread-prev');
  var nextSpreadBtn = document.getElementById('spread-next');

  var mode = 'double';
  var bordersOn = true;
  var spreadIndex = 0;

  function buildSpreads() {
    if (!sides.length) return [];
    var spreads = [[null, 0]];
    for (var i = 1; i < sides.length; i += 2) spreads.push([i, i + 1 < sides.length ? i + 1 : null]);
    return spreads;
  }
  var spreads = buildSpreads();

  function sideMaxIndex() { return mode === 'double' ? spreads.length - 1 : sides.length - 1; }

  function renderSideEl(sideIdx) {
    var wrap = document.createElement('div');
    wrap.className = 'panel';
    if (sideIdx === null || sideIdx === undefined) return wrap;
    var side = sides[sideIdx];
    if (!side.image) {
      var empty = document.createElement('div');
      empty.className = 'empty-side';
      empty.textContent = side.emptyLabel;
      wrap.appendChild(empty);
      return wrap;
    }
    var box = document.createElement('div');
    box.className = 'side-wrap';
    var img = document.createElement('img');
    img.src = side.image;
    img.alt = side.label;
    box.appendChild(img);

    if (side.slots) {
      side.slots.forEach(function (slot) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn' + (bordersOn ? ' bordered' : '');
        btn.style.cssText = slot.style;
        btn.title = slot.label;
        if (slot.itemIndex !== null) {
          btn.addEventListener('click', function () { openItem(slot.itemIndex); });
        } else {
          btn.style.cursor = 'default';
        }
        box.appendChild(btn);
      });
    } else if (side.looseItemIndex !== null) {
      var looseBtn = document.createElement('button');
      looseBtn.type = 'button';
      looseBtn.className = 'loose-btn';
      looseBtn.setAttribute('aria-label', 'Open ' + side.label);
      looseBtn.addEventListener('click', function () { openItem(side.looseItemIndex); });
      box.appendChild(looseBtn);
    }

    wrap.appendChild(box);
    return wrap;
  }

  function renderStage() {
    stage.innerHTML = '';
    stage.className = 'stage ' + mode;
    modeSingleBtn.className = mode === 'single' ? 'active' : '';
    modeDoubleBtn.className = mode === 'double' ? 'active' : '';
    bordersBtn.className = 'toggle-btn' + (bordersOn ? ' active' : '');
    prevSpreadBtn.disabled = spreadIndex <= 0;
    nextSpreadBtn.disabled = spreadIndex >= sideMaxIndex();

    if (!sides.length) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    if (mode === 'double') {
      var pair = spreads[spreadIndex] || [null, null];
      stage.appendChild(renderSideEl(pair[0]));
      stage.appendChild(renderSideEl(pair[1]));
    } else {
      stage.appendChild(renderSideEl(spreadIndex));
    }
  }

  modeSingleBtn.addEventListener('click', function () {
    if (mode === 'single') return;
    spreadIndex = spreadIndex === 0 ? 0 : spreadIndex * 2 - 1;
    mode = 'single';
    renderStage();
  });
  modeDoubleBtn.addEventListener('click', function () {
    if (mode === 'double') return;
    spreadIndex = Math.ceil(spreadIndex / 2);
    mode = 'double';
    renderStage();
  });
  bordersBtn.addEventListener('click', function () { bordersOn = !bordersOn; renderStage(); });
  prevSpreadBtn.addEventListener('click', function () { if (spreadIndex > 0) { spreadIndex -= 1; renderStage(); } });
  nextSpreadBtn.addEventListener('click', function () { if (spreadIndex < sideMaxIndex()) { spreadIndex += 1; renderStage(); } });

  renderStage();

  // --- Item flip-card viewer (front/back + gallery), same interaction as the in-app viewer ---
  var overlay = document.getElementById('overlay');
  var flipInner = document.getElementById('flip-inner');
  var faceFront = document.getElementById('face-front');
  var faceBack = document.getElementById('face-back');
  var metaRow = document.getElementById('meta-row');
  var galleryStrip = document.getElementById('gallery-strip');
  var notesEl = document.getElementById('notes');
  var currentIndex = 0;
  var flipped = false;

  function faceHtml(image, label) {
    return image ? '<img src="' + image + '" alt="' + label + '">' : '<div class="fallback-card">' + label + '</div>';
  }

  function openItem(index) {
    if (index === null || index === undefined) return;
    currentIndex = index;
    flipped = false;
    renderItem();
    overlay.classList.add('open');
  }

  function renderItem() {
    var item = items[currentIndex];
    flipInner.classList.toggle('flipped', flipped);
    faceFront.innerHTML = faceHtml(item.front, 'Admit One');
    faceBack.innerHTML = faceHtml(item.back, 'Back of ticket');

    metaRow.innerHTML = '';
    var t = document.createElement('span'); t.className = 't'; t.textContent = item.title; metaRow.appendChild(t);
    var d = document.createElement('span'); d.className = 'd'; d.textContent = item.date; metaRow.appendChild(d);
    if (item.location) { var l = document.createElement('span'); l.className = 'l'; l.textContent = item.location; metaRow.appendChild(l); }
    var p = document.createElement('span'); p.className = 'p'; p.textContent = item.people; metaRow.appendChild(p);

    notesEl.textContent = item.notes || '';
    notesEl.style.display = item.notes ? 'block' : 'none';

    galleryStrip.innerHTML = '';
    galleryStrip.style.display = item.gallery.length ? 'flex' : 'none';
    item.gallery.forEach(function (photo, photoIndex) {
      var img = document.createElement('img');
      img.src = photo;
      img.alt = '';
      img.addEventListener('click', function () { openLightbox(item.gallery, photoIndex); });
      galleryStrip.appendChild(img);
    });
  }

  document.getElementById('flip-btn').addEventListener('click', function () { flipped = !flipped; renderItem(); });
  document.getElementById('flip-wrap').addEventListener('click', function () { flipped = !flipped; renderItem(); });
  document.getElementById('close-btn').addEventListener('click', function () { overlay.classList.remove('open'); });
  document.getElementById('prev-btn').addEventListener('click', function () { openItem((currentIndex - 1 + items.length) % items.length); });
  document.getElementById('next-btn').addEventListener('click', function () { openItem((currentIndex + 1) % items.length); });
  overlay.addEventListener('click', function (event) { if (event.target === overlay) overlay.classList.remove('open'); });

  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxThumbs = document.getElementById('lightbox-thumbs');
  var lightboxPhotos = [];
  var lightboxIndex = 0;

  function openLightbox(photos, index) {
    lightboxPhotos = photos;
    lightboxIndex = index;
    renderLightbox();
    lightbox.classList.add('open');
  }

  function renderLightbox() {
    lightboxImg.src = lightboxPhotos[lightboxIndex];
    lightboxThumbs.innerHTML = '';
    lightboxPhotos.forEach(function (photo, index) {
      var img = document.createElement('img');
      img.src = photo;
      if (index === lightboxIndex) img.className = 'active';
      img.addEventListener('click', function () { lightboxIndex = index; renderLightbox(); });
      lightboxThumbs.appendChild(img);
    });
  }

  lightbox.addEventListener('click', function (event) { if (event.target === lightbox) lightbox.classList.remove('open'); });

  document.addEventListener('keydown', function (event) {
    if (lightbox.classList.contains('open')) {
      if (event.key === 'Escape') lightbox.classList.remove('open');
      else if (event.key === 'ArrowLeft') { lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length; renderLightbox(); }
      else if (event.key === 'ArrowRight') { lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length; renderLightbox(); }
      return;
    }
    if (overlay.classList.contains('open')) {
      if (event.key === 'Escape') overlay.classList.remove('open');
      else if (event.key === 'ArrowLeft') openItem((currentIndex - 1 + items.length) % items.length);
      else if (event.key === 'ArrowRight') openItem((currentIndex + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowLeft' && spreadIndex > 0) { spreadIndex -= 1; renderStage(); }
    else if (event.key === 'ArrowRight' && spreadIndex < sideMaxIndex()) { spreadIndex += 1; renderStage(); }
  });
})();
</script>
</body>
</html>`;
}
