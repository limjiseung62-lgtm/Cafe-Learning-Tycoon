import { webAssets } from './webAssetCatalog.js?v=1.5.4';
export function webAsset(file) { return webAssets[file]?.file ?? file; }
export { webAssets };
