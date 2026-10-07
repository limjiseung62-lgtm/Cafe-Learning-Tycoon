import { growthBaseFor } from './sessionFactory.js';
export function captureGrowth(game, base, now = new Date().toISOString()) { const t = game.telemetry.phase4, b = base.specialCustomerStats; const types = structuredClone(b.types); for (const [key, v] of Object.entries(t.specialCustomerTypes)) {
    const old = types[key] ?? { spawned: 0, served: 0 };
    types[key] = { spawned: old.spawned + v.spawned, served: old.served + v.served };
} return { ...structuredClone(base), updatedAt: now, cafeLevel: game.cafeLevel, money: game.money, warehouseLevel: game.warehouseLevel, unlockedMenuIds: game.menus.map(m => m.menuId), menuLevels: Object.fromEntries(game.menus.map(m => [m.menuId, m.currentLevel])), staffOwned: game.service.paid.map(w => w.staffId), staffLevels: Object.fromEntries(game.service.paid.map(w => [w.staffId, w.level])), cumulativeRevenue: base.cumulativeRevenue + game.stats.revenue, cumulativeCustomersServed: base.cumulativeCustomersServed + game.stats.servedCustomers, cumulativeFoodSold: base.cumulativeFoodSold + game.stats.soldFood, cumulativeQuestionsAttempted: base.cumulativeQuestionsAttempted + game.stats.attempted, cumulativeQuestionsCorrect: base.cumulativeQuestionsCorrect + game.stats.correct, completedSessions: base.completedSessions + (game.status === 'CLOSED' ? 1 : 0), regularMemory: structuredClone(game.regularMemory), specialCustomerStats: { spawned: b.spawned + t.specialCustomersSpawned, served: b.served + t.specialCustomersServed, types, vipVisits: b.vipVisits + t.vipVisits, regularRevisits: b.regularRevisits + t.regularCustomerRevisits, regularHighestTier: Math.max(b.regularHighestTier, t.regularHighestTier) } }; }
export class GrowthSessionController {
    game;
    repository;
    clock;
    lastAuto = 0;
    purchaseCount = 0;
    ended = false;
    lastSaved;
    base;
    lastResult = { ok: true, message: '' };
    constructor(game, repository, clock = () => new Date().toISOString()) {
        this.game = game;
        this.repository = repository;
        this.clock = clock;
        const base = growthBaseFor(game);
        if (game.policy.persistence !== 'saved-cafe' || !base)
            throw Error('Only growth sessions can save');
        this.base = structuredClone(base);
        this.lastSaved = structuredClone(base);
    }
    current() { return captureGrowth(this.game, this.base, this.clock()); }
    save() { const save = this.current(); this.lastResult = this.repository.write(save, this.lastSaved); if (this.lastResult.ok)
        this.lastSaved = structuredClone(save); this.lastAuto = this.game.elapsedTime; this.purchaseCount = this.game.telemetry.upgradePurchases.length; return this.lastResult; }
    poll() { const purchased = this.game.telemetry.upgradePurchases.length !== this.purchaseCount; const closed = this.game.status === 'CLOSED' && !this.ended; if (purchased || closed || this.game.elapsedTime - this.lastAuto >= this.game.policy.autosaveSeconds) {
        this.ended = this.game.status === 'CLOSED';
        return this.save();
    } return null; }
}
