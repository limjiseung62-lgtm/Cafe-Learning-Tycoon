import { chooseSpecial, specialDefinition, itemCatalog } from './phase4Config.js';
import { policyFor } from './sessionModes.js';
import { chooseCustomer, chooseOrderMenu } from './customerRules.js';
import { StaffSystem } from './staff.js';
import { LocalTelemetry } from './telemetry.js';
import { balance } from './config.js';
import { createMenus, menuDefinitions } from './data.js';
export class CafeGame {
    durationSeconds;
    random;
    content;
    get mode() { return this.content.mode ?? 'CLASS_MATCH'; }
    get policy() { return policyFor(this.mode); }
    get economy() { return this.policy.economy; }
    menus = createMenus();
    guests = [];
    stats = { revenue: 0, servedCustomers: 0, soldFood: 0, attempted: 0, correct: 0 };
    remainingSeconds;
    status = 'RUNNING';
    itemPurchases = { 'stock-five': 0, delivery: 0, golden: 0, invite: 0, booster: 0 };
    goldenRemaining = 0;
    boosterRemaining = 0;
    vipPending = false;
    regularMemory = { satisfiedVisits: 0, revisitEligible: false };
    get phase4Enabled() { return this.content.phase4 === true; }
    get phase4Profile() { return this.content.phase4Profile ?? this.economy.special; }
    getItemPrice(id) { return Math.round(this.phase4Profile.items[id].price * (this.phase4Profile.itemPriceMultipliers?.[this.cafeLevel - 1] ?? 1)); }
    itemRemaining(id) { return Math.max(0, this.phase4Profile.items[id].limit - this.itemPurchases[id]); }
    buyItem(id, menuId) { if (!this.phase4Enabled)
        return { ok: false, reason: '이번 영업에서는 아이템을 사용하지 않아요.' }; if (!itemCatalog.some(i => i.id === id))
        return { ok: false, reason: '없는 아이템이에요.' }; if (!this.itemRemaining(id))
        return { ok: false, reason: '이번 영업의 구매 횟수를 모두 썼어요.' }; const m = this.menus.find(m => m.menuId === menuId); if (id === 'delivery' && !m)
        return { ok: false, reason: '배송할 해금 메뉴를 선택해 주세요.' }; if (id === 'golden' && this.goldenRemaining)
        return { ok: false, reason: '황금시간을 모두 사용한 뒤 구매해 주세요.' }; if (id === 'booster' && this.boosterRemaining)
        return { ok: false, reason: '부스터를 모두 사용한 뒤 구매해 주세요.' }; if (id === 'invite' && (this.vipPending || this.cafeLevel < this.phase4Profile.rules.vip.unlock))
        return { ok: false, reason: this.vipPending ? 'VIP가 이미 방문 예약 중이에요.' : 'VIP 초대권은 Cafe Lv.' + this.phase4Profile.rules.vip.unlock + '부터 사용해요.' }; const price = this.getItemPrice(id); const result = this.purchase(price, 'item', id, 1); if (!result.ok)
        return result; this.itemPurchases[id]++; const t = this.telemetry.phase4; t.itemPurchases.push({ elapsedTime: this.elapsedTime, item: id, cost: price, ...(id === 'delivery' && menuId ? { menuId } : {}) }); let amount = 0; if (id === 'stock-five') {
        for (const m of this.menus) {
            const n = Math.min(5, m.maxStock - m.stock);
            m.stock += n;
            amount += n;
        }
    } if (id === 'delivery') {
        amount = m.maxStock - m.stock;
        m.stock = m.maxStock;
    } if (id === 'golden')
        this.goldenRemaining = 5; if (id === 'booster')
        this.boosterRemaining = 3; if (id === 'invite')
        this.vipPending = true; t.itemUsage.push({ elapsedTime: this.elapsedTime, item: id, amount }); return { ok: true, reason: { 'stock-five': '모든 해금 메뉴 재고 +5!', delivery: '선택 메뉴 배송 완료!', golden: '황금시간 시작 · 다음 완료 주문 5개 ×2', invite: 'VIP 방문을 예약했어요!', booster: '다음 정답 3번 생산량 UP!' }[id] }; }
    service = new StaffSystem();
    foodWaitSeconds = 0;
    staffWaitSeconds = 0;
    readyWaitingEvents = 0;
    maxPendingOrders = 0;
    readyWaitIds = new Set();
    money = 0;
    cafeLevel = 1;
    warehouseLevel = 1;
    customersLeft = 0;
    stockoutEvents = 0;
    wastedProduction = 0;
    successfulProduction = 0;
    telemetry;
    nextSnapshot;
    updateServiceLayout(columns = this.cafe.maxCustomers <= 3 ? 3 : this.cafe.maxCustomers <= 4 ? 2 : this.cafe.maxCustomers >= 7 ? 4 : 3) { const count = this.cafe.maxCustomers; this.service.setLayout({ x: 78, y: 27 }, Array.from({ length: count }, (_, i) => ({ x: 14 + (i % columns) * 72 / Math.max(1, columns - 1), y: 52 + Math.floor(i / columns) * 38 / Math.max(1, Math.ceil(count / columns) - 1) }))); }
    get staffLimit() { return this.economy.staff.limits[this.cafeLevel - 1]; }
    get nextHireCost() { return this.economy.staff.hireCosts[this.service.paid.length] ?? null; }
    getStaffUpgradeCost(id) { const w = this.service.paid.find(w => w.staffId === id); return !w || w.level >= 5 ? null : this.economy.staff.upgradeCosts[w.level - 1]; }
    hireStaff() { if (this.service.paid.length >= this.staffLimit)
        return { ok: false, reason: '카페 단계의 직원 제한이에요. 카페를 확장해 주세요.' }; const cost = this.nextHireCost; if (cost === null)
        return { ok: false, reason: '모든 직원을 고용했어요.' }; const result = this.purchase(cost, 'staff-hire', '직원 ' + (this.service.paid.length + 1), 1); if (result.ok) {
        const w = this.service.hire();
        this.telemetry.staffHireTimes.push({ elapsedTime: this.elapsedTime, staffId: w.staffId });
    } return result; }
    upgradeStaff(id) { const w = this.service.paid.find(w => w.staffId === id); const cost = this.getStaffUpgradeCost(id); if (!w || cost === null)
        return { ok: false, reason: '고용한 직원만 Lv.5까지 강화할 수 있어요.' }; const result = this.purchase(cost, 'staff-upgrade', id, w.level + 1); if (result.ok) {
        this.service.upgrade(w, this.elapsedTime);
        this.telemetry.staffUpgradePurchases.push({ ...this.telemetry.upgradePurchases.at(-1) });
    } return result; }
    get cafe() { return this.economy.cafes[this.cafeLevel - 1]; }
    get warehouse() { return this.economy.warehouses[this.warehouseLevel - 1]; }
    earlyElapsed = null;
    get elapsedTime() { return this.earlyElapsed ?? this.durationSeconds - this.remainingSeconds; }
    endBusiness() { if (this.policy.persistence !== 'saved-cafe' || this.status !== 'RUNNING')
        return false; this.earlyElapsed = this.elapsedTime; this.remainingSeconds = 0; this.status = 'CLOSED'; this.telemetry.record(this.snapshot); return true; }
    leaveClassMatch() { if (this.policy.persistence !== 'none' || this.status !== 'RUNNING')
        return false; this.earlyElapsed = this.elapsedTime; this.remainingSeconds = 0; this.status = 'CLOSED'; this.telemetry.record(this.snapshot); return true; }
    getPrice(m, level = m.currentLevel) { return Math.round(m.basePrice * this.economy.menuMultipliers[level - 1]); }
    getMenuUpgradeCost(m) { return m.currentLevel >= m.maxLevel ? null : Math.round(m.basePrice * this.economy.menuUpgradeMultipliers[m.currentLevel - 1]); }
    get nextCafe() { return this.economy.cafes[this.cafeLevel] ?? null; }
    get nextWarehouse() { return this.economy.warehouses[this.warehouseLevel] ?? null; }
    purchase(cost, kind, target, level) {
        if (this.status !== 'RUNNING')
            return { ok: false, reason: '영업이 종료됐어요.' };
        if (this.money < cost)
            return { ok: false, reason: '돈이 부족해요. ' + this.money.toLocaleString() + ' / ' + cost.toLocaleString() + ' 원' };
        this.money -= cost;
        this.telemetry.upgradePurchases.push({ elapsedTime: this.elapsedTime, kind, target, cost, level });
        return { ok: true, reason: '투자 완료!' };
    }
    expandCafe() { const next = this.nextCafe; if (!next)
        return { ok: false, reason: '최고 단계 카페예요.' }; const result = this.purchase(next.expansionCost, 'cafe', next.name, next.level); if (result.ok) {
        this.cafeLevel = next.level;
        this.updateServiceLayout();
        this.telemetry.cafeUpgradeTimes.push({ elapsedTime: this.elapsedTime, level: next.level });
        for (const definition of menuDefinitions.filter(m => m.unlockCafeLevel === next.level))
            this.menus.push({ ...definition, stock: Math.min(this.warehouse.capacity, balance.stock.newMenuInitial), maxStock: this.warehouse.capacity });
    } return result; }
    upgradeWarehouse() { const next = this.nextWarehouse; if (!next)
        return { ok: false, reason: '창고가 최대 크기예요.' }; const result = this.purchase(next.cost, 'warehouse', '창고', this.warehouseLevel + 1); if (result.ok) {
        this.warehouseLevel++;
        for (const m of this.menus)
            m.maxStock = next.capacity;
    } return result; }
    upgradeMenu(id) { const m = this.menus.find(m => m.menuId === id); if (!m)
        return { ok: false, reason: '아직 잠긴 메뉴예요.' }; const cost = this.getMenuUpgradeCost(m); if (cost === null)
        return { ok: false, reason: '이미 최고 등급이에요.' }; const result = this.purchase(cost, 'menu', id, m.currentLevel + 1); if (result.ok)
        m.currentLevel++; return result; }
    get snapshot() { return { elapsedTime: this.elapsedTime, remainingTime: this.remainingSeconds, cafeLevel: this.cafeLevel, money: this.money, cumulativeRevenue: this.stats.revenue, questionsAttempted: this.stats.attempted, questionsCorrect: this.stats.correct, customersServed: this.stats.servedCustomers, customersLeft: this.customersLeft, foodSold: this.stats.soldFood, warehouseLevel: this.warehouseLevel, unlockedMenuCount: this.menus.length, menuUpgradeLevels: Object.fromEntries(this.menus.map(m => [m.menuId, m.currentLevel])), menuStocks: Object.fromEntries(this.menus.map(m => [m.menuId, m.stock])), stockoutEvents: this.stockoutEvents, wastedProduction: this.wastedProduction, successfulProduction: this.successfulProduction, staffCount: this.service.paid.length, staffLevels: Object.fromEntries(this.service.paid.map(w => [w.staffId, w.level])), ordersServedByOwner: this.service.completedByOwner, ordersServedByStaff: this.service.completedByStaff, averageOrderWaitTime: this.service.completedOrders ? this.service.totalOrderWait / this.service.completedOrders : 0, staffIdleTime: Object.fromEntries(this.service.workers.map(w => [w.staffId, w.idleTime])), staffBusyTime: Object.fromEntries(this.service.workers.map(w => [w.staffId, w.busyTime])), maxPendingOrders: this.maxPendingOrders, ordersReadyButWaitingForStaff: this.readyWaitingEvents, foodWaitSeconds: this.foodWaitSeconds, staffWaitSeconds: this.staffWaitSeconds }; }
    get growthResult() { return { cafeLevel: this.cafeLevel, warehouseLevel: this.warehouseLevel, unlockedMenuCount: this.menus.length, menuUpgrades: this.telemetry.upgradePurchases.filter(p => p.kind === 'menu').length, wastedProduction: this.wastedProduction, stockoutEvents: this.stockoutEvents, money: this.money }; }
    spawnElapsed = balance.customer.spawnSeconds;
    nextId = 1;
    constructor(durationSeconds, random = Math.random, snapshotSeconds = balance.telemetry.snapshotSeconds, content = {}) {
        this.durationSeconds = durationSeconds;
        this.random = random;
        this.content = content;
        if (!Number.isFinite(durationSeconds) || durationSeconds < 1 || durationSeconds > balance.time.maxSeconds)
            throw new Error('플레이 시간은 1~3600초입니다.');
        this.remainingSeconds = durationSeconds;
        this.telemetry = new LocalTelemetry(snapshotSeconds);
        this.nextSnapshot = snapshotSeconds;
        this.updateServiceLayout();
        this.telemetry.record(this.snapshot);
    }
    recordAnswer(correct) { if (this.status !== 'RUNNING')
        return; this.stats.attempted++; if (correct) {
        this.stats.correct++;
        const boosted = this.boosterRemaining > 0;
        const quantity = boosted ? 3 : balance.productionPerCorrect;
        if (boosted) {
            this.boosterRemaining--;
            this.telemetry.phase4.boostedCorrectAnswers++;
            this.telemetry.phase4.itemUsage.push({ elapsedTime: this.elapsedTime, item: 'booster', amount: 1 });
        }
        for (const m of this.menus.filter(m => m.unlockCafeLevel <= this.cafeLevel)) {
            const produced = Math.min(m.maxStock - m.stock, quantity);
            m.stock += produced;
            this.successfulProduction += produced;
            this.wastedProduction += quantity - produced;
        }
    } }
    canServe(g) { return g.order.length > 0 && g.order.every(o => (this.menus.find(m => m.menuId === o.menuId)?.stock ?? 0) >= o.quantity); }
    transition(g, state) { g.state = state; g.elapsed = 0; }
    generateOrder(customer, type) { const d = { orderProfile: this.cafe.order }; const available = this.menus.filter(m => m.unlockCafeLevel <= this.cafeLevel); const base = d.orderProfile.minQuantity + Math.floor(this.random() * (d.orderProfile.maxQuantity - d.orderProfile.minQuantity + 1)); const total = type === 'gourmand' ? Math.min(this.phase4Profile.gourmandMaxQuantity, Math.ceil(base * this.phase4Profile.gourmandMultiplier)) : type === 'vip' ? 2 + Math.floor(this.random() * 3) : type === 'hurried' ? Math.min(2, base) : base; const lines = []; for (let i = 0; i < total; i++) {
        const choices = lines.length >= d.orderProfile.maxTypes ? available.filter(m => lines.some(l => l.menuId === m.menuId)) : available;
        const repeat = type === 'gourmand' && lines.length > 0 && this.random() < .65;
        const preferred = repeat ? choices.filter(m => m.menuId === lines[0].menuId) : choices;
        const m = chooseOrderMenu(preferred.length ? preferred : choices, customer.orderPreference, this.random);
        const line = lines.find(l => l.menuId === m.menuId);
        if (line)
            line.quantity++;
        else
            lines.push({ menuId: m.menuId, quantity: 1 });
    } return lines; }
    spawn() { const seat = Array.from({ length: this.cafe.maxCustomers }, (_, i) => i).find(s => !this.guests.some(g => g.seat === s)); if (seat === undefined)
        return; let spawnRoll = 0; let definition = chooseCustomer(this.content.customerPool ? [...this.content.customerPool] : this.cafe.customerPool, this.guests.map(g => g.definition.visualKey), () => { spawnRoll = this.random(); return spawnRoll; }); if (!definition)
        return; this.telemetry.phase4.customersSpawned++; const roll = this.content.specialRandom?.() ?? ((Math.sin((spawnRoll + this.nextId) * 127.1) * 43758.5453) % 1 + 1) % 1; const type = this.phase4Enabled ? chooseSpecial(this.cafeLevel, this.guests.flatMap(g => g.specialType ? [g.specialType] : []), roll, this.phase4Profile, this.vipPending, this.regularMemory.revisitEligible) : null; let regularTier = 1; if (type) {
        definition = specialDefinition(type, this.phase4Profile);
        if (type === 'regular') {
            regularTier = Math.min(3, 1 + this.regularMemory.satisfiedVisits);
            definition = { ...definition, patienceSeconds: definition.patienceSeconds + (regularTier - 1) * this.phase4Profile.regularPatienceStep };
        }
        const t = this.telemetry.phase4;
        t.specialCustomersSpawned++;
        const count = t.specialCustomerTypes[type] ??= { spawned: 0, served: 0 };
        count.spawned++;
        if (type === 'vip') {
            t.vipVisits++;
            if (this.vipPending) {
                this.vipPending = false;
                t.itemUsage.push({ elapsedTime: this.elapsedTime, item: 'invite', amount: 1, guestId: this.nextId });
            }
        }
        if (type === 'regular') {
            if (this.regularMemory.satisfiedVisits)
                t.regularCustomerRevisits++;
            t.regularHighestTier = Math.max(t.regularHighestTier, regularTier);
        }
        t.visits.push({ elapsedTime: this.elapsedTime, guestId: this.nextId, type, tier: regularTier });
    } this.guests.push({ id: this.nextId++, ...(type ? { specialType: type, regularTier } : {}), definition, seat, state: 'ENTERING', elapsed: 0, patienceRemaining: definition.patienceSeconds, order: [], paid: false, abandoned: false, stockoutRecorded: false, quotedRevenue: 0, orderedAt: 0, foodWaitTime: 0, staffWaitTime: 0 }); }
    tick(seconds) { if (this.status === 'CLOSED' || seconds <= 0 || !Number.isFinite(seconds))
        return; let left = Math.min(seconds, this.remainingSeconds); while (left > 0) {
        const dt = Math.min(left, 0.1);
        this.step(dt);
        left -= dt;
        this.remainingSeconds = Math.max(0, this.remainingSeconds - dt);
        if (this.elapsedTime + 1e-7 >= this.nextSnapshot) {
            this.telemetry.record(this.snapshot);
            this.nextSnapshot += this.telemetry.intervalSeconds;
        }
        if (this.remainingSeconds < 1e-8) {
            this.remainingSeconds = 0;
            this.status = 'CLOSED';
            if (Math.abs((this.telemetry.snapshots.at(-1)?.elapsedTime ?? -1) - this.elapsedTime) < 1e-6)
                this.telemetry.snapshots.pop();
            this.telemetry.record(this.snapshot);
            break;
        }
    } }
    step(dt) {
        this.spawnElapsed += dt;
        if (this.spawnElapsed >= balance.customer.spawnSeconds && this.guests.length < this.cafe.maxCustomers) {
            this.spawn();
            this.spawnElapsed = 0;
        }
        for (const g of this.guests) {
            g.elapsed += dt;
            switch (g.state) {
                case 'ENTERING':
                    if (g.elapsed >= balance.customer.entering)
                        this.transition(g, 'MOVING_TO_SEAT');
                    break;
                case 'MOVING_TO_SEAT':
                    if (g.elapsed >= balance.customer.moving)
                        this.transition(g, 'ORDERING');
                    break;
                case 'ORDERING':
                    if (g.elapsed >= balance.customer.ordering) {
                        g.order = this.generateOrder(g.definition, g.specialType);
                        g.orderedAt = this.elapsedTime;
                        g.quotedRevenue = g.order.reduce((sum, o) => sum + this.getPrice(this.menus.find(m => m.menuId === o.menuId)) * o.quantity, 0);
                        this.transition(g, 'WAITING_FOR_FOOD');
                    }
                    break;
                case 'WAITING_FOR_FOOD':
                    g.patienceRemaining = Math.max(0, g.patienceRemaining - dt);
                    if (!this.canServe(g)) {
                        g.foodWaitTime += dt;
                        this.foodWaitSeconds += dt;
                    }
                    if (g.patienceRemaining <= 0) {
                        g.abandoned = true;
                        this.customersLeft++;
                        this.transition(g, 'LEAVING');
                    }
                    else if (this.canServe(g)) {
                        for (const o of g.order)
                            this.menus.find(m => m.menuId === o.menuId).stock -= o.quantity;
                        this.transition(g, 'PREPARING');
                    }
                    else if (!g.stockoutRecorded) {
                        g.stockoutRecorded = true;
                        this.stockoutEvents++;
                    }
                    break;
                case 'PREPARING':
                    if (g.elapsed >= balance.customer.preparing)
                        this.transition(g, 'SERVING');
                    break;
                case 'SERVING': break;
                case 'EATING':
                    if (g.elapsed >= balance.customer.eating)
                        this.transition(g, 'PAYING');
                    break;
                case 'PAYING':
                    if (g.elapsed >= balance.customer.paying) {
                        if (!g.paid) {
                            let specialMultiplier = g.specialType ? this.phase4Profile.rules[g.specialType].multiplier : 1;
                            if (g.specialType === 'hurried' && (g.servedAt ?? Infinity) - g.orderedAt <= this.phase4Profile.hurriedFastSeconds)
                                specialMultiplier = this.phase4Profile.hurriedBonus;
                            const special = Math.round(g.quotedRevenue * specialMultiplier);
                            const golden = this.goldenRemaining > 0;
                            const total = special * (golden ? 2 : 1);
                            if (golden) {
                                this.goldenRemaining--;
                                this.telemetry.phase4.goldenOrdersCompleted++;
                                this.telemetry.phase4.itemUsage.push({ elapsedTime: this.elapsedTime, item: 'golden', amount: 1, guestId: g.id });
                            }
                            g.paymentRevenue = total;
                            this.stats.revenue += total;
                            this.money += total;
                            const t = this.telemetry.phase4;
                            t.payments.push({ elapsedTime: this.elapsedTime, guestId: g.id, type: g.specialType ?? 'normal', base: g.quotedRevenue, special, golden, total });
                            if (g.specialType) {
                                t.specialCustomersServed++;
                                t.specialCustomerTypes[g.specialType].served++;
                            }
                            this.stats.servedCustomers++;
                            this.stats.soldFood += g.order.reduce((sum, o) => sum + o.quantity, 0);
                            g.paid = true;
                        }
                        this.transition(g, 'LEAVING');
                    }
                    break;
                case 'LEAVING':
                    if (g.elapsed >= balance.customer.leaving) {
                        if (g.specialType === 'regular' && g.paid && !g.abandoned) {
                            this.regularMemory.satisfiedVisits = Math.min(2, this.regularMemory.satisfiedVisits + 1);
                            this.regularMemory.revisitEligible = (this.content.specialRandom?.() ?? this.random()) < this.phase4Profile.regularRevisitChance;
                        }
                        this.transition(g, 'DONE');
                    }
                    break;
            }
        }
        const pending = this.guests.filter(g => g.state === 'WAITING_FOR_FOOD' || g.state === 'PREPARING' || g.state === 'SERVING');
        this.maxPendingOrders = Math.max(this.maxPendingOrders, pending.length);
        for (const g of this.guests.filter(g => g.state === 'PREPARING' || g.state === 'SERVING')) {
            g.patienceRemaining = Math.max(0, g.patienceRemaining - dt);
            if (g.patienceRemaining <= 0) {
                g.abandoned = true;
                this.customersLeft++;
                this.transition(g, 'LEAVING');
                continue;
            }
        }
        this.service.tick(dt, this.guests.map(g => ({ id: g.id, seat: g.seat, ready: g.state === 'SERVING', active: g.state === 'SERVING' || g.state === 'PREPARING', orderedAt: g.orderedAt, items: g.order.flatMap(o => Array(o.quantity).fill(o.menuId)) })), this.elapsedTime, (id) => { const g = this.guests.find(g => g.id === id); if (g?.state === 'SERVING') {
            g.servedAt = this.elapsedTime;
            this.transition(g, 'EATING');
        } });
        for (const g of this.guests) {
            if (g.state === 'SERVING' && !this.service.workers.some(w => w.orderId === g.id)) {
                g.staffWaitTime += dt;
                this.staffWaitSeconds += dt;
                if (!this.readyWaitIds.has(g.id)) {
                    this.readyWaitIds.add(g.id);
                    this.readyWaitingEvents++;
                }
            }
        }
        this.guests = this.guests.filter(g => g.state !== 'DONE');
    }
    get result() { return { playSeconds: this.elapsedTime, ...this.stats, accuracy: this.stats.attempted ? Math.round(this.stats.correct / this.stats.attempted * 100) : 0 }; }
}
