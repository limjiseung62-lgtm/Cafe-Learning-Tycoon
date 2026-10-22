import { JsonQuestionProvider, legacyQuestions } from './questionPack.js?v=1.5.5';
import { LearningSession, LearningProgressRepository } from './learningSession.js?v=1.5.5';
import { LocalProblemRepository } from './problems.js?v=1.5.5';
let storage = null;
try {
    if (typeof localStorage !== 'undefined')
        storage = localStorage;
}
catch { }
export let learningProgressRepository = new LearningProgressRepository(storage);
export function providerForPool(pool) { const first = pool[0]; if (first?.packId && first.questionId) {
    return new JsonQuestionProvider({ schemaVersion: 1, packId: first.packId, title: first.unit, subject: first.subject, grade: first.grade, semester: first.semester, unit: first.unit, version: '1.0.0', source: first.sourceFile ?? 'JSON', questions: pool, templates: [] });
} const questions = legacyQuestions(pool); return { packId: 'legacy-demo', list: () => structuredClone(questions), twin: () => null }; }
export function createLearning(pool, persistent, random = Math.random, options = {}) { const provider = providerForPool(pool ?? new LocalProblemRepository().list()); return new LearningSession(provider, random, persistent ? learningProgressRepository.read(provider.packId) : undefined, undefined, options); }
export function configureLearningRepository(repository) { learningProgressRepository = repository; }
