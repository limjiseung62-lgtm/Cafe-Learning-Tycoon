import { normalizeAnswer } from './questionPack.js';
export const learningConfig = { remediationGap: 3, recentWindow: 3, maxQueue: 32 };
export class LearningSession {
    provider;
    random;
    clock;
    pool;
    queue = [];
    remediation = [];
    recent = [];
    active = null;
    answered = true;
    lastRemediation = false;
    progress;
    attempts = [];
    metrics = { questionPackId: '', normalQuestionsAttempted: 0, remediationQuestionsAttempted: 0, twinQuestionsGenerated: 0, twinQuestionsCorrect: 0, remediationQuestionsCorrect: 0 };
    constructor(provider, random = Math.random, progress, clock = () => new Date().toISOString()) {
        this.provider = provider;
        this.random = random;
        this.clock = clock;
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
                this.remediation.push({ source, due: learningConfig.remediationGap });
        }
    }
    next() {
        if (this.active && !this.answered)
            return this.active;
        let q;
        const due = this.remediation.findIndex(r => r.due <= this.metrics.normalQuestionsAttempted);
        if (due >= 0 && !this.lastRemediation) {
            const item = this.remediation.splice(due, 1)[0];
            let twin = this.provider.twin(item.source);
            if (twin && twin.prompt !== item.source.prompt && !this.recent.includes(twin.questionId)) {
                q = { ...twin, isTwin: true, isRemediation: true, sourceQuestionId: item.source.questionId };
                this.metrics.twinQuestionsGenerated++;
            }
            else {
                const other = this.pool.find(q => q.skillId === item.source.skillId && q.questionId !== item.source.questionId && !this.recent.includes(q.questionId));
                q = { ...(other ?? item.source), isRemediation: true, isTwin: false, sourceQuestionId: item.source.questionId };
            }
        }
        if (!q) {
            if (!this.queue.length) {
                this.queue = [...this.pool];
                for (let i = this.queue.length - 1; i > 0; i--) {
                    const j = Math.floor(this.random() * (i + 1));
                    [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
                }
            }
            let index = this.queue.findIndex(x => !this.recent.includes(x.questionId) && x.questionId !== this.active?.questionId);
            if (index < 0)
                index = this.queue.findIndex(x => x.questionId !== this.active?.questionId);
            if (index < 0)
                index = 0;
            q = { ...this.queue.splice(index, 1)[0], isRemediation: false, isTwin: false };
        }
        this.active = structuredClone(q);
        this.answered = false;
        this.lastRemediation = q.isRemediation === true;
        this.recent.push(q.questionId);
        if (this.recent.length > learningConfig.recentWindow)
            this.recent.shift();
        return this.active;
    }
    submit(answer) { const q = this.active; if (!q || this.answered)
        return null; this.answered = true; const correct = normalizeAnswer(answer) === normalizeAnswer(q.answer); if (q.isRemediation)
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
            this.remediation.push({ source, due: this.metrics.normalQuestionsAttempted + learningConfig.remediationGap });
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
        this.remediation.push({ source, due: this.metrics.normalQuestionsAttempted + learningConfig.remediationGap }); this.attempts.push({ questionId: q.questionId, skillId: q.skillId, correct, isRemediation: !!q.isRemediation, isTwin: !!q.isTwin, sourceQuestionId: q.sourceQuestionId, answeredAt: this.clock() }); if (this.attempts.length > 1000)
        this.attempts.shift(); this.progress.updatedAt = this.clock(); return { correct, answer: q.answer, correctAnswer: q.answer, explanation: q.explanation, questionId: q.questionId, skillId: q.skillId, isRemediation: q.isRemediation === true, isTwin: q.isTwin === true, sourceQuestionId: q.sourceQuestionId }; }
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
