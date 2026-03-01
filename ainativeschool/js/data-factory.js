/* ============================================
   AI Native Schools — Student Data Factory
   ============================================
   Generates realistic Indian student data for demo/testing.
   Produces CSV compatible with the Excel Import Engine.
*/

import { getSchool, saveSchool, getAllStudents } from './storage.js';

// ═══════════════════════════════════════════
// NAME ENGINE — Realistic Indian Names
// ═══════════════════════════════════════════

const MALE_FIRST = [
    'Aarav', 'Aditya', 'Akash', 'Amit', 'Anand', 'Ankur', 'Arjun', 'Arnav', 'Ashwin', 'Bharat',
    'Chirag', 'Darsh', 'Dev', 'Dhruv', 'Eshan', 'Gaurav', 'Harsh', 'Ishaan', 'Jai', 'Kabir',
    'Karan', 'Kartik', 'Kunal', 'Laksh', 'Manik', 'Manav', 'Mohit', 'Nakul', 'Nikhil', 'Omkar',
    'Pranav', 'Rahul', 'Rajesh', 'Rishi', 'Rohan', 'Sahil', 'Samar', 'Siddharth', 'Tanmay', 'Tejas',
    'Utkarsh', 'Varun', 'Vedant', 'Vihaan', 'Vikram', 'Viraj', 'Vivaan', 'Yash', 'Yuvraj', 'Zain',
    'Abhinav', 'Advait', 'Amar', 'Atharv', 'Ayush', 'Devansh', 'Hemant', 'Ishan', 'Jayesh', 'Krish',
];

const FEMALE_FIRST = [
    'Aanya', 'Aditi', 'Ananya', 'Anika', 'Anjali', 'Asha', 'Avni', 'Bhavna', 'Charu', 'Deepa',
    'Diya', 'Esha', 'Gauri', 'Isha', 'Jiya', 'Kavya', 'Kiara', 'Kriti', 'Lavanya', 'Mahika',
    'Meera', 'Mira', 'Myra', 'Naina', 'Navya', 'Neha', 'Nisha', 'Palak', 'Pooja', 'Priya',
    'Radhika', 'Riya', 'Ruhi', 'Saanvi', 'Sakshi', 'Sara', 'Shreya', 'Simran', 'Siya', 'Sneha',
    'Suhana', 'Tanvi', 'Tanya', 'Trisha', 'Uma', 'Urvi', 'Vaishnavi', 'Vidya', 'Yashvi', 'Zara',
    'Aishwarya', 'Akshara', 'Divya', 'Ishita', 'Janvi', 'Mansi', 'Pari', 'Rhea', 'Sanya', 'Swara',
];

const LAST_NAMES = [
    'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Joshi', 'Mehta', 'Reddy', 'Nair',
    'Bhatia', 'Kapoor', 'Malhotra', 'Chauhan', 'Desai', 'Rao', 'Iyer', 'Banerjee', 'Saxena', 'Agarwal',
    'Tiwari', 'Mishra', 'Pandey', 'Dubey', 'Srivastava', 'Chopra', 'Khanna', 'Arora', 'Pillai', 'Menon',
    'Das', 'Sen', 'Bose', 'Roy', 'Mukherjee', 'Chatterjee', 'Thakur', 'Rathore', 'Shekhawat', 'Choudhury',
    'Jain', 'Goswami', 'Bhatt', 'Kulkarni', 'Deshpande', 'Patil', 'Shinde', 'Pawar', 'Sawant', 'Hegde',
];

// ═══════════════════════════════════════════
// CLASS CONFIGURATION
// ═══════════════════════════════════════════

const ALL_CLASSES = ['6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B'];

// Class grade → age range (in years as of today)
const CLASS_AGE_MAP = {
    '6': { min: 11, max: 12 },
    '7': { min: 12, max: 13 },
    '8': { min: 13, max: 14 },
    '9': { min: 14, max: 15 },
    '10': { min: 15, max: 16 },
};

// ═══════════════════════════════════════════
// GENERATION HELPERS
// ═══════════════════════════════════════════

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function padZero(n) {
    return String(n).padStart(2, '0');
}

/**
 * Generate a realistic DOB for a given class grade.
 * @param {string} grade - e.g. '8' from class '8A'
 * @returns {string} - DD/MM/YYYY
 */
function generateDOB(grade) {
    const ageRange = CLASS_AGE_MAP[grade];
    if (!ageRange) return '';

    const now = new Date();
    const age = ageRange.min + Math.random() * (ageRange.max - ageRange.min);
    const birthYear = now.getFullYear() - Math.round(age);
    const birthMonth = Math.floor(Math.random() * 12); // 0-11
    const maxDay = new Date(birthYear, birthMonth + 1, 0).getDate();
    const birthDay = 1 + Math.floor(Math.random() * maxDay);

    return `${padZero(birthDay)}/${padZero(birthMonth + 1)}/${birthYear}`;
}

/**
 * Generate unique 4-digit admission number
 */
function generateAdmNo(usedSet) {
    let num;
    do {
        num = 1000 + Math.floor(Math.random() * 9000);
    } while (usedSet.has(num));
    usedSet.add(num);
    return `ADM${num}`;
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
        return plaintext;
    }
}

// ═══════════════════════════════════════════
// CORE GENERATOR
// ═══════════════════════════════════════════

/**
 * Generate an array of realistic student records.
 * @param {object} options
 * @param {number} options.count - Number of students (default 100)
 * @param {string[]} options.classes - Array of class names
 * @param {number} options.maleRatio - 0-100 percentage male (default 50)
 * @param {boolean} options.includeDOB - Include DOB column
 * @param {boolean} options.includeAdmNo - Include Admission No column
 * @param {number} options.startId - Starting student ID
 * @param {Function} options.onProgress - Callback(current, total)
 * @returns {Promise<object[]>} Array of student objects
 */
export async function generateStudents(options = {}) {
    const {
        count = 100,
        classes = ALL_CLASSES,
        maleRatio = 50,
        includeDOB = true,
        includeAdmNo = true,
        startId = 1001,
        onProgress = null,
    } = options;

    const usedNames = new Set();
    const usedAdmNos = new Set();
    const students = [];

    // Distribute evenly across classes
    const perClass = Math.floor(count / classes.length);
    const remainder = count % classes.length;
    const classCounts = classes.map((c, i) => ({ className: c, count: perClass + (i < remainder ? 1 : 0) }));

    // Track roll numbers per class
    const rollCounters = {};
    classes.forEach(c => { rollCounters[c] = 0; });

    let generated = 0;

    for (const { className, count: classCount } of classCounts) {
        const grade = className.replace(/[A-Za-z]/g, ''); // '8A' → '8'

        for (let i = 0; i < classCount; i++) {
            const isMale = generated < count * (maleRatio / 100);
            const gender = isMale ? 'Male' : 'Female';
            const firstNames = isMale ? MALE_FIRST : FEMALE_FIRST;

            // Generate unique name
            let fullName;
            let attempts = 0;
            do {
                fullName = `${randomItem(firstNames)} ${randomItem(LAST_NAMES)}`;
                attempts++;
            } while (usedNames.has(fullName) && attempts < 100);
            usedNames.add(fullName);

            const studentId = String(startId + generated);
            rollCounters[className]++;

            const student = {
                name: fullName,
                studentId,
                className,
                gender,
                dob: includeDOB ? generateDOB(grade) : '',
                rollNumber: padZero(rollCounters[className]),
                admissionNo: includeAdmNo ? generateAdmNo(usedAdmNos) : '',
            };

            students.push(student);
            generated++;

            // Progress callback (yield to UI every 5 students)
            if (onProgress && generated % 5 === 0) {
                onProgress(generated, count);
                await new Promise(r => setTimeout(r, 15)); // Micro-yield for animation
            }
        }
    }

    // Final progress
    if (onProgress) onProgress(count, count);

    // Shuffle to mix genders (they were grouped by class already, this randomizes within output)
    return shuffleArray(students);
}

// ═══════════════════════════════════════════
// CSV GENERATION
// ═══════════════════════════════════════════

/**
 * Convert student array to CSV string
 */
export function generateCSV(students, options = {}) {
    const { includeDOB = true, includeAdmNo = true } = options;

    const headers = ['Student Name', 'Student ID', 'Class', 'Gender'];
    if (includeDOB) headers.push('Date of Birth');
    headers.push('Roll Number');
    if (includeAdmNo) headers.push('Admission No');

    const rows = students.map(s => {
        const row = [s.name, s.studentId, s.className, s.gender];
        if (includeDOB) row.push(s.dob);
        row.push(s.rollNumber);
        if (includeAdmNo) row.push(s.admissionNo);
        return row.join(',');
    });

    return headers.join(',') + '\n' + rows.join('\n');
}

/**
 * Trigger CSV file download
 */
export function downloadCSV(csvString, count = 100) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo_students_${count}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════
// AUTO-IMPORT INTO SCHOOL
// ═══════════════════════════════════════════

/**
 * Directly import generated students into school → class → student structure.
 * Bypasses CSV parsing — inserts directly with hashed passwords.
 * @param {string} schoolCode
 * @param {object[]} students - Generated student records
 * @param {boolean} replaceExisting - Overwrite existing students
 * @param {Function} onProgress - Callback(current, total)
 * @returns {Promise<object>} Import result
 */
export async function autoImport(schoolCode, students, replaceExisting = false, onProgress = null) {
    const school = getSchool(schoolCode);
    if (!school) return { success: false, message: 'School not found' };
    if (!school.classes) school.classes = [];

    let added = 0, updated = 0, skipped = 0, classesCreated = 0;
    const classesSet = new Set(school.classes.map(c => c.className));

    for (let i = 0; i < students.length; i++) {
        const s = students[i];

        // Find or create class
        let cls = school.classes.find(c => c.className === s.className);
        if (!cls) {
            cls = { className: s.className, students: [] };
            school.classes.push(cls);
            classesCreated++;
            classesSet.add(s.className);
        }

        // Check duplicate
        const existingIdx = cls.students.findIndex(st => st.studentId === s.studentId);
        const passwordHash = await hashPassword(s.studentId + '@AI');

        if (existingIdx !== -1) {
            if (replaceExisting) {
                cls.students[existingIdx] = {
                    ...cls.students[existingIdx],
                    name: s.name,
                    gender: s.gender,
                    dob: s.dob,
                    rollNumber: s.rollNumber,
                    admissionNo: s.admissionNo,
                    passwordHash,
                    password: s.studentId + '@AI',
                };
                updated++;
            } else {
                skipped++;
            }
        } else {
            cls.students.push({
                studentId: s.studentId,
                name: s.name,
                gender: s.gender || '',
                dob: s.dob || '',
                rollNumber: s.rollNumber || '',
                admissionNo: s.admissionNo || '',
                passwordHash,
                password: s.studentId + '@AI',
                psychometricCompleted: false,
                psychometricReport: null,
            });
            added++;
        }

        // Progress
        if (onProgress && (i + 1) % 10 === 0) {
            onProgress(i + 1, students.length);
            await new Promise(r => setTimeout(r, 10));
        }
    }

    // Sort classes naturally
    school.classes.sort((a, b) => {
        const numA = parseInt(a.className); const numB = parseInt(b.className);
        if (numA !== numB) return numA - numB;
        return a.className.localeCompare(b.className);
    });

    saveSchool(schoolCode, school);

    if (onProgress) onProgress(students.length, students.length);

    return {
        success: true,
        added,
        updated,
        skipped,
        classesCreated,
        totalImported: added + updated,
        maleCount: students.filter(s => s.gender === 'Male').length,
        femaleCount: students.filter(s => s.gender === 'Female').length,
    };
}

/**
 * Get the next available student ID for a school
 */
export function getNextStudentId(schoolCode) {
    const existing = getAllStudents(schoolCode);
    if (existing.length === 0) return 1001;
    const maxId = Math.max(...existing.map(s => parseInt(s.studentId) || 0));
    return maxId + 1;
}

/**
 * Export student data as JSON
 */
export function exportJSON(students) {
    const json = JSON.stringify(students, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_export_${students.length}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
