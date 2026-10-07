import { FinalUx } from './finalUx.js';
import { SessionClock, ActionGate } from './uxState.js';
import { installAssetFallbacks } from './assetFallback.js';
import { createLearning, learningProgressRepository } from './learningIntegration.js';
import { renderQuestionText, escapeText } from './questionRenderer.js';
import { GameFeel } from './gameFeel.js';
import { ModeFlow } from './modeUi.js';
import { itemCatalog, specialNames, specialIcons, specialTypes } from './phase4Config.js';
import { showOrderBubble, syncOrderBubble, assetSignature } from './presentation.js';
import { personalityLabels } from './customerRules.js';
import { selectCustomerPose, customerPoseArt, poseGeometry, preloadCustomerPoses, selectedPoseAsset } from './customerPoses.js';
import { SpatialScene } from './spatial.js';
import { icon } from './uiIcons.js';
import { sprite } from './art.js';
import { staffBalance } from './config.js';
import { staffDefinitions } from './staff.js';
import { foodVisual } from './foodVisual.js';
import { cafeLevels } from './config.js';
import { customers, menuDefinitions } from './data.js';
const developerMode = new URLSearchParams(location.search).has('dev');
const clock = new SessionClock(), purchaseGate = new ActionGate();
const feel = new GameFeel();
const app = document.querySelector('#app');
preloadCustomerPoses(cafeLevels[0].customerPool);
let game = null;
let engine = createLearning(undefined, false);
let active = null;
let feedback = null;
let panelOpen = false;
let last = performance.now();
let productionUntil = 0;
let investmentOpen = false;
let investmentTab = 'cafe';
let investmentMessage = '';
let celebrationUntil = 0;
let celebrationLevel = 0;
let renderedInvestmentKey = '';
let displayedResult = null;
let deliveryMenu = 'coffee';
let scene = null;
const guestLooks = new Map();
let selectedGuest = null;
let selectedUntil = 0;
let detailKey = '';
const format = (s) => Math.floor(Math.ceil(s) / 60).toString().padStart(2, '0') + ':' + (Math.ceil(s) % 60).toString().padStart(2, '0');
const labels = { ENTERING: '어서 오세요!', MOVING_TO_SEAT: '자리로 가는 중', ORDERING: '메뉴 고르는 중', WAITING_FOR_FOOD: '음식을 기다려요', PREPARING: '주문 준비 중', SERVING: '음식 배달 중', EATING: '맛있게 먹는 중', PAYING: '결제 중', LEAVING: '다음에 또 올게요' };
app.innerHTML = `<main class="shell"><header class="brand"><span class="logo">${sprite('coffee')}</span><div><p class="eyebrow">CAFE LEARNING TYCOON</p><h1>카페 학습 타이쿤</h1><p>문제 하나, 맛있는 한 걸음</p></div></header><section id="setup" class="setup"><div class="setup-people">${sprite('owner', 'welcome-owner')}${sprite('staff-1', 'welcome-staff')}</div><div class="welcome-card"></div><div class="welcome-note">공부하는 만큼, 나만의 카페가 완성돼요.</div></section><section id="playing" hidden><div class="hud"><div><span>남은 시간</span><strong id="timer"></strong></div><div><span>푼 문제</span><strong id="question-count">0</strong></div><div class="money-card"><span>보유금</span><strong id="money"></strong></div><div class="level-card"><span>나의 카페</span><strong id="cafe-level"></strong></div></div><div class="game-layout"><section class="cafe" id="cafe-room"><span id="cafe-name" class="room-name"></span><div id="decor" class="decor"></div><div class="seats" id="seats"></div><div class="pickup-marker">음식 받는 곳</div><div class="workers" id="workers"></div><div class="counter-foreground"></div></section><section class="lesson-card"><button id="make" class="primary" aria-label="음식 만들기">${icon('menu')}<span>음식 만들기</span></button></section><aside class="pantry"><div class="pantry-head"><h2>부족 재고</h2><span id="warehouse-caption"></span><span id="stock-count"></span></div><div id="stocks"></div><div id="production" class="production" aria-live="polite"></div></aside><nav class="scene-actions" aria-label="카페 관리"><button id="invest" aria-label="카페 키우기"><span class="nav-symbol">${icon('grow')}</span>성장</button><button data-focus-tab="staff" aria-label="직원 관리"><span class="nav-symbol">${icon('staff')}</span>직원</button><button data-focus-tab="menu" aria-label="메뉴 강화"><span class="nav-symbol">${icon('menu')}</span>메뉴</button><button data-focus-tab="warehouse" aria-label="창고 관리"><span class="nav-symbol">${icon('warehouse')}</span>창고</button></nav><div id="live-stats"></div><div id="item-effects" class="item-effects"></div><div class="mode-status"><span id="mode-label"></span><span id="save-status"></span><button id="end-business" hidden>영업 마치기</button><button id="leave-game">나가기</button></div><aside id="guest-detail" class="guest-detail" hidden aria-label="선택한 손님 상세"></aside></div></section><section id="results" class="results" hidden></section></main><section id="problem-panel" class="problem-panel" hidden aria-label="음식 만들기 학습 패널"></section><section id="investment-panel" class="investment-panel" hidden aria-label="카페 투자 패널"></section><div id="celebration" class="celebration" hidden aria-live="polite"></div>`;
const el = (id) => document.getElementById(id);
const ux = new FinalUx(() => game);
installAssetFallbacks();
export function startSession(session, pool) { el('workers').innerHTML = ''; el('seats').innerHTML = ''; el('decor').innerHTML = ''; delete el('cafe-room').dataset.artLevel; guestLooks.clear(); selectedGuest = null; detailKey = ''; app.classList.add('in-session'); game = session; displayedResult = null; clock.start(); ux.start(); feel.start(session); modeFlow.attach(session, pool); scene = new SpatialScene(game.cafeLevel, game.cafe.maxCustomers); scene.sync(game); preloadCustomerPoses([...game.cafe.customerPool, ...(game.phase4Enabled ? specialTypes.map(t => 'special-' + t) : [])]); engine = createLearning(pool, session.policy.persistence === 'saved-cafe'); active = null; feedback = null; panelOpen = false; investmentOpen = false; investmentMessage = ''; renderedInvestmentKey = ''; celebrationUntil = 0; productionUntil = 0; el('setup').hidden = true; el('results').hidden = true; el('playing').hidden = false; el('make').disabled = false; el('investment-panel').hidden = true; last = performance.now(); render(); }
document.querySelectorAll('[data-focus-tab]').forEach(b => b.onclick = () => { if (game?.status !== 'RUNNING')
    return; investmentTab = b.dataset.focusTab; selectedGuest = null; detailKey = ''; el('guest-detail').hidden = true; investmentOpen = true; panelOpen = false; renderProblem(); renderInvestment(true); });
el('invest').addEventListener('click', () => { investmentTab = 'cafe'; if (game?.status !== 'RUNNING')
    return; selectedGuest = null; detailKey = ''; el('guest-detail').hidden = true; investmentOpen = true; panelOpen = false; renderProblem(); renderInvestment(true); });
el('make').addEventListener('click', () => { if (game?.status !== 'RUNNING')
    return; selectedGuest = null; detailKey = ''; el('guest-detail').hidden = true; investmentOpen = false; el('investment-panel').hidden = true; panelOpen = true; if (!active)
    active = engine.next(); renderProblem(); if (active.type === 'short_answer' && !feedback)
    el('answer-input')?.focus(); });
function renderProblem() {
    const p = el('problem-panel');
    p.hidden = !panelOpen;
    if (!panelOpen || !active)
        return;
    p.innerHTML = `<div class="problem-head"><span>✦ 음식을 만드는 작은 도전</span><button id="close-problem" aria-label="문제 패널 닫기">✕</button></div><p class="eyebrow">${escapeText(active.subject)} · ${active.grade}학년 · ${active.type === 'ox' ? 'OX' : active.type === 'short_answer' ? '단답형' : '객관식'}</p><h2>${renderQuestionText(active.question)}</h2>${feedback ? '<div class="feedback ' + (feedback.correct ? 'correct' : 'incorrect') + '"><strong>' + (feedback.correct ? '정답! 음식이 만들어졌어요.' : '괜찮아요, 함께 확인해요') + '</strong><p>정답: ' + renderQuestionText(feedback.answer) + '</p><p>' + renderQuestionText(feedback.explanation) + '</p></div><button class="primary" id="next">다음 문제 →</button>' : active.type === 'short_answer' ? '<form id="answer-form"><label>답<input id="answer-input" autocomplete="off" inputmode="text" required></label><button class="primary">정답 확인</button></form>' : '<div class="choices">' + active.choices.map(c => '<button data-answer="' + escapeText(c) + '">' + renderQuestionText(c) + '</button>').join('') + '</div>'}<p class="hint">문제를 푸는 동안에도 영업 시간과 손님 대기시간은 흘러요.</p>`;
    el('close-problem').onclick = () => { panelOpen = false; renderProblem(); };
    p.querySelectorAll('[data-answer]').forEach(b => b.onclick = () => submit(b.dataset.answer));
    el('answer-form')?.addEventListener('submit', e => { e.preventDefault(); submit(el('answer-input').value); });
    el('next')?.addEventListener('click', () => { if (game?.status !== 'RUNNING')
        return; active = engine.next(); feedback = null; renderProblem(); if (active.type === 'short_answer')
        el('answer-input')?.focus(); });
}
function submit(answer) { advanceTime(); if (game?.status !== 'RUNNING' || !answer.trim())
    return; const r = engine.submit(answer); if (!r)
    return; feedback = r; const learningSaved = game.policy.persistence !== 'saved-cafe' || learningProgressRepository.write(engine.progress); const before = game.successfulProduction, quantity = game.boosterRemaining ? 3 : 1; game.recordAnswer(r.correct); if (r.correct)
    productionUntil = performance.now() + 1800; renderProblem(); if (!r.correct && ux.wrong()) {
    const note = document.createElement('p');
    note.textContent = '비슷한 문제가 나중에 다시 나와요.';
    document.querySelector('.feedback')?.append(note);
} if (!learningSaved) {
    const warning = document.createElement('p');
    warning.className = 'save-error';
    warning.textContent = '학습 기록을 저장하지 못했어요. 이번 영업에서는 복습이 계속됩니다.';
    document.querySelector('.feedback')?.append(warning);
} const chosen = document.createElement('p'); chosen.className = 'answer-outcome'; chosen.textContent = '내 답: ' + answer + ' · 정답: ' + r.answer; document.querySelector('.feedback')?.append(chosen); feel.answer(r.correct, game.successfulProduction - before, quantity, game.menus.length); render(); }
function render() {
    if (!game)
        return;
    if (game.status === 'CLOSED' && displayedResult === game) {
        modeFlow.refresh(game);
        feel.poll(game);
        ux.poll(game);
        return;
    }
    el('question-count').textContent = String(game.stats.attempted);
    el('timer').textContent = format(game.remainingSeconds);
    el('timer').classList.toggle('ending-time', game.remainingSeconds <= 60);
    el('money').textContent = game.money.toLocaleString() + ' 원';
    el('cafe-level').textContent = game.cafeLevel + '단계';
    el('cafe-level').title = game.cafe.name;
    el('cafe-name').textContent = game.cafe.name;
    el('warehouse-caption').textContent = '창고 ' + (game.warehouseLevel === 6 ? 'MAX' : game.warehouseLevel + '단계') + ' · 최대 ' + game.warehouse.capacity + '개';
    el('stock-count').textContent = game.menus.length + '종';
    scene.sync(game);
    renderRoom();
    renderWorkers();
    renderCompactStock();
    el('production').textContent = performance.now() < productionUntil ? '모든 메뉴가 만들어졌어요 · 최대 ' + game.warehouse.capacity + '개' : '';
    el('live-stats').textContent = '응대한 손님 ' + game.stats.servedCustomers + '명 · 푼 문제 ' + game.stats.attempted + '개 · 총매출 ' + game.stats.revenue.toLocaleString() + '원';
    renderSeats();
    renderGuestDetail();
    el('item-effects').textContent = [game.goldenRemaining ? '✦ 황금시간 ' + game.goldenRemaining + '주문' : '', game.boosterRemaining ? '생산 UP ' + game.boosterRemaining + '정답' : '', game.vipPending ? '★ VIP 예약' : ''].filter(Boolean).join(' · ');
    renderInvestment();
    renderCelebration();
    if (game.status === 'CLOSED') {
        displayedResult = game;
        document.querySelectorAll('#mode-confirm,#game-method,#sound-panel').forEach(n => n.remove());
        el('guest-detail').hidden = true;
        investmentOpen = false;
        el('investment-panel').hidden = true;
        el('celebration').hidden = true;
        panelOpen = false;
        renderProblem();
        el('make').disabled = true;
        el('playing').hidden = true;
        if (game.policy.persistence === 'none') {
            const r = game.result;
            el('results').hidden = false;
            el('results').innerHTML = `<p class="eyebrow">오늘도 수고했어요</p><h2>오늘의 카페 운영 결과</h2><p>작은 도전들이 맛있는 하루를 만들었어요.</p><p>${game.telemetry.phase4.vipVisits ? '★ VIP ' + game.telemetry.phase4.vipVisits + '명 방문 · ' : ''}${game.telemetry.phase4.regularHighestTier ? '♥ 단골 최고 단계 ' + game.telemetry.phase4.regularHighestTier : ''}</p><div class="result-grid">${[['최종 카페', game.cafeLevel + '단계'], ['총매출', r.revenue.toLocaleString() + ' 원'], ['손님', r.servedCustomers + '명'], ['판매 음식', r.soldFood + '개'], ['푼 문제', r.attempted + '개'], ['정답', r.correct + '개'], ['정답률', r.accuracy + '%']].map(([k, v]) => '<div>' + k + '<strong>' + v + '</strong></div>').join('')}</div><details class="analysis"><summary>개발자 플레이 분석</summary><p>재고 부족: ${game.stockoutEvents}개 주문 · 생산 낭비: ${game.wastedProduction}개 · 성공 생산: ${game.successfulProduction}개 · 대기 중 퇴장: ${game.customersLeft}명</p><button id="export-log" class="secondary">플레이 로그 JSON 저장</button><pre id="log-preview"></pre></details><button class="primary" id="restart">모드 선택으로</button>`;
            el('log-preview').textContent = JSON.stringify(({ ...game.telemetry.export(game.snapshot), learning: engine.report() }), null, 2);
            el('export-log').onclick = () => { if (!game)
                return; const blob = new Blob([JSON.stringify(({ ...game.telemetry.export(game.snapshot), learning: engine.report() }), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'cafe-play-log.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
            el('restart').onclick = () => { modeFlow.showModes(); game = null; app.classList.remove('in-session'); investmentOpen = false; el('investment-panel').hidden = true; el('results').hidden = true; el('setup').hidden = false; el('make').disabled = false; };
            if (!developerMode)
                el('results').querySelector('.analysis')?.remove();
        }
    }
    modeFlow.refresh(game);
    feel.poll(game);
    ux.poll(game);
}
let nextRender = 0;
function frame(now) { if (game?.status === 'CLOSED') {
    modeFlow.refresh(game);
    feel.poll(game);
    ux.poll(game);
} last = now; if (game?.status === 'RUNNING') {
    game.tick(clock.take(Date.now(), now));
    scene.sync(game);
    renderActors();
    renderWorkers();
    feel.poll(game);
    ux.poll(game);
    if (now >= nextRender || game.remainingSeconds === 0) {
        render();
        nextRender = now + 150;
    }
} requestAnimationFrame(frame); }
requestAnimationFrame(frame);
function renderRoom() { if (!game)
    return; const room = el('cafe-room'); room.className = 'cafe cafe-lv-' + game.cafeLevel; room.dataset.theme = game.cafe.theme; if (room.dataset.artLevel === String(game.cafeLevel))
    return; room.dataset.artLevel = String(game.cafeLevel); preloadCustomerPoses(game.cafe.customerPool); room.style.setProperty('--room', 'url(assets/art/' + (game.cafeLevel === 1 ? 'room.png' : 'room-' + game.cafeLevel + '.png') + ')'); if (game.cafeLevel < 6) {
    const preload = new Image();
    preload.src = 'assets/art/room-' + (game.cafeLevel + 1) + '.png';
} renderFurniture(); }
function orderArt(menuId) { const m = game.menus.find(m => m.menuId === menuId); return foodVisual(m); }
// Appearance allocation is UI-only. Original customer definition/patience/RNG are untouched.
function allocateLooks() { if (!game)
    return; const active = new Set(game.guests.map(g => g.id)); for (const id of guestLooks.keys())
    if (!active.has(id))
        guestLooks.delete(id); for (const g of game.guests)
    guestLooks.set(g.id, g.definition.visualKey); }
function lookName(id) { const g = game?.guests.find(g => g.id === id); if (g?.specialType)
    return specialNames[g.specialType]; return customers.find(c => c.visualKey === guestLooks.get(id))?.name ?? '손님'; }
function renderCompactStock() { if (!game)
    return; const demand = new Map(); for (const g of game.guests.filter(g => g.state === 'WAITING_FOR_FOOD'))
    for (const o of g.order)
        demand.set(o.menuId, (demand.get(o.menuId) ?? 0) + o.quantity); const shortages = game.menus.filter(m => (demand.get(m.menuId) ?? 0) > m.stock).sort((a, b) => ((demand.get(b.menuId) ?? 0) - b.stock) - ((demand.get(a.menuId) ?? 0) - a.stock)); const shown = shortages.slice(0, 3); document.querySelector('.pantry-head h2').textContent = shown.length ? '부족 재고' : ''; el('stocks').innerHTML = shown.map(m => '<div class="stock" title="' + m.name + ' · 재고 ' + m.stock + ' / ' + m.maxStock + '">' + foodVisual(m) + '<strong>' + m.stock + '</strong></div>').join(''); el('stock-count').textContent = shortages.length > 3 ? '+' + (shortages.length - 3) : shown.length ? '' : '재고 여유'; el('make').classList.toggle('needs-production', shortages.length > 0); }
function renderFurniture() { if (!game || !scene)
    return; el('seats').innerHTML = ''; el('decor').innerHTML = scene.space.tables.map(t => { const art = sprite(game.cafeLevel >= 5 ? 'premium-table' : 'table'); return '<div class="space-table" data-table="' + t.tableId + '" style="left:' + t.x + '%;top:' + t.y + '%;--table-scale:' + t.scale + ';z-index:' + Math.round(t.y * 10 - 5) + '">' + art + '</div><div class="table-front" style="left:' + t.x + '%;top:' + t.y + '%;--table-scale:' + t.scale + ';z-index:' + Math.round(t.y * 10 + 2) + '">' + art + '</div>'; }).join(''); }
function renderSeats() { renderActors(); }
function renderActors() {
    if (!game || !scene)
        return;
    allocateLooks();
    const layer = el('seats');
    const ids = new Set(game.guests.map(g => String(g.id)));
    for (const token of layer.querySelectorAll('[data-meal-guest]'))
        if (!ids.has(token.dataset.mealGuest))
            token.remove();
    for (const node of layer.querySelectorAll('[data-guest-id]'))
        if (!ids.has(node.dataset.guestId))
            node.remove();
    for (const g of game.guests) {
        const seat = scene.space.seats[g.seat], pose = scene.guest(g);
        let node = layer.querySelector('[data-guest-id="' + g.id + '"]');
        if (!node) {
            node = document.createElement('div');
            node.className = 'spatial-guest';
            node.dataset.guestId = String(g.id);
            node.innerHTML = '<button class="guest" data-select-guest="' + g.id + '">' + customerPoseArt(selectCustomerPose(guestLooks.get(g.id), pose.action, pose.facing)) + '</button><div class="guest-bubble"></div><span class="seated-meal"></span>';
            layer.append(node);
        }
        const selection = selectCustomerPose(guestLooks.get(g.id), pose.action, pose.facing), geometry = poseGeometry(selection);
        let badge = node.querySelector('.special-badge');
        if (g.specialType) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'special-badge';
                node.append(badge);
            }
            badge.textContent = specialIcons[g.specialType] + (g.specialType === 'regular' ? String(g.regularTier ?? 1) : '');
            badge.title = specialNames[g.specialType];
            node.dataset.special = g.specialType;
            node.classList.toggle('vip-arrival', g.specialType === 'vip' && ['ENTERING', 'MOVING_TO_SEAT'].includes(g.state));
        }
        node.dataset.pose = selection.kind;
        node.dataset.renderIdentity = selection.walk;
        node.dataset.assetFile = selectedPoseAsset(selection).file;
        node.dataset.assetSignature = assetSignature(selectedPoseAsset(selection));
        node.style.setProperty('--pose-size', String(selectedPoseAsset(selection).displayScale ?? 1));
        node.style.setProperty('--anchor-x', geometry.anchorX + '%');
        node.style.setProperty('--anchor-y', geometry.anchorY + '%');
        node.style.aspectRatio = String(geometry.ratio);
        if (node.dataset.poseKey !== selection.key) {
            node.dataset.poseKey = selection.key;
            node.querySelector('button').innerHTML = customerPoseArt(selection);
        }
        node.dataset.seat = seat.seatId;
        node.dataset.bubbleSide = g.seat % 2 === 0 ? 'right' : 'left';
        node.dataset.table = seat.tableId;
        node.dataset.state = pose.action;
        node.dataset.engineState = g.state;
        node.dataset.visual = guestLooks.get(g.id);
        node.dataset.facing = pose.facing;
        node.dataset.rear = String(seat.rear);
        node.classList.toggle('seated', pose.seated);
        node.classList.toggle('walking', pose.action === 'ENTERING' || pose.action.startsWith('WALKING'));
        node.style.left = pose.x + '%';
        node.style.top = pose.y + '%';
        node.style.opacity = String(pose.opacity);
        node.style.setProperty('--actor-scale', String(seat.scale));
        node.style.zIndex = String(pose.seated ? Math.round(scene.space.tables.find(t => t.tableId === seat.tableId).y * 10 + (seat.rear ? -1 : 3)) : Math.round(pose.y * 10));
        const button = node.querySelector('button');
        button.setAttribute('aria-label', lookName(g.id) + ' 주문 상세');
        button.setAttribute('aria-pressed', String(selectedGuest === g.id));
        const pending = showOrderBubble(g), patience = Math.max(0, g.patienceRemaining / g.definition.patienceSeconds);
        const bubble = node.querySelector('.guest-bubble');
        const key = [pending, g.order.map(o => o.menuId + ':' + o.quantity).join(','), Math.round(patience * 100)].join('/');
        node.dataset.orderUi = pending ? 'pending' : 'hidden';
        syncOrderBubble(bubble, pending, key, () => '<div class="bubble ' + (patience < .25 ? 'urgent' : patience < .5 ? 'concern' : '') + '" aria-label="주문 음식"><div class="order-foods">' + g.order.map(o => '<span>' + orderArt(o.menuId) + '<small>×' + o.quantity + '</small></span>').join('') + '</div><span class="patience-meter" role="progressbar" aria-label="인내심" aria-valuenow="' + Math.round(patience * 100) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + patience * 100 + '%"></i></span></div>');
        let meal = layer.querySelector('[data-meal-guest="' + g.id + '"]');
        if (g.state === 'EATING') {
            if (!meal) {
                meal = document.createElement('span');
                meal.className = 'table-meal-token';
                meal.dataset.mealGuest = String(g.id);
                meal.innerHTML = orderArt(g.order[0].menuId);
                layer.append(meal);
            }
            const table = scene.space.tables.find(t => t.tableId === seat.tableId);
            meal.style.left = (table.x + (g.seat % 2 === 0 ? 2 : -2) * table.scale) + '%';
            meal.style.top = (table.y - 11 * table.scale) + '%';
            meal.style.zIndex = String(Math.round(table.y * 10 + 4));
        }
        else
            meal?.remove();
    }
}
el('seats').addEventListener('click', event => { const target = event.target.closest('[data-select-guest]'); if (!target || !game)
    return; selectedGuest = Number(target.dataset.selectGuest); selectedUntil = game.elapsedTime + 8; detailKey = ''; renderGuestDetail(); });
function renderGuestDetail() { const box = el('guest-detail'), g = game?.guests.find(g => g.id === selectedGuest); if (!game || !g || game.elapsedTime >= selectedUntil || game.status !== 'RUNNING') {
    box.hidden = true;
    selectedGuest = null;
    detailKey = '';
    return;
} box.hidden = false; const key = [g.id, g.state, scene.guest(g).action, Math.ceil(g.patienceRemaining)].join('/'); if (key === detailKey)
    return; detailKey = key; box.innerHTML = '<div><strong>' + lookName(g.id) + '</strong><button aria-label="손님 상세 닫기">×</button></div><p>' + ({ SITTING: '자리에 앉는 중', WALKING_TO_SEAT: '자리로 가는 중', FINISHING: '식사를 마쳤어요', STANDING_UP: '자리에서 일어나는 중', WALKING_TO_EXIT: '다음에 또 올게요' }[scene.guest(g).action] ?? labels[g.state]) + (['WAITING_FOR_FOOD', 'PREPARING', 'SERVING'].includes(g.state) ? ' · 남은 ' + Math.ceil(g.patienceRemaining) + '초' : '') + '</p><p>' + personalityLabels[g.definition.personality] + ' · ' + g.definition.characterTrait + '</p><div class="detail-order">' + g.order.map(o => '<span>' + orderArt(o.menuId) + '<small>' + game.menus.find(m => m.menuId === o.menuId).name + ' ×' + o.quantity + '</small></span>').join('') + '</div>'; box.querySelector('button').onclick = () => { selectedGuest = null; box.hidden = true; detailKey = ''; }; }
function renderCelebration() { const box = el('celebration'); box.hidden = !game || game.status === 'CLOSED' || performance.now() > celebrationUntil; if (box.hidden)
    return; if (box.dataset.level !== String(celebrationLevel)) {
    box.dataset.level = String(celebrationLevel);
    box.innerHTML = '<button id="skip-celebration" aria-label="축하 연출 닫기">✕</button><p>카페 ' + celebrationLevel + '단계!</p><h2>' + cafeLevels[celebrationLevel - 1].name + ' OPEN!</h2><p>새 메뉴</p><div>' + menuDefinitions.filter(m => m.unlockCafeLevel === celebrationLevel).map(m => '<span>' + sprite(m.menuId) + ' ' + m.name + '</span>').join('') + '</div>' + (customers.some(c => c.unlockCafeLevel === celebrationLevel) ? '<p>새로운 손님 ' + customers.filter(c => c.unlockCafeLevel === celebrationLevel).length + '명이 찾아오기 시작했어요!</p>' : '');
    box.onclick = () => { celebrationUntil = 0; box.hidden = true; };
    el('skip-celebration').onclick = box.onclick;
} }
function renderInvestment(force = false) {
    const panel = el('investment-panel');
    panel.hidden = !investmentOpen || !game || game.status !== 'RUNNING';
    if (panel.hidden || !game)
        return;
    const key = JSON.stringify([investmentTab, game.money, game.cafeLevel, game.warehouseLevel, game.menus.map(m => [m.stock, m.currentLevel]), game.service.paid.map(w => w.level), game.itemPurchases, game.goldenRemaining, game.boosterRemaining, game.vipPending, investmentMessage, purchaseGate.blocked, performance.now() < celebrationUntil]);
    if (!force && key === renderedInvestmentKey)
        return;
    renderedInvestmentKey = key;
    const affordability = (cost) => '<p class="afford ' + (game.money < cost ? 'insufficient' : '') + '">' + game.money.toLocaleString() + ' / ' + cost.toLocaleString() + ' 원' + (game.money < cost ? ' · ' + (cost - game.money).toLocaleString() + '원 더 필요해요 · 돈이 부족해요.' : ' · 살 수 있어요') + '</p>';
    const next = game.nextCafe;
    const warehouse = game.nextWarehouse;
    let content = '';
    if (investmentTab === 'cafe') {
        content = '<div class="investment-card"><p>현재 카페 ' + game.cafeLevel + '단계' + ' · ' + game.cafe.name + '</p>' + (next ? '<h2>카페 ' + next.level + '단계 · ' + next.name + '</h2><p>테이블 ' + game.cafe.maxCustomers + ' → ' + next.maxCustomers + '석</p><div class="unlock-preview">' + menuDefinitions.filter(m => m.unlockCafeLevel === next.level).map(m => '<span>' + sprite(m.menuId) + ' ' + m.name + '</span>').join('') + '</div>' + affordability(next.expansionCost) + '<button class="primary" data-buy="cafe">카페 확장 · ' + next.expansionCost.toLocaleString() + '원</button>' : '<h2>✦ 드림 카페 완성!</h2><p>최고 단계에 도달했어요. 영업은 남은 시간 동안 계속됩니다.</p>') + '</div>';
    }
    else if (investmentTab === 'warehouse') {
        content = '<div class="investment-card"><p>현재 창고 ' + (game.warehouseLevel === 6 ? 'MAX' : game.warehouseLevel + '단계') + '</p><h2>메뉴마다 ' + game.warehouse.capacity + '개 보관</h2>' + (warehouse ? '<p>최대 재고 ' + game.warehouse.capacity + ' → ' + warehouse.capacity + '개</p>' + affordability(warehouse.cost) + '<button class="primary" data-buy="warehouse">창고 확장 · ' + warehouse.cost.toLocaleString() + '원</button>' : '<p>최대 크기의 창고예요.</p>') + '</div>';
    }
    else if (investmentTab === 'staff') {
        content = '<p>사장님 1명 + 직원 ' + game.service.paid.length + '명 / 현재 최대 ' + game.staffLimit + '명</p><div class="menu-investments">' + staffDefinitions.map((d, i) => {
            const w = game.service.paid.find(w => w.staffId === d.staffId);
            if (w) {
                const cost = game.getStaffUpgradeCost(w.staffId);
                const next = staffBalance.levels[w.level];
                return '<article class="investment-card">' + sprite(d.staffId, 'staff-portrait') + '<h3>' + w.name + ' · ' + w.level + '레벨' + '</h3><p>' + (cost === null ? '최고 수준의 서빙!' : next.carryCapacity > w.carryCapacity ? '다음: 한 번에 음식 ' + next.carryCapacity + '개 운반' : '다음: 더 빠른 이동과 서빙') + '</p>' + (cost === null ? '' : affordability(cost) + '<button class="secondary" data-buy="staff-upgrade" data-staff="' + w.staffId + '" aria-label="' + w.name + ' 직원 강화">직원 강화 · ' + cost.toLocaleString() + '원</button>') + '</article>';
            }
            const unlock = staffBalance.limits.findIndex(n => n >= i + 1) + 1;
            const locked = i >= game.staffLimit;
            return '<article class="investment-card ' + (locked ? 'locked' : '') + '">' + sprite(d.staffId, 'staff-portrait') + '<h3>' + d.name + '</h3><p>' + (locked ? '카페 ' + unlock + '단계에서 열려요' : i > game.service.paid.length ? '이전 직원을 먼저 고용해요.' : '함께 카페를 운영해요.') + '</p>' + (!locked && i === game.service.paid.length ? affordability(game.economy.staff.hireCosts[i]) + '<button class="primary" data-buy="staff-hire">' + d.name + ' 고용 · ' + game.economy.staff.hireCosts[i].toLocaleString() + '원</button>' : '') + '</article>';
        }).join('') + '</div>';
    }
    else if (investmentTab === 'items') {
        content = '<p class="item-status">황금시간 ' + game.goldenRemaining + '주문 · 부스터 ' + game.boosterRemaining + '정답' + (game.vipPending ? ' · VIP 방문 예약 중' : '') + '</p><div class="menu-investments">' + itemCatalog.map(item => { const rule = { ...game.phase4Profile.items[item.id], price: game.getItemPrice(item.id) }, remaining = game.itemRemaining(item.id); const blocked = !remaining || game.money < rule.price || (item.id === 'golden' && game.goldenRemaining > 0) || (item.id === 'booster' && game.boosterRemaining > 0) || (item.id === 'invite' && (game.vipPending || game.cafeLevel < game.phase4Profile.rules.vip.unlock)); return '<article class="investment-card item-card"><h3>' + item.name + '</h3><p>' + ({ 'stock-five': '모든 음식 +5 · 창고가 가득 차면 멈춰요', delivery: '고른 음식을 창고 가득 채워요', golden: '다음 5주문에서 버는 돈 2배', invite: '다음 가능한 손님을 VIP로 초대해요', booster: '다음 3번 정답 · 음식마다 +3' }[item.id]) + '</p><p>' + rule.price.toLocaleString() + '원 · 남은 구매 ' + remaining + '/' + rule.limit + '회</p>' + affordability(rule.price) + (item.id === 'delivery' ? '<label>배송 메뉴<select id="delivery-menu">' + game.menus.map(m => '<option value="' + m.menuId + '" ' + (deliveryMenu === m.menuId ? 'selected' : '') + '>' + m.name + '</option>').join('') + '</select></label>' : '') + '<button class="secondary" data-item="' + item.id + '" ' + (blocked ? 'disabled' : '') + '>' + (!remaining ? '구매 완료' : item.id === 'invite' && game.cafeLevel < game.phase4Profile.rules.vip.unlock ? '카페 ' + game.phase4Profile.rules.vip.unlock + '단계에서 열려요' : '구매 · 사용') + '</button></article>'; }).join('') + '</div>';
    }
    else {
        content = '<div class="menu-investments">' + menuDefinitions.map(def => { const m = game.menus.find(m => m.menuId === def.menuId); if (!m)
            return '<article class="investment-card locked"><span class="lock">잠김</span><h3>' + def.name + '</h3><p>카페 ' + def.unlockCafeLevel + '단계에서 열려요</p></article>'; const cost = game.getMenuUpgradeCost(m); return '<article class="investment-card">' + foodVisual(m) + '<h3>' + m.name + '</h3><p class="menu-stars">' + "★".repeat(m.currentLevel) + '</p><p>재고 ' + m.stock + ' / ' + m.maxStock + ' · 판매 ' + game.getPrice(m) + '원</p>' + (cost !== null ? '<p>다음 판매가격 ' + game.getPrice(m, m.currentLevel + 1) + '원</p>' + affordability(cost) + '<button class="secondary" data-buy="menu" data-menu="' + m.menuId + '" aria-label="' + m.name + ' 강화">★' + (m.currentLevel + 1) + ' 강화 · ' + cost.toLocaleString() + '원</button>' : '<p class="max-label">✦ 최고 등급 ★5</p>') + '</article>'; }).join('') + '</div>';
    }
    const scroll = panel.querySelector('.investment-content')?.scrollTop ?? 0;
    panel.innerHTML = '<div class="problem-head"><h2>카페 키우기</h2><button id="close-invest" aria-label="투자 패널 닫기">✕</button></div><p class="investment-money">보유금 ' + game.money.toLocaleString() + '원 · 총매출 ' + game.stats.revenue.toLocaleString() + '원</p><div class="investment-tabs" role="tablist">' + [['cafe', '카페 확장'], ['warehouse', '창고'], ['menu', '메뉴 강화'], ['staff', '직원'], ...(game.phase4Enabled ? [['items', '아이템']] : [])].map(([id, title]) => '<button role="tab" aria-selected="' + (id === investmentTab) + '" data-tab="' + id + '">' + title + '</button>').join('') + '</div><p class="investment-message" aria-live="polite">' + investmentMessage + '</p><div class="investment-content">' + content + '</div><p class="hint">카페를 키우는 동안에도 시간이 계속 흘러요.</p>';
    panel.querySelector('.investment-content').scrollTop = scroll;
    const delivery = panel.querySelector('#delivery-menu');
    if (delivery)
        delivery.onchange = () => { deliveryMenu = delivery.value; };
    panel.querySelectorAll('[data-item]').forEach(b => b.onclick = () => { advanceTime(); if (!game || game.status !== 'RUNNING' || !purchaseGate.run(() => { }))
        return; const menu = panel.querySelector('#delivery-menu')?.value; const result = game.buyItem(b.dataset.item, b.dataset.item === 'delivery' ? menu : undefined); investmentMessage = result.reason.replace(/Cafe Lv\.(\d+)/g, '카페 $1단계'); render(); });
    panel.querySelectorAll('[data-buy],[data-item]').forEach(b => { if (purchaseGate.blocked || b.closest('article,.investment-card')?.querySelector('.afford.insufficient') || (b.dataset.buy === 'cafe' && performance.now() < celebrationUntil))
        b.disabled = true; });
    el('close-invest').onclick = () => { investmentOpen = false; panel.hidden = true; };
    panel.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { investmentTab = b.dataset.tab; investmentMessage = ''; renderInvestment(true); panel.querySelector('.investment-content').scrollTop = 0; });
    panel.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { advanceTime(); if (!game || game.status !== 'RUNNING' || !purchaseGate.run(() => { }))
        return; const kind = b.dataset.buy; if (kind === 'cafe' && performance.now() < celebrationUntil)
        return; const result = kind === 'cafe' ? game.expandCafe() : kind === 'warehouse' ? game.upgradeWarehouse() : kind === 'staff-hire' ? game.hireStaff() : kind === 'staff-upgrade' ? game.upgradeStaff(b.dataset.staff) : game.upgradeMenu(b.dataset.menu); investmentMessage = result.reason; if (result.ok && kind === 'cafe') {
        celebrationLevel = game.cafeLevel;
        celebrationUntil = performance.now() + 2700;
        el('celebration').dataset.level = '';
    } render(); });
}
function renderWorkers() {
    if (!game)
        return;
    const layer = el('workers');
    const names = { IDLE: '', CLAIMING_ORDER: '주문 확인', MOVING_TO_PICKUP: '픽업으로', PICKING_UP: '음식 픽업', MOVING_TO_TABLE: '서빙 중', SERVING: '서빙', RETURNING: '복귀' };
    for (const w of game.service.workers) {
        let node = layer.querySelector('[data-worker="' + w.staffId + '"]');
        if (!node) {
            node = document.createElement('div');
            node.className = 'worker';
            node.dataset.worker = w.staffId;
            node.innerHTML = sprite(w.staffId, 'worker-art') + '<span class="worker-tray"></span><b></b><small></small><em></em>';
            layer.append(node);
        }
        const point = scene.worker(w, game);
        node.style.left = point.x + '%';
        node.style.top = point.y + '%';
        node.style.zIndex = String(Math.min(790, Math.round(point.y * 10)));
        node.dataset.facing = point.facing;
        node.dataset.state = w.state;
        node.dataset.order = String(w.orderId ?? '');
        const displayCargo = w.state === 'PICKING_UP' ? w.remaining.slice(0, w.carryCapacity) : w.cargo;
        const visualKey = [w.state, w.level, displayCargo.join(','), game.elapsedTime < w.upgradeFeedbackUntil].join('/');
        if (node.dataset.visualKey === visualKey)
            continue;
        node.dataset.visualKey = visualKey;
        node.querySelector('b').textContent = w.name + (w.owner ? '' : ' Lv.' + w.level);
        node.querySelector('small').textContent = names[w.state];
        node.querySelector('em').textContent = game.elapsedTime < w.upgradeFeedbackUntil ? 'LEVEL UP · Lv.' + w.level : '';
        node.querySelector('.worker-tray').innerHTML = displayCargo.map(orderArt).join('');
        node.classList.toggle('carrying', w.cargo.length > 0);
        node.classList.toggle('upgraded', w.level >= 3);
        node.classList.toggle('walking', w.state.startsWith('MOVING') || w.state === 'RETURNING');
    }
}
const modeFlow = new ModeFlow(startSession, () => game, undefined, appendLearningAnalysis, () => ux.beforeStart(), () => render());
export function configureSaveRepository(repository) { modeFlow.setRepository(repository); }
export function feedbackDiagnostics() { return feel.diagnostics(); }
export function learningDiagnostics() { return { progress: structuredClone(engine.progress), metrics: engine.report(), active: active ? structuredClone(active) : null }; }
function appendLearningAnalysis() { if (!game || !developerMode)
    return; const detail = document.createElement('details'); detail.className = 'analysis'; detail.innerHTML = '<summary>개발자 플레이 분석</summary><button id="growth-export-log" class="secondary">플레이 로그 JSON 저장</button><pre id="growth-log-preview"></pre>'; el('results').append(detail); el('growth-log-preview').textContent = JSON.stringify({ ...game.telemetry.export(game.snapshot), learning: engine.report() }, null, 2); el('growth-export-log').onclick = () => { if (!game)
    return; const url = URL.createObjectURL(new Blob([JSON.stringify({ ...game.telemetry.export(game.snapshot), learning: engine.report() }, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'cafe-play-log.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }; }
export function closeSessionForQA() { game?.endBusiness(); render(); }
function advanceTime() { if (game?.status !== 'RUNNING')
    return; game.tick(clock.take()); if (game.status === 'CLOSED')
    render(); }
addEventListener('visibilitychange', () => { advanceTime(); if (game) {
    render();
    modeFlow.flush();
} });
addEventListener('pagehide', () => { advanceTime(); modeFlow.flush(); });
export function configureUxPreference(storage, key) { ux.configure(storage, key); }
export function uxDiagnostics() { return { tutorialCompleted: ux.preference.completed, status: game?.status, cafe: game?.snapshot, learning: engine.report() }; }
export function refreshForQA() { render(); }
export function sessionForQA() { return game; }
