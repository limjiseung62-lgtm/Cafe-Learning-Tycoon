import { webAssets } from './webAssetCatalog.js?v=2.0.0';
export function webAsset(file) { return webAssets[file]?.file ?? file; }
export { webAssets };
