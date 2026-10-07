import { createClassMatch, createGrowthSession } from './sessionFactory.js';
import { createGrowthSave } from './growthSave.js';
import { GrowthSessionController } from './growthSession.js';
import { LocalSaveRepository } from './saveRepository.js';
import { policyFor } from './sessionModes.js';
import { balance } from './config.js';
import { questionCatalog } from './questionPack.js';
import { escapeText } from './questionRenderer.js';
const e = (id) => document.getElementById(id);
const study = () => '<div id="study-content" class="study-content"><span>학습 내용</span><strong id="study-title">문제를 준비하고 있어요…</strong><select id="study-pack" aria-label="학습 내용" hidden></select></div><p id="pack-error" class="save-error" aria-live="polite"></p><button type="button" id="pack-retry" class="text-button pack-retry" hidden>다시 시도</button>';
export function browserSaveRepository() { try {
    return new LocalSaveRepository(localStorage);
}
catch {
    return new LocalSaveRepository(null);
} }
export class ModeFlow {
    start;
    current;
    repository;
    augmentResults;
    beforeStart;
    endView;
    pool;
    controller = null;
    savedUntil = 0;
    endedGame = null;
    busy = false;
    loadFailed = false;
    view = 0;
    constructor(start, current, repository = browserSaveRepository(), augmentResults = () => { }, beforeStart = async () => { }, endView = () => { }) {
        this.start = start;
        this.current = current;
        this.repository = repository;
        this.augmentResults = augmentResults;
        this.beforeStart = beforeStart;
        this.endView = endView;
        this.showModes();
        addEventListener('beforeunload', event => { const game = this.current(); if (game?.status === 'RUNNING' && game.policy.protectActiveExit) {
            event.preventDefault();
            event.returnValue = '';
        }
        else
            this.flush(); });
        addEventListener('pagehide', () => this.flush());
        addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden')
            this.flush(); });
    }
    setRepository(repo) { if (this.current()?.status === 'RUNNING')
        throw Error('Cannot change repository during a session'); this.repository = repo; this.showModes(); }
    card() { return document.querySelector('.welcome-card'); }
    showModes() { this.view++; this.busy = false; this.controller = null; this.endedGame = null; this.card().innerHTML = '<p class="eyebrow">오늘은 어떻게 놀까요?</p><h2>배움이 쌓이는<br>나만의 카페</h2><div class="mode-cards"><button id="choose-class" class="mode-card"><strong>수업 게임</strong><span>정해진 시간 동안 카페를 키워요!</span></button><button id="choose-growth" class="mode-card"><strong>내 카페 키우기</strong><span>내 카페를 저장하고 계속 키워요!</span></button></div><p class="hint">처음이라면 위의 게임 방법을 눌러 보세요.</p>'; e('choose-class').onclick = () => this.classSetup(); e('choose-growth').onclick = () => this.growthSetup(); }
    back() { e('mode-back').onclick = () => this.showModes(); }
    controls(disabled) { this.card().querySelectorAll('[data-start]').forEach(b => b.disabled = disabled); }
    async populatePacks(retry = false) { const view = this.view; this.loadFailed = false; this.controls(true); e('pack-error').textContent = ''; e('pack-retry').hidden = true; try {
        if (retry)
            questionCatalog.reset();
        const list = await questionCatalog.list();
        if (view !== this.view)
            return;
        const select = e('study-pack');
        select.innerHTML = list.map(p => '<option value="' + escapeText(p.packId) + '">' + escapeText(p.title) + '</option>').join('');
        select.hidden = list.length === 1;
        e('study-title').textContent = list.length === 1 ? list[0].title : '오늘 배울 내용을 골라요';
        this.controls(false);
    }
    catch {
        if (view !== this.view)
            return;
        e('study-title').textContent = '학습 내용을 확인해 주세요.';
        this.packError();
    } if (view === this.view)
        e('pack-retry').onclick = () => { void this.populatePacks(true); }; }
    packError() { this.loadFailed = true; this.controls(true); e('pack-error').textContent = '문제를 불러오지 못했어요. 다시 시도해 주세요.'; e('pack-retry').hidden = false; }
    async problems() { const id = e('study-pack').value; if (!id)
        throw Error('missing'); return (await questionCatalog.load(id)).questions; }
    async begin(factory, pool, view) { await this.beforeStart(); if (view !== this.view)
        return; this.start(factory(), pool); }
    classSetup() { this.view++; this.busy = false; this.card().innerHTML = '<button id="mode-back" class="text-button">← 모드 선택</button><h2>수업 게임</h2><p>모두 같은 작은 카페에서 시작해요.</p><form id="class-settings">' + study() + '<label>플레이 시간<select id="duration">' + balance.time.presets.map(s => '<option value="' + s + '">' + s / 60 + '분</option>').join('') + '</select></label><p class="hint">음식 만들기로 문제를 맞히고 카페를 키워요.<br>게임 중에는 시간이 계속 흘러요.</p><button class="primary" data-start disabled>카페 문 열기 →</button></form>'; this.back(); void this.populatePacks(); e('class-settings').onsubmit = async (ev) => { ev.preventDefault(); if (this.busy)
        return; this.busy = true; this.controls(true); const view = this.view; const seconds = Number(e('duration').value); try {
        if (!balance.time.presets.some(s => s === seconds))
            return;
        const pool = await this.problems();
        await this.begin(() => createClassMatch(seconds), pool, view);
    }
    catch {
        if (view === this.view)
            this.packError();
    }
    finally {
        this.busy = false;
        if (view === this.view && !this.loadFailed)
            this.controls(false);
    } }; }
    growthSetup() { this.view++; this.busy = false; const loaded = this.repository.read(), ready = loaded.status === 'ready'; this.card().innerHTML = '<button id="mode-back" class="text-button">← 모드 선택</button><h2>내 카페 키우기</h2><p>음식을 팔아 나만의 카페를 키워요.</p><p>' + policyFor('CAFE_GROWTH').sessionSeconds / 60 + '분 영업 · 이 브라우저에 저장돼요.</p>' + study() + (ready ? '<div class="save-preview">내 카페 ' + loaded.save.cafeLevel + '단계 · ' + loaded.save.money.toLocaleString() + '원<br>푼 문제 ' + loaded.save.cumulativeQuestionsAttempted + '개 · 영업 ' + loaded.save.completedSessions + '회</div><button id="continue-growth" class="primary" data-start disabled>이어하기</button><button id="reset-growth" class="text-button" data-start disabled>새로 시작</button>' : loaded.status === 'empty' ? '<button id="new-growth" class="primary" data-start disabled>새 카페 시작</button>' : '<p class="save-error">' + escapeText(loaded.message) + '</p><button id="reset-growth" class="primary" data-start disabled>새 카페 시작</button>'); this.back(); void this.populatePacks(); if (ready)
        e('continue-growth').onclick = () => { void this.launchGrowth(loaded.save); }; e('new-growth')?.addEventListener('click', () => { void this.launchGrowth(createGrowthSave()); }); e('reset-growth')?.addEventListener('click', () => this.confirm('지금까지 키운 카페가 초기화됩니다. 정말 새로 시작할까요?', () => { void this.launchGrowth(createGrowthSave(), true); })); }
    async launchGrowth(save, replace = false) { if (this.busy)
        return; this.busy = true; this.controls(true); const view = this.view; try {
        const pool = await this.problems();
        if (replace) {
            const result = this.repository.replace(save, true);
            if (!result.ok) {
                e('pack-error').textContent = '카페 저장에 문제가 생겼어요. 기존 카페는 그대로 있어요.';
                return;
            }
        }
        await this.begin(() => createGrowthSession(save), pool, view);
    }
    catch {
        if (view === this.view)
            this.packError();
    }
    finally {
        this.busy = false;
        if (view === this.view)
            this.controls(false);
    } }
    confirm(message, action) { if (document.getElementById('mode-confirm'))
        return; const dialog = document.createElement('section'); dialog.id = 'mode-confirm'; dialog.className = 'mode-confirm'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', '카페 확인'); dialog.innerHTML = '<div><h2>한 번 더 확인해요</h2><p>' + message + '</p><button id="confirm-cancel" class="secondary">취소</button><button id="confirm-yes" class="primary">확인하고 진행</button></div>'; document.body.append(dialog); e('confirm-cancel').onclick = () => dialog.remove(); e('confirm-yes').onclick = () => { if (!dialog.isConnected)
        return; dialog.remove(); action(); }; e('confirm-cancel').focus(); }
    attach(game, pool) { this.pool = pool; this.endedGame = null; this.controller = game.policy.persistence === 'saved-cafe' ? new GrowthSessionController(game, this.repository) : null; if (this.controller)
        this.feedback(this.controller.save()); e('mode-label').textContent = game.policy.label; e('end-business').hidden = !this.controller; e('end-business').onclick = () => this.confirm('지금 영업을 마치고 카페를 저장할까요?', () => { game.endBusiness(); this.endView(); this.refresh(game); }); e('leave-game').onclick = () => this.confirm(this.controller ? '현재 카페를 저장하고 나갈까요?' : '수업 게임을 나가면 현재 기록이 끝납니다.', () => { if (game.status !== 'RUNNING')
        return; if (this.controller)
        game.endBusiness();
    else
        game.leaveClassMatch(); this.endView(); this.refresh(game); }); }
    feedback(result) { e('save-status').textContent = result.ok ? '저장 완료 ✓' : '카페 저장에 문제가 생겼어요.'; e('save-status').className = result.ok ? 'save-ok' : 'save-error'; this.savedUntil = result.ok ? performance.now() + 2200 : Infinity; }
    flush() { if (this.controller)
        this.feedback(this.controller.save()); }
    refresh(game) { if (!this.controller)
        return; const result = this.controller.poll(); if (result)
        this.feedback(result); if (performance.now() > this.savedUntil)
        e('save-status').textContent = ''; if (game.status === 'CLOSED' && this.endedGame !== game) {
        this.endedGame = game;
        this.growthResults(game);
    } }
    home() { e('results').hidden = true; e('setup').hidden = false; document.getElementById('app').classList.remove('in-session'); this.showModes(); }
    growthResults(game) { const result = game.result, save = this.controller.current(); e('playing').hidden = true; e('problem-panel').hidden = true; e('investment-panel').hidden = true; e('results').hidden = false; e('results').innerHTML = '<p class="eyebrow">내 카페</p><h2>오늘의 카페 운영 결과</h2><h3>오늘</h3><div class="result-grid">' + [['매출', result.revenue.toLocaleString() + '원'], ['손님', result.servedCustomers + '명'], ['판매 음식', result.soldFood + '개'], ['푼 문제', result.attempted + '개'], ['정답', result.correct + '개'], ['정답률', result.accuracy + '%']].map(([a, b]) => '<div>' + a + '<strong>' + b + '</strong></div>').join('') + '</div><h3>내 카페</h3><div class="growth-summary">' + [['카페', game.cafeLevel + '단계'], ['보유금', game.money.toLocaleString() + '원'], ['창고', game.warehouseLevel + '단계'], ['직원', game.service.paid.length + '명'], ['메뉴', game.menus.length + '종'], ['평균 메뉴', '★' + (game.menus.reduce((sum, m) => sum + m.currentLevel, 0) / game.menus.length).toFixed(1)]].map(([a, b]) => '<div>' + a + '<strong>' + b + '</strong></div>').join('') + '</div><p>누적 매출 ' + save.cumulativeRevenue.toLocaleString() + '원 · 푼 문제 ' + save.cumulativeQuestionsAttempted + '개</p><p id="growth-save-result" class="' + (this.controller.lastResult.ok ? 'save-ok' : 'save-error') + '">' + (this.controller.lastResult.ok ? '저장 완료 ✓' : '카페 저장에 문제가 생겼어요. 다시 저장해 주세요.') + '</p><button id="growth-next" class="primary">다시 영업하기</button><button id="growth-home" class="secondary">모드 선택으로</button>'; e('growth-next').disabled = !this.controller.lastResult.ok; e('growth-home').disabled = !this.controller.lastResult.ok; if (!this.controller.lastResult.ok) {
        const retry = document.createElement('button');
        retry.className = 'secondary';
        retry.textContent = '저장 다시 시도';
        retry.onclick = () => { this.flush(); this.growthResults(game); };
        e('results').append(retry);
    } e('growth-next').onclick = () => { if (this.busy)
        return; this.busy = true; this.flush(); if (!this.controller.lastResult.ok) {
        this.busy = false;
        this.growthResults(game);
        return;
    } this.start(createGrowthSession(this.controller.current()), this.pool); this.busy = false; }; e('growth-home').onclick = () => { this.flush(); if (!this.controller.lastResult.ok) {
        this.growthResults(game);
        return;
    } this.home(); }; this.augmentResults(); }
}
