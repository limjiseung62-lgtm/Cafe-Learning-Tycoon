import { validateGrowthSave, migrateGrowthSave } from './growthSave.js';
export const growthStorageKey = 'cafe-learning-tycoon.growth.v1';
export class LocalSaveRepository {
    storage;
    key;
    backupSequence = 0;
    constructor(storage, key = growthStorageKey) {
        this.storage = storage;
        this.key = key;
    }
    read() { try {
        if (!this.storage)
            return { status: 'unavailable', message: '이 브라우저에서 저장 기능을 사용할 수 없습니다.' };
        const raw = this.storage.getItem(this.key);
        if (raw === null)
            return { status: 'empty' };
        if (raw.length > 100000)
            throw Error('oversized');
        const value = JSON.parse(raw);
        const save = migrateGrowthSave(value);
        if (save)
            return { status: 'ready', save };
        if (value && typeof value === 'object' && typeof value.schemaVersion === 'number' && value.schemaVersion !== 1)
            return { status: 'unsupported', message: '이 저장 버전은 불러올 수 없습니다. 기존 저장은 보관됩니다.' };
        return { status: 'corrupt', message: '저장 데이터를 불러올 수 없습니다. 기존 저장은 보관됩니다.' };
    }
    catch {
        return { status: this.storage ? 'corrupt' : 'unavailable', message: '저장 데이터를 불러올 수 없습니다. 기존 저장은 보관됩니다.' };
    } }
    write(save, expected) { if (!validateGrowthSave(save))
        return { ok: false, message: '저장할 카페 정보를 확인할 수 없습니다.' }; try {
        if (!this.storage)
            throw Error('unavailable');
        const current = this.storage.getItem(this.key);
        if (expected && current !== null) {
            let value;
            try {
                value = JSON.parse(current);
            }
            catch {
                return { ok: false, message: '저장 데이터가 바뀌어 덮어쓰지 않았습니다. 다시 열어 주세요.' };
            }
            if (JSON.stringify(value) !== JSON.stringify(expected))
                return { ok: false, message: '다른 창에서 카페가 변경됐어요. 다시 열어 주세요.' };
        }
        this.storage.setItem(this.key, JSON.stringify(save));
        return { ok: true, message: '저장됨 ✓' };
    }
    catch {
        return { ok: false, message: '저장할 수 없습니다. 브라우저 저장 공간을 확인해 주세요.' };
    } }
    replace(save, confirmed) { if (!confirmed)
        return { ok: false, message: '새로 시작 확인이 필요합니다.' }; if (!validateGrowthSave(save))
        return { ok: false, message: '새 카페 정보가 올바르지 않습니다.' }; try {
        if (!this.storage)
            throw Error('unavailable');
        const old = this.storage.getItem(this.key);
        if (old !== null)
            this.storage.setItem(this.key + '.backup.' + Date.now() + '.' + this.backupSequence++, old);
        return this.write(save);
    }
    catch {
        return { ok: false, message: '기존 저장을 보관할 수 없어 초기화하지 않았습니다.' };
    } }
}
