import { CafeGame } from './game.js';
import { menuDefinitions } from './data.js';
import { policyFor } from './sessionModes.js';
import { createGrowthSave, validateGrowthSave } from './growthSave.js';
const growthBases = new WeakMap();
export function growthBaseFor(game) { return growthBases.get(game); }
export function createClassMatch(seconds = policyFor().sessionSeconds, random = Math.random) { return new CafeGame(seconds, random, 300, { mode: 'CLASS_MATCH', phase4: true }); }
export function createGrowthSession(save = createGrowthSave(), random = Math.random, seconds = policyFor('CAFE_GROWTH').sessionSeconds) { if (!validateGrowthSave(save))
    throw Error('Invalid growth save'); const g = new CafeGame(seconds, random, 300, { mode: 'CAFE_GROWTH', phase4: true }); g.cafeLevel = save.cafeLevel; g.money = save.money; g.warehouseLevel = save.warehouseLevel; g.menus = menuDefinitions.filter(m => save.unlockedMenuIds.includes(m.menuId)).map(m => ({ ...m, currentLevel: save.menuLevels[m.menuId], stock: 0, maxStock: g.warehouse.capacity })); for (const id of save.staffOwned) {
    const w = g.service.hire();
    if (w.staffId !== id)
        throw Error('Invalid staff order');
    while (w.level < save.staffLevels[id])
        g.service.upgrade(w, 0);
    w.upgradeFeedbackUntil = 0;
} g.regularMemory = structuredClone(save.regularMemory); g.updateServiceLayout(); g.telemetry.snapshots = []; g.telemetry.record(g.snapshot); growthBases.set(g, structuredClone(save)); return g; }
