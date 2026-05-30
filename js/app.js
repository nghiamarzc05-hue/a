// =========================================
// FILE: app.js - FIX LỖI DATA (CHUẨN 100%)
// =========================================

let allDecks = [];
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = [];
let currentStreak = 0;
let DOM = {};
let englishVoice = null;
const audioCache = {};

let studyMode = null;
let autoTimer = null;
let autoSpeed = 3000;
let autoPhase = 'front';
let autoPaused = false;
let currentModeToStart = 'manual';
let sessionConfig = { includeNew: true, includeReview: false, shuffle: true, autoPronounce: true, cardCount: 20, speed: 3 };
let sessionStart = null;
let sessionKnown = 0;
let sessionUnknown = 0;

function initVoices() {
    if (!('speechSynthesis' in window)) return;
    const findVoice = () => {
        let voices = window.speechSynthesis.getVoices();
        englishVoice = voices.find(v => v.lang.includes('en-US') && (v.name.includes('Google') || v.name.includes('Samantha'))) || 
                       voices.find(v => v.lang.startsWith('en-US')) || 
                       voices.find(v => v.lang.startsWith('en'));
    };
    findVoice();
    window.speechSynthesis.onvoiceschanged = findVoice;
}

async function playWordSound() {
    if (!currentDeck || !currentDeck.items || !currentDeck.items[currentCardIndex]) return;
    const text = currentDeck.items[currentCardIndex].term;

    if (text in audioCache) {
        audioCache[text] ? playAudioUrl(audioCache[text]) : speakWithTTS(text);
        return;
    }

    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        let url = null;
        for (const entry of data) {
            for (const p of (entry.phonetics || [])) {
                if (p.audio) {
                    if (!url || p.audio.includes('-us')) url = p.audio;
                    if (p.audio.includes('-us')) break;
                }
            }
            if (url && url.includes('-us')) break;
        }
        if (url && url.startsWith('//')) url = 'https:' + url;

        audioCache[text] = url || null;
        url ? playAudioUrl(url) : speakWithTTS(text);
    } catch {
        audioCache[text] = null;
        speakWithTTS(text);
    }
}

function playAudioUrl(url) {
    const audio = new Audio(url);
    audio.play().catch(() => speakWithTTS(currentDeck?.items[currentCardIndex]?.term));
}

function speakWithTTS(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    if (englishVoice) utterance.voice = englishVoice;
    setTimeout(() => window.speechSynthesis.speak(utterance), 50);
}

function checkStreak() {
    const today = new Date().toDateString(); 
    let lastDate = localStorage.getItem('lastStudyDate');
    currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;
    
    if (lastDate) {
        const diff = Math.ceil(Math.abs(new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
        if (diff > 1) { currentStreak = 0; localStorage.setItem('currentStreak', 0); }
    }
    if(DOM.statStreak) DOM.statStreak.innerText = `${currentStreak} ngày`;
}

function noiLua() {
    const today = new Date().toDateString();
    if (localStorage.getItem('lastStudyDate') !== today) {
        currentStreak++;
        localStorage.setItem('currentStreak', currentStreak);
        localStorage.setItem('lastStudyDate', today);
        if(DOM.statStreak) DOM.statStreak.innerText = `${currentStreak} ngày`;
        if (typeof confetti !== 'undefined') {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#4255FF', '#23B26D', '#FFCD1F', '#FF725B'] });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try { masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || []; } catch (e) { masteredCards = []; }
    initDOM();
    initVoices();
    setupTheme();
    checkStreak();
    loadSRS();
    mergeData();
    setupNavigation();
    setupEventListeners();
    setupReviewListeners();
    updateDashboardStats();
    renderContinueLearning();
    setupLibraryListeners();
    setupSettingsListeners();
    if (DOM.quickLearnBtn) DOM.quickLearnBtn.addEventListener('click', () => document.querySelector('[data-view="library"]')?.click());
    if (DOM.quickReviewBtn) DOM.quickReviewBtn.addEventListener('click', () => document.querySelector('[data-view="review"]')?.click());
    if (DOM.focusNewBtn) DOM.focusNewBtn.addEventListener('click', () => document.querySelector('[data-view="library"]')?.click());
    if (DOM.focusReviewFocusBtn) DOM.focusReviewFocusBtn.addEventListener('click', () => document.querySelector('[data-view="review"]')?.click());
});

function initDOM() {
    DOM = {
        views: document.querySelectorAll('.view-section'),
        navItems: document.querySelectorAll('.nav-item, .sidebar-nav .nav-item'),
        flashcard: document.getElementById('flashcard'),
        cardWord: document.getElementById('cardWord'),
        cardIpa: document.getElementById('cardIpa'),
        cardMeaning: document.getElementById('cardMeaning'),
        cardExampleEn: document.getElementById('cardExampleEn'),
        cardExampleVi: document.getElementById('cardExampleVi'),
        cardPos: document.getElementById('cardPos'),
        cardCounter: document.getElementById('cardCounter'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        speakBtn: document.getElementById('speakBtn'),
        masterBtn: document.getElementById('masterBtn'),
        notMasteredBtn: document.getElementById('notMasteredBtn'),
        continueCard: document.getElementById('continueCard'),
        continueDeckName: document.getElementById('continueDeckName'),
        continueDeckMeta: document.getElementById('continueDeckMeta'),
        continueBtn: document.getElementById('continueBtn'),
        quickLearnBtn: document.getElementById('quickLearnBtn'),
        quickReviewBtn: document.getElementById('quickReviewBtn'),
        focusNewCount: document.getElementById('focusNewCount'),
        focusReviewCount: document.getElementById('focusReviewCount'),
        focusNewBtn: document.getElementById('focusNewBtn'),
        focusReviewFocusBtn: document.getElementById('focusReviewFocusBtn'),
        learnModePicker: document.getElementById('learnModePicker'),
        learnDeckBanner: document.getElementById('learnDeckBanner'),
        learnNoDeck: document.getElementById('learnNoDeck'),
        learnModeCards: document.getElementById('learnModeCards'),
        learnDeckChipName: document.getElementById('learnDeckChipName'),
        studyContainer: document.getElementById('studyContainer'),
        studyModeBadge: document.getElementById('studyModeBadge'),
        manualControls: document.getElementById('manualControls'),
        autoControls: document.getElementById('autoControls'),
        autoFill: document.getElementById('autoFill'),
        autoPauseBtn: document.getElementById('autoPauseBtn'),
        autoSlowBtn: document.getElementById('autoSlowBtn'),
        autoFastBtn: document.getElementById('autoFastBtn'),
        cardHint: document.getElementById('cardHint'),
        statTotalDecks: document.getElementById('statTotalDecks'),
        statTotalWords: document.getElementById('statTotalWords'),
        statMastered: document.getElementById('statMastered'),
        statProgress: document.getElementById('statProgress'),
        statStreak: document.getElementById('statStreak'),
        resetStatsBtn: document.getElementById('resetStatsBtn'),
        themeSwitch: document.getElementById('themeSwitch'),
        viewTitle: document.getElementById('viewTitle')
    };
}

function setupTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (DOM.themeSwitch) DOM.themeSwitch.checked = (theme === 'dark');
}

// KHẮC PHỤC TRIỆT ĐỂ LỖI MẤT DỮ LIỆU Ở ĐÂY
function mergeData() {
    allDecks = [];
    let misses = 0;
    for (let i = 1; i <= 100; i++) {
        try {
            const deckData = eval(`group_${i}_decks`);
            if (Array.isArray(deckData)) { allDecks = allDecks.concat(deckData); misses = 0; }
            else misses++;
        } catch { misses++; }
        if (misses >= 3) break;
    }
    allDecks = allDecks.concat(getUserDecks());
}

function renderDeckList(data, target) {
    if (!target) return; 
    target.innerHTML = '';
    
    // Nếu chưa load được dữ liệu nào, báo ra màn hình
    if (data.length === 0) {
        target.innerHTML = '<p style="color: var(--text-muted); padding: 10px;">Đang tải dữ liệu bài học...</p>';
        return;
    }

    data.forEach(deck => {
        const li = document.createElement('li');
        li.className = 'deck-item';
        let total = deck.items ? deck.items.length : 0;
        li.innerHTML = `<div class="deck-info"><strong>${deck.ten}</strong><span class="deck-meta">${total} từ vựng</span></div><i class="fa-solid fa-chevron-right" style="color: var(--text-muted);"></i>`;
        li.addEventListener('click', () => loadDeck(deck));
        target.appendChild(li);
    });
}

function setupNavigation() {
    DOM.navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const v = e.currentTarget.getAttribute('data-view');
            DOM.navItems.forEach(b => b.classList.remove('active'));
            DOM.views.forEach(view => view.classList.remove('active'));
            document.querySelectorAll(`[data-view="${v}"]`).forEach(b => b.classList.add('active'));
            const viewEl = document.getElementById(v + 'View');
            if (viewEl) viewEl.classList.add('active');
            
            if (DOM.viewTitle) {
                const titles = { 'dashboard': 'Home', 'study': 'Learn', 'review': 'Review', 'library': 'Library', 'settings': 'Settings' };
                DOM.viewTitle.innerText = titles[v] || 'Flashcards';
            }
            if (v === 'library') openLibListView();
            if (v === 'study') {
                stopAuto();
                if (DOM.studyContainer) DOM.studyContainer.style.display = 'none';
                const sessionResults = document.getElementById('sessionResults');
                if (sessionResults) sessionResults.style.display = 'none';
                const cfgPanel = document.getElementById('learnConfigPanel');
                if (cfgPanel) cfgPanel.style.display = 'none';
                if (DOM.learnModePicker) DOM.learnModePicker.style.display = 'block';
                updateLearnModePicker();
            }
            if (v === 'review') renderReviewView();
        });
    });
}

// ─── LIBRARY ──────────────────────────────────────────────────────────────

let viewingDeck = null;

function getUserDecks() {
    try { return JSON.parse(localStorage.getItem('userDecks')) || []; } catch { return []; }
}
function saveUserDecks(decks) { localStorage.setItem('userDecks', JSON.stringify(decks)); }

function openLibListView() {
    document.getElementById('libListView').style.display = 'block';
    document.getElementById('libDetailView').style.display = 'none';
    document.getElementById('libCreateView').style.display = 'none';
    renderLibraryList(allDecks);
}

function openLibDetailView(deck) {
    viewingDeck = deck;
    document.getElementById('libListView').style.display = 'none';
    document.getElementById('libDetailView').style.display = 'block';
    document.getElementById('libCreateView').style.display = 'none';
    renderLibDetail();
}

function openLibCreateView() {
    document.getElementById('libListView').style.display = 'none';
    document.getElementById('libDetailView').style.display = 'none';
    document.getElementById('libCreateView').style.display = 'block';
    document.getElementById('newDeckNameInput').value = '';
    document.getElementById('newWordRows').innerHTML = '';
    addNewWordRow();
}

function renderLibraryList(data) {
    const target = document.getElementById('libraryList');
    if (!target) return;
    target.innerHTML = '';
    if (!data.length) {
        target.innerHTML = '<p style="color:var(--text-muted);padding:20px 0">No decks found.</p>';
        return;
    }
    data.forEach(deck => {
        const total = deck.items ? deck.items.length : 0;
        const learned = deck.items ? deck.items.filter(it => masteredCards.includes(it.id)).length : 0;
        const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
        const unlearned = total - learned;
        const isUser = getUserDecks().some(d => d.id === deck.id);
        const li = document.createElement('li');
        li.className = 'deck-item';
        li.innerHTML = `
            <div class="deck-info" style="flex:1">
                <strong>${deck.ten}</strong>
                <div style="display:flex;gap:8px;align-items:center;margin-top:3px">
                    <span class="deck-meta">${total} words</span>
                    <span class="deck-unlearned">${unlearned > 0 ? unlearned + ' unlearned' : '✓ Complete'}</span>
                </div>
                <div class="deck-progress-bar"><div class="deck-progress-fill" style="width:${pct}%"></div></div>
            </div>
            ${isUser ? '<span style="font-size:0.7rem;color:var(--text-muted);margin-right:8px">MY</span>' : ''}
            <i class="fa-solid fa-chevron-right" style="color:var(--text-muted)"></i>`;
        li.addEventListener('click', () => openLibDetailView(deck));
        target.appendChild(li);
    });
}

function renderLibDetail() {
    if (!viewingDeck) return;
    document.getElementById('libDetailTitle').innerText = viewingDeck.ten;
    const items = viewingDeck.items || [];
    const total = items.length;
    const learned = items.filter(it => masteredCards.includes(it.id)).length;
    const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
    document.getElementById('libDetailTotal').innerText = `${total} words`;
    document.getElementById('libDetailPct').innerText = `${pct}% learned`;
    document.getElementById('libProgressFill').style.width = pct + '%';
    const isUser = getUserDecks().some(d => d.id === viewingDeck.id);
    document.getElementById('libDeleteBtn').style.display = isUser ? 'flex' : 'none';
    renderWordList();
}

function renderWordList() {
    if (!viewingDeck) return;
    const search = document.getElementById('libWordSearch')?.value.toLowerCase().trim() || '';
    const filter = document.getElementById('libFilterSel')?.value || 'all';
    const sort   = document.getElementById('libSortSel')?.value || 'default';
    let items = [...(viewingDeck.items || [])];
    if (filter === 'new')     items = items.filter(it => !masteredCards.includes(it.id));
    if (filter === 'learned') items = items.filter(it =>  masteredCards.includes(it.id));
    if (search) items = items.filter(it =>
        (it.term||'').toLowerCase().includes(search) ||
        (it.meaning_vi||'').toLowerCase().includes(search));
    if (sort === 'az') items.sort((a,b) => (a.term||'').localeCompare(b.term));
    if (sort === 'za') items.sort((a,b) => (b.term||'').localeCompare(a.term));
    const ul = document.getElementById('libWordList');
    if (!ul) return;
    ul.innerHTML = '';
    if (!items.length) { ul.innerHTML = '<p style="color:var(--text-muted);padding:12px 0">No words found.</p>'; return; }
    items.forEach(it => {
        const isLearned = masteredCards.includes(it.id);
        const li = document.createElement('li');
        li.className = 'word-item' + (isLearned ? ' is-learned' : '');
        li.innerHTML = `
            <div class="word-left">
                <span class="word-term">${it.term||''}</span>
                <span class="word-ipa">${it.ipa||''}</span>
            </div>
            <div class="word-right">
                <span class="word-meaning">${it.meaning_vi||''}</span>
                <span class="word-badge ${isLearned ? 'learned' : 'new'}">${isLearned ? '✓ Known' : 'New'}</span>
            </div>`;
        ul.appendChild(li);
    });
}

function deleteUserDeck(deckId) {
    if (!confirm('Delete this deck?')) return;
    const decks = getUserDecks().filter(d => d.id !== deckId);
    saveUserDecks(decks);
    mergeData();
    updateDashboardStats();
    openLibListView();
}

function createUserDeck(name, wordRows) {
    if (!name.trim()) { alert('Please enter a deck name.'); return; }
    const id = 'user_' + Date.now();
    const items = wordRows.map((r, i) => ({
        id: id + '_' + i,
        term: r[0].trim(), ipa: r[1].trim(),
        meaning_vi: r[2].trim(), example: r[3].trim(), example_vi: ''
    })).filter(it => it.term);
    if (!items.length) { alert('Add at least one word.'); return; }
    const deck = { id, ten: name.trim(), items };
    const decks = getUserDecks();
    decks.push(deck);
    saveUserDecks(decks);
    mergeData();
    updateDashboardStats();
    openLibDetailView(deck);
}

function exportDeckCSV(deck) {
    const rows = [['term','ipa','meaning_vi','example']];
    (deck.items || []).forEach(it => rows.push([it.term||'', it.ipa||'', it.meaning_vi||'', it.example||'']));
    const csv = rows.map(r => r.map(c => `"${(c+'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = (deck.ten || 'deck') + '.csv';
    a.click();
}

function importCSV(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const lines = e.target.result.split('\n').filter(l => l.trim());
        if (!lines.length) return;
        const start = lines[0].toLowerCase().includes('term') ? 1 : 0;
        const items = lines.slice(start).map((line, i) => {
            const cols = line.split(',').map(c => c.replace(/^"|"$/g,'').replace(/""/g,'"').trim());
            return { id: 'csv_' + Date.now() + '_' + i, term: cols[0]||'', ipa: cols[1]||'', meaning_vi: cols[2]||'', example: cols[3]||'', example_vi: '' };
        }).filter(it => it.term);
        if (!items.length) { alert('No valid words found in CSV.'); return; }
        const name = file.name.replace('.csv','') || 'Imported Deck';
        const deck = { id: 'user_csv_' + Date.now(), ten: name, items };
        const decks = getUserDecks();
        decks.push(deck);
        saveUserDecks(decks);
        mergeData();
        updateDashboardStats();
        openLibDetailView(deck);
    };
    reader.readAsText(file);
}

function addNewWordRow() {
    const container = document.getElementById('newWordRows');
    const div = document.createElement('div');
    div.className = 'new-word-row';
    div.innerHTML = `
        <input placeholder="Word" class="word-input">
        <input placeholder="/ipa/" class="word-input">
        <input placeholder="Meaning" class="word-input">
        <input placeholder="Example" class="word-input">
        <button class="remove-word-btn" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(div);
}

function setupLibraryListeners() {
    document.getElementById('libDetailBack')?.addEventListener('click', openLibListView);
    document.getElementById('libCreateBack')?.addEventListener('click', openLibListView);
    document.getElementById('libNewDeckBtn')?.addEventListener('click', openLibCreateView);

    document.getElementById('libStudyBtn')?.addEventListener('click', () => {
        if (viewingDeck) { loadDeck(viewingDeck); }
    });
    document.getElementById('libDeleteBtn')?.addEventListener('click', () => {
        if (viewingDeck) deleteUserDeck(viewingDeck.id);
    });
    document.getElementById('libExportBtn')?.addEventListener('click', () => {
        if (viewingDeck) exportDeckCSV(viewingDeck);
    });
    document.getElementById('libAddWordBtn')?.addEventListener('click', addNewWordRow);
    document.getElementById('libSaveDeckBtn')?.addEventListener('click', () => {
        const name = document.getElementById('newDeckNameInput').value;
        const rows = [...document.querySelectorAll('.new-word-row')].map(row =>
            [...row.querySelectorAll('.word-input')].map(i => i.value));
        createUserDeck(name, rows);
    });
    document.getElementById('libImportBtn')?.addEventListener('click', () =>
        document.getElementById('libCsvInput').click());
    document.getElementById('libCsvInput')?.addEventListener('change', e => {
        if (e.target.files[0]) { importCSV(e.target.files[0]); e.target.value = ''; }
    });
    document.getElementById('libWordSearch')?.addEventListener('input', renderWordList);
    document.getElementById('libFilterSel')?.addEventListener('change', renderWordList);
    document.getElementById('libSortSel')?.addEventListener('change', renderWordList);
    document.getElementById('searchInput')?.addEventListener('input', e => {
        const kw = e.target.value.toLowerCase().trim();
        renderLibraryList(allDecks.filter(d => d.ten.toLowerCase().includes(kw)));
    });
}

// ─────────────────────────────────────────────────────────────────────────────

function loadDeck(deck) {
    currentDeck = deck;
    currentCardIndex = 0;
    if (deck.id !== '__review__') localStorage.setItem('lastDeckId', deck.id);
    stopAuto();
    DOM.navItems.forEach(b => b.classList.remove('active'));
    DOM.views.forEach(view => view.classList.remove('active'));
    document.querySelectorAll('[data-view="study"]').forEach(b => b.classList.add('active'));
    const studyView = document.getElementById('studyView');
    if (studyView) studyView.classList.add('active');
    if (DOM.studyContainer) DOM.studyContainer.style.display = 'none';
    if (DOM.learnModePicker) DOM.learnModePicker.style.display = 'block';
    if (DOM.viewTitle) DOM.viewTitle.innerText = 'Learn';
    updateLearnModePicker();
    renderContinueLearning();
}

function updateLearnModePicker() {
    if (!DOM.learnModePicker) return;
    const hasDeck = !!currentDeck;
    if (DOM.learnNoDeck) DOM.learnNoDeck.style.display = hasDeck ? 'none' : 'block';
    if (DOM.learnDeckBanner) DOM.learnDeckBanner.style.display = hasDeck ? 'block' : 'none';
    if (DOM.learnDeckChipName && currentDeck) DOM.learnDeckChipName.innerText = currentDeck.ten;
    if (DOM.learnModeCards) DOM.learnModeCards.style.display = hasDeck ? 'block' : 'none';
    const qms = document.getElementById('quickModesSection');
    if (qms) qms.style.display = hasDeck ? 'block' : 'none';
    if (hasDeck) updateQuickModeCounts();
    else renderLearnDeckList(allDecks);
}

function renderLearnDeckList(data) {
    const ul = document.getElementById('learnDeckList');
    if (!ul) return;
    ul.innerHTML = '';
    data.forEach(deck => {
        const total = deck.items ? deck.items.length : 0;
        const learned = deck.items ? deck.items.filter(it => masteredCards.includes(it.id)).length : 0;
        const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
        const li = document.createElement('li');
        li.className = 'deck-item';
        li.innerHTML = `
            <div class="deck-info" style="flex:1">
                <strong>${deck.ten}</strong>
                <span class="deck-meta">${total} words · ${pct}%</span>
            </div>
            <i class="fa-solid fa-chevron-right" style="color:var(--text-muted);font-size:0.8rem"></i>`;
        li.addEventListener('click', () => {
            currentDeck = deck;
            currentCardIndex = 0;
            if (deck.id !== '__review__') localStorage.setItem('lastDeckId', deck.id);
            updateLearnModePicker();
            renderContinueLearning();
        });
        ul.appendChild(li);
    });
}

function updateQuickModeCounts() {
    if (!currentDeck) return;
    const items = currentDeck.items || [];
    const newCount = items.filter(it => !masteredCards.includes(it.id)).length;
    const revCount = items.filter(it => masteredCards.includes(it.id)).length;
    const qmNew = document.getElementById('qmNewCount');
    const qmRev = document.getElementById('qmReviewCount');
    if (qmNew) qmNew.innerText = `${newCount} words`;
    if (qmRev) qmRev.innerText = `${revCount} words`;
}

function openConfigPanel(mode, preConfig) {
    currentModeToStart = mode;
    if (preConfig) Object.assign(sessionConfig, preConfig);
    if (DOM.learnModePicker) DOM.learnModePicker.style.display = 'none';
    const panel = document.getElementById('learnConfigPanel');
    if (!panel) return;
    panel.style.display = 'block';
    const badge = document.getElementById('cfgModeBadge');
    if (badge) badge.innerText = mode === 'auto' ? 'Auto' : 'Manual';
    const deckName = document.getElementById('cfgDeckName');
    if (deckName) deckName.innerText = currentDeck ? currentDeck.ten : '-';
    const speedRow = document.getElementById('cfgSpeedRow');
    if (speedRow) speedRow.style.display = mode === 'auto' ? 'flex' : 'none';
    const autoPronRow = document.getElementById('cfgAutoPronounceRow');
    if (autoPronRow) autoPronRow.style.display = mode === 'auto' ? 'flex' : 'none';
    // Sync checkboxes
    const el = id => document.getElementById(id);
    if (el('cfgIncludeNew')) el('cfgIncludeNew').checked = sessionConfig.includeNew;
    if (el('cfgIncludeReview')) el('cfgIncludeReview').checked = sessionConfig.includeReview;
    if (el('cfgShuffle')) el('cfgShuffle').checked = sessionConfig.shuffle;
    if (el('cfgAutoPronounce')) el('cfgAutoPronounce').checked = sessionConfig.autoPronounce;
    if (el('cfgCardsVal')) el('cfgCardsVal').innerText = sessionConfig.cardCount;
    if (el('cfgSpeedVal')) el('cfgSpeedVal').innerText = sessionConfig.speed + 's';
}

function buildSessionDeck(baseDeck) {
    let items = [...(baseDeck.items || [])];
    if (sessionConfig.includeNew && !sessionConfig.includeReview)
        items = items.filter(it => !masteredCards.includes(it.id));
    else if (sessionConfig.includeReview && !sessionConfig.includeNew)
        items = items.filter(it => masteredCards.includes(it.id));
    if (items.length === 0) items = [...(baseDeck.items || [])];
    if (sessionConfig.shuffle) items = items.sort(() => Math.random() - 0.5);
    const count = Math.min(sessionConfig.cardCount, items.length);
    return { ...baseDeck, items: items.slice(0, count) };
}

function startSessionFromConfig() {
    if (!currentDeck) return;
    const el = id => document.getElementById(id);
    sessionConfig.includeNew = el('cfgIncludeNew')?.checked ?? true;
    sessionConfig.includeReview = el('cfgIncludeReview')?.checked ?? false;
    sessionConfig.shuffle = el('cfgShuffle')?.checked ?? true;
    sessionConfig.autoPronounce = el('cfgAutoPronounce')?.checked ?? true;
    autoSpeed = sessionConfig.speed * 1000;
    const sessionDeck = buildSessionDeck(currentDeck);
    currentDeck = sessionDeck;
    currentCardIndex = 0;
    sessionStart = Date.now();
    sessionKnown = 0;
    sessionUnknown = 0;
    el('learnConfigPanel').style.display = 'none';
    showStudyArea(currentModeToStart);
}

function showSessionResults() {
    stopAuto();
    studyMode = null;
    if (DOM.studyContainer) DOM.studyContainer.style.display = 'none';
    const panel = document.getElementById('sessionResults');
    if (!panel) return;
    panel.style.display = 'block';
    const elapsed = sessionStart ? Math.round((Date.now() - sessionStart) / 1000) : 0;
    const total = sessionKnown + sessionUnknown;
    const rate = total > 0 ? Math.round((sessionKnown / total) * 100) : 0;
    const m = Math.floor(elapsed / 60), s = elapsed % 60;
    const el = id => document.getElementById(id);
    if (el('resCards')) el('resCards').innerText = currentDeck?.items?.length ?? 0;
    if (el('resKnown')) el('resKnown').innerText = sessionKnown;
    if (el('resUnknown')) el('resUnknown').innerText = sessionUnknown;
    if (el('resRate')) el('resRate').innerText = rate + '%';
    if (el('resTime')) el('resTime').innerText = `${m}:${s.toString().padStart(2,'0')}`;
    if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 80 });
}

function showStudyArea(mode) {
    studyMode = mode;
    if (DOM.learnModePicker) DOM.learnModePicker.style.display = 'none';
    if (DOM.studyContainer) DOM.studyContainer.style.display = 'block';
    if (DOM.studyModeBadge) DOM.studyModeBadge.innerText = mode === 'auto' ? 'Auto' : 'Manual';
    if (DOM.manualControls) DOM.manualControls.style.display = mode === 'manual' ? 'flex' : 'none';
    if (DOM.autoControls) DOM.autoControls.style.display = mode === 'auto' ? 'flex' : 'none';
    if (DOM.cardHint) DOM.cardHint.style.display = mode === 'auto' ? 'none' : 'block';
    if (DOM.flashcard) DOM.flashcard.style.pointerEvents = mode === 'auto' ? 'none' : '';
    showCard();
    if (mode === 'auto') startAutoMode();
}

function backToModePicker() {
    stopAuto();
    studyMode = null;
    if (DOM.studyContainer) DOM.studyContainer.style.display = 'none';
    const sessionResults = document.getElementById('sessionResults');
    if (sessionResults) sessionResults.style.display = 'none';
    const cfgPanel = document.getElementById('learnConfigPanel');
    if (cfgPanel) cfgPanel.style.display = 'none';
    if (DOM.learnModePicker) DOM.learnModePicker.style.display = 'block';
    if (DOM.flashcard) { DOM.flashcard.classList.remove('is-flipped'); DOM.flashcard.style.pointerEvents = ''; }
    isFlipped = false;
}

function startAutoMode() {
    autoPaused = false;
    autoPhase = 'front';
    if (DOM.flashcard) DOM.flashcard.classList.remove('is-flipped');
    isFlipped = false;
    playWordSound();
    tickAutoProgress();
    autoTimer = setTimeout(autoTick, autoSpeed);
}

function autoTick() {
    if (autoPaused) return;
    if (autoPhase === 'front') {
        autoPhase = 'back';
        if (DOM.flashcard) DOM.flashcard.classList.add('is-flipped');
        isFlipped = true;
        tickAutoProgress();
        autoTimer = setTimeout(autoTick, autoSpeed);
    } else {
        autoPhase = 'front';
        if (currentDeck) {
            currentCardIndex = currentCardIndex < currentDeck.items.length - 1 ? currentCardIndex + 1 : 0;
        }
        showCard();
        if (DOM.flashcard) DOM.flashcard.classList.remove('is-flipped');
        isFlipped = false;
        playWordSound();
        tickAutoProgress();
        autoTimer = setTimeout(autoTick, autoSpeed);
    }
}

function tickAutoProgress() {
    const fill = DOM.autoFill;
    if (!fill) return;
    fill.style.transition = 'none';
    fill.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.transition = `width ${autoSpeed}ms linear`;
        fill.style.width = '100%';
    }));
}

function stopAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    autoPaused = false;
    if (DOM.autoFill) { DOM.autoFill.style.transition = 'none'; DOM.autoFill.style.width = '0%'; }
    if (DOM.autoPauseBtn) DOM.autoPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
}

function toggleAutoPause() {
    autoPaused = !autoPaused;
    if (DOM.autoPauseBtn) DOM.autoPauseBtn.innerHTML = autoPaused
        ? '<i class="fa-solid fa-play"></i>'
        : '<i class="fa-solid fa-pause"></i>';
    if (!autoPaused) {
        tickAutoProgress();
        autoTimer = setTimeout(autoTick, autoSpeed);
    } else {
        if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
        if (DOM.autoFill) {
            const w = getComputedStyle(DOM.autoFill).width;
            DOM.autoFill.style.transition = 'none';
            DOM.autoFill.style.width = w;
        }
    }
}

// ─── REVIEW / SRS ─────────────────────────────────────────────────────────

let srsData = {};
let favoriteWords = [];
let todayStats = { date: '', reviewed: 0, correct: 0 };
let reviewQueue = [];
let reviewQueueIndex = 0;
let reviewSessionCorrect = 0;

function loadSRS() {
    try { srsData = JSON.parse(localStorage.getItem('srsData')) || {}; } catch { srsData = {}; }
    try { favoriteWords = JSON.parse(localStorage.getItem('favoriteWords')) || []; } catch { favoriteWords = []; }
    try {
        const saved = JSON.parse(localStorage.getItem('todayStats'));
        const today = new Date().toDateString();
        todayStats = (saved && saved.date === today) ? saved : { date: today, reviewed: 0, correct: 0 };
    } catch { todayStats = { date: new Date().toDateString(), reviewed: 0, correct: 0 }; }
}

function saveSRS() { localStorage.setItem('srsData', JSON.stringify(srsData)); }
function saveFavorites() { localStorage.setItem('favoriteWords', JSON.stringify(favoriteWords)); }
function saveTodayStats() { localStorage.setItem('todayStats', JSON.stringify(todayStats)); }

function srsRate(cardId, quality) {
    let d = srsData[cardId] || { interval: 1, easeFactor: 2.5, repetitions: 0, lapses: 0 };
    if (quality === 1) {        // Again
        d.interval = 1; d.lapses++; d.repetitions = 0;
        d.easeFactor = Math.max(1.3, d.easeFactor - 0.2);
    } else if (quality === 2) { // Hard
        d.interval = Math.max(1, Math.round(d.interval * 1.2));
        d.easeFactor = Math.max(1.3, d.easeFactor - 0.15);
    } else if (quality === 3) { // Good
        d.interval = d.repetitions === 0 ? 1 : d.repetitions === 1 ? 6 : Math.round(d.interval * d.easeFactor);
        d.repetitions++;
    } else {                    // Easy
        d.interval = d.repetitions === 0 ? 4 : Math.round(d.interval * d.easeFactor * 1.3);
        d.easeFactor = Math.min(2.5, d.easeFactor + 0.15);
        d.repetitions++;
    }
    d.nextReview = Date.now() + d.interval * 86400000;
    srsData[cardId] = d;
    saveSRS();
}

function initSRSForCard(cardId) {
    if (!srsData[cardId]) {
        srsData[cardId] = { interval: 1, easeFactor: 2.5, repetitions: 1, lapses: 0, nextReview: Date.now() + 86400000 };
        saveSRS();
    }
}

function getAllCards() {
    const cards = [];
    allDecks.forEach(d => { if (d && d.items) d.items.forEach(it => cards.push({ ...it, _deck: d.ten })); });
    return cards;
}

function getDueCards() {
    const now = Date.now();
    return getAllCards().filter(it => {
        const s = srsData[it.id];
        if (!s) return masteredCards.includes(it.id); // mastered but never SRS'd = due
        return s.nextReview <= now;
    });
}

function getDifficultCards() {
    return getAllCards().filter(it => (srsData[it.id]?.lapses || 0) >= 2);
}

function getForgottenCards() {
    return getAllCards().filter(it => (srsData[it.id]?.lapses || 0) >= 3);
}

function getFavoriteCards() {
    return getAllCards().filter(it => favoriteWords.includes(it.id));
}

function toggleFavorite(cardId, btn) {
    const idx = favoriteWords.indexOf(cardId);
    if (idx > -1) favoriteWords.splice(idx, 1);
    else favoriteWords.push(cardId);
    saveFavorites();
    if (btn) btn.className = 'study-fav-btn' + (favoriteWords.includes(cardId) ? ' active' : '');
    updateReviewDashboard();
}

function updateReviewDashboard() {
    const due = getDueCards();
    const difficult = getDifficultCards();
    const forgotten = getForgottenCards();
    const favorites = getFavoriteCards();
    const el = id => document.getElementById(id);
    if (el('revDueCount'))      el('revDueCount').innerText      = due.length;
    if (el('revDifficultCount'))el('revDifficultCount').innerText= difficult.length;
    if (el('revMasteredCount')) el('revMasteredCount').innerText = masteredCards.length;
    if (el('revDueLabel'))      el('revDueLabel').innerText      = due.length + ' words';
    if (el('revDifficultLabel'))el('revDifficultLabel').innerText= difficult.length + ' words';
    if (el('revForgottenLabel'))el('revForgottenLabel').innerText= forgotten.length + ' words';
    if (el('revFavoritesLabel'))el('revFavoritesLabel').innerText= favorites.length + ' words';
    if (el('todayReviewed'))    el('todayReviewed').innerText    = todayStats.reviewed;
    if (el('todayAccuracy')) {
        const acc = todayStats.reviewed > 0 ? Math.round((todayStats.correct / todayStats.reviewed) * 100) : null;
        el('todayAccuracy').innerText = acc !== null ? acc + '%' : '—';
    }
}

function startReviewSession(cards) {
    if (!cards.length) { alert('No cards to review!'); return; }
    reviewQueue = cards.sort(() => Math.random() - 0.5);
    reviewQueueIndex = 0;
    reviewSessionCorrect = 0;
    document.getElementById('reviewDashboard').style.display = 'none';
    document.getElementById('reviewComplete').style.display = 'none';
    document.getElementById('reviewSessionView').style.display = 'block';
    showReviewCard();
}

function showReviewCard() {
    const card = reviewQueue[reviewQueueIndex];
    if (!card) { showReviewComplete(); return; }
    const el = id => document.getElementById(id);
    el('revQueueBadge').innerText = `${reviewQueueIndex + 1} / ${reviewQueue.length}`;
    el('revWord').innerText   = card.term || '';
    el('revIpa').innerText    = card.ipa  || '';
    el('revCardDeck').innerText = card._deck || '';
    el('revWordBack').innerText = card.term || '';
    el('revMeaning').innerText  = card.meaning_vi || '';
    el('revExample').innerText  = card.example || '';
    el('revFrontPanel').style.display = 'block';
    el('revBackPanel').style.display  = 'none';
    const favBtn = el('revFavBtn');
    if (favBtn) favBtn.className = 'study-fav-btn' + (favoriteWords.includes(card.id) ? ' active' : '');
    if (sessionConfig.autoPronounce) {
        const text = card.term;
        if (text in audioCache) {
            audioCache[text] ? playAudioUrl(audioCache[text]) : speakWithTTS(text);
        } else {
            fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`)
                .then(r => r.ok ? r.json() : null).then(data => {
                    if (!data) { speakWithTTS(text); return; }
                    let url = null;
                    for (const e of data) for (const p of (e.phonetics||[])) if (p.audio) { if (!url || p.audio.includes('-us')) url = p.audio; }
                    if (url && url.startsWith('//')) url = 'https:' + url;
                    audioCache[text] = url || null;
                    url ? playAudioUrl(url) : speakWithTTS(text);
                }).catch(() => speakWithTTS(text));
        }
    }
}

function handleReviewRating(quality) {
    const card = reviewQueue[reviewQueueIndex];
    if (!card) return;
    srsRate(card.id, quality);
    const isCorrect = quality >= 3;
    if (isCorrect) reviewSessionCorrect++;
    todayStats.reviewed++;
    if (isCorrect) todayStats.correct++;
    saveTodayStats();
    if (quality === 1) {
        reviewQueue.push(card); // "Again" → put at end of queue
    }
    reviewQueueIndex++;
    if (reviewQueueIndex >= reviewQueue.length) showReviewComplete();
    else showReviewCard();
}

function showReviewComplete() {
    const total = reviewQueueIndex;
    const acc = total > 0 ? Math.round((reviewSessionCorrect / total) * 100) : 0;
    document.getElementById('reviewSessionView').style.display = 'none';
    document.getElementById('reviewComplete').style.display = 'block';
    document.getElementById('revCompleteTotal').innerText   = total;
    document.getElementById('revCompleteCorrect').innerText = reviewSessionCorrect;
    document.getElementById('revCompleteAcc').innerText     = acc + '%';
    updateReviewDashboard();
    if (typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70 });
}

function renderReviewView() {
    document.getElementById('reviewDashboard').style.display   = 'block';
    document.getElementById('reviewSessionView').style.display = 'none';
    document.getElementById('reviewComplete').style.display    = 'none';
    updateReviewDashboard();
}

function setupSettingsListeners() {
    const el = id => document.getElementById(id);

    // Theme
    if (el('themeSwitch')) el('themeSwitch').addEventListener('change', e => {
        const t = e.target.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('theme', t);
    });

    // Font size
    el('setFontSize')?.addEventListener('change', e => {
        const sizes = { small: '14px', normal: '16px', large: '18px' };
        document.documentElement.style.fontSize = sizes[e.target.value] || '16px';
        localStorage.setItem('fontSize', e.target.value);
    });

    // Auto speed stepper
    const speedEl = el('setSpeedVal');
    el('setSpeedDown')?.addEventListener('click', () => {
        sessionConfig.speed = Math.max(1, sessionConfig.speed - 1);
        autoSpeed = sessionConfig.speed * 1000;
        if (speedEl) speedEl.innerText = sessionConfig.speed + 's';
    });
    el('setSpeedUp')?.addEventListener('click', () => {
        sessionConfig.speed = Math.min(10, sessionConfig.speed + 1);
        autoSpeed = sessionConfig.speed * 1000;
        if (speedEl) speedEl.innerText = sessionConfig.speed + 's';
    });

    // Voice
    el('setVoice')?.addEventListener('change', e => {
        localStorage.setItem('preferredVoice', e.target.value);
    });

    // Export all CSV
    el('setExportCSV')?.addEventListener('click', () => {
        const rows = [['deck','term','ipa','meaning_vi','example']];
        allDecks.forEach(d => (d.items||[]).forEach(it =>
            rows.push([d.ten, it.term||'', it.ipa||'', it.meaning_vi||'', it.example||''])));
        const csv = rows.map(r => r.map(c => `"${(c+'').replace(/"/g,'""')}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = 'flashcards_export.csv'; a.click();
    });

    // Export JSON backup
    el('setExportJSON')?.addEventListener('click', () => {
        const backup = {
            masteredCards, srsData, favoriteWords, todayStats,
            userDecks: getUserDecks(),
            exportDate: new Date().toISOString()
        };
        const a = document.createElement('a');
        a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
        a.download = 'flashcards_backup.json'; a.click();
    });

    // Import JSON
    el('setImportData')?.addEventListener('click', () => el('setImportFile').click());
    el('setImportFile')?.addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.masteredCards) { masteredCards = data.masteredCards; localStorage.setItem('masteredCards', JSON.stringify(masteredCards)); }
                if (data.srsData) { srsData = data.srsData; saveSRS(); }
                if (data.favoriteWords) { favoriteWords = data.favoriteWords; saveFavorites(); }
                if (data.userDecks) { saveUserDecks(data.userDecks); }
                mergeData(); updateDashboardStats();
                alert('Import successful!');
            } catch { alert('Invalid backup file.'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // Reset
    el('resetStatsBtn')?.addEventListener('click', () => {
        if (confirm('Reset ALL progress? This cannot be undone.')) { localStorage.clear(); location.reload(); }
    });

    // Load saved settings
    const savedFont = localStorage.getItem('fontSize');
    if (savedFont && el('setFontSize')) {
        el('setFontSize').value = savedFont;
        const sizes = { small: '14px', normal: '16px', large: '18px' };
        document.documentElement.style.fontSize = sizes[savedFont] || '16px';
    }
    const savedVoice = localStorage.getItem('preferredVoice');
    if (savedVoice && el('setVoice')) el('setVoice').value = savedVoice;
    if (speedEl) speedEl.innerText = sessionConfig.speed + 's';
}

function setupReviewListeners() {
    document.getElementById('startDueReviewBtn')?.addEventListener('click', () => startReviewSession(getDueCards()));
    document.getElementById('revDueBtn')?.addEventListener('click',       () => startReviewSession(getDueCards()));
    document.getElementById('revDifficultBtn')?.addEventListener('click', () => startReviewSession(getDifficultCards()));
    document.getElementById('revForgottenBtn')?.addEventListener('click', () => startReviewSession(getForgottenCards()));
    document.getElementById('revFavoritesBtn')?.addEventListener('click', () => startReviewSession(getFavoriteCards()));
    document.getElementById('revBackBtn')?.addEventListener('click', () => {
        document.getElementById('reviewSessionView').style.display = 'none';
        document.getElementById('reviewDashboard').style.display = 'block';
        updateReviewDashboard();
    });
    document.getElementById('revShowAnswerBtn')?.addEventListener('click', () => {
        document.getElementById('revFrontPanel').style.display = 'none';
        document.getElementById('revBackPanel').style.display  = 'block';
    });
    document.getElementById('revAgain')?.addEventListener('click', () => handleReviewRating(1));
    document.getElementById('revHard')?.addEventListener('click',  () => handleReviewRating(2));
    document.getElementById('revGood')?.addEventListener('click',  () => handleReviewRating(3));
    document.getElementById('revEasy')?.addEventListener('click',  () => handleReviewRating(4));
    document.getElementById('revDoneBtn')?.addEventListener('click', renderReviewView);
    document.getElementById('revFavBtn')?.addEventListener('click', () => {
        const card = reviewQueue[reviewQueueIndex];
        if (card) toggleFavorite(card.id, document.getElementById('revFavBtn'));
    });
}

function renderContinueLearning() {
    const lastId = localStorage.getItem('lastDeckId');
    if (!lastId || !DOM.continueCard) return;
    const deck = allDecks.find(d => d.id === lastId);
    if (!deck) return;
    const total = deck.items ? deck.items.length : 0;
    const mastered = deck.items ? deck.items.filter(it => masteredCards.includes(it.id)).length : 0;
    const left = total - mastered;
    DOM.continueDeckName.innerText = deck.ten;
    DOM.continueDeckMeta.innerText = `${left} thẻ còn lại · ${mastered}/${total} đã thuộc`;
    DOM.continueCard.style.display = 'block';
    DOM.continueBtn.onclick = () => loadDeck(deck);
}

function showCard() {
    if (!currentDeck || !currentDeck.items || currentDeck.items.length === 0) return;
    const item = currentDeck.items[currentCardIndex];
    isFlipped = false; 
    if (DOM.flashcard) DOM.flashcard.classList.remove('is-flipped');
    
    if(DOM.cardWord) DOM.cardWord.innerText = item.term || '';
    if(DOM.cardIpa) DOM.cardIpa.innerText = item.ipa || '';
    if(DOM.cardCounter) DOM.cardCounter.innerText = `${currentCardIndex + 1} / ${currentDeck.items.length}`;
    const favBtn = document.getElementById('studyFavBtn');
    if (favBtn) favBtn.className = 'study-fav-btn' + (favoriteWords.includes(item.id) ? ' active' : '');
    if(DOM.cardPos) DOM.cardPos.innerText = item.pos || 'N/A';
    if(DOM.cardMeaning) DOM.cardMeaning.innerText = item.meaning_vi || '';
    if(DOM.cardExampleEn) DOM.cardExampleEn.innerText = item.example || '';
    if(DOM.cardExampleVi) DOM.cardExampleVi.innerText = item.example_vi || '';
    updateCardStatusUI();
}

function updateCardStatusUI() {
    if (!currentDeck || !currentDeck.items || !currentDeck.items[currentCardIndex]) return;
    const isM = masteredCards.includes(currentDeck.items[currentCardIndex].id);
    if (DOM.masterBtn && DOM.notMasteredBtn) {
        DOM.masterBtn.style.cssText = isM ? 'color:var(--success); border-color:var(--success); background:rgba(35,178,109,0.1)' : '';
        DOM.notMasteredBtn.style.cssText = !isM ? 'color:var(--danger); border-color:var(--danger); background:rgba(255,114,91,0.1)' : '';
    }
}

function setupEventListeners() {
    if (DOM.flashcard) {
        DOM.flashcard.addEventListener('click', (e) => {
            if (e.target.closest('.control-btn') || window.getSelection().toString().length > 0) return;
            DOM.flashcard.classList.toggle('is-flipped');
            isFlipped = !isFlipped;
            playWordSound();
        });
    }

    document.addEventListener('keydown', (e) => {
        const studyView = document.getElementById('studyView');
        if (!studyView || !studyView.classList.contains('active')) return;
        
        if (e.code === 'Space') { 
            e.preventDefault(); 
            if(DOM.flashcard) DOM.flashcard.classList.toggle('is-flipped');
            isFlipped = !isFlipped;
            playWordSound(); 
        } 
        else if (e.key === 'ArrowRight') { if(DOM.nextBtn) DOM.nextBtn.click(); }
        else if (e.key === 'ArrowLeft') { if(DOM.prevBtn) DOM.prevBtn.click(); }
        else if (e.key === 'Enter') { if(DOM.masterBtn) DOM.masterBtn.click(); }
    });

    if(DOM.nextBtn) {
        DOM.nextBtn.addEventListener('click', (e) => {
            e.stopPropagation(); noiLua();
            if (currentDeck && currentCardIndex < currentDeck.items.length - 1) {
                currentCardIndex++;
                showCard();
            } else {
                showSessionResults();
            }
        });
    }

    if(DOM.prevBtn) {
        DOM.prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeck && currentCardIndex > 0) { currentCardIndex--; showCard(); }
        });
    }

    if(DOM.speakBtn) {
        DOM.speakBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            playWordSound(); 
        });
    }

    if(DOM.masterBtn) {
        DOM.masterBtn.addEventListener('click', (e) => {
            e.stopPropagation(); noiLua();
            if(!currentDeck) return;
            const id = currentDeck.items[currentCardIndex].id;
            if (!masteredCards.includes(id)) {
                masteredCards.push(id);
                localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
                updateDashboardStats();
            }
            initSRSForCard(id);
            sessionKnown++;
            updateCardStatusUI();
        });
    }

    if(DOM.notMasteredBtn) {
        DOM.notMasteredBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(!currentDeck) return;
            const id = currentDeck.items[currentCardIndex].id;
            const idx = masteredCards.indexOf(id);
            if (idx > -1) {
                masteredCards.splice(idx, 1);
                localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
                updateDashboardStats();
            }
            sessionUnknown++;
            updateCardStatusUI();
        });
    }

    if(DOM.themeSwitch) {
        DOM.themeSwitch.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    if(DOM.resetStatsBtn) {
        DOM.resetStatsBtn.addEventListener('click', () => {
            if (confirm("Xóa toàn bộ tiến độ học tập và chuỗi ngày?")) { 
                localStorage.clear(); 
                location.reload(); 
            }
        });
    }

    const startManualBtn = document.getElementById('startManualBtn');
    const startAutoBtn = document.getElementById('startAutoBtn');
    const studyBackBtn = document.getElementById('studyBackBtn');

    document.getElementById('learnDeckSearch')?.addEventListener('input', e => {
        const kw = e.target.value.toLowerCase().trim();
        renderLearnDeckList(allDecks.filter(d => d.ten.toLowerCase().includes(kw)));
    });
    document.getElementById('changeDeckBtn')?.addEventListener('click', () => {
        currentDeck = null;
        updateLearnModePicker();
    });

    if (startManualBtn) startManualBtn.addEventListener('click', () => { if (currentDeck) openConfigPanel('manual'); });
    if (startAutoBtn) startAutoBtn.addEventListener('click', () => { if (currentDeck) openConfigPanel('auto'); });
    if (studyBackBtn) studyBackBtn.addEventListener('click', backToModePicker);
    document.getElementById('studyFavBtn')?.addEventListener('click', () => {
        if (!currentDeck || !currentDeck.items[currentCardIndex]) return;
        const id = currentDeck.items[currentCardIndex].id;
        toggleFavorite(id, document.getElementById('studyFavBtn'));
    });
    if (DOM.autoPauseBtn) DOM.autoPauseBtn.addEventListener('click', toggleAutoPause);
    if (DOM.autoSlowBtn) DOM.autoSlowBtn.addEventListener('click', () => { autoSpeed = 5000; stopAuto(); if (studyMode === 'auto') startAutoMode(); });
    if (DOM.autoFastBtn) DOM.autoFastBtn.addEventListener('click', () => { autoSpeed = 1500; stopAuto(); if (studyMode === 'auto') startAutoMode(); });

    // Quick modes
    document.getElementById('qmNewBtn')?.addEventListener('click', () => openConfigPanel('manual', { includeNew: true, includeReview: false }));
    document.getElementById('qmReviewBtn')?.addEventListener('click', () => openConfigPanel('manual', { includeNew: false, includeReview: true }));

    // Config panel
    document.getElementById('cfgBackBtn')?.addEventListener('click', () => {
        document.getElementById('learnConfigPanel').style.display = 'none';
        if (DOM.learnModePicker) DOM.learnModePicker.style.display = 'block';
    });
    document.getElementById('cfgStartBtn')?.addEventListener('click', startSessionFromConfig);

    const cfgStep = (id, key, step, min, max, suffix) => {
        document.getElementById(id)?.addEventListener('click', () => {
            sessionConfig[key] = Math.min(max, Math.max(min, sessionConfig[key] + step));
            const valEl = document.getElementById(id.replace('Down','Val').replace('Up','Val'));
            if (valEl) valEl.innerText = sessionConfig[key] + (suffix||'');
        });
    };
    cfgStep('cfgCardsDown', 'cardCount', -5, 5, 200, '');
    cfgStep('cfgCardsUp',   'cardCount',  5, 5, 200, '');
    cfgStep('cfgSpeedDown', 'speed', -1, 1, 10, 's');
    cfgStep('cfgSpeedUp',   'speed',  1, 1, 10, 's');

    // Results
    document.getElementById('resAgainBtn')?.addEventListener('click', () => {
        document.getElementById('sessionResults').style.display = 'none';
        openConfigPanel(currentModeToStart);
    });
    document.getElementById('resLibraryBtn')?.addEventListener('click', () => {
        document.getElementById('sessionResults').style.display = 'none';
        document.querySelector('[data-view="library"]')?.click();
    });
}

function updateDashboardStats() {
    let totalWords = 0;
    const validIds = new Set();
    allDecks.forEach(d => {
        if(d && d.items) {
            totalWords += d.items.length;
            d.items.forEach(item => validIds.add(item.id));
        }
    });

    // Lọc bỏ id mồ côi không còn tồn tại trong data
    const validMastered = masteredCards.filter(id => validIds.has(id));
    if (validMastered.length !== masteredCards.length) {
        masteredCards = validMastered;
        localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
    }

    if(DOM.statTotalDecks) DOM.statTotalDecks.innerText = allDecks.length;
    if(DOM.statTotalWords) DOM.statTotalWords.innerText = totalWords.toLocaleString();
    if(DOM.statMastered) DOM.statMastered.innerText = masteredCards.length;
    if(DOM.statProgress) {
        DOM.statProgress.innerText = totalWords > 0
            ? `${Math.round((masteredCards.length / totalWords) * 100)}%`
            : '0%';
    }
    const unmastered = totalWords - masteredCards.length;
    if(DOM.focusNewCount) DOM.focusNewCount.innerText = `${unmastered} words`;
    if(DOM.focusReviewCount) DOM.focusReviewCount.innerText = `${masteredCards.length} to review`;
}
