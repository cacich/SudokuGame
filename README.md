# 野牛格

一款為手機設計的繁體中文牧場邏輯益智遊戲。每一列、每一欄與每個彩色牧區都必須剛好放一頭牛，而且牛不能彼此相鄰（斜角也不行）。

## 遊玩

- 點一下格子：放排除記號
- 再點一下：放牛
- 第三下：清除
- 支援提示、復原、計時、無限程序生成關卡與裝置端進度保存
- 每一關都會由內建解題器驗證只有一個答案後才顯示
- 可在 Android Chrome 使用「加到主畫面」安裝，並支援離線遊玩

## 開發

```bash
npm install
npm run dev
```

## GitHub Pages

專案已包含 `.github/workflows/deploy-pages.yml`。在 repo 的 **Settings → Pages → Build and deployment** 將 Source 設為 **GitHub Actions**，之後推送到 `main` 就會自動發布。

本專案的名稱、介面與美術均為原創；玩法採用常見的區域配置邏輯規則，未使用 Bullpen 的程式、商標或美術素材。
