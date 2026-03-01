// =========================================
// FILE: app.js - XỬ LÝ LOGIC CHÍNH
// =========================================

// 1. BIẾN TRẠNG THÁI (STATE)
let allDecks = [];
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = [];

// Khai báo biến DOM (sẽ được gán giá trị sau khi trang tải xong)
let DOM = {};

// 2. KHỞI TẠO ỨNG DỤNG (Chạy khi HTML đã tải xong)
document.addEventListener('DOMContentLoaded', () => {
    // Tải dữ liệu từ LocalStorage
    try {
        masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || [];
    } catch (e) {
        masteredCards = [];
        console.error("Lỗi khi đọc LocalStorage:", e);
    }

    // Gán các phần tử DOM
    initDOM();
    
    // Gộp dữ liệu từ các file group
    mergeData();

    // Khởi tạo giao diện và sự kiện
    renderDeckList();
    setupNavigation();
    setupEventListeners();
    updateDashboardStats();
    
    // Khôi phục theme (Light/Dark)
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
});

// 3. HÀM KHỞI TẠO DOM ELEMENTS
function initDOM() {
    DOM = {
        // Views
        views: document.querySelectorAll('.view-section'),
        navItems: document.querySelectorAll('.nav-item'),
        viewTitle: document.getElementById('viewTitle'),
        
        // Lists
        deckList: document.getElementById('deckList'),
        mobileDeckList: document.getElementById('mobileDeckList'),
        
        // Flashcard Elements
        flashcard: document.getElementById('flashcard'),
        cardPos: document.getElementById('cardPos'),
        cardWord: document.getElementById('cardWord'),
        cardIpa: document.getElementById('cardIpa'),
        cardMeaning: document.getElementById('cardMeaning'),
        cardExample: document.getElementById('cardExample'),
        cardExampleVi: document.getElementById('cardExampleVi'),
        
        // Buttons
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        masterBtn: document.getElementById('masterBtn'),
        notMasteredBtn: document.getElementById('notMasteredBtn'),
        speakBtn: document.getElementById('speakBtn'),
        themeToggle: document.getElementById('themeToggle'),
        
        // Stats
        statMastered: document.getElementById('statMastered'),
        statProgress: document.getElementById('statProgress'),
        cardCounter: document.getElementById('cardCounter'),
        
        // Settings
        resetStatsBtn: document.getElementById('resetStatsBtn')
    };
}

// 4. GỘP DỮ LIỆU TỪ CÁC FILE GROUP (HỖ TRỢ LÊN ĐẾN GROUP_20)
function mergeData() {
    allDecks = [];
    
    // Hỗ trợ sẵn lên tới 20 file group 
    if (typeof group_1_decks !== 'undefined') allDecks = allDecks.concat(group_1_decks);
    if (typeof group_2_decks !== 'undefined') allDecks = allDecks.concat(group_2_decks);
    if (typeof group_3_decks !== 'undefined') allDecks = allDecks.concat(group_3_decks);
    if (typeof group_4_decks !== 'undefined') allDecks = allDecks.concat(group_4_decks);
    if (typeof group_5_decks !== 'undefined') allDecks = allDecks.concat(group_5_decks);
    if (typeof group_6_decks !== 'undefined') allDecks = allDecks.concat(group_6_decks);
    if (typeof group_7_decks !== 'undefined') allDecks = allDecks.concat(group_7_decks);
    
    // Các slot dự trữ cho tương lai
    if (typeof group_8_decks !== 'undefined') allDecks = allDecks.concat(group_8_decks);
    if (typeof group_9_decks !== 'undefined') allDecks = allDecks.concat(group_9_decks);
    if (typeof group_10_decks !== 'undefined') allDecks = allDecks.concat(group_10_decks);
    if (typeof group_11_decks !== 'undefined') allDecks = allDecks.concat(group_11_decks);
    if (typeof group_12_decks !== 'undefined') allDecks = allDecks.concat(group_12_decks);
    if (typeof group_13_decks !== 'undefined') allDecks = allDecks.concat(group_13_decks);
    if (typeof group_14_decks !== 'undefined') allDecks = allDecks.concat(group_14_decks);
    if (typeof group_15_decks !== 'undefined') allDecks = allDecks.concat(group_15_decks);
    if (typeof group_16_decks !== 'undefined') allDecks = allDecks.concat(group_16_decks);
    if (typeof group_17_decks !== 'undefined') allDecks = allDecks.concat(group_17_decks);
    if (typeof group_18_decks !== 'undefined') allDecks = allDecks.concat(group_18_decks);
    if (typeof group_19_decks !== 'undefined') allDecks = allDecks.concat(group_19_decks);
    if (typeof group_20_decks !== 'undefined') allDecks = allDecks.concat(group_20_decks);

    if (allDecks.length === 0) {
        console.warn("Chưa có dữ liệu. Vui lòng kiểm tra lại các file group_x.js");
    }
}

// 5. HIỂN THỊ DANH SÁCH BỘ THẺ (CẢ DESKTOP & MOBILE)
function renderDeckList() {
    const listHTML = allDecks.map(deck => {
        let count = deck.items ? deck.items.length : 0;
        let masteredCount = deck.items ? deck.items.filter(item => masteredCards.includes(item.id)).length : 0;
        let progress = count > 0 ? Math.round((masteredCount / count) * 100) : 0;
        
        return `
            <li class="deck-item" data-id="${deck.id}">
                <div class="deck-info">
                    <strong>${deck.ten}</strong>
                    <div class="deck-meta">${count} từ vựng</div>
                </div>
                <div class="deck-progress">
                    <span class="progress-text">${progress}%</span>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            </li>
        `;
    }).join('');

    if (DOM.deckList) DOM.deckList.innerHTML = listHTML;
    if (DOM.mobileDeckList) DOM.mobileDeckList.innerHTML = listHTML;

    // Gắn sự kiện click
    const attachClicks = (listElement) => {
        if (!listElement) return;
        const items = listElement.querySelectorAll('.deck-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                // Đánh dấu active
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                const deckId = item.getAttribute('data-id');
                openDeck(deckId);
            });
        });
    };

    attachClicks(DOM.deckList);
    attachClicks(DOM.mobileDeckList);
}

// 6. CHUYỂN ĐỔI GIỮA CÁC TAB/VIEW
function setupNavigation() {
    if (!DOM.navItems) return;
    
    DOM.navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            // Xóa active ở tất cả nav-item
            DOM.navItems.forEach(b => b.classList.remove('active'));
            
            // Tìm nút được click (kể cả mobile hay desktop)
            const targetView = btn.getAttribute('data-view');
            const matchingBtns = document.querySelectorAll(`[data-view="${targetView}"]`);
            matchingBtns.forEach(b => b.classList.add('active'));

            // Đổi view
            if (DOM.views) {
                DOM.views.forEach(v => {
                    v.classList.remove('active');
                    if(v.id === targetView + 'View') {
                        v.classList.add('active');
                    }
                });
            }

            // Đổi Title
            if (DOM.viewTitle) {
                switch(targetView) {
                    case 'dashboard': DOM.viewTitle.innerText = "Trang chủ"; break;
                    case 'study': DOM.viewTitle.innerText = "Học tập"; break;
                    case 'library': DOM.viewTitle.innerText = "Thư viện"; break;
                    case 'settings': DOM.viewTitle.innerText = "Cài đặt"; break;
                }
            }
        });
    });
}

// 7. XỬ LÝ HỌC FLASHCARD
function openDeck(deckId) {
    currentDeck = allDecks.find(d => d.id === deckId);
    if (!currentDeck || !currentDeck.items || currentDeck.items.length === 0) {
        alert("Bộ thẻ này chưa có từ vựng!");
        return;
    }

    currentCardIndex = 0;
    isFlipped = false;
    
    // Tự động chuyển sang tab "Study"
    const studyTab = document.querySelector('[data-view="study"]');
    if (studyTab) studyTab.click();
    
    updateCardView();
}

function updateCardView() {
    if (!currentDeck || !DOM.flashcard) return;

    const currentCard = currentDeck.items[currentCardIndex];
    if (!currentCard) return;

    // Cập nhật mặt trước
    if (DOM.cardWord) DOM.cardWord.innerText = currentCard.term || '';
    if (DOM.cardPos) DOM.cardPos.innerText = currentCard.pos || '';
    if (DOM.cardIpa) DOM.cardIpa.innerText = currentCard.ipa || '';

    // Cập nhật mặt sau
    if (DOM.cardMeaning) DOM.cardMeaning.innerText = currentCard.meaning_vi || '';
    if (DOM.cardExample) DOM.cardExample.innerText = currentCard.example || '';
    if (DOM.cardExampleVi) DOM.cardExampleVi.innerText = currentCard.example_vi || '';

    // Đặt lại trạng thái lật thẻ
    isFlipped = false;
    DOM.flashcard.classList.remove('flipped');

    // Cập nhật số đếm
    if (DOM.cardCounter) DOM.cardCounter.innerText = `${currentCardIndex + 1} / ${currentDeck.items.length}`;

    // Kiểm tra xem đã thuộc chưa để đổi màu nút
    if (DOM.masterBtn) {
        if (masteredCards.includes(currentCard.id)) {
            DOM.masterBtn.style.color = 'var(--success)';
            DOM.masterBtn.style.borderColor = 'var(--success)';
        } else {
            DOM.masterBtn.style.color = '';
            DOM.masterBtn.style.borderColor = '';
        }
    }
}

// 8. CÁC SỰ KIỆN TƯƠNG TÁC CHUNG
function setupEventListeners() {
    // Nút Xóa dữ liệu (Settings)
    if (DOM.resetStatsBtn) {
        DOM.resetStatsBtn.addEventListener('click', () => {
            if(confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử học tập? Hành động này không thể hoàn tác.')) {
                masteredCards = [];
                localStorage.removeItem('masteredCards');
                updateDashboardStats();
                renderDeckList();
                if(currentDeck) updateCardView();
                alert('Đã xóa dữ liệu thành công!');
            }
        });
    }

    // Lật Flashcard
    if (DOM.flashcard) {
        DOM.flashcard.addEventListener('click', (e) => {
            // Ngăn chặn lật thẻ nếu click vào nút phát âm
            if(e.target.closest('#speakBtn')) return;
            isFlipped = !isFlipped;
            DOM.flashcard.classList.toggle('flipped');
        });
    }

    // Phát âm (Sử dụng Web Speech API)
    if (DOM.speakBtn) {
        DOM.speakBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(!currentDeck) return;
            const textToSpeak = currentDeck.items[currentCardIndex].term;
            
            // Xóa các luồng đọc cũ
            window.speechSynthesis.cancel(); 

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = 'en-US'; // Hoặc 'en-GB'
            window.speechSynthesis.speak(utterance);
        });
    }

    // Nút Next / Prev
    if (DOM.prevBtn) {
        DOM.prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeck && currentCardIndex > 0) {
                currentCardIndex--;
                updateCardView();
            }
        });
    }

    if (DOM.nextBtn) {
        DOM.nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentDeck && currentCardIndex < currentDeck.items.length - 1) {
                currentCardIndex++;
                updateCardView();
            } else if (currentDeck && currentCardIndex === currentDeck.items.length - 1) {
                alert("Chúc mừng! Bạn đã hoàn thành bộ thẻ này.");
            }
        });
    }

    // Bắt sự kiện phím mũi tên trên bàn phím (Trái / Phải / Space)
    document.addEventListener('keydown', (e) => {
        // Chỉ bắt sự kiện nếu đang ở màn hình Study
        const studyView = document.getElementById('studyView');
        if (!studyView || !studyView.classList.contains('active')) return;

        if (e.key === 'ArrowRight' || e.key === 'd') {
            if (DOM.nextBtn) DOM.nextBtn.click();
        } else if (e.key === 'ArrowLeft' || e.key === 'a') {
            if (DOM.prevBtn) DOM.prevBtn.click();
        } else if (e.key === ' ' || e.key === 'Enter') { // Phím cách để lật thẻ
            e.preventDefault(); 
            if (DOM.flashcard) DOM.flashcard.click();
        }
    });

    // Nút Đã thuộc (Mastered)
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
                // Tự động nhảy sang thẻ tiếp theo
                DOM.nextBtn.click();
            }
        });
    }

    // Nút Chưa thuộc (Nếu có)
    if (DOM.notMasteredBtn) {
        DOM.notMasteredBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (DOM.nextBtn) DOM.nextBtn.click();
        });
    }

    // Dark/Light Mode Toggle
    if (DOM.themeToggle) {
        DOM.themeToggle.addEventListener('click', () => {
            const root = document.documentElement;
            const currentTheme = root.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

// 9. CẬP NHẬT THỐNG KÊ TRANG CHỦ
function updateDashboardStats() {
    if (DOM.statMastered) DOM.statMastered.innerText = `${masteredCards.length} Từ`;
    
    // Tính tổng số từ trong tất cả các file
    let totalWords = 0;
    allDecks.forEach(deck => {
        if (deck.items) totalWords += deck.items.length;
    });
    
    if (totalWords > 0 && DOM.statProgress) {
        const percent = Math.round((masteredCards.length / totalWords) * 100);
        DOM.statProgress.innerText = `${percent}%`;
    }
    
    // Render lại List để thanh progress nhỏ trong từng deck cũng được cập nhật
    renderDeckList();
}
