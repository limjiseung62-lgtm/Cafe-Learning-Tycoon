import { miniAtlas } from './miniGameConfig.js?v=2.0.0';
import { miniArtFrames as atlas } from './miniArtFrames.js?v=2.0.0';
import { imageReady } from './imageLoading.js?v=2.0.0';
function style(cell) { const f = atlas.frames[cell]; return 'background-image:url(' + miniAtlas + ');background-size:' + atlas.width / f.w * 100 + '% ' + atlas.height / f.h * 100 + '%;background-position:' + f.x / (atlas.width - f.w) * 100 + '% ' + f.y / (atlas.height - f.h) * 100 + '%;aspect-ratio:' + f.w + '/' + f.h + ';'; }
export function miniArt(cell, name) { const ready = imageReady(miniAtlas); return '<span class="mini-art ' + (ready ? 'ready' : '') + '" data-mini-cell="' + cell + '" role="img" aria-label="' + name + '" style="' + (ready ? style(cell) : '') + '"><span>' + name + '</span></span>'; }
export function refreshMiniArt(root) { if (!imageReady(miniAtlas))
    return; for (const node of root.querySelectorAll('[data-mini-cell]')) {
    node.style.cssText = style(Number(node.dataset.miniCell));
    node.classList.add('ready');
} }
