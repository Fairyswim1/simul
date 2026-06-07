const state = {
  data: null,
  activeClass: 'all',
  scrollIndex: 0,
  visibleCount: 4,
};

const filterEl = document.getElementById('filter');
const trackEl = document.getElementById('track');
const emptyMsg = document.getElementById('emptyMsg');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

async function loadData() {
  try {
    const res = await fetch('data/students.json');
    if (!res.ok) throw new Error('not found');
    state.data = await res.json();
  } catch {
    state.data = { classes: [], students: [] };
  }
}

function getCards() {
  if (!state.data) return [];
  const cards = [];

  for (const student of state.data.students) {
    if (state.activeClass !== 'all' && student.classId !== state.activeClass) continue;

    for (const sim of student.simulations) {
      cards.push({ student, sim });
    }
  }

  return cards;
}

function renderFilter() {
  const classes = state.data?.classes ?? [];
  const buttons = [
    { id: 'all', label: '전체' },
    ...classes.map((c) => ({ id: c, label: `${c}반` })),
  ];

  filterEl.innerHTML = buttons
    .map(
      (b) =>
        `<button class="filter__btn${b.id === state.activeClass ? ' filter__btn--active' : ''}" data-class="${b.id}">${b.label}</button>`
    )
    .join('');

  filterEl.querySelectorAll('.filter__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeClass = btn.dataset.class;
      state.scrollIndex = 0;
      renderFilter();
      renderCards();
    });
  });
}

function createCard({ student, sim }) {
  const card = document.createElement('article');
  card.className = 'card';

  const hasReport = !!student.report;

  card.innerHTML = `
    <div class="card__thumb" data-href="${sim.path}" role="button" tabindex="0" aria-label="${sim.title} 시뮬레이션 열기">
      <iframe src="${sim.path}" title="${sim.title} 미리보기" loading="lazy"></iframe>
      <div class="card__thumb-overlay">
        <div class="card__play">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="card__badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>
    <div class="card__body">
      <span class="card__tag">${student.studentId}</span>
      <h3 class="card__title">${sim.title}</h3>
      <p class="card__student">${student.studentName}</p>
      <div class="card__actions">
        <a class="card__btn card__btn--play" href="${sim.path}" target="_blank" rel="noopener">시뮬레이션 실행</a>
        ${
          hasReport
            ? `<a class="card__btn card__btn--report" href="${student.report}" target="_blank" rel="noopener">보고서 보기</a>`
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

function updateArrows(cardCount) {
  const maxIndex = Math.max(0, cardCount - state.visibleCount);
  prevBtn.disabled = state.scrollIndex <= 0;
  nextBtn.disabled = state.scrollIndex >= maxIndex;
}

function updateVisibleCount() {
  const w = window.innerWidth;
  if (w < 640) state.visibleCount = 1;
  else if (w < 900) state.visibleCount = 2;
  else if (w < 1100) state.visibleCount = 3;
  else state.visibleCount = 4;
}

function scrollToIndex() {
  const cardWidth = 280 + 20;
  trackEl.style.transform = `translateX(-${state.scrollIndex * cardWidth}px)`;
}

function renderCards() {
  const cards = getCards();
  trackEl.innerHTML = '';

  if (cards.length === 0) {
    emptyMsg.hidden = false;
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    return;
  }

  emptyMsg.hidden = true;
  prevBtn.style.display = '';
  nextBtn.style.display = '';

  cards.forEach((c) => trackEl.appendChild(createCard(c)));

  updateVisibleCount();
  const maxIndex = Math.max(0, cards.length - state.visibleCount);
  if (state.scrollIndex > maxIndex) state.scrollIndex = maxIndex;
  scrollToIndex();
  updateArrows(cards.length);
}

prevBtn.addEventListener('click', () => {
  if (state.scrollIndex > 0) {
    state.scrollIndex--;
    scrollToIndex();
    updateArrows(getCards().length);
  }
});

nextBtn.addEventListener('click', () => {
  const cards = getCards();
  const maxIndex = Math.max(0, cards.length - state.visibleCount);
  if (state.scrollIndex < maxIndex) {
    state.scrollIndex++;
    scrollToIndex();
    updateArrows(cards.length);
  }
});

window.addEventListener('resize', () => {
  updateVisibleCount();
  scrollToIndex();
  updateArrows(getCards().length);
});

async function init() {
  await loadData();
  renderFilter();
  renderCards();
}

init();
