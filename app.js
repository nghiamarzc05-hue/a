// =========================================
// FILE: app.js - SƯỜN CHÍNH (CHUẨN 100%)
// =========================================

let allDecks = [];
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = [];
let currentStreak = 0;
let DOM = {};
let englishVoice = null;

// 1. Service Worker (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW error: ', err));
    });
}

// 2. Cài đặt giọng đọc Anh-Mỹ
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
    if (!currentDeck) return;
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

// 3. Logic Nối lửa & Chuỗi ngày
function checkStreak() {
    const today = new Date().toDateString(); 
    let lastDate = localStorage.getItem('lastStudyDate');
    currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;
    
    if (lastDate) {
        const diff = Math.ceil(Math.abs(new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
        if (diff > 1) { 
            currentStreak = 0; 
            localStorage.setItem('currentStreak', 0); 
        }
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
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FF725B', '#FFCD1F', '#23B26D'] });
        }
    }
}

// 4. Khởi chạy Ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    try { masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || []; } catch (e) { masteredCards = []; }
    initDOM();
    initVoices();
    setupTheme();
    checkStreak();
    mergeData(); // Quét data
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

// Hàm quét data an toàn (quét từ 1 đến 100)
function mergeData() {
    allDecks = [];
    for (let i = 1; i <= 100; i++) {
        let name = `group_${i}_decks`;
        if (typeof window[name] !== 'undefined') {
            allDecks = allDecks.concat(window[name]);
        }
    }
}

function renderDeckList(data, target) {
    if (!target) return; 
    target.innerHTML = '';
    data.forEach(deck => {
        const li = document.createElement('li');
        li.className = 'deck-item';
        li.innerHTML = `<div class="deck-info"><strong>${deck.ten}</strong><span class="deck-meta">${deck.items.length} từ vựng</span></div><i class="fa-solid fa-chevron-right" style="color: var(--text-muted);"></i>`;
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
            document.getElementById(v + 'View').classList.add('active');
            
            if (DOM.viewTitle) {
                const titles = { 'dashboard': 'Trang chủ', 'study': currentDeck ? `Học: ${currentDeck.ten}` : 'Học tập', 'library': 'Tìm kiếm bài học', 'settings': 'Cài đặt' };
                DOM.viewTitle.innerText = titles[v] || 'Flashcards';
            }
            if (v === 'library') renderDeckList(allDecks, DOM.libraryList);
        });
    });
}

function loadDeck(deck) {
    currentDeck = deck; 
    currentCardIndex = 0;
    document.querySelector('[data-view="study"]').click();
    showCard();
}

function showCard() {
    if (!currentDeck) return;
    const item = currentDeck.items[currentCardIndex];
    isFlipped = false; 
    DOM.flashcard.classList.remove('is-flipped');
    
    setTimeout(() => {
        DOM.cardWord.innerText = item.term; 
        DOM.cardIpa.innerText = item.ipa;
        DOM.cardCounter.innerText = `${currentCardIndex + 1} / ${currentDeck.items.length}`;
        DOM.cardPos.innerText = item.pos || 'N/A'; 
        DOM.cardMeaning.innerText = item.meaning_vi;
        DOM.cardExampleEn.innerText = item.example; 
        DOM.cardExampleVi.innerText = item.example_vi;
        updateCardStatusUI();
    }, 150);
}

function updateCardStatusUI() {
    if (!currentDeck) return;
    const isM = masteredCards.includes(currentDeck.items[currentCardIndex].id);
    if (DOM.masterBtn) {
        DOM.masterBtn.style.cssText = isM ? 'color:var(--success); border-color:var(--success); background:rgba(35,178,109,0.1)' : '';
        DOM.notMasteredBtn.style.cssText = !isM ? 'color:var(--danger); border-color:var(--danger); background:rgba(255,114,91,0.1)' : '';
    }
}

// 5. CÁC SỰ KIỆN NÚT BẤM VÀ BÀN PHÍM
function setupEventListeners() {
    // Click thẻ -> Lật + Đọc
    DOM.flashcard.addEventListener('click', (e) => {
        if (e.target.closest('.control-btn') || window.getSelection().toString()) return;
        DOM.flashcard.classList.toggle('is-flipped');
        isFlipped = !isFlipped;
        playWordSound();
    });

    // Bàn phím: Space = Lật + Đọc
    document.addEventListener('keydown', (e) => {
        if (!document.getElementById('studyView').classList.contains('active')) return;
        
        if (e.code === 'Space') { 
            e.preventDefault(); 
            DOM.flashcard.classList.toggle('is-flipped');
            isFlipped = !isFlipped;
            playWordSound(); 
        } 
        else if (e.key === 'ArrowRight') { DOM.nextBtn.click(); }
        else if (e.key === 'ArrowLeft') { DOM.prevBtn.click(); }
        else if (e.key === 'Enter') { DOM.masterBtn.click(); }
    });

    // Tới / Lui / Loa
    DOM.nextBtn.addEventListener('click', (e) => {
        e.stopPropagation(); noiLua();
        if (currentCardIndex < currentDeck.items.length - 1) { 
            currentCardIndex++; 
            showCard(); 
        } else {
            if (typeof confetti !== 'undefined') confetti({ particleCount: 200, spread: 90 });
        }
    });

    DOM.prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentCardIndex > 0) { currentCardIndex--; showCard(); }
    });

    DOM.speakBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        playWordSound(); 
    });

    // Master / Not Master (Chỉ đổi màu UI, không tự động nhảy thẻ)
    DOM.masterBtn.addEventListener('click', (e) => {
        e.stopPropagation(); noiLua();
        const id = currentDeck.items[currentCardIndex].id;
        if (!masteredCards.includes(id)) { 
            masteredCards.push(id); 
            localStorage.setItem('masteredCards', JSON.stringify(masteredCards)); 
            updateDashboardStats(); 
        }
        updateCardStatusUI();
    });

    DOM.notMasteredBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = currentDeck.items[currentCardIndex].id;
        const idx = masteredCards.indexOf(id);
        if (idx > -1) { 
            masteredCards.splice(idx, 1); 
            localStorage.setItem('masteredCards', JSON.stringify(masteredCards)); 
            updateDashboardStats(); 
        }
        updateCardStatusUI();
    });

    // Cài đặt Theme
    DOM.themeSwitch.addEventListener('change', (e) => {
        const theme = e.target.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });

    // Xóa tiến độ
    DOM.resetStatsBtn.addEventListener('click', () => {
        if (confirm("Xóa toàn bộ tiến độ học tập và chuỗi ngày?")) { 
            localStorage.clear(); 
            location.reload(); 
        }
    });

    // Tìm kiếm
    DOM.searchInput.addEventListener('input', (e) => {
        const kw = e.target.value.toLowerCase().trim();
        renderDeckList(allDecks.filter(d => d.ten.toLowerCase().includes(kw)), DOM.libraryList);
    });
}

function updateDashboardStats() {
    DOM.statMastered.innerText = masteredCards.length;
    let total = 0; 
    allDecks.forEach(d => total += d.items.length);
    if (total > 0) {
        DOM.statProgress.innerText = `${Math.round((masteredCards.length / total) * 100)}%`;
    }
}
