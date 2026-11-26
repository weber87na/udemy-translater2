# udemy-translater2

兩門 Microsoft Agent Framework Udemy 課程的繁體中文字幕，搭配 Chrome 中英雙語字幕外掛。

| 課程 | 影片 | 字幕段數 |
| --- | ---: | ---: |
| [AI in C# using the Microsoft Agent Framework](https://www.udemy.com/course/ai-in-c-sharp-using-the-microsoft-agent-framework/) | 127 | 13,669 |
| [Mastering Microsoft Agent Framework in C#](https://www.udemy.com/course/mastering-microsoft-agent-framework-in-c/) | 46 | 4,359 |
| 合計 | **173** | **18,028** |

譯文由 Codex 直接依課程固定英文字幕製作，沒有使用 Google 翻譯、iAI 或其他翻譯 API。明顯的自動聽打誤字依技術語境在譯文中校正，英文來源保留於字幕資料。講師提到的日期、版本及服務行為依原影片敘述保留。

## 安裝 Chrome 外掛

1. 點 repository 的 **Code → Download ZIP**，完整解壓縮；也可以 `git clone https://github.com/weber87na/udemy-translater2.git`。
2. 在 Chrome 網址列輸入 `chrome://extensions/`。
3. 開啟「開發人員模式」，點「載入未封裝項目」。
4. 選擇本專案內含 `manifest.json` 的 **extension 資料夾**。
5. 回到已登入、可正常播放的 Udemy 課程，重新整理頁面並播放講座。

影片右上角會出現「繁中 CC」。外掛無須 API 金鑰，也無須執行 Python、Node.js 或本機伺服器。請保留載入的 extension 資料夾。

[Chrome 官方安裝說明](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

## 使用方式

- 開啟或關閉中文字幕，並切換繁中／中英雙語。
- 調整字幕大小、距離影片底部的位置，以及正負 30 秒的時間偏移。
- 正數時間偏移表示延後，負數表示提前。
- 字幕跟隨影片時間同步，支援暫停、快轉、重播、變速及切換講座。
- 長字幕會依播放器尺寸自動縮放，保留畫面空間。
- 支援一般播放器全螢幕；子母畫面、投放電視、影片元素單獨進入的原生全螢幕不支援網頁字幕覆蓋層。

不需要開啟 Udemy 的英文 CC。課程文章沒有影片時間軸；日後新增、未收錄的講座會顯示提示並保留 Udemy 原字幕。

## 字幕檔

請由 [字幕目錄](字幕目錄.md) 依課程、章節與講座名稱查找。

- `subtitles/<lectureId>.zh-Hant.vtt`：173 份繁中 VTT。
- `extension/data/<lectureId>.json`：中英字幕與原始時間軸。
- `extension/data/index.json`：課程及講座對照。
- `coverage.json`：完整性、段數及時間軸核對結果。

相鄰英文字幕會整併成較自然的句段，起訖點取自原字幕。字幕資料不包含課程影片，影片仍由 Udemy 正常播放。

## 更新

取得新版檔案後，到 `chrome://extensions/` 重新載入外掛，再重新整理 Udemy 頁面。

## 權限與資料處理

外掛只要求 `storage` 權限保存顯示設定，並只在上列兩門課執行。字幕顯示讀取 repository 中隨附的靜態資料與影片時間，不讀取 Cookie 或 API 金鑰，也不呼叫翻譯服務。

## 驗證

有 Node.js 的開發環境可以執行：

```shell
node --test tests/subtitles.test.mjs
```

已核對兩門課全部 173 支影片、18,028 段譯文與來源的起訖時間；另測試字幕查找、重播、間隔、雙語切換、缺少字幕時的處理及全螢幕容器。字幕介面也在真實 Udemy 頁面的隔離環境中測試，Chrome 未封裝安裝仍依上述步驟自行完成。
