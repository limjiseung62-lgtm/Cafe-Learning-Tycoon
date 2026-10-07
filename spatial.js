import { balance } from './config.js';
// Coordinates are floor contact points, in percent of the full 3:2 room image.
// All six rooms deliberately retain a clear floor; furniture uses the existing atlas.
const centers = [
    [{ x: 29, y: 53 }, { x: 59, y: 56 }],
    [{ x: 28, y: 52 }, { x: 60, y: 55 }],
    [{ x: 24, y: 50 }, { x: 49, y: 48 }, { x: 69, y: 62 }],
    [{ x: 24, y: 50 }, { x: 49, y: 48 }, { x: 69, y: 62 }],
    [{ x: 23, y: 49 }, { x: 47, y: 46 }, { x: 69, y: 49 }, { x: 42, y: 65 }],
    [{ x: 23, y: 49 }, { x: 47, y: 46 }, { x: 69, y: 49 }, { x: 42, y: 65 }]
];
export function createSpace(level) {
    const scale = level >= 5 ? .88 : 1;
    const tables = centers[level - 1].map((p, i) => ({ ...p, tableId: 'table-' + (i + 1), scale, servicePoints: [{ x: p.x + 10 * scale, y: p.y - 5 * scale }, { x: p.x - 10 * scale, y: p.y - 2 * scale }] }));
    const chairs = level >= 5 ? [{ x: 210, y: 163, rear: true, facing: 'left' }, { x: 47, y: 218, rear: false, facing: 'right' }] : [{ x: 208, y: 192, rear: false, facing: 'left' }, { x: 43, y: 164, rear: true, facing: 'right' }];
    const furniture = level >= 5 ? { w: 250, h: 316 } : { w: 242, h: 291 };
    const seats = tables.flatMap((t, i) => chairs.map((chair, side) => { const x = t.x + 14 * t.scale * (chair.x / furniture.w - .5), y = t.y - 21 * t.scale * (furniture.h - chair.y) / furniture.w; return { seatId: 'seat-' + (i * 2 + side + 1), tableId: t.tableId, x, y, facing: chair.facing, occupiedBy: null, cafeLevel: Math.max(1, i * 2 + side - 1), scale, servicePoint: t.servicePoints[side], approach: { ...t.servicePoints[side] }, rear: chair.rear, entryPath: [], standPoint: { x, y: y + 5 * t.scale } }; }));
    const space = { level, entrance: { x: 96, y: 43 }, exit: { x: 103, y: 43 }, pickup: { x: 78, y: 65 }, pickupSlots: Array.from({ length: 6 }, (_, i) => ({ x: 52 + i * 6.6, y: 65 })), staffWaitingPoints: [{ x: 15, y: 66 }, { x: 27, y: 72 }, { x: 43, y: 84 }, { x: 61, y: 76 }, { x: 75, y: 66 }, { x: 89, y: 67 }].map(p => ({ x: p.x + (level === 2 ? 1 : level >= 5 ? -1 : 0), y: p.y })), staffAccessPoints: [{ x: 15, y: 58 }, { x: 32, y: 59 }, { x: 51, y: 70 }, { x: 54, y: 70 }, { x: 89, y: 61 }, { x: 91, y: 61 }], intermediateWaypoints: [{ x: 89, y: 47 }, { x: 89, y: 59 }, { x: 89, y: 67 }], tables, seats };
    for (const seat of seats)
        seat.entryPath = floorPath(space, space.entrance, seat.approach);
    return space;
}
// A small visibility graph around furniture rectangles. Routes follow open floor,
// then the final chair approach is intentionally allowed into its own seat.
export function floorPath(space, from, to) {
    const obstacles = space.tables.map(t => ({ left: t.x - 7.2 * t.scale, right: t.x + 7.2 * t.scale, top: t.y - 18.5 * t.scale, bottom: t.y + .6 }));
    const clear = (a, b) => !obstacles.some(r => { let lo = 0, hi = 1; for (const axis of ['x', 'y']) {
        const min = axis === 'x' ? r.left : r.top, max = axis === 'x' ? r.right : r.bottom, delta = b[axis] - a[axis];
        if (Math.abs(delta) < 1e-8) {
            if (a[axis] <= min || a[axis] >= max)
                return false;
        }
        else {
            const u = (min - a[axis]) / delta, v = (max - a[axis]) / delta;
            lo = Math.max(lo, Math.min(u, v));
            hi = Math.min(hi, Math.max(u, v));
            if (lo >= hi)
                return false;
        }
    } return lo < hi && hi > 0 && lo < 1; });
    const points = [from, to, ...obstacles.flatMap(r => [{ x: r.left - .6, y: r.top - .6 }, { x: r.right + .6, y: r.top - .6 }, { x: r.left - .6, y: r.bottom + .6 }, { x: r.right + .6, y: r.bottom + .6 }])].filter((p, i) => i < 2 || (p.x >= 10 && p.x <= 94 && p.y >= 35 && p.y <= 67));
    const distances = points.map(() => Infinity), previous = points.map(() => -1), visited = new Set();
    distances[0] = 0;
    for (let pass = 0; pass < points.length; pass++) {
        let current = -1;
        for (let i = 0; i < points.length; i++)
            if (!visited.has(i) && (current < 0 || distances[i] < distances[current]))
                current = i;
        if (current < 0 || !Number.isFinite(distances[current]))
            break;
        if (current === 1)
            break;
        visited.add(current);
        for (let i = 0; i < points.length; i++)
            if (!visited.has(i) && clear(points[current], points[i])) {
                const cost = distances[current] + Math.hypot(points[current].x - points[i].x, (points[current].y - points[i].y) * 2 / 3);
                if (cost < distances[i]) {
                    distances[i] = cost;
                    previous[i] = current;
                }
            }
    }
    if (!Number.isFinite(distances[1]))
        throw new Error('No clear floor route: ' + JSON.stringify({ level: space.level, from, to }));
    const result = [];
    for (let i = 1; i !== -1; i = previous[i])
        result.unshift({ ...points[i] });
    return result;
}
export class SeatReservations {
    seats;
    capacity;
    constructor(seats, capacity) {
        this.seats = seats;
        this.capacity = capacity;
    }
    reserve(id, preferred) { const existing = this.seats.find(s => s.occupiedBy === id); if (existing)
        return existing; const seat = preferred === undefined ? this.seats.slice(0, this.capacity).find(s => s.occupiedBy === null) : this.seats[preferred]; if (!seat || this.seats.indexOf(seat) >= this.capacity || seat.occupiedBy !== null)
        return null; seat.occupiedBy = id; return seat; }
    release(id) { const s = this.seats.find(s => s.occupiedBy === id); if (s)
        s.occupiedBy = null; }
    sync(guests) { const ids = new Set(guests.map(g => g.id)); for (const s of this.seats)
        if (s.occupiedBy !== null && !ids.has(s.occupiedBy))
            s.occupiedBy = null; for (const g of guests)
        if (!this.reserve(g.id, g.seat))
            throw new Error('Seat reservation conflict: ' + g.id); }
}
export function pointOnPath(path, progress) { const t = Math.max(0, Math.min(1, progress)); if (t === 1)
    return { ...path.at(-1) }; const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, (p.y - path[i].y) * 2 / 3)); const total = lengths.reduce((a, b) => a + b, 0); let left = total * t; for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
        const f = lengths[i] ? Math.min(1, left / lengths[i]) : 1;
        return { x: path[i].x + (path[i + 1].x - path[i].x) * f, y: path[i].y + (path[i + 1].y - path[i].y) * f };
    }
    left -= lengths[i];
} return { ...path[0] }; }
export function guestPose(g, space) {
    const s = space.seats[g.seat];
    let point = s, action = g.state, seated = true, opacity = 1;
    const entrance = space.entrance;
    if (g.state === 'ENTERING') {
        point = pointOnPath([{ x: 101, y: 43 }, entrance], g.elapsed / balance.customer.entering);
        action = 'ENTERING';
        seated = false;
        opacity = Math.min(1, g.elapsed / .3);
    }
    else if (g.state === 'MOVING_TO_SEAT') {
        point = pointOnPath([...s.entryPath, s.standPoint], g.elapsed / balance.customer.moving);
        action = 'WALKING_TO_SEAT';
        seated = false;
    }
    else if (g.state === 'ORDERING')
        action = g.elapsed < .4 ? 'SITTING' : 'ORDERING';
    else if (g.state === 'PAYING')
        action = 'FINISHING';
    else if (g.state === 'LEAVING') {
        seated = false;
        if (g.elapsed < .25) {
            action = 'STANDING_UP';
            point = s.standPoint;
        }
        else {
            action = 'WALKING_TO_EXIT';
            point = pointOnPath([s.standPoint, ...[...s.entryPath].reverse(), space.exit], (g.elapsed - .25) / (balance.customer.leaving - .25));
            opacity = Math.min(1, (balance.customer.leaving - g.elapsed) / .25);
        }
    }
    const facing = action === 'WALKING_TO_EXIT' ? 'right' : action === 'ENTERING' || action === 'WALKING_TO_SEAT' ? 'left' : s.facing;
    return { ...point, action, facing, seated, opacity: Math.max(0, opacity) };
}
export class SpatialScene {
    space;
    reservations;
    tracks = new Map();
    constructor(level, capacity) { this.space = createSpace(level); this.reservations = new SeatReservations(this.space.seats, capacity); }
    sync(game) { if (this.space.level !== game.cafeLevel) {
        this.space = createSpace(game.cafeLevel);
        this.reservations = new SeatReservations(this.space.seats, game.cafe.maxCustomers);
        this.tracks.clear();
    } this.reservations.sync(game.guests); }
    guest(g) { return guestPose(g, this.space); }
    worker(w, game) {
        const index = game.service.workers.indexOf(w), home = this.space.staffWaitingPoints[index], pickup = this.space.pickupSlots[index];
        let track = this.tracks.get(w.staffId);
        const g = game.guests.find(g => g.id === w.orderId), seat = g ? this.space.seats[g.seat] : undefined;
        if (!track) {
            track = { state: '', orderId: null, engineStart: { ...w.position }, engineTarget: { ...w.position }, path: [home], point: { ...home }, facing: 'left' };
            this.tracks.set(w.staffId, track);
        }
        if (track.state !== w.state || track.orderId !== w.orderId) {
            // Finish the preceding leg before beginning a new one. Engine arrival is authoritative.
            if ((track.state === 'MOVING_TO_PICKUP' && w.state === 'PICKING_UP') || (track.state === 'MOVING_TO_TABLE' && w.state === 'SERVING') || (track.state === 'RETURNING' && (w.state === 'IDLE' || w.state === 'CLAIMING_ORDER')))
                track.point = { ...track.path.at(-1) };
            const from = { ...track.point };
            let target = from, engineTarget = { ...w.position }, path = [from];
            if (w.state === 'MOVING_TO_PICKUP') {
                target = pickup;
                engineTarget = game.service.pickup;
                path = w.state === 'MOVING_TO_PICKUP' && track.state === 'CLAIMING_ORDER' ? [from, this.space.staffAccessPoints[index], ...floorPath(this.space, this.space.staffAccessPoints[index], target).slice(1)] : floorPath(this.space, from, target);
            }
            else if (w.state === 'MOVING_TO_TABLE' && seat) {
                target = seat.servicePoint;
                engineTarget = { x: game.service.seats[g.seat].x, y: game.service.seats[g.seat].y + 5 };
                path = floorPath(this.space, from, target);
            }
            else if (w.state === 'RETURNING') {
                target = home;
                engineTarget = w.owner ? { x: 78, y: 22 } : { x: 14 + game.service.paid.indexOf(w) * 12, y: 22 };
                path = [...floorPath(this.space, from, this.space.staffAccessPoints[index]), target];
            }
            else if (w.state === 'IDLE')
                path = [home];
            else if (w.state === 'SERVING' && seat)
                path = [seat.servicePoint];
            else if (w.state === 'PICKING_UP')
                path = [pickup];
            track = { state: w.state, orderId: w.orderId, engineStart: { ...w.position }, engineTarget: { ...engineTarget }, path, point: path.length === 1 ? { ...path[0] } : from, facing: track.facing };
            this.tracks.set(w.staffId, track);
        }
        if (w.state.startsWith('MOVING') || w.state === 'RETURNING') {
            const total = Math.hypot(track.engineTarget.x - track.engineStart.x, track.engineTarget.y - track.engineStart.y);
            const remaining = Math.hypot(track.engineTarget.x - w.position.x, track.engineTarget.y - w.position.y);
            const point = pointOnPath(track.path, total ? 1 - remaining / total : 1);
            if (Math.abs(point.x - track.point.x) > .01)
                track.facing = point.x < track.point.x ? 'left' : 'right';
            track.point = point;
        }
        return { ...track.point, facing: track.facing, action: w.state, seated: false, opacity: 1 };
    }
}
