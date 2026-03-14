// =========================================
// FILE: app.js - BẢN FIX LỖI (AN TOÀN & HOÀN CHỈNH 100%)
// =========================================

let allDecks = [];
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = [];
let currentStreak = 0;
let DOM = {};
let englishVoice = null;

// 1. Tải Service Worker (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW config error: ', err));
    });
}

// 2. KHỞI TẠO GIỌNG ĐỌC (ÉP TÌM GIỌNG ANH MỸ)
function initVoices() {
    if (!('speechSynthesis' in window)) return;
    let voices = window.speechSynthesis.getVoices();
    
    const findEnglishVoice = (voiceList) => {
        let voice = voiceList.find(v => v.lang.includes('en-US') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')));
        if (!voice) voice = voiceList.find(v => v.lang === 'en-US' || v.lang === 'en_US');
        if (!voice) voice = voiceList.find(v => v.lang.startsWith('en'));
        return voice;
    };

    if (voices.length > 0) englishVoice = findEnglishVoice(voices);

    window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        englishVoice = findEnglishVoice(voices);
    };
}

// 3. HÀM ĐỌC TỪ VỰNG
function playWordSound() {
    if (!currentDeck || !currentDeck.items) return;
    const textToSpeak = currentDeck.items[currentCardIndex].term;
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Xóa luồng đọc bị kẹt
        
        let utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        if (englishVoice) utterance.voice = englishVoice;
        
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50); // Delay 50ms chống kẹt trên iOS/Android
    }
}

// 4. KHỞI CHẠY ỨNG DỤNG
document.addEventListener('DOMContentLoaded', () => {
    try {
        masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || [];
    } catch (e) {
        masteredCards = [];
    }

    initDOM();
    initVoices();
    setupTheme(); 
    checkStreak(); 
    mergeData(); // Đã fix lỗi mất dữ liệu ở hàm này
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

function checkStreak() {
    const today = new Date().toDateString(); 
    let lastStudyDate = localStorage.getItem('lastStudyDate');
    currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;

    if (lastStudyDate) {
        const lastDate = new Date(lastStudyDate);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            currentStreak = 0;
            localStorage.setItem('currentStreak', currentStreak);
        }
    }
    if(DOM.statStreak) DOM.statStreak.innerText = `${currentStreak} ngày`;
}

function noiLua() {
    const today = new Date().toDateString();
    let lastStudyDate = localStorage.getItem('lastStudyDate');
    
    if (lastStudyDate !== today) {
        currentStreak++;
        localStorage.setItem('currentStreak', currentStreak);
        localStorage.setItem('lastStudyDate', today);
        
        if(DOM.statStreak) DOM.statStreak.innerText = `${currentStreak} ngày`;
        
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#FF725B', '#FFCD1F', '#23B26D']
            });
        }
    }
}

function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (DOM.themeSwitch) {
        DOM.themeSwitch.checked = (savedTheme === 'dark');
    }
}

// ĐÃ SỬA LỖI MẤT DỮ LIỆU Ở ĐÂY
function mergeData() {
    allDecks = [];
    if (typeof group_1_decks !== 'undefined') allDecks = allDecks.concat(group_1_decks);
    if (typeof group_2_decks !== 'undefined') allDecks = allDecks.concat(group_2_decks);
    if (typeof group_3_decks !== 'undefined') allDecks = allDecks.concat(group_3_decks);
    if (typeof group_4_decks !== 'undefined') allDecks = allDecks.concat(group_4_decks);
    if (typeof group_5_decks !== 'undefined') allDecks = allDecks.concat(group_5_decks);
    if (typeof group_6_decks !== 'undefined') allDecks = allDecks.concat(group_6_decks);
    if (typeof group_7_decks !== 'undefined') allDecks = allDecks.concat(group_7_decks);
    if (typeof group_8_decks !== 'undefined') allDecks = allDecks.concat(group_8_decks);
    if (typeof group_9_decks !== 'undefined') allDecks = allDecks.concat(group_9_decks);
    if (typeof group_10_decks !== 'undefined') allDecks = allDecks.concat(group_10_decks);
    if (typeof group_11_decks !== 'undefined') allDecks = allDecks.concat(group_11_decks);
}

function renderDeckList(decksToRender, targetDOM) {
    if (!targetDOM) return;
    targetDOM.innerHTML = '';
    
    decksToRender.forEach(deck => {
        const totalItems = deck.items ? deck.items.length : 0;
        const li = document.createElement('li');
        li.className = 'deck-item';
        li.innerHTML = `
            <div class="deck-info">
                <strong>${deck.ten}</strong>
                <span class="deck-meta">${totalItems} thuật ngữ</span>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: var(--text-muted);"></i>
        `;
        li.addEventListener('click', () => loadDeck(deck));
        targetDOM.appendChild(li);
    });
}

function setupNavigation() {
    DOM.navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetView = e.currentTarget.getAttribute('data-view');
            
            DOM.navItems.forEach(b => b.classList.remove('active'));
            DOM.views.forEach(v => v.classList.remove('active'));
            
            document.querySelectorAll(`[data-view="${targetView}"]`).forEach(b => b.classList.add('active'));
            
            const viewEl = document.getElementById(targetView + 'View');
            if (viewEl) viewEl.classList.add('active');

            if (DOM.viewTitle) {
                const titles = {
                    'dashboard': 'Trang chủ',
                    'study': currentDeck ? `Học: ${currentDeck.ten}` : 'Học tập',
                    'library': 'Tìm kiếm bài học',
                    'settings': 'Cài đặt'
                };
                DOM.viewTitle.innerText = titles[targetView] || 'Flashcards';
            }

            if (targetView === 'library') {
                renderDeckList(allDecks, DOM.libraryList);
                if(DOM.searchInput) DOM.searchInput.value = '';
            }
        });
    });
}

function loadDeck(deck) {
    if (!deck || !deck.items || deck.items.length === 0) return;
    currentDeck = deck;
    currentCardIndex = 0;
    
    document.querySelector('[data-view="study"]').click();
    showCard();
}

function showCard() {
    if (!currentDeck || !currentDeck.items) return;
    
    const cardData = currentDeck.items[currentCardIndex];
    isFlipped = false;
    DOM.flashcard.classList.remove('is-flipped');

    setTimeout(() => {
        if(DOM.cardWord) DOM.cardWord.innerText = cardData.term || '';
        if(DOM.cardIpa) DOM.cardIpa.innerText = cardData.ipa || '';
        if(DOM.cardCounter) DOM.cardCounter.innerText = `${currentCardIndex + 1} / ${currentDeck.items.length}`;
        
        if(DOM.cardPos) DOM.cardPos.innerText = `${cardData.pos || 'N/A'}`;
        if(DOM.cardMeaning) DOM.cardMeaning.innerText = cardData.meaning_vi || '';
        if(DOM.cardExampleEn) DOM.cardExampleEn.innerText = cardData.example || '';
        if(DOM.cardExampleVi) DOM.cardExampleVi.innerText = cardData.example_vi || '';
        
        updateCardStatusUI();
    }, 150);
}

function updateCardStatusUI() {
    if (!currentDeck) return;
    const cardId = currentDeck.items[currentCardIndex].id;
    const isMastered = masteredCards.includes(cardId);
    
    if (DOM.masterBtn && DOM.notMasteredBtn) {
        if (isMastered) {
            DOM.masterBtn.style.color = 'var(--success)';
            DOM.masterBtn.style.borderColor = 'var(--success)';
            DOM.masterBtn.style.backgroundColor = 'rgba(35, 178, 109, 0.1)';
            DOM.notMasteredBtn.style.color = '';
            DOM.notMasteredBtn.style.borderColor = '';
            DOM.notMasteredBtn.style.backgroundColor = '';
        } else {
            DOM.masterBtn.style.color = '';
            DOM.masterBtn.style.borderColor = '';
            DOM.masterBtn.style.backgroundColor = '';
            DOM.notMasteredBtn.style.color = 'var(--danger)';
            DOM.notMasteredBtn.style.borderColor = 'var(--danger)';
            DOM.notMasteredBtn.style.backgroundColor = 'rgba(255, 114, 91, 0.1)';
        }
    }
}

// =========================================
// 8. TẤT CẢ SỰ KIỆN TƯƠNG TÁC
// =========================================
function setupEventListeners() {
    
    // --- CHUỘT: LẬT THẺ & TỰ ĐỘNG ĐỌC ÂM THANH ---
    if (DOM.flashcard) {
        DOM.flashcard.addEventListener('click', (e) => {
            if (e.target.closest('.control-btn')) return; 
            if (window.getSelection().toString().length > 0) return; 
            
            DOM.flashcard.classList.toggle('is-flipped');
            isFlipped = !isFlipped;
            
            playWordSound(); // Gọi hàm đọc
        });
    }

    // --- BÀN PHÍM LAPTOP: PHÍM CÁCH = LẬT + ĐỌC ---
    document.addEventListener('keydown', (e) => {
        const studyView = document.getElementById('studyView');
        // Chỉ nhận phím tắt nếu đang ở màn hình học
        if (!studyView || !studyView.classList.contains('active')) return;

        if (e.code === 'Space') { 
            e.preventDefault(); // Ngăn trang tự cuộn xuống
            DOM.flashcard.classList.toggle('is-flipped');
            isFlipped = !isFlipped;
            playWordSound(); 
        } else if (e.key === 'ArrowRight') { 
            if(DOM.nextBtn) DOM.nextBtn.click();
        } else if (e.key === 'ArrowLeft') { 
            if(DOM.prevBtn) DOM.prevBtn.click();
        } else if (e.key === 'Enter') {
            if(DOM.masterBtn) DOM.masterBtn.click();
        }
    });

    // --- NÚT LOA THỦ CÔNG ---
    if (DOM.speakBtn) {
        DOM.speakBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            playWordSound();
        });
    }

    if (DOM.nextBtn) {
        DOM.nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            noiLua(); // CHÂM LỬA STREAK
            if (currentDeck && currentCardIndex < currentDeck.items.length - 1) {
                currentCardIndex++;
                showCard();
            } else {
                if (typeof confetti !== 'undefined') triggerConfetti();
            }
        });
    }

    if (DOM.prevBtn) {
        DOM.prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeck && currentCardIndex > 0) {
                currentCardIndex--;
                showCard();
            }
        });
    }

    if (DOM.masterBtn) {
        DOM.masterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            noiLua();
            if (currentDeck) {
                const wordId = currentDeck.items[currentCardIndex].id;
                if (!masteredCards.includes(wordId)) {
                    masteredCards.push(wordId);
                    localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
                    updateDashboardStats();
                }
                updateCardStatusUI();
            }
        });
    }

    if (DOM.notMasteredBtn) {
        DOM.notMasteredBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeck) {
                const wordId = currentDeck.items[currentCardIndex].id;
                const index = masteredCards.indexOf(wordId);
                if (index > -1) {
                    masteredCards.splice(index, 1); 
                    localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
                    updateDashboardStats();
                }
                updateCardStatusUI();
            }
        });
    }

    if (DOM.themeSwitch) {
        DOM.themeSwitch.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    if (DOM.resetStatsBtn) {
        DOM.resetStatsBtn.addEventListener('click', () => {
            if (confirm("Xóa toàn bộ tiến độ học tập và chuỗi ngày?")) {
                masteredCards = [];
                localStorage.removeItem('masteredCards');
                localStorage.removeItem('currentStreak');
                localStorage.removeItem('lastStudyDate');
                currentStreak = 0;
                if(DOM.statStreak) DOM.statStreak.innerText = `0 ngày`;
                updateDashboardStats();
                if(currentDeck) updateCardStatusUI();
                alert("Đã xóa dữ liệu thành công!");
            }
        });
    }

    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', (e) => {
            const kw = e.target.value.toLowerCase().trim();
            if (kw === '') {
                renderDeckList(allDecks, DOM.libraryList);
                return;
            }
            const filtered = allDecks.filter(deck => 
                deck.ten.toLowerCase().includes(kw)
            );
            renderDeckList(filtered, DOM.libraryList);
        });
    }
}

function updateDashboardStats() {
    if (DOM.statMastered) DOM.statMastered.innerText = masteredCards.length;
    let totalWords = 0;
    allDecks.forEach(deck => {
        if (deck.items) totalWords += deck.items.length;
    });
    if (totalWords > 0 && DOM.statProgress) {
        const percent = Math.round((masteredCards.length / totalWords) * 100);
        DOM.statProgress.innerText = `${percent}%`;
    }
}

function triggerConfetti() {
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#4255FF', '#23B26D', '#FFCD1F', '#FF725B']
        });
    }
}
