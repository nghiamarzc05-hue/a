// =========================================
// FILE: app.js - XỬ LÝ LOGIC HOÀN CHỈNH
// =========================================

let allDecks = [];
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = [];
let DOM = {};

document.addEventListener('DOMContentLoaded', () => {
    // Load lịch sử học tập
    try {
        masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || [];
    } catch (e) {
        masteredCards = [];
    }

    initDOM();
    setupTheme(); // Cài đặt Dark mode trước khi render
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
        resetStatsBtn: document.getElementById('resetStatsBtn'),
        themeSwitch: document.getElementById('themeSwitch'),
        viewTitle: document.getElementById('viewTitle')
    };
}

function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Gạt đúng vị trí nút Switch trong Settings
    if (DOM.themeSwitch) {
        DOM.themeSwitch.checked = (savedTheme === 'dark');
    }
}

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
    
    // Đảm bảo úp thẻ lại trước khi đổi chữ
    isFlipped = false;
    DOM.flashcard.classList.remove('is-flipped');

    // Chờ 150ms cho animation úp thẻ chạy một chút rồi mới đổi nội dung
    setTimeout(() => {
        // Mặt trước
        DOM.cardWord.innerText = cardData.term || '';
        DOM.cardIpa.innerText = cardData.ipa || '';
        if(DOM.cardCounter) DOM.cardCounter.innerText = `${currentCardIndex + 1} / ${currentDeck.items.length}`;
        
        // Mặt sau
        if(DOM.cardPos) DOM.cardPos.innerText = `Từ loại: ${cardData.pos || 'N/A'}`;
        DOM.cardMeaning.innerText = cardData.meaning_vi || '';
        DOM.cardExampleEn.innerText = cardData.example || '';
        DOM.cardExampleVi.innerText = cardData.example_vi || '';

        // Tự động đọc từ (Bỏ comment // dòng dưới nếu muốn tự động đọc khi chuyển thẻ)
        // DOM.speakBtn.click();
    }, 150);
}

function setupEventListeners() {
    // Lật Thẻ
    if (DOM.flashcard) {
        DOM.flashcard.addEventListener('click', (e) => {
            if(e.target.closest('.control-btn')) return; // Không lật nếu bấm nhầm vào nút
            DOM.flashcard.classList.toggle('is-flipped');
            isFlipped = !isFlipped;
        });
    }

    // Tới / Lui
    if (DOM.nextBtn) {
        DOM.nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeck && currentCardIndex < currentDeck.items.length - 1) {
                currentCardIndex++;
                showCard();
            } else if (currentDeck && currentCardIndex === currentDeck.items.length - 1) {
                alert("Chúc mừng! Bạn đã hoàn thành bộ thẻ này.");
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

    // Phát âm
    if (DOM.speakBtn) {
        DOM.speakBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentDeck) return;
            const textToSpeak = currentDeck.items[currentCardIndex].term;
            if (textToSpeak && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            }
        });
    }

    // Đã Thuộc
    if (DOM.masterBtn) {
        DOM.masterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeck) {
                const wordId = currentDeck.items[currentCardIndex].id;
                if (!masteredCards.includes(wordId)) {
                    masteredCards.push(wordId);
                    localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
                    updateDashboardStats();
                }
                DOM.nextBtn.click();
            }
        });
    }

    // Chưa Thuộc
    if (DOM.notMasteredBtn) {
        DOM.notMasteredBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            DOM.nextBtn.click();
        });
    }

    // Bắt sự kiện bàn phím
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'd') {
            if (DOM.nextBtn) DOM.nextBtn.click();
        } else if (e.key === 'ArrowLeft' || e.key === 'a') {
            if (DOM.prevBtn) DOM.prevBtn.click();
        } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault(); 
            if (DOM.flashcard) DOM.flashcard.click();
        }
    });

    // Dark Mode Toggle (Lắng nghe sự thay đổi của công tắc)
    if (DOM.themeSwitch) {
        DOM.themeSwitch.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Reset Tiến Độ
    if (DOM.resetStatsBtn) {
        DOM.resetStatsBtn.addEventListener('click', () => {
            if (confirm("Bạn có chắc chắn muốn xóa toàn bộ tiến độ học tập không?")) {
                masteredCards = [];
                localStorage.removeItem('masteredCards');
                updateDashboardStats();
                alert("Đã xóa dữ liệu thành công!");
            }
        });
    }

    // Search Box
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
