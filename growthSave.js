import { menuDefinitions } from './data.js';
import { staffDefinitions } from './staff.js';
import { cafeGrowthBalance } from './modeBalance.js';
import { specialTypes } from './phase4Config.js';
const integer = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const date = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
export function validateGrowthSave(v) { if (!object(v) || v.schemaVersion !== 1 || v.mode !== 'CAFE_GROWTH' || !date(v.createdAt) || !date(v.updatedAt) || Date.parse(v.createdAt) > Date.parse(v.updatedAt) || !integer(v.cafeLevel, 1, 6) || !integer(v.warehouseLevel, 1, 6) || !integer(v.money))
    return false; const ids = menuDefinitions.filter(m => m.unlockCafeLevel <= v.cafeLevel).map(m => m.menuId); if (!Array.isArray(v.unlockedMenuIds) || new Set(v.unlockedMenuIds).size !== ids.length || v.unlockedMenuIds.length !== ids.length || !ids.every(id => v.unlockedMenuIds instanceof Array && v.unlockedMenuIds.includes(id)))
    return false; if (!object(v.menuLevels) || Object.keys(v.menuLevels).length !== ids.length || !ids.every(id => object(v.menuLevels) && integer(v.menuLevels[id], 1, 5)))
    return false; if (!Array.isArray(v.staffOwned) || v.staffOwned.length > cafeGrowthBalance.staff.limits[v.cafeLevel - 1] || !v.staffOwned.every((id, i) => id === staffDefinitions[i]?.staffId) || !object(v.staffLevels) || Object.keys(v.staffLevels).length !== v.staffOwned.length || !v.staffOwned.every(id => object(v.staffLevels) && integer(v.staffLevels[id], 1, 5)))
    return false; for (const k of ['cumulativeRevenue', 'cumulativeCustomersServed', 'cumulativeFoodSold', 'cumulativeQuestionsAttempted', 'cumulativeQuestionsCorrect', 'completedSessions'])
    if (!integer(v[k]))
        return false; if (v.cumulativeQuestionsCorrect > v.cumulativeQuestionsAttempted)
    return false; const memory = v.regularMemory, t = v.specialCustomerStats; if (!object(memory) || !integer(memory.satisfiedVisits, 0, 2) || typeof memory.revisitEligible !== 'boolean' || !object(t) || !integer(t.spawned) || !integer(t.served) || Number(t.served) > Number(t.spawned) || !integer(t.vipVisits) || !integer(t.regularRevisits) || !integer(t.regularHighestTier, 0, 3) || !object(t.types))
    return false; for (const [k, count] of Object.entries(t.types)) {
    if (!specialTypes.includes(k) || !object(count) || !integer(count.spawned) || !integer(count.served) || Number(count.served) > Number(count.spawned))
        return false;
} const allowed = ['schemaVersion', 'mode', 'createdAt', 'updatedAt', 'cafeLevel', 'money', 'warehouseLevel', 'unlockedMenuIds', 'menuLevels', 'staffOwned', 'staffLevels', 'cumulativeRevenue', 'cumulativeCustomersServed', 'cumulativeFoodSold', 'cumulativeQuestionsAttempted', 'cumulativeQuestionsCorrect', 'completedSessions', 'regularMemory', 'specialCustomerStats']; return Object.keys(v).every(k => allowed.includes(k)); }
export function createGrowthSave(now = new Date().toISOString()) { const initial = cafeGrowthBalance.initial; const ids = menuDefinitions.filter(m => m.unlockCafeLevel <= initial.cafeLevel).map(m => m.menuId); return { schemaVersion: 1, mode: 'CAFE_GROWTH', createdAt: now, updatedAt: now, ...initial, unlockedMenuIds: ids, menuLevels: Object.fromEntries(ids.map(id => [id, 1])), staffOwned: [], staffLevels: {}, cumulativeRevenue: 0, cumulativeCustomersServed: 0, cumulativeFoodSold: 0, cumulativeQuestionsAttempted: 0, cumulativeQuestionsCorrect: 0, completedSessions: 0, regularMemory: { satisfiedVisits: 0, revisitEligible: false }, specialCustomerStats: { spawned: 0, served: 0, types: {}, vipVisits: 0, regularRevisits: 0, regularHighestTier: 0 } }; }
export const saveMigrations = new Map();
export function migrateGrowthSave(value) { let v = value; for (let i = 0; i < 10 && object(v) && integer(v.schemaVersion) && Number(v.schemaVersion) < 1; i++) {
    const fn = saveMigrations.get(Number(v.schemaVersion));
    if (!fn)
        return null;
    v = fn(v);
} return validateGrowthSave(v) ? structuredClone(v) : null; }
