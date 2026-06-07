const CLASS_ORDER = ['301', '302', '303', '304', '305'];

const ROW_COLORS = [
  { accent: '#6366f1', soft: 'rgba(99, 102, 241, 0.1)' },
  { accent: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.1)' },
  { accent: '#ec4899', soft: 'rgba(236, 72, 153, 0.1)' },
  { accent: '#f59e0b', soft: 'rgba(245, 158, 11, 0.1)' },
  { accent: '#10b981', soft: 'rgba(16, 185, 129, 0.1)' },
];

const galleryEl = document.getElementById('gallery');
const classNavEl = document.getElementById('classNav');
const emptyMsg = document.getElementById('emptyMsg');

let data = null;

async function loadData() {
  try {
    const res = await fetch('data/students.json');
    if (!res.ok) throw new Error('not found');
    data = await res.json();
  } catch {
    data = { classes: [], students: [] };
  }
}

function getStudentsByClass(classId) {
  return (data?.students ?? []).filter((s) => s.classId === classId);
}

function getClassCards(classId) {
  const cards = [];
  for (const student of getStudentsByClass(classId)) {
    for (const sim of student.simulations) {
      cards.push({ student, sim });
    }
  }
  return cards;
}

function getSimIndex(title) {
  const match = title.match(/(\d+)/);
  return match ? match[1] : '';
}

function createCard({ student, sim }, color) {
  const card = document.createElement('article');
  card.className = 'card';
  card.style.setProperty('--row-accent', color.accent);
  card.style.setProperty('--row-accent-soft', color.soft);

  const hasReport = !!student.report;
  const simNum = getSimIndex(sim.title);

  card.innerHTML = `
    <div class="card__thumb" role="button" tabindex="0" aria-label="${student.studentName} ${sim.title} 시뮬레이션 열기">
      <iframe src="${sim.path}" title="${sim.title} 미리보기" loading="lazy" sandbox=""></iframe>
      <div class="card__thumb-overlay">
        <div class="card__play">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      ${simNum ? `<span class="card__sim-badge">Sim ${simNum}</span>` : ''}
    </div>
    <div class="card__body">
      <div class="card__top">
        <span class="card__tag">${student.studentId}</span>
        <span class="card__student">${student.studentName}</span>
      </div>
      <h3 class="card__title">${sim.title}</h3>
      <div class="card__actions">
        <a class="card__btn card__btn--play" href="${sim.path}" target="_blank" rel="noopener">실행</a>
        ${
          hasReport
            ? `<a class="card__btn card__btn--report" href="${student.report}" target="_blank" rel="noopener">보고서</a>`
            : `<span class="card__btn card__btn--report" aria-disabled="true">보고서 없음</span>`
        }
      </div>
    </div>
  `;

  const thumb = card.querySelector('.card__thumb');
  const openSim = () => window.open(sim.path, '_blank');
  thumb.addEventListener('click', openSim);
  thumb.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openSim();
    }
  });

  return card;
}

function createClassRow(classId, index) {
  const color = ROW_COLORS[index % ROW_COLORS.length];
  const students = getStudentsByClass(classId);
  const cards = getClassCards(classId);

  const section = document.createElement('section');
  section.className = 'class-row';
  section.id = `class-${classId}`;
  section.style.setProperty('--row-accent', color.accent);
  section.style.setProperty('--row-accent-soft', color.soft);

  section.innerHTML = `
    <div class="class-row__header">
      <div class="class-row__title-group">
        <div class="class-row__indicator"></div>
        <div>
          <h2 class="class-row__title">${classId}반</h2>
          <p class="class-row__meta">${students.length}명 · 시뮬레이션 ${cards.length}개</p>
        </div>
      </div>
      <span class="class-row__count">${cards.length} works</span>
    </div>
    <div class="class-row__body">
      <div class="class-row__scroll">
        <div class="class-row__track"></div>
      </div>
    </div>
  `;

  const track = section.querySelector('.class-row__track');

  if (cards.length === 0) {
    section.querySelector('.class-row__body').innerHTML =
      '<p class="class-row__empty">아직 제출된 작품이 없습니다.</p>';
  } else {
    cards.forEach((c) => track.appendChild(createCard(c, color)));
  }

  return section;
}

function renderClassNav() {
  classNavEl.innerHTML = CLASS_ORDER.map((classId) => {
    const count = getClassCards(classId).length;
    return `
      <a class="class-nav__link" href="#class-${classId}">
        ${classId}반
        <span class="class-nav__count">${count}</span>
      </a>
    `;
  }).join('');
}

function renderGallery() {
  galleryEl.innerHTML = '';

  const totalCards = CLASS_ORDER.reduce((sum, id) => sum + getClassCards(id).length, 0);

  if (totalCards === 0) {
    emptyMsg.hidden = false;
    return;
  }

  emptyMsg.hidden = true;

  CLASS_ORDER.forEach((classId, index) => {
    galleryEl.appendChild(createClassRow(classId, index));
  });
}

async function init() {
  await loadData();
  renderClassNav();
  renderGallery();
}

init();
