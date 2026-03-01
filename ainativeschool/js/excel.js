/* ============================================
   AI Native Schools — Next-Gen Excel Import Engine
   ============================================
   Intelligent parsing · Header normalization · Validation · SHA-256 hashing
   Uses SheetJS (XLSX) loaded via CDN on the page.
*/

import { getSchool, saveSchool, getSchools, saveSchools } from './storage.js';

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const REQUIRED_FIELDS = ['studentname', 'studentid', 'class'];
const OPTIONAL_FIELDS = ['gender', 'dateofbirth', 'rollnumber', 'admissionno'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

// Patterns to match raw headers → canonical fields
const HEADER_PATTERNS = {
    studentname: ['studentname', 'name', 'fullname', 'student', 'studname', 'sname', 'pupilname', 'learnername'],
    studentid: ['studentid', 'id', 'sid', 'studid', 'studentno', 'enrollmentid', 'enrolmentid', 'admno', 'studno'],
    class: ['class', 'classname', 'section', 'grade', 'div', 'division', 'classsection', 'standard', 'std'],
    gender: ['gender', 'sex', 'gendertype', 'mf'],
    dateofbirth: ['dateofbirth', 'dob', 'birthday', 'birthdate', 'bday', 'born'],
    rollnumber: ['rollnumber', 'roll', 'rollno', 'serialno', 'sno', 'srno', 'slno'],
    admissionno: ['admissionno', 'admission', 'admno', 'admissionid', 'admissionnumber', 'admid'],
};

// ═══════════════════════════════════════════
// HEADER NORMALIZATION
// ═══════════════════════════════════════════

/**
 * Normalize a header string: lowercase, strip spaces/underscores/special chars
 */
function normalizeHeader(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw
        .toLowerCase()
        .replace(/[_\-\.\s]+/g, '')   // strip underscores, dashes, dots, spaces
        .replace(/[^a-z0-9]/g, '')    // remove remaining special chars
        .trim();
}

/**
 * Score how well a normalized header matches a canonical field.
 * Returns 0-100 confidence score.
 */
function matchScore(normalizedHeader, canonicalField) {
    const patterns = HEADER_PATTERNS[canonicalField] || [];
    // Exact match
    if (patterns.includes(normalizedHeader)) return 100;
    // Partial match — check if any pattern is contained
    for (const p of patterns) {
        if (normalizedHeader.includes(p) || p.includes(normalizedHeader)) {
            const similarity = Math.min(normalizedHeader.length, p.length) / Math.max(normalizedHeader.length, p.length);
            return Math.round(60 + similarity * 35);
        }
    }
    return 0;
}

/**
 * Auto-map raw headers to canonical fields.
 * Returns { mappings: { rawHeader: canonicalField }, unmapped: [], confidence }
 */
export function autoMapHeaders(rawHeaders) {
    const normalized = rawHeaders.map(h => normalizeHeader(h));
    const mappings = {};       // rawIndex → canonical field
    const suggestions = {};    // rawIndex → [{ field, score }]
    const usedFields = new Set();

    // Pass 1: Find exact matches
    normalized.forEach((nh, i) => {
        for (const field of ALL_FIELDS) {
            if (usedFields.has(field)) continue;
            const score = matchScore(nh, field);
            if (score === 100) {
                mappings[i] = field;
                usedFields.add(field);
                break;
            }
        }
    });

    // Pass 2: Best-effort for remaining columns
    normalized.forEach((nh, i) => {
        if (mappings[i]) return;
        const scores = ALL_FIELDS
            .filter(f => !usedFields.has(f))
            .map(f => ({ field: f, score: matchScore(nh, f) }))
            .filter(s => s.score > 50)
            .sort((a, b) => b.score - a.score);

        suggestions[i] = scores;
        if (scores.length > 0 && scores[0].score >= 70) {
            mappings[i] = scores[0].field;
            usedFields.add(scores[0].field);
        }
    });

    // Check which required fields are mapped
    const missingRequired = REQUIRED_FIELDS.filter(f => !Object.values(mappings).includes(f));

    // Confidence
    const mappedRequired = REQUIRED_FIELDS.filter(f => Object.values(mappings).includes(f)).length;
    const confidence = Math.round((mappedRequired / REQUIRED_FIELDS.length) * 100);

    return {
        mappings,
        suggestions,
        missingRequired,
        normalizedHeaders: normalized,
        confidence,
    };
}

// ═══════════════════════════════════════════
// FILE PARSING
// ═══════════════════════════════════════════

/**
 * Parse file into { headers: string[], rows: string[][], sheetNames: string[], selectedSheet: string }
 */
export function parseFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('No file provided'));

        if (typeof XLSX === 'undefined') {
            return reject(new Error('SheetJS library not loaded. Please refresh and try again.'));
        }

        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file. It may be corrupted.'));

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    return reject(new Error('No sheets found in file.'));
                }

                const sheetNames = workbook.SheetNames;
                const selectedSheet = sheetNames[0];
                const sheet = workbook.Sheets[selectedSheet];

                // Read as array of arrays (header: 1)
                const rawRows = XLSX.utils.sheet_to_json(sheet, {
                    defval: '',
                    raw: false,
                    header: 1,
                });

                if (!rawRows || rawRows.length === 0) {
                    return reject(new Error('File is empty — no data found.'));
                }

                // First row = headers
                const headers = rawRows[0].map(h => String(h || '').trim());
                const dataRows = rawRows.slice(1).filter(row => row.some(cell => String(cell || '').trim()));

                if (dataRows.length === 0) {
                    return reject(new Error('File contains headers but no student data rows.'));
                }

                resolve({ headers, rows: dataRows, sheetNames, selectedSheet, rawJson: rawRows });
            } catch (err) {
                reject(new Error(`Parse error: ${err.message}`));
            }
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Parse a specific sheet from already-loaded workbook data
 */
export function parseSheet(file, sheetName) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[sheetName];
                if (!sheet) return reject(new Error(`Sheet "${sheetName}" not found`));

                const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, header: 1 });
                const headers = (rawRows[0] || []).map(h => String(h || '').trim());
                const dataRows = rawRows.slice(1).filter(row => row.some(cell => String(cell || '').trim()));
                resolve({ headers, rows: dataRows, sheetNames: workbook.SheetNames, selectedSheet: sheetName, rawJson: rawRows });
            } catch (err) {
                reject(new Error(`Parse error: ${err.message}`));
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// ═══════════════════════════════════════════
// VALIDATION ENGINE
// ═══════════════════════════════════════════

/**
 * Validate all parsed rows given a mapping.
 * @param {string[]} headers - raw headers
 * @param {Array<string[]>} rows - data rows
 * @param {Object} mappings - { columnIndex: canonicalField }
 * @param {string} schoolCode - to check existing duplicates
 * @returns {{ validatedRows, stats }}
 */
export function validateRows(headers, rows, mappings, schoolCode) {
    const existingStudents = new Set();
    // Collect existing student IDs from school
    const school = getSchool(schoolCode);
    if (school && school.classes) {
        for (const cls of school.classes) {
            for (const s of (cls.students || [])) {
                existingStudents.add(String(s.studentId).trim());
            }
        }
    }

    const seenIds = new Map(); // studentId → row index (within this import)
    const existingClasses = new Set((school?.classes || []).map(c => c.className));
    const newClasses = new Set();

    const validatedRows = rows.map((row, rowIdx) => {
        const record = {};
        const errors = [];
        const warnings = [];

        // Extract mapped values
        for (const [colIdx, field] of Object.entries(mappings)) {
            record[field] = String(row[colIdx] || '').trim();
        }

        // Required field checks
        if (!record.studentname) errors.push('Missing student name');
        if (!record.studentid) errors.push('Missing student ID');
        if (!record.class) errors.push('Missing class');

        // Duplicate within import
        if (record.studentid) {
            if (seenIds.has(record.studentid)) {
                warnings.push(`Duplicate Student ID (row ${seenIds.get(record.studentid) + 1})`);
            } else {
                seenIds.set(record.studentid, rowIdx);
            }

            // Duplicate in existing school data
            if (existingStudents.has(record.studentid)) {
                warnings.push('Student ID exists — will update');
            }
        }

        // Track new classes
        if (record.class && !existingClasses.has(record.class)) {
            newClasses.add(record.class);
        }

        const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid';

        return { rowIdx, record, errors, warnings, status, rawRow: row };
    });

    // Stats
    const stats = {
        total: validatedRows.length,
        valid: validatedRows.filter(r => r.status === 'valid').length,
        warnings: validatedRows.filter(r => r.status === 'warning').length,
        errors: validatedRows.filter(r => r.status === 'error').length,
        duplicateIds: validatedRows.filter(r => r.warnings.some(w => w.includes('Duplicate'))).length,
        newClasses: [...newClasses],
        existingUpdates: validatedRows.filter(r => r.warnings.some(w => w.includes('will update'))).length,
        confidence: 0,
    };
    stats.confidence = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0;

    return { validatedRows, stats };
}

// ═══════════════════════════════════════════
// SHA-256 HASHING
// ═══════════════════════════════════════════

async function hashPassword(plaintext) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
        // Fallback for non-secure contexts
        return plaintext;
    }
}

// ═══════════════════════════════════════════
// IMPORT ENGINE
// ═══════════════════════════════════════════

/**
 * Import validated rows into school → class → student structure.
 * @param {string} schoolCode
 * @param {Array} validatedRows - from validateRows()
 * @param {boolean} allowOverwrite - whether to overwrite existing students
 * @returns {Promise<object>} Import result
 */
export async function importValidatedRows(schoolCode, validatedRows, allowOverwrite = false) {
    const school = getSchool(schoolCode);
    if (!school) return { success: false, message: 'School not found' };
    if (!school.classes) school.classes = [];

    let added = 0, updated = 0, skipped = 0, classesCreated = 0;
    const errors = [];

    // Only import valid + warning rows (not error rows)
    const importable = validatedRows.filter(r => r.status !== 'error');

    for (const row of importable) {
        const { record } = row;
        if (!record.studentid || !record.studentname || !record.class) {
            errors.push(`Row ${row.rowIdx + 1}: Missing required fields`);
            skipped++;
            continue;
        }

        // Find or create class
        let cls = school.classes.find(c => c.className === record.class);
        if (!cls) {
            cls = { className: record.class, students: [] };
            school.classes.push(cls);
            classesCreated++;
        }

        // Check duplicate
        const existingIdx = cls.students.findIndex(s => s.studentId === record.studentid);
        const passwordHash = await hashPassword(record.studentid + '@AI');

        if (existingIdx !== -1) {
            if (allowOverwrite) {
                cls.students[existingIdx] = {
                    ...cls.students[existingIdx],
                    name: record.studentname,
                    gender: record.gender || cls.students[existingIdx].gender || '',
                    dob: record.dateofbirth || cls.students[existingIdx].dob || '',
                    rollNumber: record.rollnumber || cls.students[existingIdx].rollNumber || '',
                    admissionNo: record.admissionno || cls.students[existingIdx].admissionNo || '',
                    passwordHash,
                    password: record.studentid + '@AI',
                };
                updated++;
            } else {
                skipped++;
            }
        } else {
            // Also check in other classes (student might be moving class)
            let foundElsewhere = false;
            for (const otherCls of school.classes) {
                if (otherCls === cls) continue;
                const otherIdx = otherCls.students.findIndex(s => s.studentId === record.studentid);
                if (otherIdx !== -1) {
                    foundElsewhere = true;
                    if (allowOverwrite) {
                        // Remove from old class, add to new
                        otherCls.students.splice(otherIdx, 1);
                        cls.students.push({
                            studentId: record.studentid,
                            name: record.studentname,
                            gender: record.gender || '',
                            dob: record.dateofbirth || '',
                            rollNumber: record.rollnumber || '',
                            admissionNo: record.admissionno || '',
                            passwordHash,
                            password: record.studentid + '@AI',
                            psychometricCompleted: false,
                            psychometricReport: null,
                        });
                        updated++;
                    } else {
                        skipped++;
                    }
                    break;
                }
            }

            if (!foundElsewhere) {
                cls.students.push({
                    studentId: record.studentid,
                    name: record.studentname,
                    gender: record.gender || '',
                    dob: record.dateofbirth || '',
                    rollNumber: record.rollnumber || '',
                    admissionNo: record.admissionno || '',
                    passwordHash,
                    password: record.studentid + '@AI',
                    psychometricCompleted: false,
                    psychometricReport: null,
                });
                added++;
            }
        }
    }

    saveSchool(schoolCode, school);

    return {
        success: true,
        added,
        updated,
        skipped,
        classesCreated,
        errors,
        totalImported: added + updated,
    };
}

// ═══════════════════════════════════════════
// CSV TEMPLATE DOWNLOAD
// ═══════════════════════════════════════════

export function downloadTemplate() {
    const headers = 'Student Name,Student ID,Class,Gender,Date of Birth,Roll Number,Admission No';
    const rows = [
        'Rahul Sharma,1001,8A,Male,15/03/2010,01,ADM1001',
        'Priya Verma,1002,8A,Female,22/07/2010,02,ADM1002',
        'Arjun Patel,1003,9B,Male,10/11/2009,01,ADM1003',
    ];
    const csv = headers + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════
// OLD API BACKWARDS COMPATIBILITY
// ═══════════════════════════════════════════

/**
 * @deprecated Use parseFile + autoMapHeaders + validateRows + importValidatedRows instead
 */
export async function parseAndImportExcel(file, schoolCode) {
    try {
        const parsed = await parseFile(file);
        const mapping = autoMapHeaders(parsed.headers);
        if (mapping.missingRequired.length > 0) {
            return { success: false, message: `Missing required columns: ${mapping.missingRequired.join(', ')}` };
        }
        const { validatedRows, stats } = validateRows(parsed.headers, parsed.rows, mapping.mappings, schoolCode);
        const result = await importValidatedRows(schoolCode, validatedRows, true);
        return { ...result, classesCreated: result.classesCreated, duplicates: result.updated };
    } catch (err) {
        return { success: false, message: err.message };
    }
}
