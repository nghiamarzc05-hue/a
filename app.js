// ========================================================
// FILE: app.2.4.4.js - LOGIC MỚI CHO GIAO DIỆN ĐỆ NHỊ WEB
// ========================================================

let allDecks = [];
let currentDeck = null;
let currentCardIndex = 0;
let isFlipped = false;
let masteredCards = [];
let currentStreak = 0;
let englishVoice = null;

// Hàm tiện ích lấy element
const $ = id => document.getElementById(id);

// 1. TẢI SERVICE WORKER (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(err => console.log('SW error:', err));
    });
}

// 2. KHỞI TẠO GIỌNG ĐỌC MỸ CHUẨN
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

// 3. HÀM PHÁT ÂM TIẾNG ANH
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

// 4. LOGIC CHUỖI NGÀY HỌC (STREAK) - Gắn vào Trang chủ
function checkStreak() {
    const today = new Date().toDateString(); 
    let lastDate = localStorage.getItem('lastStudyDate');
    currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;
    
    if (lastDate) {
        const diff = Math.ceil(Math.abs(new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
        if (diff > 1) { currentStreak = 0; localStorage.setItem('currentStreak', 0); }
    }
    
    // Hiển thị Streak lên Card "Ôn tập" của Đệ Nhị Web
    const reviewTitle = document.querySelector('#btnReview .fTitle');
    if (reviewTitle) reviewTitle.innerText = 'Chuỗi ngày học';
    if ($('focusReviewCount')) $('focusReviewCount').innerText = `${currentStreak} ngày 🔥`;
}

function noiLua() {
    const today = new Date().toDateString();
    if (localStorage.getItem('lastStudyDate') !== today) {
        currentStreak++;
        localStorage.setItem('currentStreak', currentStreak);
        localStorage.setItem('lastStudyDate', today);
        checkStreak(); // Update UI ngay lập tức
        if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
}

// 5. KHỞI CHẠY TOÀN BỘ ỨNG DỤNG
document.addEventListener('DOMContentLoaded', () => {
    try { masteredCards = JSON.parse(localStorage.getItem('masteredCards')) || []; } catch (e) { masteredCards = []; }
    initVoices();
    setupTheme();
    checkStreak();
    mergeData();
    renderDeckList(allDecks);
    setupNavigation();
    setupEventListeners();
    updateDashboardStats();
});

// 6. QUÉT TOÀN BỘ DỮ LIỆU TỪ VỰNG TỰ ĐỘNG (Không giới hạn)
function mergeData() {
    allDecks = [];
    let i = 1;
    while (true) {
        let name = `group_${i}_decks`;
        if (typeof window[name] !== 'undefined') {
            allDecks = allDecks.concat(window[name]);
            i++;
        } else {
            break; 
        }
    }
}

// 7. HIỂN THỊ DỮ LIỆU LÊN GIAO DIỆN
function renderDeckList(decksToRender) {
    const libGrid = $('deckGrid');
    const sideList = $('deckList');
    if (libGrid) libGrid.innerHTML = '';
    if (sideList) sideList.innerHTML = '';
    
    decksToRender.forEach(deck => {
        // Gắn vào Thư viện chính
        if (libGrid) {
            const card = document.createElement('div');
            card.className = 'libCard deckGridCard';
            card.innerHTML = `<div class="deckGridTop"><div class="deckGridName">${deck.ten}</div></div><div class="deckGridMeta">${deck.items.length} từ vựng</div>`;
            card.addEventListener('click', () => loadDeck(deck));
            libGrid.appendChild(card);
        }
        // Gắn vào Sidebar bên trái
        if (sideList) {
            const btn = document.createElement('button');
            btn.className = 'deckItem';
            btn.innerHTML = `<div class="deckDot"></div><span class="txt">${deck.ten}</span><span class="num">${deck.items.length}</span>`;
            btn.addEventListener('click', () => loadDeck(deck));
            sideList.appendChild(btn);
        }
    });
}

function updateDashboardStats() {
    let total = 0; 
    allDecks.forEach(d => total += d.items.length);
    
    // Sửa Card "Học từ mới" thành "Từ đã thuộc"
    const newTitle = document.querySelector('#btnLearnNew .fTitle');
    if (newTitle) newTitle.innerText = 'Đã thuộc (Mastered)';
    if ($('focusNewCount')) $('focusNewCount').innerText = `${masteredCards.length} / ${total} từ`;
    if ($('countAll')) $('countAll').innerText = total;
}

// 8. ĐIỀU HƯỚNG CHUYỂN TAB TRONG ĐỆ NHỊ WEB
function setupNavigation() {
    const navButtons = document.querySelectorAll('.navItem, .sideItem');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            let viewName = btn.dataset.view || btn.dataset.deck; 
            if(viewName === '__all' || viewName === '__fav') return;
            
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            
            let targetId = 'view' + viewName.charAt(0).toUpperCase() + viewName.slice(1);
            if($(targetId)) $(targetId).classList.remove('hidden');
            
            document.querySelectorAll('.navItem, .sideItem').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Xử lý tab Thư viện
            if (viewName === 'library') renderDeckList(allDecks);
        });
    });
}

// 9. LOGIC HỌC THẺ
function loadDeck(deck) {
    if (!deck || !deck.items || deck.items.length === 0) return;
    currentDeck = deck; 
    currentCardIndex = 0;
    
    // Tự động chuyển qua tab Học (Learn)
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    $('viewLearn').classList.remove('hidden');
    document.querySelectorAll('.navItem').forEach(b => b.classList.remove('active'));
    if(document.querySelector(`.navItem[data-view="learn"]`)) {
        document.querySelector(`.navItem[data-view="learn"]`).classList.add('active');
    }
    
    if($('learnDeckTitle')) $('learnDeckTitle').innerText = deck.ten;
    if($('panelDeckName')) $('panelDeckName').innerText = deck.ten;
    if($('homeDeckName')) $('homeDeckName').innerText = deck.ten; // Cập nhật thẻ Resume
    
    showCard();
}

function showCard() {
    if (!currentDeck) return;
    const item = currentDeck.items[currentCardIndex];
    
    isFlipped = false; 
    if($('flipInner')) $('flipInner').classList.remove('isFlipped');
    
    setTimeout(() => {
        // Mặt trước
        if($('word')) $('word').innerText = item.term;
        if($('phonetic')) $('phonetic').innerText = item.ipa || '';
        
        // Mặt sau
        if($('wordBack')) $('wordBack').innerText = item.term;
        if($('phoneticBack')) $('phoneticBack').innerText = item.ipa || '';
        if($('meaning')) $('meaning').innerText = item.meaning_vi;
        if($('example')) $('example').innerText = item.example || '';
        
        // Đếm số thứ tự
        const posText = `${currentCardIndex + 1} / ${currentDeck.items.length}`;
        if($('learnPos')) $('learnPos').innerText = posText;
        if($('progressText')) $('progressText').innerText = posText;
        if($('statWords')) $('statWords').innerText = posText;
        
        // Cập nhật vòng Progress
        if($('statPct')) $('statPct').innerText = Math.round(((currentCardIndex + 1) / currentDeck.items.length) * 100);
        
        updateCardStatusUI();
    }, 150);
}

// Cập nhật nút Ngôi Sao (Yêu thích/Đã thuộc)
function updateCardStatusUI() {
    if (!currentDeck) return;
    const id = currentDeck.items[currentCardIndex].id;
    const isMastered = masteredCards.includes(id);
    
    const btnStar = $('btnStar');
    if (btnStar) {
        if (isMastered) {
            btnStar.style.color = '#f59e0b'; // Màu vàng 
            btnStar.style.background = 'rgba(245, 158, 11, 0.15)';
        } else {
            btnStar.style.color = '';
            btnStar.style.background = '';
        }
    }
}

// 10. TẤT CẢ SỰ KIỆN NÚT BẤM VÀ PHÍM TẮT
function setupEventListeners() {
    
    // Click Thẻ -> Lật & Đọc
    const flipCard = $('flipCard');
    if (flipCard) {
        flipCard.addEventListener('click', (e) => {
            if (e.target.closest('button') || window.getSelection().toString().length > 0) return;
            $('flipInner').classList.toggle('isFlipped');
            isFlipped = !isFlipped;
            playWordSound();
        });
    }

    // Bàn phím (Space = Lật + Đọc)
    document.addEventListener('keydown', (e) => {
        const viewLearn = $('viewLearn');
        if (!viewLearn || viewLearn.classList.contains('hidden')) return;

        if (e.code === 'Space') { 
            e.preventDefault(); 
            $('flipInner').classList.toggle('isFlipped');
            isFlipped = !isFlipped;
            playWordSound(); 
        } else if (e.key === 'ArrowRight') { 
            if($('btnNext')) $('btnNext').click();
        } else if (e.key === 'ArrowLeft') { 
            if($('btnPrev')) $('btnPrev').click();
        } else if (e.key === 'Enter') {
            if($('btnStar')) $('btnStar').click(); // Enter = Đánh dấu đã thuộc
        }
    });

    // Nút Next / Prev / Flip
    if ($('btnNext')) {
        $('btnNext').addEventListener('click', (e) => {
            e.stopPropagation(); noiLua();
            if (currentCardIndex < currentDeck.items.length - 1) {
                currentCardIndex++;
                showCard();
            } else {
                if (typeof confetti !== 'undefined') confetti({ particleCount: 200, spread: 90 });
            }
        });
    }

    if ($('btnPrev')) {
        $('btnPrev').addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentCardIndex > 0) { currentCardIndex--; showCard(); }
        });
    }
    
    if ($('btnFlip')) {
        $('btnFlip').addEventListener('click', (e) => {
            e.stopPropagation();
            $('flipInner').classList.toggle('isFlipped');
            isFlipped = !isFlipped;
            playWordSound();
        });
    }

    // Loa US và UK trên Giao diện
    if ($('btnSpeakUS')) $('btnSpeakUS').addEventListener('click', (e) => { e.stopPropagation(); playWordSound(); });
    if ($('btnSpeakUK')) $('btnSpeakUK').addEventListener('click', (e) => { e.stopPropagation(); playWordSound(); });

    // Đánh dấu đã thuộc (Nút Ngôi sao)
    if ($('btnStar')) {
        $('btnStar').addEventListener('click', (e) => {
            e.stopPropagation(); noiLua();
            const id = currentDeck.items[currentCardIndex].id;
            const idx = masteredCards.indexOf(id);
            if (idx > -1) {
                masteredCards.splice(idx, 1); 
            } else {
                masteredCards.push(id); 
            }
            localStorage.setItem('masteredCards', JSON.stringify(masteredCards));
            updateDashboardStats();
            updateCardStatusUI();
        });
    }

    // Nút Tiếp tục học ở Trang chủ
    if ($('btnContinue')) {
        $('btnContinue').addEventListener('click', () => {
            if (currentDeck) loadDeck(currentDeck);
            else if (allDecks.length > 0) loadDeck(allDecks[0]);
        });
    }
    
    // Tìm kiếm trong Thư viện
    if ($('libTìm')) {
        $('libTìm').addEventListener('input', (e) => {
            const kw = e.target.value.toLowerCase().trim();
            const filtered = allDecks.filter(d => d.ten.toLowerCase().includes(kw));
            renderDeckList(filtered);
        });
    }
    
    // Tìm kiếm Global
    if ($('globalTìm')) {
        $('globalTìm').addEventListener('input', (e) => {
            const kw = e.target.value.toLowerCase().trim();
            const filtered = allDecks.filter(d => d.ten.toLowerCase().includes(kw));
            renderDeckList(filtered);
            // Tự động nhảy sang tab Thư viện để xem kết quả
            if($('globalTìm').value !== "") {
                document.querySelector(`.navItem[data-view="library"]`).click();
            }
        });
    }
}

// 11. ĐỔI MÀU GIAO DIỆN (SÁNG/TỐI)
function setupTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', theme);
    
    if ($('themeLight')) {
        $('themeLight').addEventListener('click', () => {
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        });
    }
    if ($('themeDark')) {
        $('themeDark').addEventListener('click', () => {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        });
    }
}
