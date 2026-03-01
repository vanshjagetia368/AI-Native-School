/* ============================================
   AI Native Schools — LocalStorage Service
   ============================================ */

const STORAGE_KEY = 'ai_native_schools';
const SESSION_KEY = 'currentSession';
const THEME_KEY = 'ai_native_theme';

// --- Safe JSON helpers ---
function safeParse(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// --- Schools ---
export function getSchools() {
    return safeParse(localStorage.getItem(STORAGE_KEY)) || {};
}

export function saveSchools(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Failed to save schools:', e);
        return false;
    }
}

export function getSchool(schoolCode) {
    const schools = getSchools();
    return schools[schoolCode] || null;
}

export function saveSchool(schoolCode, schoolData) {
    const schools = getSchools();
    schools[schoolCode] = schoolData;
    return saveSchools(schools);
}

// --- Class helpers ---
export function getClasses(schoolCode) {
    const school = getSchool(schoolCode);
    return school ? (school.classes || []) : [];
}

export function addClass(schoolCode, className) {
    const school = getSchool(schoolCode);
    if (!school) return { success: false, message: 'School not found' };
    if (!school.classes) school.classes = [];
    const exists = school.classes.find(c => c.className === className);
    if (exists) return { success: false, message: 'Class already exists' };
    school.classes.push({ className, students: [] });
    saveSchool(schoolCode, school);
    return { success: true, message: `Class ${className} created` };
}

export function deleteClass(schoolCode, className) {
    const school = getSchool(schoolCode);
    if (!school) return { success: false, message: 'School not found' };
    const idx = (school.classes || []).findIndex(c => c.className === className);
    if (idx === -1) return { success: false, message: 'Class not found' };
    school.classes.splice(idx, 1);
    saveSchool(schoolCode, school);
    return { success: true, message: `Class ${className} deleted` };
}

// --- Student helpers ---
export function getStudentInSchool(schoolCode, studentId) {
    const school = getSchool(schoolCode);
    if (!school || !school.classes) return null;
    for (const cls of school.classes) {
        const student = (cls.students || []).find(s => s.studentId === studentId);
        if (student) return { ...student, className: cls.className };
    }
    return null;
}

export function updateStudent(schoolCode, studentId, updater) {
    const school = getSchool(schoolCode);
    if (!school || !school.classes) return false;
    for (const cls of school.classes) {
        const idx = (cls.students || []).findIndex(s => s.studentId === studentId);
        if (idx !== -1) {
            if (typeof updater === 'function') {
                cls.students[idx] = updater(cls.students[idx]);
            } else {
                Object.assign(cls.students[idx], updater);
            }
            saveSchool(schoolCode, school);
            return true;
        }
    }
    return false;
}

export function getAllStudents(schoolCode) {
    const school = getSchool(schoolCode);
    if (!school || !school.classes) return [];
    const students = [];
    for (const cls of school.classes) {
        for (const s of (cls.students || [])) {
            students.push({ ...s, className: cls.className });
        }
    }
    return students;
}

export function importStudents(schoolCode, studentsData) {
    const school = getSchool(schoolCode);
    if (!school) return { success: false, message: 'School not found' };
    if (!school.classes) school.classes = [];

    let added = 0, duplicates = 0, classesCreated = 0;
    const errors = [];

    for (const row of studentsData) {
        if (!row.studentId || !row.name || !row.className) {
            errors.push(`Missing required fields for row: ${JSON.stringify(row)}`);
            continue;
        }

        // Find or create class
        let cls = school.classes.find(c => c.className === row.className);
        if (!cls) {
            cls = { className: row.className, students: [] };
            school.classes.push(cls);
            classesCreated++;
        }

        // Check duplicate
        const existing = cls.students.find(s => s.studentId === row.studentId);
        if (existing) {
            // Override if re-import
            Object.assign(existing, {
                name: row.name,
                gender: row.gender || existing.gender,
                dob: row.dob || existing.dob,
                rollNumber: row.rollNumber || existing.rollNumber,
                admissionNo: row.admissionNo || existing.admissionNo,
            });
            duplicates++;
        } else {
            cls.students.push({
                studentId: row.studentId,
                name: row.name,
                gender: row.gender || '',
                dob: row.dob || '',
                rollNumber: row.rollNumber || '',
                admissionNo: row.admissionNo || '',
                password: row.studentId + '@AI',
                passwordHash: null,
                isFirstLogin: true,
                loginAttempts: 0,
                lockUntil: null,
                psychometricCompleted: false,
                psychometricReport: null,
            });
            added++;
        }
    }

    saveSchool(schoolCode, school);
    return { success: true, added, duplicates, classesCreated, errors };
}

// --- Session ---
export function getSession() {
    return safeParse(localStorage.getItem(SESSION_KEY));
}

export function saveSession(session) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return true;
    } catch (e) {
        console.error('Failed to save session:', e);
        return false;
    }
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

// --- Theme ---
export function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
}

export function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

// --- Seed Demo Data ---
export function seedDemoData() {
    const schools = getSchools();
    if (schools['AINSC1']) return;

    schools['AINSC1'] = {
        schoolCode: 'AINSC1',
        schoolName: 'AI Native Demo School',
        admin: {
            name: 'Demo Admin',
            email: 'admin@ainativeschool.com',
            passwordHash: null,
        },
        classes: [
            {
                className: '8A',
                students: [
                    {
                        studentId: '1001',
                        name: 'Rahul Sharma',
                        gender: 'Male',
                        dob: '15/03/2010',
                        rollNumber: '01',
                        admissionNo: 'ADM1001',
                        password: '1001@AI',
                        passwordHash: null,
                        isFirstLogin: true,
                        loginAttempts: 0,
                        lockUntil: null,
                        psychometricCompleted: false,
                        psychometricReport: null,
                    },
                    {
                        studentId: '1002',
                        name: 'Priya Verma',
                        gender: 'Female',
                        dob: '22/07/2010',
                        rollNumber: '02',
                        admissionNo: 'ADM1002',
                        password: '1002@AI',
                        passwordHash: null,
                        isFirstLogin: true,
                        loginAttempts: 0,
                        lockUntil: null,
                        psychometricCompleted: false,
                        psychometricReport: null,
                    },
                ],
            },
            {
                className: '9B',
                students: [
                    {
                        studentId: '1003',
                        name: 'Arjun Patel',
                        gender: 'Male',
                        dob: '10/11/2009',
                        rollNumber: '01',
                        admissionNo: 'ADM1003',
                        password: '1003@AI',
                        passwordHash: null,
                        isFirstLogin: true,
                        loginAttempts: 0,
                        lockUntil: null,
                        psychometricCompleted: false,
                        psychometricReport: null,
                    },
                ],
            },
        ],
        createdAt: new Date().toISOString(),
    };

    saveSchools(schools);
}
