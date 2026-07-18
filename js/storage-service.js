/**
 * MÓDULO: storage-service.js
 * Infraestructura común para trabajar con localStorage sin modificar los
 * formatos actuales. Expone resultados explícitos para que las migraciones
 * posteriores puedan distinguir datos ausentes, corruptos y válidos.
 */

(function initializeStorageService() {
    const STATUS = Object.freeze({
        FOUND: 'found',
        MISSING: 'missing',
        VALID: 'valid',
        INVALID_JSON: 'invalid-json',
        INVALID_TYPE: 'invalid-type',
        EXPECTED_ARRAY: 'expected-array',
        EXPECTED_OBJECT: 'expected-object',
        MISSING_REQUIRED_FIELDS: 'missing-required-fields',
        INVALID_ITEM: 'invalid-item',
        INVALID_KEY: 'invalid-key',
        INVALID_OPERATION: 'invalid-operation',
        VALIDATION_FAILED: 'validation-failed',
        READ_FAILED: 'read-failed',
        WRITE_FAILED: 'write-failed',
        SERIALIZATION_FAILED: 'serialization-failed',
        BACKUP_CREATED: 'backup-created',
        BACKUP_FAILED: 'backup-failed',
        RESTORED: 'restored',
        RESTORE_FAILED: 'restore-failed',
        PREPARED: 'prepared',
        INVALID_CHANGES: 'invalid-changes',
        APPLIED: 'applied',
        ROLLBACK_APPLIED: 'rollback-applied',
        ROLLBACK_FAILED: 'rollback-failed',
        APPLY_FAILED_RESTORED: 'apply-failed-restored',
        APPLY_FAILED_RESTORE_FAILED: 'apply-failed-restore-failed'
    });

    function getErrorMessage(error) {
        return error instanceof Error ? error.message : String(error);
    }

    function getValueType(value) {
        if (value === null) return 'null';
        return Array.isArray(value) ? 'array' : typeof value;
    }

    function isValidKey(key) {
        return typeof key === 'string' && key.trim().length > 0;
    }

    function getStorage(storageOverride) {
        return storageOverride || window.localStorage;
    }

    /** Lee una clave sin lanzar excepciones y conserva el valor bruto para posibles backups. */
    function readRaw(key, options = {}) {
        if (!isValidKey(key)) {
            return { ok: false, status: STATUS.INVALID_KEY, key };
        }

        try {
            const raw = getStorage(options.storage).getItem(key);
            return raw === null
                ? { ok: false, status: STATUS.MISSING, key, raw: null }
                : { ok: true, status: STATUS.FOUND, key, raw };
        } catch (error) {
            return { ok: false, status: STATUS.READ_FAILED, key, error: getErrorMessage(error) };
        }
    }

    /** Parsea JSON y diferencia explícitamente una ausencia de un JSON inválido. */
    function parseJson(raw) {
        if (raw === null || raw === undefined) {
            return { ok: false, status: STATUS.MISSING, value: null };
        }

        if (typeof raw !== 'string') {
            return { ok: false, status: STATUS.INVALID_TYPE, expected: 'string', actual: getValueType(raw) };
        }

        try {
            return { ok: true, status: STATUS.VALID, value: JSON.parse(raw) };
        } catch (error) {
            return { ok: false, status: STATUS.INVALID_JSON, error: getErrorMessage(error) };
        }
    }

    /**
     * Comprueba solo la estructura mínima indicada por el llamador.
     * El esquema es deliberadamente flexible para admitir datos antiguos.
     */
    function validateStructure(value, schema = {}) {
        const normalizedSchema = schema && typeof schema === 'object' ? schema : {};
        const expectedType = normalizedSchema.type;

        if (expectedType === 'array' && !Array.isArray(value)) {
            return { valid: false, status: STATUS.EXPECTED_ARRAY, actual: getValueType(value) };
        }

        if (expectedType === 'object' && (value === null || Array.isArray(value) || typeof value !== 'object')) {
            return { valid: false, status: STATUS.EXPECTED_OBJECT, actual: getValueType(value) };
        }

        if (expectedType && expectedType !== 'array' && expectedType !== 'object' && typeof value !== expectedType) {
            return { valid: false, status: STATUS.INVALID_TYPE, expected: expectedType, actual: getValueType(value) };
        }

        const requiredKeys = Array.isArray(normalizedSchema.requiredKeys) ? normalizedSchema.requiredKeys : [];
        if (requiredKeys.length > 0) {
            if (value === null || Array.isArray(value) || typeof value !== 'object') {
                return { valid: false, status: STATUS.EXPECTED_OBJECT, actual: getValueType(value) };
            }

            const missingKeys = requiredKeys.filter(key => !Object.prototype.hasOwnProperty.call(value, key));
            if (missingKeys.length > 0) {
                return { valid: false, status: STATUS.MISSING_REQUIRED_FIELDS, missingKeys };
            }
        }

        if (Array.isArray(value) && normalizedSchema.item) {
            for (let index = 0; index < value.length; index += 1) {
                const itemValidation = validateStructure(value[index], normalizedSchema.item);
                if (!itemValidation.valid) {
                    return { valid: false, status: STATUS.INVALID_ITEM, index, itemValidation };
                }
            }
        }

        return { valid: true, status: STATUS.VALID, value };
    }

    /** Lee, parsea y valida una clave sin aplicar fallbacks silenciosos. */
    function readJson(key, options = {}) {
        const rawResult = readRaw(key, options);
        if (rawResult.status !== STATUS.FOUND) {
            return { ...rawResult, value: options.fallback };
        }

        const parseResult = parseJson(rawResult.raw);
        if (!parseResult.ok) {
            return { ...parseResult, key, raw: rawResult.raw, value: options.fallback };
        }

        const validation = validateStructure(parseResult.value, options.schema);
        if (!validation.valid) {
            return { ok: false, ...validation, key, raw: rawResult.raw, value: options.fallback };
        }

        return { ok: true, status: STATUS.VALID, key, raw: rawResult.raw, value: parseResult.value };
    }

    function serializeJson(value) {
        try {
            const raw = JSON.stringify(value);
            return typeof raw === 'string'
                ? { ok: true, status: STATUS.VALID, raw }
                : { ok: false, status: STATUS.SERIALIZATION_FAILED, error: 'El valor no se puede serializar como JSON.' };
        } catch (error) {
            return { ok: false, status: STATUS.SERIALIZATION_FAILED, error: getErrorMessage(error) };
        }
    }

    /** Escribe JSON de forma controlada. Los backups se gestionan mediante cambios preparados. */
    function writeJson(key, value, options = {}) {
        if (!isValidKey(key)) {
            return { ok: false, status: STATUS.INVALID_KEY, key };
        }

        const validation = validateStructure(value, options.schema);
        if (!validation.valid) {
            return { ok: false, ...validation, key };
        }

        const serialized = serializeJson(value);
        if (!serialized.ok) {
            return { ...serialized, key };
        }

        try {
            getStorage(options.storage).setItem(key, serialized.raw);
            return { ok: true, status: STATUS.APPLIED, key, raw: serialized.raw };
        } catch (error) {
            return { ok: false, status: STATUS.WRITE_FAILED, key, error: getErrorMessage(error) };
        }
    }

    /** Crea una copia en memoria de los valores brutos, incluidos valores corruptos. */
    function createBackup(keys, options = {}) {
        if (!Array.isArray(keys) || keys.some(key => !isValidKey(key))) {
            return { ok: false, status: STATUS.INVALID_KEY };
        }

        const entries = Object.create(null);
        for (const key of [...new Set(keys)]) {
            const readResult = readRaw(key, options);
            if (readResult.status === STATUS.READ_FAILED || readResult.status === STATUS.INVALID_KEY) {
                return { ok: false, status: STATUS.BACKUP_FAILED, key, cause: readResult };
            }

            entries[key] = {
                exists: readResult.status === STATUS.FOUND,
                raw: readResult.raw
            };
        }

        return { ok: true, status: STATUS.BACKUP_CREATED, backup: { entries } };
    }

    /** Restaura exactamente los valores brutos capturados antes de una operación. */
    function restoreBackup(backup, options = {}) {
        if (!backup || !backup.entries || typeof backup.entries !== 'object') {
            return { ok: false, status: STATUS.RESTORE_FAILED, error: 'Backup no válido.' };
        }

        const failures = [];
        const restoredKeys = [];
        for (const [key, entry] of Object.entries(backup.entries)) {
            try {
                if (!entry || typeof entry.exists !== 'boolean' || (entry.exists && typeof entry.raw !== 'string')) {
                    throw new Error('Entrada de backup invalida.');
                }

                const storage = getStorage(options.storage);
                if (entry.exists) {
                    storage.setItem(key, entry.raw);
                } else {
                    storage.removeItem(key);
                }
                restoredKeys.push(key);
            } catch (error) {
                failures.push({ key, error: getErrorMessage(error) });
            }
        }

        return failures.length === 0
            ? { ok: true, status: STATUS.RESTORED, restoredKeys }
            : { ok: false, status: STATUS.RESTORE_FAILED, restoredKeys, failures };
    }

    /**
     * Valida, serializa y captura el backup antes de que se escriba una clave.
     * Los flujos futuros deben copiar su estado previo en memoria, preparar el
     * estado siguiente sin mutarlo, aplicar esta operacion y actualizar memoria
     * solo tras "applied"; ante un fallo deben conservar o restaurar su copia.
     */
    function prepareJsonChanges(changes, options = {}) {
        // No modifica estados de dominio en memoria; solo prepara persistencia.
        if (!Array.isArray(changes) || changes.length === 0) {
            return {
                ok: false,
                status: STATUS.INVALID_OPERATION,
                error: 'La operacion debe incluir al menos un cambio.',
                storageState: 'unchanged'
            };
        }

        const keys = new Set();
        const preparedChanges = [];

        for (const change of changes) {
            if (!change || typeof change !== 'object' || Array.isArray(change) || !isValidKey(change.key) || keys.has(change.key)) {
                return {
                    ok: false,
                    status: STATUS.INVALID_OPERATION,
                    key: change && change.key,
                    error: 'Cada cambio debe tener una clave unica y valida.',
                    storageState: 'unchanged'
                };
            }

            const validation = validateStructure(change.value, change.schema);
            if (!validation.valid) {
                return {
                    ok: false,
                    status: STATUS.VALIDATION_FAILED,
                    key: change.key,
                    validation,
                    storageState: 'unchanged'
                };
            }

            const serialized = serializeJson(change.value);
            if (!serialized.ok) {
                return {
                    ok: false,
                    status: STATUS.SERIALIZATION_FAILED,
                    key: change.key,
                    serialization: serialized,
                    storageState: 'unchanged'
                };
            }

            keys.add(change.key);
            preparedChanges.push({ key: change.key, raw: serialized.raw });
        }

        const backupResult = createBackup(preparedChanges.map(change => change.key), options);
        if (!backupResult.ok) {
            return {
                ok: false,
                status: STATUS.BACKUP_FAILED,
                key: backupResult.key,
                cause: backupResult.cause,
                storageState: 'unchanged'
            };
        }

        return {
            ok: true,
            status: STATUS.PREPARED,
            changes: preparedChanges,
            backup: backupResult.backup,
            keys: preparedChanges.map(change => change.key),
            storageState: 'prepared'
        };
    }

    /**
     * Aplica cambios ya preparados. Si falla una escritura, restaura el backup
     * en memoria para dejar todas las claves como estaban antes de la operación.
     */
    function applyPreparedChanges(prepared, options = {}) {
        // localStorage no ofrece transacciones reales: un cierre durante una
        // escritura o rollback puede dejar el almacenamiento en estado incierto.
        if (!prepared || prepared.status !== STATUS.PREPARED || !Array.isArray(prepared.changes) || prepared.changes.length === 0 || !prepared.backup || !prepared.backup.entries || typeof prepared.backup.entries !== 'object') {
            return {
                ok: false,
                status: STATUS.INVALID_OPERATION,
                error: 'La operacion preparada no es valida.',
                storageState: 'unchanged'
            };
        }

        const preparedKeys = new Set();
        const backupKeys = Object.keys(prepared.backup.entries);
        for (const change of prepared.changes) {
            if (!change || !isValidKey(change.key) || typeof change.raw !== 'string' || preparedKeys.has(change.key) || !Object.prototype.hasOwnProperty.call(prepared.backup.entries, change.key)) {
                return {
                    ok: false,
                    status: STATUS.INVALID_OPERATION,
                    key: change && change.key,
                    error: 'La operacion preparada contiene cambios incompletos o duplicados.',
                    storageState: 'unchanged'
                };
            }
            preparedKeys.add(change.key);
        }

        if (backupKeys.length !== preparedKeys.size || backupKeys.some(key => !preparedKeys.has(key) || !prepared.backup.entries[key] || typeof prepared.backup.entries[key].exists !== 'boolean' || (prepared.backup.entries[key].exists && typeof prepared.backup.entries[key].raw !== 'string'))) {
            return {
                ok: false,
                status: STATUS.INVALID_OPERATION,
                error: 'El backup preparado no coincide con los cambios.',
                storageState: 'unchanged'
            };
        }

        const writtenKeys = [];
        for (const change of prepared.changes) {
            try {
                getStorage(options.storage).setItem(change.key, change.raw);
                writtenKeys.push(change.key);
            } catch (error) {
                const restoreResult = restoreBackup(prepared.backup, options);
                const rollbackApplied = restoreResult.ok;

                return {
                    ok: false,
                    status: rollbackApplied ? STATUS.ROLLBACK_APPLIED : STATUS.ROLLBACK_FAILED,
                    causeStatus: STATUS.WRITE_FAILED,
                    failedKey: change.key,
                    writtenKeys,
                    restoredKeys: restoreResult.restoredKeys || [],
                    restoreFailures: restoreResult.failures || [],
                    storageState: rollbackApplied ? 'restored' : 'uncertain',
                    error: getErrorMessage(error)
                };
            }
        }

        return {
            ok: true,
            status: STATUS.APPLIED,
            writtenKeys,
            restoredKeys: [],
            storageState: 'applied'
        };
    }

    window.GymNotesStorage = Object.freeze({
        STATUS,
        readRaw,
        parseJson,
        validateStructure,
        readJson,
        writeJson,
        createBackup,
        restoreBackup,
        prepareJsonChanges,
        applyPreparedChanges
    });
})();
