// =========================================
// FILE: app.js - XỬ LÝ LOGIC CHÍNH
// =========================================

let allDecks = [];
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = [];
let DOM = {};

document.addEventListener('DOMContentLoaded', () => {
    try {
        masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || [];
    } catch (e) {
        masteredCards = [];
    }

    initDOM();
    mergeData();
    renderDeckList();
    setupNavigation();
    setupEventListeners();
    updateDashboardStats();
    
    // Cài đặt Dark Mode lúc tải trang
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (DOM.themeSwitch) {
        DOM.themeSwitch.checked = (savedTheme === 'dark');
    }
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

function renderDeckList(decksToRender = allDecks, targetDOM = DOM.deckList) {
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
            
            // Xóa active hiện tại
            DOM.navItems.forEach(b => b.classList.remove('active'));
            DOM.views.forEach(v => v.classList.remove('active'));
            
            // Active nút bấm (Cả sidebar và bottom nav)
            document.querySelectorAll(`[data-view="${targetView}"]`).forEach(b => b.classList.add('active'));
            
            // Hiển thị section
            const viewEl = document.getElementById(targetView + 'View');
            if (viewEl) viewEl.classList.add('active');

            // Cập nhật title
            if (DOM.viewTitle) {
                const titles = {
                    'dashboard': 'Trang chủ',
                    'study': currentDeck ? `Học: ${currentDeck.ten}` : 'Học tập',
                    'library': 'Tìm kiếm bài học',
                    'settings': 'Cài đặt'
                };
                DOM.viewTitle.innerText = titles[targetView] || 'Flashcards';
            }

            // Render lại library nếu chuyển sang tab Library
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
    isFlipped = false;
    
    document.querySelector('[data-view="study"]').click();
    showCard();
}

function showCard() {
    if (!currentDeck || !currentDeck.items) return;
    
    const cardData = currentDeck.items[currentCardIndex];
    
    // Xóa class lật để trở về mặt trước
    DOM.flashcard.classList.remove('flipped');
    isFlipped = false;

    // Cập nhật mặt trước
    DOM.cardWord.innerText = cardData.term || '';
    DOM.cardIpa.innerText = cardData.ipa || '';
    DOM.cardPos.innerText = `${currentCardIndex + 1} / ${currentDeck.items.length}`;

    // Cập nhật mặt sau (Xử lý nếu không có example_vi)
    DOM.cardMeaning.innerText = cardData.meaning_vi || '';
    DOM.cardExampleEn.innerText = cardData.example || '';
    DOM.cardExampleVi.innerText = cardData.example_vi || '';
}

function setupEventListeners() {
    // 1. Lật thẻ 3D
    if (DOM.flashcard) {
        DOM.flashcard.addEventListener('click', () => {
            DOM.flashcard.classList.toggle('flipped');
            isFlipped = !isFlipped;
        });
    }

    // 2. Chuyển thẻ tiếp theo
    if (DOM.nextBtn) {
        DOM.nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentDeck) return;
            if (currentCardIndex < currentDeck.items.length - 1) {
                currentCardIndex++;
                showCard();
            } else {
                alert('Bạn đã học xong bộ thẻ này!');
            }
        });
    }

    // 3. Lùi lại thẻ trước
    if (DOM.prevBtn) {
        DOM.prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentDeck) return;
            if (currentCardIndex > 0) {
                currentCardIndex--;
                showCard();
            }
        });
    }

    // 4. Nút Đọc phát âm
    if (DOM.speakBtn) {
        DOM.speakBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentDeck) return;
            const textToSpeak = currentDeck.items[currentCardIndex].term;
            if (textToSpeak && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            }
        });
    }

    // 5. Nút Đã Thuộc
    if (DOM.masterBtn) {
        DOM.masterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentDeck) return;
            const currentItem = currentDeck.items[currentCardIndex];
            if (!masteredCards.includes(currentItem.id)) {
                masteredCards.push(currentItem.id);
                localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
                updateDashboardStats();
            }
            if (DOM.nextBtn) DOM.nextBtn.click();
        });
    }

    // 6. Nút Chưa Thuộc (bỏ qua)
    if (DOM.notMasteredBtn) {
        DOM.notMasteredBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (DOM.nextBtn) DOM.nextBtn.click();
        });
    }

    // 7. Xóa dữ liệu tiến độ
    if (DOM.resetStatsBtn) {
        DOM.resetStatsBtn.addEventListener('click', () => {
            if (confirm("Bạn có chắc chắn muốn xóa toàn bộ từ đã thuộc không?")) {
                masteredCards = [];
                localStorage.removeItem('masteredCards');
                updateDashboardStats();
                alert("Đã xóa tiến độ thành công!");
            }
        });
    }

    // 8. Tìm kiếm động (Live Search)
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

    // 9. Nút Gạt Dark Mode (Trong phần cài đặt)
    if (DOM.themeSwitch) {
        DOM.themeSwitch.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
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
