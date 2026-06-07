const Interactions = (() => {
  const NAME_KEY = 'iasa_gallery_author_name';
  const LIKED_PREFIX = 'iasa_liked_';
  const BLOCKED_NAMES = ['익명', 'anonymous', 'anon', '테스트', 'test', 'admin', '관리자'];

  let db = null;
  let ready = false;
  let modalSim = null;
  let commentRef = null;
  let commentHandler = null;
  const simState = new Map();
  const subscribed = new Set();

  function getSimId(path) {
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
      hash = (hash << 5) - hash + path.charCodeAt(i);
      hash |= 0;
    }
    return `sim_${Math.abs(hash).toString(36)}`;
  }

  function isConfigured() {
    const cfg = window.FIREBASE_CONFIG;
    return cfg?.enabled && cfg?.apiKey && cfg?.projectId && cfg?.databaseURL;
  }

  function initFirebase() {
    if (!isConfigured() || typeof firebase === 'undefined') return false;
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      db = firebase.database();
      ready = true;
      return true;
    } catch (err) {
      console.warn('Firebase 초기화 실패:', err);
      return false;
    }
  }

  function simRef(simId) {
    return db.ref(`interactions/${simId}`);
  }

  function getSavedName() {
    return localStorage.getItem(NAME_KEY) || '';
  }

  function saveName(name) {
    localStorage.setItem(NAME_KEY, name);
  }

  function validateName(name) {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      return '이름은 2~20자로 입력해 주세요.';
    }
    if (BLOCKED_NAMES.includes(trimmed.toLowerCase())) {
      return '실명을 입력해 주세요. (익명 사용 불가)';
    }
    const hasKorean = /[가-힣]/.test(trimmed);
    const hasLatin = /[a-zA-Z]{2,}/.test(trimmed);
    if (!hasKorean && !hasLatin) {
      return '한글 또는 영문 실명을 입력해 주세요.';
    }
    if (/^\d+$/.test(trimmed)) {
      return '숫자만으로는 이름을 등록할 수 없습니다.';
    }
    return null;
  }

  async function ensureSimDoc(meta) {
    const ref = simRef(meta.simId);
    const snap = await ref.once('value');
    if (!snap.exists()) {
      await ref.set({
        path: meta.path,
        title: meta.title,
        studentName: meta.studentName,
        studentId: meta.studentId,
        likes: 0,
      });
    }
    return ref;
  }

  function updateCardCounts(simId, likes, comments) {
    document.querySelectorAll(`[data-sim-id="${simId}"]`).forEach((card) => {
      const likeEl = card.querySelector('.card__like-count');
      const commentEl = card.querySelector('.card__comment-count');
      if (likeEl) likeEl.textContent = likes;
      if (commentEl) commentEl.textContent = comments;

      const likeBtn = card.querySelector('.card__like-btn');
      if (likeBtn) {
        const liked = localStorage.getItem(LIKED_PREFIX + simId) === '1';
        likeBtn.classList.toggle('card__like-btn--active', liked);
      }
    });
  }

  function subscribeSim(simId) {
    if (!ready || subscribed.has(simId)) return;
    subscribed.add(simId);
    simState.set(simId, { likes: 0, comments: 0 });

    simRef(simId).on('value', (snap) => {
      const state = simState.get(simId);
      const data = snap.val() || {};
      state.likes = data.likes || 0;
      const comments = data.comments || {};
      state.comments = Object.keys(comments).length;
      updateCardCounts(simId, state.likes, state.comments);
    });
  }

  async function toggleLike(meta) {
    if (!ready) {
      alert('좋아요 기능이 아직 설정되지 않았습니다.\n관리자에게 Firebase 설정을 요청해 주세요.');
      return;
    }

    const likedKey = LIKED_PREFIX + meta.simId;
    if (localStorage.getItem(likedKey) === '1') return;

    try {
      const ref = await ensureSimDoc(meta);
      await ref.child('likes').transaction((current) => (current || 0) + 1);
      localStorage.setItem(likedKey, '1');
      document.querySelectorAll(`[data-sim-id="${meta.simId}"] .card__like-btn`).forEach((btn) => {
        btn.classList.add('card__like-btn--active');
      });
    } catch (err) {
      console.error(err);
      alert('좋아요 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function renderComments(snap) {
    const list = document.getElementById('commentList');
    if (!list) return;

    const val = snap.val();
    if (!val) {
      list.innerHTML = '<p class="comment-modal__empty">아직 댓글이 없어요. 첫 댓글을 남겨 보세요!</p>';
      return;
    }

    const items = Object.entries(val).map(([id, c]) => ({ id, ...c }));
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    list.innerHTML = items
      .map(
        (c) => `
        <article class="comment-item">
          <div class="comment-item__header">
            <strong class="comment-item__name">${escapeHtml(c.authorName)}</strong>
            <time class="comment-item__date">${formatDate(c.createdAt)}</time>
          </div>
          <p class="comment-item__body">${escapeHtml(c.body)}</p>
        </article>
      `
      )
      .join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openCommentModal(meta) {
    if (!ready) {
      alert('댓글 기능이 아직 설정되지 않았습니다.\n관리자에게 Firebase 설정을 요청해 주세요.');
      return;
    }

    modalSim = meta;
    const modal = document.getElementById('commentModal');
    const title = document.getElementById('commentModalTitle');
    const nameInput = document.getElementById('commentAuthorName');

    title.textContent = `${meta.studentName} · ${meta.title}`;
    nameInput.value = getSavedName();

    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    if (commentRef && commentHandler) {
      commentRef.off('value', commentHandler);
    }

    ensureSimDoc(meta).then(() => {
      commentRef = simRef(meta.simId).child('comments');
      commentHandler = (snap) => renderComments(snap);
      commentRef.on('value', commentHandler);
    });
  }

  function closeCommentModal() {
    const modal = document.getElementById('commentModal');
    modal.hidden = true;
    document.body.style.overflow = '';
    modalSim = null;
    if (commentRef && commentHandler) {
      commentRef.off('value', commentHandler);
      commentRef = null;
      commentHandler = null;
    }
  }

  async function submitComment() {
    if (!modalSim || !ready) return;

    const nameInput = document.getElementById('commentAuthorName');
    const bodyInput = document.getElementById('commentBody');
    const name = nameInput.value.trim();
    const body = bodyInput.value.trim();

    const nameError = validateName(name);
    if (nameError) {
      alert(nameError);
      nameInput.focus();
      return;
    }
    if (!body) {
      alert('댓글 내용을 입력해 주세요.');
      bodyInput.focus();
      return;
    }
    if (body.length > 500) {
      alert('댓글은 500자 이내로 작성해 주세요.');
      return;
    }

    try {
      const ref = await ensureSimDoc(modalSim);
      await ref.child('comments').push({
        authorName: name,
        body,
        createdAt: Date.now(),
      });
      saveName(name);
      bodyInput.value = '';
    } catch (err) {
      console.error(err);
      alert('댓글 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  function bindCard(card, meta) {
    card.dataset.simId = meta.simId;

    const likeBtn = card.querySelector('.card__like-btn');
    const commentBtn = card.querySelector('.card__comment-btn');

    likeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(meta);
    });

    commentBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      openCommentModal(meta);
    });

    if (ready) subscribeSim(meta.simId);
  }

  function setupModal() {
    document.getElementById('commentModalClose')?.addEventListener('click', closeCommentModal);
    document.getElementById('commentModalBackdrop')?.addEventListener('click', closeCommentModal);
    document.getElementById('commentSubmit')?.addEventListener('click', submitComment);

    document.getElementById('commentBody')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCommentModal();
    });
  }

  function init() {
    initFirebase();
    setupModal();

    if (!ready) {
      console.info('Firebase 미설정 — 좋아요/댓글 UI는 표시되지만 저장은 비활성화됩니다.');
    }
  }

  function createMeta(student, sim) {
    return {
      simId: getSimId(sim.path),
      path: sim.path,
      title: sim.title,
      studentName: student.studentName,
      studentId: student.studentId,
    };
  }

  return { init, bindCard, createMeta, getSimId, isConfigured, ready: () => ready };
})();
