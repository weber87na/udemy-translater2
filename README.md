# udemy-translater2

Udemy 課程的繁體中文字幕，搭配 Chrome 中英雙語字幕外掛。

| 課程 | 影片 | 字幕段數 |
| --- | ---: | ---: |
| [AI in C# using the Microsoft Agent Framework](https://www.udemy.com/course/ai-in-c-sharp-using-the-microsoft-agent-framework/) | 127 | 13,669 |
| [Mastering Microsoft Agent Framework in C#](https://www.udemy.com/course/mastering-microsoft-agent-framework-in-c/) | 46 | 4,359 |
| [Fraud Detection in Python](https://www.udemy.com/course/fraud-detection-using-python/) | 20 | 1,194 |
| [Detect Fake News with Machine Learning & Feature Engineering](https://www.udemy.com/course/detect-fake-news-with-machine-learning-feature-engineering/) | 24 | 3,308 |
| [Building a RAG application in Python](https://www.udemy.com/course/building-a-rag-application-in-python/) | 75 | 6,970 |
| 合計 | **292** | **29,500** |

譯文由 Codex 直接依英文字幕製作，不使用 Google、iAI 或其他翻譯 API。程式識別字與影片敘述的版本、日期保留原文語意。

## 安裝 Chrome 外掛

1. 下載此 repository 的 ZIP 並完整解壓縮，或 clone 本 repo。
2. 開啟 chrome://extensions/，啟用「開發人員模式」。
3. 選「載入未封裝項目」，選擇本專案的 extension 資料夾。
4. 回到已登入、可正常播放的 Udemy 課程，重新整理頁面。

影片右上角「繁中 CC」可設定雙語、字級、位置與正負 30 秒的時間差。字幕跟隨影片時間同步，支援暫停、快轉、重播、變速及切換講座。

一般播放器容器全螢幕可用；子母畫面、投放電視及 VIDEO 元素單獨進入的原生全螢幕不支援網頁字幕覆蓋層。

## 字幕與完整性

請由 [字幕目錄](字幕目錄.md) 查找各講座。

- subtitles/<lectureId>.zh-Hant.vtt：繁中 VTT。
- extension/data/<lectureId>.json：中英字幕與時間軸。
- extension/data/index.json：課程與講座對照。
- coverage.json：全課覆蓋率與段數。

文章單元另列，不計入影片字幕；未收錄的新增講座會保留 Udemy 原字幕。字幕資料不含課程影片，影片仍由 Udemy 正常播放。

## 權限與更新

外掛只請求 storage 保存顯示設定，只在上表課程啟用。播放時讀取隨附的固定字幕資料，不讀 Cookie 或 API 金鑰，也不呼叫翻譯服務。更新檔案後重新載入外掛及 Udemy 頁面。

## 驗證

```shell
node --test tests/subtitles.test.mjs
```

測試依 index 與 coverage 動態核對每門課、所有影片字幕、時間軸、課程作用範圍及字幕查找。結構檢查不能代替翻譯語意校對。
