import { gradeAnswer } from './reading.js?v=1.5.5';
import { normalizeAnswer } from './questionPack.js?v=1.5.5';
export const learningConfig = { remediationGap: 3, recentWindow: 3, maxQueue: 32 };
export class LearningSession {
    provider;
    random;
    clock;
    options;
    pool;
    reserved = new Set();
    visit = 0;
    recentGroups = [];
    queue = [];
    remediation = [];
    recent = [];
    active = null;
    answered = true;
    lastRemediation = false;
    progress;
    attempts = [];
    metrics = { questionPackId: '', normalQuestionsAttempted: 0, remediationQuestionsAttempted: 0, twinQuestionsGenerated: 0, twinQuestionsCorrect: 0, remediationQuestionsCorrect: 0 };
    constructor(provider, random = Math.random, progress, clock = () => new Date().toISOString(), options = {}) {
        this.provider = provider;
        this.random = random;
        this.clock = clock;
        this.options = options;
        this.pool = provider.list();
        if (!this.pool.length)
            throw Error('Empty question pack');
        this.progress = progress ? structuredClone(progress) : { schemaVersion: 1, packId: provider.packId, updatedAt: this.clock(), questions: {}, skills: {} };
        if (this.progress.packId !== provider.packId)
            throw Error('Learning progress pack mismatch');
        this.metrics.questionPackId = provider.packId;
        for (const memory of Object.values(this.progress.questions).filter(m => m.priority > 0).sort((a, b) => b.priority - a.priority).slice(0, learningConfig.maxQueue)) {
            const source = this.pool.find(q => q.questionId === memory.questionId);
            if (source)
                this.remediation.push({ source, due: this.options.remediationGap ?? learningConfig.remediationGap });
        }
    }
    present(questionId, eligibleIds) { if (this.active && !this.answered)
        return null; let q = this.pool.find(q => q.questionId === questionId); if (!q)
        return null; if (this.options.deferExactReviewUntilPoolEnd && eligibleIds?.length) {
        const seen = new Set(this.attempts.map(a => a.questionId));
        q = this.pool.find(p => eligibleIds.includes(p.questionId) && !seen.has(p.questionId)) ?? q;
    } if (this.options.deferExactReviewUntilPoolEnd && !q.readingContext) {
        this.reserved.add(q.questionId);
        this.queue = this.queue.filter(p => p.questionId !== q.questionId);
    } this.active = structuredClone({ ...q, isRemediation: false, isTwin: false }); this.answered = false; this.lastRemediation = false; this.recent.push(q.questionId); if (this.recent.length > (this.options.recentWindow ?? learningConfig.recentWindow))
        this.recent.shift(); return this.active; }
    next(preference) {
        if (this.active && !this.answered)
            return this.active;
        let q;
        const grouped = !!this.pool[0].readingContext;
        const boundary = !grouped || !this.queue.length || this.queue[0].readingContext?.position === 1;
        const due = boundary ? this.remediation.findIndex(r => r.due <= this.metrics.normalQuestionsAttempted) : -1;
        const pendingTwin = due >= 0 ? this.provider.twin(this.remediation[due].source) : null;
        const hasDifferentTwin = !!pendingTwin && pendingTwin.prompt !== this.remediation[due].source.prompt && !this.recent.includes(pendingTwin.questionId);
        if (due >= 0 && !this.lastRemediation && (!this.options.deferExactReviewUntilPoolEnd || !this.queue.length || hasDifferentTwin)) {
            const item = this.remediation.splice(due, 1)[0];
            let twin = pendingTwin;
            if (twin && twin.prompt !== item.source.prompt && !this.recent.includes(twin.questionId)) {
                q = { ...twin, isTwin: true, isRemediation: true, sourceQuestionId: item.source.questionId };
                this.metrics.twinQuestionsGenerated++;
            }
            else {
                const other = this.pool.find(q => q.skillId === item.source.skillId && (!grouped || q.readingContext?.passageId === item.source.readingContext?.passageId) && q.questionId !== item.source.questionId && !this.recent.includes(q.questionId));
                q = { ...(other ?? item.source), isRemediation: true, isTwin: false, sourceQuestionId: item.source.questionId };
            }
        }
        if (!q) {
            if (!this.queue.length) {
                if (grouped) {
                    const groups = [...new Set(this.pool.map(q => q.readingContext.groupId))];
                    for (let i = groups.length - 1; i > 0; i--) {
                        const j = Math.floor(this.random() * (i + 1));
                        [groups[i], groups[j]] = [groups[j], groups[i]];
                    }
                    let previous = [...this.recentGroups];
                    const order = [];
                    while (groups.length) {
                        let index = groups.findIndex(id => !previous.includes(id));
                        if (index < 0)
                            index = 0;
                        const id = groups.splice(index, 1)[0];
                        order.push(id);
                        previous = [...previous, id].slice(-2);
                    }
                    this.queue = order.flatMap(id => this.pool.filter(q => q.readingContext.groupId === id).sort((a, b) => a.readingContext.position - b.readingContext.position));
                }
                else {
                    this.queue = [...this.pool];
                    for (let i = this.queue.length - 1; i > 0; i--) {
                        const j = Math.floor(this.random() * (i + 1));
                        [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
                    }
                }
            }
            if (this.reserved.size && !grouped) {
                const fresh = this.queue.filter(p => !this.reserved.has(p.questionId));
                if (fresh.length)
                    this.queue = fresh;
                this.reserved.clear();
            }
            let index = grouped ? 0 : this.queue.findIndex(x => !this.recent.includes(x.questionId) && x.questionId !== this.active?.questionId && (!preference || (preference === 'challenge' ? x.difficulty >= 2 : !x.readingContext && !x.prompt.includes('\n'))));
            if (index < 0)
                index = this.queue.findIndex(x => x.questionId !== this.active?.questionId);
            if (index < 0)
                index = 0;
            q = { ...this.queue.splice(index, 1)[0], isRemediation: false, isTwin: false };
        }
        if (q.readingContext) {
            if (q.isRemediation || q.readingContext.position === 1)
                this.visit++;
            q = { ...q, readingContext: { ...q.readingContext, visit: this.visit } };
            if (!q.isRemediation && q.readingContext.position === 1)
                this.recentGroups = [...this.recentGroups, q.readingContext.groupId].slice(-2);
        }
        this.active = structuredClone(q);
        this.answered = false;
        this.lastRemediation = q.isRemediation === true;
        this.recent.push(q.questionId);
        if (this.recent.length > (this.options.recentWindow ?? learningConfig.recentWindow))
            this.recent.shift();
        return this.active;
    }
    submit(answer) { const q = this.active; if (!q || this.answered)
        return null; this.answered = true; const correct = gradeAnswer(q, answer, normalizeAnswer); if (q.isRemediation)
        this.metrics.remediationQuestionsAttempted++;
    else
        this.metrics.normalQuestionsAttempted++; if (q.isRemediation && correct)
        this.metrics.remediationQuestionsCorrect++; if (q.isTwin && correct)
        this.metrics.twinQuestionsCorrect++; const origin = q.sourceQuestionId ?? q.questionId; const source = this.pool.find(p => p.questionId === origin) ?? q; let memory = Object.hasOwn(this.progress.questions, origin) ? this.progress.questions[origin] : undefined; const skill = Object.hasOwn(this.progress.skills, q.skillId) ? this.progress.skills[q.skillId] : { wrongCount: 0, remediationAttempts: 0, remediationSuccess: 0, priority: 0 }; if (!Object.hasOwn(this.progress.skills, q.skillId))
        Object.defineProperty(this.progress.skills, q.skillId, { value: skill, writable: true, enumerable: true, configurable: true }); if (!correct) {
        memory ??= { questionId: origin, skillId: q.skillId, tags: q.tags, wrongCount: 0, lastWrongAt: this.clock(), remediationAttempts: 0, remediationSuccess: 0, priority: 0 };
        memory.wrongCount++;
        memory.lastWrongAt = this.clock();
        memory.priority++;
        skill.wrongCount++;
        skill.priority++;
        Object.defineProperty(this.progress.questions, origin, { value: memory, writable: true, enumerable: true, configurable: true });
        if (!this.remediation.some(r => r.source.questionId === origin)) {
            if (this.remediation.length >= learningConfig.maxQueue)
                this.remediation.shift();
            this.remediation.push({ source, due: this.metrics.normalQuestionsAttempted + (this.options.remediationGap ?? learningConfig.remediationGap) });
        }
    } if (q.isRemediation) {
        if (memory) {
            memory.remediationAttempts++;
            if (correct) {
                memory.remediationSuccess++;
                memory.priority = Math.max(0, memory.priority - 1);
            }
        }
        skill.remediationAttempts++;
        if (correct) {
            skill.remediationSuccess++;
            skill.priority = Math.max(0, skill.priority - 1);
        }
    } if (q.isRemediation && correct && memory && memory.priority > 0 && !this.remediation.some(r => r.source.questionId === origin))
        this.remediation.push({ source, due: this.metrics.normalQuestionsAttempted + (this.options.remediationGap ?? learningConfig.remediationGap) }); this.attempts.push({ questionId: q.questionId, skillId: q.skillId, correct, isRemediation: !!q.isRemediation, isTwin: !!q.isTwin, sourceQuestionId: q.sourceQuestionId, answeredAt: this.clock() }); if (this.attempts.length > 1000)
        this.attempts.shift(); this.progress.updatedAt = this.clock(); return { correct, answer: q.answer, correctAnswer: q.answer, explanation: q.explanation, questionId: q.questionId, skillId: q.skillId, isRemediation: q.isRemediation === true, isTwin: q.isTwin === true, sourceQuestionId: q.sourceQuestionId }; }
    resumeNormalCursor(count) { if (!Number.isSafeInteger(count) || count < 0 || count > 10000 || (this.active && !this.answered) || this.attempts.length || this.metrics.normalQuestionsAttempted || this.remediation.length)
        return false; for (let i = 0; i < count; i++) {
        const q = this.next();
        if (q.isRemediation)
            return false;
        this.answered = true;
    } return true; }
    checkpoint() { const ref = (q) => ({ questionId: q.questionId, isRemediation: !!q.isRemediation, isTwin: !!q.isTwin, sourceQuestionId: q.sourceQuestionId, visit: q.readingContext?.visit }); return { version: 1, packId: this.provider.packId, reserved: [...this.reserved], queue: this.queue.map(ref), remediation: this.remediation.map(r => ({ questionId: r.source.questionId, due: r.due })), recent: [...this.recent], recentGroups: [...this.recentGroups], visit: this.visit, active: this.active ? ref(this.active) : null, answered: this.answered, lastRemediation: this.lastRemediation, progress: structuredClone(this.progress), metrics: { ...this.metrics }, attempts: structuredClone(this.attempts) }; }
    restoreCheckpoint(value) { try {
        const s = value;
        if (!s || s.version !== 1 || s.packId !== this.provider.packId || s.progress?.packId !== s.packId || !Array.isArray(s.queue) || s.queue.length > this.pool.length || !Array.isArray(s.remediation) || s.remediation.length > 32 || !Array.isArray(s.recent) || !Array.isArray(s.recentGroups) || !Array.isArray(s.attempts) || s.attempts.length > 1000 || !Number.isSafeInteger(s.visit) || s.visit < 0 || typeof s.answered !== 'boolean' || typeof s.lastRemediation !== 'boolean' || Object.entries(s.metrics).some(([k, v]) => k !== 'questionPackId' && (!Number.isSafeInteger(v) || Number(v) < 0)))
            return false;
        if (!new LearningProgressRepository({ getItem: () => JSON.stringify(s.progress), setItem: () => { } }).read(s.packId) || s.metrics.questionPackId !== s.packId || !Object.keys(this.metrics).every(k => Object.hasOwn(s.metrics, k)) || !s.recent.every(id => typeof id === 'string') || !s.recentGroups.every(id => typeof id === 'string'))
            return false;
        const hydrate = (r) => { if (typeof r.isRemediation !== 'boolean' || typeof r.isTwin !== 'boolean' || r.visit !== undefined && (!Number.isSafeInteger(r.visit) || r.visit < 0))
            throw Error('invalid question state'); const source = this.pool.find(q => q.questionId === r.questionId) ?? this.pool.find(q => q.twin?.questionId === r.questionId)?.twin; if (!source)
            throw Error('unknown question'); const q = structuredClone(source); q.isRemediation = r.isRemediation; q.isTwin = r.isTwin; q.sourceQuestionId = r.sourceQuestionId; if (q.readingContext)
            q.readingContext.visit = r.visit; return q; };
        const queue = s.queue.map(hydrate), active = s.active ? hydrate(s.active) : null, remediation = s.remediation.map(r => { const source = this.pool.find(q => q.questionId === r.questionId); if (!source || !Number.isSafeInteger(r.due) || r.due < 0)
            throw Error('invalid review'); return { source, due: r.due }; });
        if (s.reserved !== undefined && (!Array.isArray(s.reserved) || !s.reserved.every(id => this.pool.some(q => q.questionId === id))))
            return false;
        this.reserved = new Set(s.reserved ?? []);
        this.queue = queue;
        this.active = active;
        this.remediation = remediation;
        this.recent = [...s.recent];
        this.recentGroups = [...s.recentGroups];
        this.visit = s.visit;
        this.answered = s.answered;
        this.lastRemediation = s.lastRemediation;
        Object.assign(this.progress, structuredClone(s.progress));
        Object.assign(this.metrics, s.metrics);
        this.attempts.splice(0, this.attempts.length, ...structuredClone(s.attempts));
        return true;
    }
    catch {
        return false;
    } }
    report() { return { ...this.metrics, attempts: structuredClone(this.attempts), wrongSkills: Object.entries(this.progress.skills).filter(([, v]) => v.wrongCount > 0).map(([skillId, v]) => ({ skillId, ...v })), remediationSuccessRate: this.metrics.remediationQuestionsAttempted ? this.metrics.remediationQuestionsCorrect / this.metrics.remediationQuestionsAttempted : 0 }; }
}
export class LearningProgressRepository {
    storage;
    prefix;
    constructor(storage = null, prefix = 'cafe-learning-tycoon.learning.v1/') {
        this.storage = storage;
        this.prefix = prefix;
    }
    read(packId) { try {
        const p = JSON.parse(this.storage?.getItem(this.prefix + packId) ?? 'null');
        if (!p || p.schemaVersion !== 1 || p.packId !== packId || typeof p.questions !== 'object' || typeof p.skills !== 'object' || !p.questions || !p.skills || Array.isArray(p.questions) || Array.isArray(p.skills) || !Number.isFinite(Date.parse(p.updatedAt)))
            return;
        const valid = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
        for (const [id, m] of Object.entries(p.questions)) {
            if (m.questionId !== id || typeof m.skillId !== 'string' || !Array.isArray(m.tags) || !m.tags.every(t => typeof t === 'string') || !Number.isFinite(Date.parse(m.lastWrongAt)) || ![m.wrongCount, m.remediationAttempts, m.remediationSuccess, m.priority].every(valid) || m.remediationSuccess > m.remediationAttempts)
                return;
        }
        for (const s of Object.values(p.skills)) {
            if (![s.wrongCount, s.remediationAttempts, s.remediationSuccess, s.priority].every(valid) || s.remediationSuccess > s.remediationAttempts)
                return;
        }
        return p;
    }
    catch {
        return;
    } }
    write(progress) { try {
        this.storage?.setItem(this.prefix + progress.packId, JSON.stringify(progress));
        return this.storage !== null;
    }
    catch {
        return false;
    } }
}
