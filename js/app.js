const CLASS_ORDER = ['301', '302', '303', '304', '305'];

const ROW_THEMES = [
  { accent: '#ff6b6b', bg: '#fff0f0', emoji: '🐰' },
  { accent: '#ffa94d', bg: '#fff8ee', emoji: '🐑' },
  { accent: '#69db7c', bg: '#f0fff4', emoji: '🦊' },
  { accent: '#74c0fc', bg: '#f0f8ff', emoji: '🐻' },
  { accent: '#da77f2', bg: '#faf0ff', emoji: '🐱' },
];

const galleryEl = document.getElementById('gallery');
const classNavEl = document.getElementById('classNav');
const emptyMsg = document.getElementById('emptyMsg');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const searchResult = document.getElementById('searchResult');

let data = null;
let searchQuery = '';

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

function createCard({ student, sim }, theme) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.studentName = student.studentName;
  card.dataset.studentId = student.studentId;
  card.style.setProperty('--row-accent', theme.accent);

  const hasReport = !!student.report;

  card.innerHTML = `
    <div class="card__thumb" role="button" tabindex="0" aria-label="${student.studentName} ${sim.title} 시뮬레이션 열기">
      <iframe src="${sim.path}" title="${sim.title} 미리보기" loading="lazy" sandbox=""></iframe>
      <div class="card__thumb-overlay">
        <div class="card__play">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
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
      <div class="card__social">
        <button type="button" class="card__like-btn" aria-label="좋아요">
          <span class="card__social-icon">♥</span>
          <span class="card__like-count">0</span>
        </button>
        <button type="button" class="card__comment-btn" aria-label="댓글 보기">
          <span class="card__social-icon">💬</span>
          <span class="card__comment-count">0</span>
        </button>
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

  if (typeof Interactions !== 'undefined') {
    Interactions.bindCard(card, Interactions.createMeta(student, sim));
  }

  return card;
}

function setupRowCarousel(section) {
  const scrollEl = section.querySelector('.class-row__scroll');
  const prevBtn = section.querySelector('.class-row__arrow--prev');
  const nextBtn = section.querySelector('.class-row__arrow--next');
  if (!scrollEl || !prevBtn || !nextBtn) return;

  const scrollAmount = () => {
    const card = scrollEl.querySelector('.card');
    if (!card) return 280;
    const gap = 14;
    return card.offsetWidth + gap;
  };

  const updateArrows = () => {
    const max = scrollEl.scrollWidth - scrollEl.clientWidth;
    prevBtn.disabled = scrollEl.scrollLeft <= 4;
    nextBtn.disabled = scrollEl.scrollLeft >= max - 4;
  };

  prevBtn.addEventListener('click', () => {
    scrollEl.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', () => {
    scrollEl.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
  });

  scrollEl.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}

function createClassRow(classId, index) {
  const theme = ROW_THEMES[index % ROW_THEMES.length];
  const students = getStudentsByClass(classId);
  const cards = getClassCards(classId);

  const section = document.createElement('section');
  section.className = 'class-row';
  section.id = `class-${classId}`;
  section.style.setProperty('--row-accent', theme.accent);
  section.style.setProperty('--row-bg', theme.bg);

  section.innerHTML = `
    <div class="class-row__header">
      <div class="class-row__title-group">
        <span class="class-row__emoji" aria-hidden="true">${theme.emoji}</span>
        <div>
          <h2 class="class-row__title">${classId}반</h2>
          <p class="class-row__meta">${students.length}명 · 시뮬레이션 ${cards.length}개</p>
        </div>
      </div>
      <span class="class-row__count">${cards.length}개</span>
    </div>
    <div class="class-row__body"></div>
  `;

  const body = section.querySelector('.class-row__body');

  if (cards.length === 0) {
    body.innerHTML = '<p class="class-row__empty">아직 제출된 작품이 없어요 🌱</p>';
  } else {
    body.innerHTML = `
      <div class="class-row__carousel">
        <button class="class-row__arrow class-row__arrow--prev" aria-label="${classId}반 이전">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </button>
        <div class="class-row__scroll">
          <div class="class-row__track"></div>
        </div>
        <button class="class-row__arrow class-row__arrow--next" aria-label="${classId}반 다음">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </button>
      </div>
    `;

    const track = body.querySelector('.class-row__track');
    cards.forEach((c) => track.appendChild(createCard(c, theme)));
    setupRowCarousel(section);
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

  if (searchQuery) applySearch(searchQuery);
}

function normalizeSearch(text) {
  return text.trim().toLowerCase().replace(/\s+/g, '');
}

function cardMatches(card, query) {
  const name = normalizeSearch(card.dataset.studentName || '');
  const id = (card.dataset.studentId || '').toLowerCase();
  return name.includes(query) || id.includes(query);
}

function applySearch(rawQuery) {
  searchQuery = rawQuery;
  const query = normalizeSearch(rawQuery);
  const cards = galleryEl.querySelectorAll('.card');
  let matchCount = 0;
  let firstMatch = null;

  cards.forEach((card) => {
    const match = !query || cardMatches(card, query);
    card.classList.toggle('card--hidden', !match);
    card.classList.toggle('card--match', match && !!query);
    if (match && query) {
      matchCount++;
      if (!firstMatch) firstMatch = card;
    }
  });

  galleryEl.querySelectorAll('.class-row').forEach((row) => {
    const visible = row.querySelector('.card:not(.card--hidden)');
    row.classList.toggle('class-row--hidden', !!query && !visible);
  });

  if (!query) {
    searchResult.hidden = true;
    searchClear.hidden = true;
    return;
  }

  searchClear.hidden = false;
  searchResult.hidden = false;

  if (matchCount === 0) {
    searchResult.textContent = `"${rawQuery.trim()}" 검색 결과가 없습니다.`;
    searchResult.classList.add('search__result--empty');
    return;
  }

  const students = new Set();
  galleryEl.querySelectorAll('.card--match').forEach((c) => students.add(c.dataset.studentName));
  searchResult.textContent = `${students.size}명 · 시뮬레이션 ${matchCount}개 찾음`;
  searchResult.classList.remove('search__result--empty');

  if (firstMatch) {
    setTimeout(() => {
      firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 80);
  }
}

function setupSearch() {
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    applySearch(searchInput.value);
  });

  searchClear?.addEventListener('click', () => {
    searchInput.value = '';
    applySearch('');
    searchInput.focus();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      applySearch('');
    }
  });
}

async function init() {
  if (typeof Interactions !== 'undefined') Interactions.init();
  await loadData();
  renderClassNav();
  renderGallery();
  setupSearch();
}

init();
