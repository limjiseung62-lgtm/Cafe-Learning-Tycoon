import { staffBalance } from './config.js';
export const staffDefinitions = [{ staffId: 'staff-1', name: '봄이', visualKey: 'spring' }, { staffId: 'staff-2', name: '준이', visualKey: 'jun' }, { staffId: 'staff-3', name: '하루', visualKey: 'haru' }, { staffId: 'staff-4', name: '루나', visualKey: 'luna' }, { staffId: 'staff-5', name: '도담', visualKey: 'dodam' }];
export const staffVisuals = { owner: { face: '🧑‍🍳', apron: '#795f42', accessory: '☕' }, spring: { face: '👩', apron: '#d4898f', accessory: '🌸' }, jun: { face: '👨‍🦱', apron: '#7d9cc1', accessory: '🎧' }, haru: { face: '👩‍🦰', apron: '#9aaf70', accessory: '🌿' }, luna: { face: '👩‍🦳', apron: '#ac8dbb', accessory: '⭐' }, dodam: { face: '👨‍🦲', apron: '#d8a562', accessory: '🎀' } };
export class StaffSystem {
    // Headless balance simulations retain their automatic driver. Interactive play opts in.
    manualOwner = false;
    claimOwner(order) { const w = this.workers[0]; if (!this.manualOwner || this.paid.length || w.state !== 'IDLE' || !order.ready || !order.active || this.workers.some(worker => worker.orderId === order.id))
        return false; w.orderId = order.id; w.remaining = [...order.items]; this.change(w, 'CLAIMING_ORDER'); return true; }
    workers = [this.create('owner', '사장님', 'owner', true)];
    pickup = { x: 78, y: 30 };
    seats = [];
    completedByOwner = 0;
    completedByStaff = 0;
    totalOrderWait = 0;
    completedOrders = 0;
    create(staffId, name, visualKey, owner = false) { return { staffId, name, visualKey, owner, level: 1, ...staffBalance.levels[0], state: 'IDLE', position: { x: 78, y: 22 }, orderId: null, cargo: [], remaining: [], elapsed: 0, idleTime: 0, busyTime: 0, upgradeFeedbackUntil: 0 }; }
    get paid() { return this.workers.filter(w => !w.owner); }
    hire() { const d = staffDefinitions[this.paid.length]; if (!d)
        return null; const w = this.create(d.staffId, d.name, d.visualKey); w.position = { x: 14 + this.paid.length * 12, y: 22 }; this.workers.push(w); return w; }
    upgrade(w, now) { w.level++; Object.assign(w, staffBalance.levels[w.level - 1]); w.upgradeFeedbackUntil = now + 3; }
    setLayout(pickup, seats) { this.pickup = { ...pickup }; this.seats = seats.map(p => ({ ...p })); }
    change(w, state) { w.state = state; w.elapsed = 0; }
    release(w) { w.orderId = null; w.cargo = []; w.remaining = []; this.change(w, 'RETURNING'); }
    move(w, to, dt) { const dx = to.x - w.position.x, dy = to.y - w.position.y; const distance = Math.hypot(dx, dy); const travel = w.moveSpeed * dt; if (distance <= travel) {
        w.position = { ...to };
        return true;
    } w.position.x += dx / distance * travel; w.position.y += dy / distance * travel; return false; }
    tick(dt, orders, now, onComplete) {
        const active = new Map(orders.filter(o => o.active).map(o => [o.id, o]));
        // Claims are established synchronously; later workers cannot take the same order.
        const claimed = new Set(this.workers.map(w => w.orderId).filter((id) => id !== null));
        for (const w of this.workers) {
            if (w.orderId !== null && !active.has(w.orderId)) {
                claimed.delete(w.orderId);
                this.release(w);
            }
            if (w.state === 'IDLE' && !(w.owner && this.manualOwner && !this.paid.length)) {
                const order = orders.filter(o => o.ready && o.active && !claimed.has(o.id)).sort((a, b) => a.orderedAt - b.orderedAt || a.id - b.id)[0];
                if (order) {
                    w.orderId = order.id;
                    w.remaining = [...order.items];
                    claimed.add(order.id);
                    this.change(w, 'CLAIMING_ORDER');
                }
            }
            if (w.state === 'IDLE')
                w.idleTime += dt;
            else
                w.busyTime += dt;
            w.elapsed += dt;
            const order = w.orderId === null ? undefined : active.get(w.orderId);
            switch (w.state) {
                case 'IDLE': break;
                case 'CLAIMING_ORDER':
                    if (w.elapsed >= staffBalance.claimSeconds)
                        this.change(w, 'MOVING_TO_PICKUP');
                    break;
                case 'MOVING_TO_PICKUP':
                    if (this.move(w, this.pickup, dt))
                        this.change(w, 'PICKING_UP');
                    break;
                case 'PICKING_UP':
                    if (w.elapsed >= staffBalance.pickupSeconds) {
                        w.cargo = w.remaining.splice(0, w.carryCapacity);
                        this.change(w, 'MOVING_TO_TABLE');
                    }
                    break;
                case 'MOVING_TO_TABLE':
                    if (order && this.move(w, { x: (this.seats[order.seat]?.x ?? 50), y: (this.seats[order.seat]?.y ?? 60) + 5 }, dt))
                        this.change(w, 'SERVING');
                    break;
                case 'SERVING':
                    if (w.elapsed >= 1 / w.serveSpeed) {
                        w.cargo = [];
                        if (w.remaining.length)
                            this.change(w, 'MOVING_TO_PICKUP');
                        else if (order) {
                            this.completedOrders++;
                            this.totalOrderWait += Math.max(0, now - order.orderedAt);
                            if (w.owner)
                                this.completedByOwner++;
                            else
                                this.completedByStaff++;
                            onComplete(order.id, w);
                            claimed.delete(order.id);
                            this.release(w);
                        }
                    }
                    break;
                case 'RETURNING':
                    if (this.move(w, w.owner ? { x: 78, y: 22 } : { x: 14 + this.paid.indexOf(w) * 12, y: 22 }, dt))
                        this.change(w, 'IDLE');
                    break;
            }
        }
    }
}
