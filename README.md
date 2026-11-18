# AI 協作開發教學手冊

給第一次用 AI 改程式的夥伴。從開工設定開始，逐關練習把想法變成可操作、可測試、能交給團隊審查的系統修改。每關有操作圖、Codex 指令和完成條件。完成由學員自行確認，進度存在目前的瀏覽器。

- [線上分課教材](https://kevin-yeh-egroup.github.io/ai-development-handbook/)
- 網站首頁的「一起學 → 學習資源」也能進入。

## 課前準備

每位夥伴在自己的電腦準備一個空資料夾 `ai-practice`，第 1–10 關都在這裡做。第 11 關再另建一個空資料夾 `my-first-tool`，第 12 關沿用。兩個資料夾先保持空白，教材會帶夥伴請 Codex 建立假課程資料及檔案。Kevin 也可以直接請夥伴照第 1 關自己建。

只做本機練習時，第 8、9 關可以在聊天內交出審查與通知草稿。要練真的送出，再另給已授權的 GitHub 練習專案連結。

## 更新一課

1. 在 `lessons.json` 找到要改的課。保留既有的 `slug`，舊連結才會有效。
2. 每課保留短圖示步驟、至少一段可直接貼給 Codex 的指令，以及完成條件。把團隊專用細節放到帶教備註。公開教材使用示範資料。
3. 執行 `node build.mjs`。用瀏覽器打開 `site/index.html`，檢查桌機、手機和複製，並試開改過的分課連結。
4. 將教材來源及產出的 `site/` 提交到這個 repo。要更新 Kevin 的網站，將 `site/` **內容**同步到網站 repo 的 `public/ai-development-handbook/`，再依網站的既有流程提交／發布。推送這個教材 repo 本身只會更新教材原始碼。

`site/handbook.html` 可以單檔離線分享。`design.html` 是第一版 Claude Code 的視覺設計稿。闖關版的樣式和操作分別在 `course.css` 與 `course.js`。
