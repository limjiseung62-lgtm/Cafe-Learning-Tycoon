import { decodeGuestCheckpoint } from './guestCheckpoint.js?v=1.5.4';
import { validEventCheckpoint } from './cafeEvents.js?v=1.5.4';
export const incompleteRunHistory = new WeakSet();
import { menuDefinitions } from './data.js?v=1.5.4';
export function classroomCafeCheckpoint(g) { return { version: 1, ...g.events.enabled ? { eventState: g.events.checkpoint(), guests: structuredClone(g.guests) } : {}, cafeLevel: g.cafeLevel, money: g.money, warehouseLevel: g.warehouseLevel, menus: g.menus.map(m => ({ id: m.menuId, level: m.currentLevel, stock: m.stock })), staff: g.service.paid.map(w => ({ level: w.level })), stats: { ...g.stats }, production: g.successfulProduction, regularMemory: { ...g.regularMemory }, itemPurchases: { ...g.itemPurchases }, golden: g.goldenRemaining, booster: g.boosterRemaining, vip: g.vipPending, run: g.run ? { selected: [...g.run.selected], finalPaid: g.run.finalPaid, finalAssigned: incompleteRunHistory.has(g) ? null : g.run.finalAssigned, finalRewarded: g.run.finalRewarded, bonusRevenue: g.run.bonusRevenue } : null }; }
export function restoreClassroomCafe(g, value) {
    if (g.mode !== 'CLASS_MATCH')
        return false;
    try {
        const s = value;
        const int = (x, min = 0, max = 1e9) => Number.isSafeInteger(x) && Number(x) >= min && Number(x) <= max;
        if (!s || s.version !== 1 || s.eventState !== undefined && (!validEventCheckpoint(s.eventState) || s.eventState.duration !== g.durationSeconds) || !int(s.cafeLevel, 1, 6) || !int(s.warehouseLevel, 1, 6) || !int(s.money) || !Array.isArray(s.menus) || !Array.isArray(s.staff) || s.staff.length > g.economy.staff.limits[s.cafeLevel - 1] || !s.staff.every(w => int(w.level, 1, 5)) || !Object.values(s.stats).every(v => int(v)) || s.stats.correct > s.stats.attempted)
            return false;
        const definitions = menuDefinitions.filter(m => m.unlockCafeLevel <= s.cafeLevel);
        if (s.menus.length !== definitions.length || new Set(s.menus.map(m => m.id)).size !== definitions.length || !definitions.every(d => s.menus.some(m => m.id === d.menuId && int(m.level, 1, 5) && int(m.stock, 0, 50))))
            return false;
        const restoredGuests = s.guests === undefined ? undefined : decodeGuestCheckpoint(s.guests, g, s.cafeLevel);
        if (restoredGuests === null)
            return false;
        g.cafeLevel = s.cafeLevel;
        g.warehouseLevel = s.warehouseLevel;
        g.money = s.money;
        g.menus = definitions.map(d => { const m = s.menus.find(m => m.id === d.menuId); return { ...d, currentLevel: m.level, stock: Math.min(m.stock, g.warehouse.capacity), maxStock: g.warehouse.capacity }; });
        for (const saved of s.staff) {
            const w = g.service.hire();
            if (!w)
                break;
            while (w.level < saved.level)
                g.service.upgrade(w, 0);
        }
        g.stats = { ...s.stats };
        g.successfulProduction = int(s.production) ? s.production : 0;
        if (s.regularMemory && int(s.regularMemory.satisfiedVisits, 0, 2) && typeof s.regularMemory.revisitEligible === 'boolean')
            g.regularMemory = { ...s.regularMemory };
        for (const key of Object.keys(g.itemPurchases))
            if (int(s.itemPurchases?.[key], 0, 100))
                g.itemPurchases[key] = s.itemPurchases[key];
        if (int(s.golden, 0, 5))
            g.goldenRemaining = s.golden;
        if (int(s.booster, 0, 3))
            g.boosterRemaining = s.booster;
        if (typeof s.vip === 'boolean')
            g.vipPending = s.vip;
        if (g.run && s.run && s.run.selected.length <= 4 && s.run.selected.every((id, i) => g.run.choices[i].includes(id))) {
            g.run.selected.push(...s.run.selected);
            g.run.finalPaid = int(s.run.finalPaid, 0, 3) ? s.run.finalPaid : 0;
            if (int(s.run.finalAssigned, 0, 3)) {
                g.run.finalAssigned = s.run.finalAssigned;
                incompleteRunHistory.delete(g);
            }
            else {
                g.run.finalAssigned = g.run.finalPaid;
                incompleteRunHistory.add(g);
            }
            g.run.finalRewarded = s.run.finalRewarded === true;
            g.run.bonusRevenue = int(s.run.bonusRevenue) ? s.run.bonusRevenue : 0;
        }
        if (s.eventState)
            g.events.restore(s.eventState);
        if (restoredGuests) {
            g.restoreSavedGuests(restoredGuests); /* Legacy checkpoints lack per-type telemetry. Restore only active-guest counters; historical totals are unknown. */
            for (const guest of restoredGuests)
                if (guest.specialType) {
                    const counters = g.telemetry.phase4.specialCustomerTypes;
                    counters[guest.specialType] ??= { spawned: 0, served: 0 };
                }
        }
        g.updateServiceLayout();
        return true;
    }
    catch {
        return false;
    }
}
