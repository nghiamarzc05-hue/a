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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

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

function playWordSound() {
    if (!currentDeck || !currentDeck.items || !currentDeck.items[currentCardIndex]) return;
    const text = currentDeck.items[currentCardIndex].term;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        if (englishVoice) utterance.voice = englishVoice;
        setTimeout(() => { window.speechSynthesis.speak(utterance); }, 50);
    }
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
    mergeData(); 
    renderDeckList(allDecks, DOM.deckList);
    setupNavigation();
    setupEventListeners();
    updateDashboardStats();
});

function initDOM() {
    DOM = {
        views: document.querySelectorAll('.view-section'),
        navItems: document.querySelectorAll('.nav-item, .sidebar-nav .nav-item'),
        deckList: document.getElementById('deckList'),
        libraryList: document.getElementById('libraryList'),
        searchInput: document.getElementById('searchInput'),
        
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
    // Quét dự phòng tới 100 file
    for (let i = 1; i <= 100; i++) {
        try {
            // Dùng eval để đọc an toàn biến const trong Javascript
            let deckData = eval(`group_${i}_decks`);
            if (deckData && Array.isArray(deckData)) {
                allDecks = allDecks.concat(deckData);
            }
        } catch (error) {
            // Nếu file group_x.js chưa được tạo, bỏ qua không báo lỗi
        }
    }
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
                const titles = { 'dashboard': 'Trang chủ', 'study': currentDeck ? `Học: ${currentDeck.ten}` : 'Học tập', 'library': 'Tìm kiếm', 'settings': 'Cài đặt' };
                DOM.viewTitle.innerText = titles[v] || 'Flashcards';
            }
            if (v === 'library') renderDeckList(allDecks, DOM.libraryList);
        });
    });
}

function loadDeck(deck) {
    currentDeck = deck; 
    currentCardIndex = 0;
    const studyBtn = document.querySelector('[data-view="study"]');
    if (studyBtn) studyBtn.click();
    showCard();
}

function showCard() {
    if (!currentDeck || !currentDeck.items || currentDeck.items.length === 0) return;
    const item = currentDeck.items[currentCardIndex];
    isFlipped = false; 
    if (DOM.flashcard) DOM.flashcard.classList.remove('is-flipped');
    
    setTimeout(() => {
        if(DOM.cardWord) DOM.cardWord.innerText = item.term || ''; 
        if(DOM.cardIpa) DOM.cardIpa.innerText = item.ipa || '';
        if(DOM.cardCounter) DOM.cardCounter.innerText = `${currentCardIndex + 1} / ${currentDeck.items.length}`;
        if(DOM.cardPos) DOM.cardPos.innerText = item.pos || 'N/A'; 
        if(DOM.cardMeaning) DOM.cardMeaning.innerText = item.meaning_vi || '';
        if(DOM.cardExampleEn) DOM.cardExampleEn.innerText = item.example || ''; 
        if(DOM.cardExampleVi) DOM.cardExampleVi.innerText = item.example_vi || '';
        updateCardStatusUI();
    }, 150);
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
                if (typeof confetti !== 'undefined') confetti({ particleCount: 200, spread: 90 });
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

    if(DOM.searchInput) {
        DOM.searchInput.addEventListener('input', (e) => {
            const kw = e.target.value.toLowerCase().trim();
            renderDeckList(allDecks.filter(d => d.ten.toLowerCase().includes(kw)), DOM.libraryList);
        });
    }
}

function updateDashboardStats() {
    if(DOM.statMastered) DOM.statMastered.innerText = masteredCards.length;
    let total = 0; 
    allDecks.forEach(d => { if(d && d.items) total += d.items.length; });
    if (total > 0 && DOM.statProgress) {
        DOM.statProgress.innerText = `${Math.round((masteredCards.length / total) * 100)}%`;
    }
}
