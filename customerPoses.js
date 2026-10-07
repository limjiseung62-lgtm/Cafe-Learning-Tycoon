import { specialPoseCatalog } from './specialPoseCatalog.js';
import { customerPoseCatalog } from './customerPoseCatalog.js';
export const customerPoses = customerPoseCatalog;
export function selectCustomerPose(visualKey, action, facing) { const p = customerPoses[visualKey] ?? specialPoseCatalog[visualKey]; if (!p)
    throw new Error('Missing customer pose: ' + visualKey); const walking = ['ENTERING', 'WALKING_TO_SEAT', 'STANDING_UP', 'WALKING_TO_EXIT'].includes(action); return { key: visualKey + (walking ? '/walk-' + facing : '/sit-' + facing), kind: walking ? 'walk' : 'sit', walk: p.walk, facing, asset: walking ? null : facing === 'left' ? p.sitLeft : p.sitRight }; }
export function selectedPoseAsset(s) { return s.asset ?? (customerPoses[s.walk] ?? specialPoseCatalog[s.walk]).walkAsset; }
export function customerPoseArt(s) { const a = selectedPoseAsset(s), [x, y, w, h] = a.box; const flip = s.kind === 'walk' && a.nativeFacing !== s.facing ? -1 : 1; return '<span class="guest-art ' + (s.kind === 'sit' ? 'sit-art' : 'walk-art') + ' art-sprite" aria-hidden="true" style="background-image:url(' + a.file + ');background-size:' + (a.width / w * 100) + '% ' + (a.height / h * 100) + '%;background-position:' + (x / (a.width - w) * 100) + '% ' + (y / (a.height - h) * 100) + '%;aspect-ratio:' + w + '/' + h + ';transform:scaleX(' + flip + ')"></span>'; }
export function poseGeometry(s) { const a = selectedPoseAsset(s), [x, y, w, h] = a.box; let anchorX = (a.anchorX - x) / w * 100; if (s.kind === 'walk' && a.nativeFacing !== s.facing)
    anchorX = 100 - anchorX; return { anchorX, anchorY: (a.anchorY - y) / h * 100, ratio: w / h }; }
const warmedPoseImages = [];
const loadMap = new Map();
export function preloadCustomerPoses(keys = Object.keys(customerPoses)) { if (typeof Image === 'undefined')
    return Promise.resolve([]); const loading = []; for (const key of keys) {
    const poses = customerPoses[key] ?? specialPoseCatalog[key];
    if (!poses)
        continue;
    for (const a of [poses.walkAsset, poses.sitLeft, poses.sitRight]) {
        if (!loadMap.has(a.file)) {
            const img = new Image();
            const promise = new Promise(resolve => { img.onload = () => resolve(true); img.onerror = () => resolve(false); });
            img.src = a.file;
            warmedPoseImages.push(img);
            loadMap.set(a.file, promise);
        }
        loading.push(loadMap.get(a.file));
    }
} return Promise.all(loading); }
