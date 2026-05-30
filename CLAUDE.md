# Flashcard English Master — CLAUDE.md

## Project overview
PWA web app học từ vựng tiếng Anh. Pure HTML/CSS/Vanilla JS, không framework, không npm, không build step.

## File structure
- `index.html` — UI chính, load tất cả script
- `styles.css` — toàn bộ styling
- `app.js` — logic chính: navigation, flashcard, TTS, localStorage
- `group_N.js` (N = 1..11) — dữ liệu từ vựng (N có thể mở rộng tới 100)
- `manifest.json` — PWA manifest
- `sw.js` — Service Worker cho offline

## Data format (group_N.js)
```js
const group_N_decks = [
  { id: "deck_id", ten: "Tên bộ từ", items: [
    { id: "deck_id-001", term: "word", pos: "n/v/phrase", ipa: "/ipa/",
      meaning_vi: "nghĩa", example: "English example", example_vi: "Nghĩa ví dụ" }
  ]}
];
```

## Cách app load data
`app.js` dùng `eval(`group_${i}_decks`)` để quét tự động từ group_1 đến group_100.  
**QUAN TRỌNG**: Mỗi file group_N.js PHẢI được thêm vào `index.html` bằng `<script src="group_N.js"></script>` trước thẻ `<script src="app.js"></script>`.

## Lưu ý quan trọng
- `index.html` hiện chỉ có script tag cho group_1, group_2, group_11 — group_3 đến group_10 bị thiếu
- localStorage lưu: `masteredCards` (array id), `currentStreak`, `lastStudyDate`, `theme`
- TTS dùng Web Speech API (chỉ hoạt động trên browser, không dùng offline)
- Để test: mở `index.html` bằng Live Server hoặc browser trực tiếp

## Thêm bộ từ vựng mới
1. Tạo file `group_N.js` theo đúng format trên
2. Thêm `<script src="group_N.js"></script>` vào `index.html` trước `app.js`
