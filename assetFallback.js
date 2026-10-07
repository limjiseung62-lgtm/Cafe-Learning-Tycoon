const checked = new Map();
export function installAssetFallbacks() { const fallback = (node) => { if (node.classList.contains('asset-unavailable'))
    return; node.dataset.fallbackLabel = node.closest('[aria-label]')?.getAttribute('aria-label')?.split(' · ')[0] ?? (node.classList.contains('cafe') ? '나의 카페' : node.classList.contains('guest-art') ? '손님' : '카페'); node.classList.add('asset-unavailable'); }; const inspect = (node) => { const style = node.style.backgroundImage || node.style.getPropertyValue('--room'), url = style.match(/url\(["']?([^"')]+)["']?\)/)?.[1]; if (!url)
    return; if (!checked.has(url))
    checked.set(url, new Promise(resolve => { const img = new Image(); img.onload = () => resolve(true); img.onerror = () => { console.warn('Cafe image unavailable:', url); resolve(false); }; img.src = url; })); void checked.get(url).then(ok => { if (!ok && node.isConnected)
    fallback(node); }); }; const scan = (node) => { if (node.matches('.art-sprite,.cafe'))
    inspect(node); node.querySelectorAll('.art-sprite,.cafe').forEach(inspect); }; scan(document.body); new MutationObserver(changes => { for (const change of changes) {
    if (change.type === 'attributes' && change.target instanceof HTMLElement && change.target.matches('.art-sprite,.cafe'))
        inspect(change.target);
    for (const node of change.addedNodes)
        if (node instanceof Element)
            scan(node);
} }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] }); document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) {
    console.warn('Cafe image unavailable:', event.target.src);
    const label = document.createElement('span');
    label.textContent = event.target.alt || '카페';
    label.className = 'asset-unavailable';
    event.target.replaceWith(label);
} }, true); }
