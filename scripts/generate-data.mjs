import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SUBMISSIONS = join(ROOT, 'submissions');
const DATA_DIR = join(ROOT, 'data');

function parseFilename(filename) {
  const name = basename(filename, extname(filename));
  const parts = name.split('_');
  if (parts.length < 2) return null;
  return {
    studentId: parts[0],
    studentName: parts[1],
    label: parts.slice(2).join('_') || name,
  };
}

function getClassId(studentId) {
  if (studentId.length >= 3) return studentId.slice(0, 3);
  return studentId;
}

function scanSubmissions() {
  if (!existsSync(SUBMISSIONS)) {
    mkdirSync(SUBMISSIONS, { recursive: true });
    return [];
  }

  const files = readdirSync(SUBMISSIONS);
  const students = new Map();

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (!['.html', '.pdf'].includes(ext)) continue;

    const parsed = parseFilename(file);
    if (!parsed) continue;

    const key = `${parsed.studentId}_${parsed.studentName}`;
    if (!students.has(key)) {
      students.set(key, {
        studentId: parsed.studentId,
        studentName: parsed.studentName,
        classId: getClassId(parsed.studentId),
        report: null,
        simulations: [],
      });
    }

    const entry = students.get(key);
    const relativePath = `submissions/${file}`;

    if (ext === '.pdf') {
      entry.report = relativePath;
    } else {
      entry.simulations.push({
        title: parsed.label,
        path: relativePath,
      });
    }
  }

  return [...students.values()]
    .map((s) => ({
      ...s,
      simulations: s.simulations.sort((a, b) => a.title.localeCompare(b.title, 'ko')),
    }))
    .sort((a, b) => a.studentId.localeCompare(b.studentId));
}

const students = scanSubmissions();
const classes = [...new Set(students.map((s) => s.classId))].sort();

const data = {
  generatedAt: new Date().toISOString(),
  classes,
  students,
};

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(join(DATA_DIR, 'students.json'), JSON.stringify(data, null, 2), 'utf-8');

console.log(`✓ ${students.length}명의 학생 데이터 생성 완료`);
console.log(`  → data/students.json`);
students.forEach((s) => {
  console.log(`  · ${s.studentId} ${s.studentName}: 시뮬 ${s.simulations.length}개, 보고서 ${s.report ? 'O' : 'X'}`);
});
