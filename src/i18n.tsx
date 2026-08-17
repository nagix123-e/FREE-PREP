import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SystemLanguage } from "./types";
import { loadSettings } from "./services/settingsService";

export interface LanguageOption {
  value: SystemLanguage;
  label: string;
}

export const SYSTEM_LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "es", label: "Español" },
  { value: "hi", label: "हिन्दी" }
];

type TranslationKey = keyof typeof ENGLISH;
type TranslationValues = Record<string, string | number>;

const ENGLISH = {
  home: "Home",
  dashboard: "Dashboard",
  marketplace: "Marketplace",
  importCsv: "Import CSV",
  questionSets: "Question Sets",
  scoreHistory: "Score History",
  achievements: "Achievements",
  spacedReview: "Spaced Review",
  mistakePractice: "Mistake Practice",
  domainPractice: "Domain Practice",
  reviewList: "Review List",
  statistics: "Statistics",
  settings: "Settings",
  questionMakerConsole: "Question Maker Console",
  questionSetPreview: "Question Set Preview",
  testOverview: "Test Overview",
  rulesAndTools: "Rules and Tools",
  deviceCheck: "Device Check",
  testSetup: "Test Setup",
  practiceTest: "Practice Test",
  moduleReview: "Module Review",
  sectionBreak: "Section Break",
  result: "Result",
  reviewAnswers: "Review Answers",
  reviewListPractice: "Review List Practice",
  focusedPractice: "Focused Practice",
  tutorial: "Tutorial",
  savedSets: "Saved Sets",
  storedInLocalSqlite: "Stored in local SQLite",
  scoreDisclaimer: "Practice Score and Estimated Score only.",
  systemLanguage: "System Language",
  timer: "Timer",
  defaultPracticeLength: "Default Practice Length",
  audio: "Audio",
  practiceMode: "Practice Mode",
  nameOnScoreCards: "Name That Appears On Score Cards",
  nameHere: "Name here",
  saveSettings: "Save Settings",
  settingsSaved: "Settings saved locally.",
  keyboardShortcuts: "Keyboard Shortcuts",
  show: "Show",
  hide: "Hide",
  on: "On",
  off: "Off",
  nextShortcut: "Next: Right Arrow",
  backShortcut: "Back: Left Arrow",
  markShortcut: "Mark: M",
  questionMenuShortcut: "Question Menu: Q",
  pauseShortcut: "Pause: P",
  submitShortcut: "Submit Module: Ctrl + Enter",
  toggleTimerShortcut: "Toggle Timer: T",
  loading: "Loading...",
  tutorialMode: "Tutorial Mode · Step {step}/{total}",
  exitTutorial: "Exit Tutorial",
  tutorialHome: "This is Home. Click Dashboard to see your practice overview.",
  tutorialDashboard: "This is Dashboard. Next, go to Import CSV.",
  tutorialImport: "This is Import CSV. Next, open Marketplace.",
  tutorialMarketplace: "Add the first marketplace question set directly to your local library.",
  tutorialQuestionSets: "Find the set you imported and start RW practice.",
  tutorialOverview: "Press Continue to move through the test overview.",
  tutorialRules: "Press Continue after reviewing the rules and tools.",
  tutorialDeviceCheck: "Confirm the local device check.",
  tutorialStartModule: "Press Start Module.",
  tutorialSetup: "Start RW practice.",
  tutorialHighlight: "Press Highlight.",
  tutorialAnswer: "Answer one RW question.",
  tutorialMark: "Press Mark for Review.",
  tutorialNotes: "Open Notes.",
  tutorialShortcuts: "Open Shortcuts to see keyboard controls.",
  tutorialPause: "Open Pause, then click Exit to Home.",
  tutorialHistory: "Go to Score History and delete the tutorial practice history.",
  tutorialTeacherSetType: "Choose the question set type.",
  tutorialTeacherTestId: "Enter a Test ID.",
  tutorialTeacherQuestion: "Write the question prompt.",
  tutorialTeacherChoiceA: "Write choice A.",
  tutorialTeacherChoiceB: "Write choice B.",
  tutorialTeacherCorrect: "Choose the correct answer.",
  tutorialTeacherExplanation: "Write the explanation.",
  tutorialTeacherDomain: "Choose the content domain.",
  tutorialTeacherDownload: "Download the CSV.",
  tutorialTeacherDone: "Question maker tutorial complete.",
  tutorialDone: "Tutorial complete.",
  buildLibrary: "Build a local SAT practice library.",
  libraryStatus: "Library Status",
  viewSets: "View Sets",
  questionSetsCount: "Question Sets",
  questions: "Questions",
  reviewListCount: "Review List",
  bestScore: "Best Score",
  recentScores: "Recent Scores",
  weakAreas: "Weak Areas",
  upcomingGoals: "Upcoming Goals",
  suggestedNextStep: "Suggested next step",
  dashboardLoading: "Loading dashboard...",
  downloadDashboardData: "Download dashboard data",
  scoreTrendChart: "Score Trend Chart",
  scoresEstimateOnly: "Scores are estimates for practice only.",
  recommendedPractice: "Recommended Practice",
  weaknessTrend: "Weakness Trend",
  noData: "No data",
  noGraphData: "No graph data yet. Complete a practice test to see score trends.",
  savedQuestionSets: "Saved Question Sets",
  importedLocally: "Imported sets are stored in local SQLite.",
  noQuestionSets: "No question sets yet",
  importToBegin: "Import a valid full-test CSV to begin.",
  name: "Name",
  imported: "Imported",
  type: "Type",
  status: "Status",
  done: "Done",
  spacedReviewLoading: "Loading spaced review...",
  dueNow: "Due Now",
  upcoming: "Upcoming",
  totalScheduled: "Total Scheduled",
  startReview: "Start Review",
  caughtUp: "You're caught up.",
  reviewIntervals: "Review intervals",
  marketDownloadGithub: "Market place download from github",
  marketTitle: "SAT Question Set Marketplace",
  marketDescription: "CSV bundles can be added directly to this app. Every bundle is listed at $0 and imports into local SQLite without saving to Downloads first.",
  loadingMarketplace: "Loading marketplace bundles...",
  previewCheckout: "Preview checkout",
  selectedBundles: "Selected bundles",
  selectBundles: "Select any number of bundles from the marketplace.",
  previewPrice: "Preview price",
  unexpectedDatabaseError: "An unexpected database error occurred.",
  kioskMode: "Kiosk Mode",
  kioskModeDescription: "Keeps FREE PREP fullscreen and on top until you enter the session password here. Restarting FREE PREP ends kiosk mode.",
  startKioskMode: "Start Kiosk Mode",
  endKioskMode: "End Kiosk Mode",
  kioskModeActive: "Kiosk mode is active.",
  kioskModeStarted: "Kiosk mode started.",
  kioskModeEnded: "Kiosk mode ended.",
  setKioskPassword: "Set Kiosk Password",
  enterKioskPassword: "Enter Kiosk Password",
  kioskPassword: "Password",
  confirmKioskPassword: "Confirm Password",
  kioskPasswordHint: "Use at least 6 characters. This password exists only until FREE PREP is closed or restarted.",
  endKioskModePrompt: "Enter the password used to start kiosk mode.",
  kioskPasswordMismatch: "The passwords do not match.",
  kioskPasswordError: "Could not update kiosk mode.",
  cancel: "Cancel"
} as const;

const TRANSLATIONS: Record<Exclude<SystemLanguage, "en">, Partial<Record<TranslationKey, string>>> = {
  ja: {
    home: "ホーム", dashboard: "ダッシュボード", marketplace: "マーケットプレイス", importCsv: "CSVをインポート", questionSets: "問題セット", scoreHistory: "スコア履歴", achievements: "実績", spacedReview: "間隔復習", mistakePractice: "間違い演習", domainPractice: "分野別演習", reviewList: "復習リスト", statistics: "統計", settings: "設定", questionMakerConsole: "問題作成コンソール", tutorial: "チュートリアル", savedSets: "保存済みセット", storedInLocalSqlite: "ローカルSQLiteに保存", scoreDisclaimer: "練習スコアと推定スコアのみです。", systemLanguage: "システム言語", timer: "タイマー", defaultPracticeLength: "標準演習問題数", audio: "音声", nameOnScoreCards: "スコアカードに表示する名前", nameHere: "名前を入力", saveSettings: "設定を保存", settingsSaved: "設定をローカルに保存しました。", keyboardShortcuts: "キーボードショートカット", show: "表示", hide: "非表示", on: "オン", off: "オフ", loading: "読み込み中...", tutorialMode: "チュートリアル · ステップ {step}/{total}", exitTutorial: "チュートリアルを終了", buildLibrary: "ローカルSAT演習ライブラリを作成しましょう。", libraryStatus: "ライブラリの状態", viewSets: "セットを見る", questionSetsCount: "問題セット", questions: "問題", reviewListCount: "復習リスト", bestScore: "最高スコア", recentScores: "最近のスコア", weakAreas: "苦手分野", upcomingGoals: "次の目標", suggestedNextStep: "次のおすすめ", dashboardLoading: "ダッシュボードを読み込み中...", downloadDashboardData: "ダッシュボードデータをダウンロード", scoreTrendChart: "スコア推移", scoresEstimateOnly: "スコアは練習用の推定値です。", recommendedPractice: "おすすめの演習", weaknessTrend: "弱点の推移", noData: "データなし", noGraphData: "まだグラフデータがありません。演習テストを完了するとスコア推移が表示されます。", savedQuestionSets: "保存済み問題セット", importedLocally: "インポートしたセットはローカルSQLiteに保存されます。", noQuestionSets: "問題セットはまだありません", importToBegin: "有効なフルテストCSVをインポートして始めましょう。", name: "名前", imported: "インポート日", type: "種類", status: "状態", done: "完了", spacedReviewLoading: "間隔復習を読み込み中...", dueNow: "今すぐ復習", upcoming: "今後の予定", totalScheduled: "復習予定の合計", startReview: "復習を開始", caughtUp: "すべて復習済みです。", reviewIntervals: "復習間隔", marketDownloadGithub: "GitHubからマーケットプレイスをダウンロード", marketTitle: "SAT問題セット・マーケットプレイス", marketDescription: "CSVバンドルをこのアプリに直接追加できます。すべて$0で、ダウンロードフォルダを経由せずローカルSQLiteにインポートされます。", loadingMarketplace: "マーケットプレイスのバンドルを読み込み中...", previewCheckout: "選択内容の確認", selectedBundles: "選択したバンドル", selectBundles: "マーケットプレイスから任意の数のバンドルを選択できます。", previewPrice: "表示価格"
  },
  "zh-CN": {
    home: "主页", dashboard: "仪表板", marketplace: "市场", importCsv: "导入 CSV", questionSets: "题集", scoreHistory: "成绩历史", achievements: "成就", spacedReview: "间隔复习", mistakePractice: "错题练习", domainPractice: "领域练习", reviewList: "复习列表", statistics: "统计", settings: "设置", questionMakerConsole: "出题控制台", tutorial: "教程", savedSets: "已保存题集", storedInLocalSqlite: "存储在本地 SQLite", scoreDisclaimer: "仅显示练习分数和预估分数。", systemLanguage: "系统语言", timer: "计时器", defaultPracticeLength: "默认练习题数", audio: "音频", nameOnScoreCards: "显示在成绩卡上的名称", nameHere: "输入名称", saveSettings: "保存设置", settingsSaved: "设置已保存到本地。", keyboardShortcuts: "键盘快捷键", show: "显示", hide: "隐藏", on: "开启", off: "关闭", loading: "正在加载...", tutorialMode: "教程模式 · 第 {step}/{total} 步", exitTutorial: "退出教程", buildLibrary: "建立本地 SAT 练习题库。", libraryStatus: "题库状态", viewSets: "查看题集", questionSetsCount: "题集", questions: "题目", reviewListCount: "复习列表", bestScore: "最高分", recentScores: "最近成绩", weakAreas: "薄弱领域", upcomingGoals: "接下来目标", suggestedNextStep: "建议的下一步", dashboardLoading: "正在加载仪表板...", downloadDashboardData: "下载仪表板数据", scoreTrendChart: "分数趋势图", scoresEstimateOnly: "分数仅为练习预估。", recommendedPractice: "推荐练习", weaknessTrend: "薄弱趋势", noData: "暂无数据", noGraphData: "暂时没有图表数据。完成练习测试后可查看分数趋势。", savedQuestionSets: "已保存题集", importedLocally: "导入的题集保存在本地 SQLite。", noQuestionSets: "尚无题集", importToBegin: "导入有效的完整测试 CSV 以开始。", name: "名称", imported: "导入时间", type: "类型", status: "状态", done: "完成", spacedReviewLoading: "正在加载间隔复习...", dueNow: "立即复习", upcoming: "即将到来", totalScheduled: "已安排总数", startReview: "开始复习", caughtUp: "你已全部完成。", reviewIntervals: "复习间隔", marketDownloadGithub: "从 GitHub 下载市场内容", marketTitle: "SAT 题集市场", marketDescription: "CSV 套件可直接加入此应用。所有套件均为 $0，并直接导入本地 SQLite。", loadingMarketplace: "正在加载市场套件...", previewCheckout: "预览结算", selectedBundles: "已选套件", selectBundles: "可从市场选择任意数量的套件。", previewPrice: "预览价格"
  },
  "zh-TW": {
    home: "首頁", dashboard: "儀表板", marketplace: "市集", importCsv: "匯入 CSV", questionSets: "題組", scoreHistory: "成績紀錄", achievements: "成就", spacedReview: "間隔複習", mistakePractice: "錯題練習", domainPractice: "領域練習", reviewList: "複習清單", statistics: "統計", settings: "設定", questionMakerConsole: "出題控制台", tutorial: "教學", savedSets: "已儲存題組", storedInLocalSqlite: "儲存在本機 SQLite", scoreDisclaimer: "僅供練習分數與預估分數使用。", systemLanguage: "系統語言", timer: "計時器", defaultPracticeLength: "預設練習題數", audio: "音效", nameOnScoreCards: "顯示於成績卡的名稱", nameHere: "輸入名稱", saveSettings: "儲存設定", settingsSaved: "設定已儲存於本機。", keyboardShortcuts: "鍵盤快速鍵", show: "顯示", hide: "隱藏", on: "開啟", off: "關閉", loading: "載入中...", tutorialMode: "教學模式 · 步驟 {step}/{total}", exitTutorial: "離開教學", buildLibrary: "建立本機 SAT 練習題庫。", libraryStatus: "題庫狀態", viewSets: "查看題組", questionSetsCount: "題組", questions: "題目", reviewListCount: "複習清單", bestScore: "最高分", recentScores: "近期成績", weakAreas: "弱項", upcomingGoals: "接下來目標", suggestedNextStep: "建議的下一步", dashboardLoading: "正在載入儀表板...", downloadDashboardData: "下載儀表板資料", scoreTrendChart: "分數趨勢圖", scoresEstimateOnly: "分數僅為練習預估。", recommendedPractice: "建議練習", weaknessTrend: "弱項趨勢", noData: "沒有資料", noGraphData: "尚無圖表資料。完成練習測驗後可查看分數趨勢。", savedQuestionSets: "已儲存題組", importedLocally: "匯入的題組會儲存在本機 SQLite。", noQuestionSets: "尚無題組", importToBegin: "匯入有效的完整測驗 CSV 以開始。", name: "名稱", imported: "匯入時間", type: "類型", status: "狀態", done: "完成", spacedReviewLoading: "正在載入間隔複習...", dueNow: "立即複習", upcoming: "即將到來", totalScheduled: "已排定總數", startReview: "開始複習", caughtUp: "你已完成所有複習。", reviewIntervals: "複習間隔", marketDownloadGithub: "從 GitHub 下載市集內容", marketTitle: "SAT 題組市集", marketDescription: "CSV 套件可直接加入此應用程式。所有套件皆為 $0，並直接匯入本機 SQLite。", loadingMarketplace: "正在載入市集套件...", previewCheckout: "預覽結帳", selectedBundles: "已選套件", selectBundles: "可從市集選擇任意數量的套件。", previewPrice: "預覽價格"
  },
  es: {
    home: "Inicio", dashboard: "Panel", marketplace: "Mercado", importCsv: "Importar CSV", questionSets: "Conjuntos de preguntas", scoreHistory: "Historial de puntuaciones", achievements: "Logros", spacedReview: "Repaso espaciado", mistakePractice: "Práctica de errores", domainPractice: "Práctica por dominio", reviewList: "Lista de repaso", statistics: "Estadísticas", settings: "Configuración", questionMakerConsole: "Consola de creación", tutorial: "Tutorial", savedSets: "Conjuntos guardados", storedInLocalSqlite: "Guardado en SQLite local", scoreDisclaimer: "Solo puntuación de práctica y estimada.", systemLanguage: "Idioma del sistema", timer: "Temporizador", defaultPracticeLength: "Cantidad predeterminada", audio: "Audio", nameOnScoreCards: "Nombre en las tarjetas de puntuación", nameHere: "Escribe un nombre", saveSettings: "Guardar configuración", settingsSaved: "Configuración guardada localmente.", keyboardShortcuts: "Atajos de teclado", show: "Mostrar", hide: "Ocultar", on: "Activado", off: "Desactivado", loading: "Cargando...", tutorialMode: "Modo tutorial · Paso {step}/{total}", exitTutorial: "Salir del tutorial", buildLibrary: "Crea una biblioteca local de práctica SAT.", libraryStatus: "Estado de la biblioteca", viewSets: "Ver conjuntos", questionSetsCount: "Conjuntos", questions: "Preguntas", reviewListCount: "Lista de repaso", bestScore: "Mejor puntuación", recentScores: "Puntuaciones recientes", weakAreas: "Áreas débiles", upcomingGoals: "Próximos objetivos", suggestedNextStep: "Siguiente paso sugerido", dashboardLoading: "Cargando el panel...", downloadDashboardData: "Descargar datos del panel", scoreTrendChart: "Gráfico de tendencia", scoresEstimateOnly: "Las puntuaciones son estimaciones de práctica.", recommendedPractice: "Práctica recomendada", weaknessTrend: "Tendencia de debilidades", noData: "Sin datos", noGraphData: "Aún no hay datos. Completa una prueba para ver tendencias.", savedQuestionSets: "Conjuntos guardados", importedLocally: "Los conjuntos importados se almacenan en SQLite local.", noQuestionSets: "Aún no hay conjuntos", importToBegin: "Importa un CSV válido de prueba completa para comenzar.", name: "Nombre", imported: "Importado", type: "Tipo", status: "Estado", done: "Hecho", spacedReviewLoading: "Cargando repaso espaciado...", dueNow: "Para repasar ahora", upcoming: "Próximamente", totalScheduled: "Total programado", startReview: "Iniciar repaso", caughtUp: "Estás al día.", reviewIntervals: "Intervalos de repaso", marketDownloadGithub: "Descarga del mercado desde GitHub", marketTitle: "Mercado de conjuntos SAT", marketDescription: "Los paquetes CSV se agregan directamente a esta aplicación. Todos cuestan $0 y se importan a SQLite local.", loadingMarketplace: "Cargando paquetes del mercado...", previewCheckout: "Vista previa", selectedBundles: "Paquetes seleccionados", selectBundles: "Selecciona cualquier cantidad de paquetes del mercado.", previewPrice: "Precio de vista previa"
  },
  hi: {
    home: "होम", dashboard: "डैशबोर्ड", marketplace: "मार्केटप्लेस", importCsv: "CSV आयात करें", questionSets: "प्रश्न सेट", scoreHistory: "स्कोर इतिहास", achievements: "उपलब्धियां", spacedReview: "अंतराल पुनरावृत्ति", mistakePractice: "गलती अभ्यास", domainPractice: "विषय अभ्यास", reviewList: "पुनरावृत्ति सूची", statistics: "आंकड़े", settings: "सेटिंग्स", questionMakerConsole: "प्रश्न निर्माण कंसोल", tutorial: "ट्यूटोरियल", savedSets: "सहेजे गए सेट", storedInLocalSqlite: "स्थानीय SQLite में संग्रहीत", scoreDisclaimer: "केवल अभ्यास और अनुमानित स्कोर।", systemLanguage: "सिस्टम भाषा", timer: "टाइमर", defaultPracticeLength: "डिफ़ॉल्ट अभ्यास लंबाई", audio: "ऑडियो", nameOnScoreCards: "स्कोर कार्ड पर दिखने वाला नाम", nameHere: "नाम लिखें", saveSettings: "सेटिंग्स सहेजें", settingsSaved: "सेटिंग्स स्थानीय रूप से सहेजी गईं।", keyboardShortcuts: "कीबोर्ड शॉर्टकट", show: "दिखाएं", hide: "छिपाएं", on: "चालू", off: "बंद", loading: "लोड हो रहा है...", tutorialMode: "ट्यूटोरियल मोड · चरण {step}/{total}", exitTutorial: "ट्यूटोरियल से बाहर निकलें", buildLibrary: "स्थानीय SAT अभ्यास लाइब्रेरी बनाएं।", libraryStatus: "लाइब्रेरी स्थिति", viewSets: "सेट देखें", questionSetsCount: "प्रश्न सेट", questions: "प्रश्न", reviewListCount: "पुनरावृत्ति सूची", bestScore: "सर्वश्रेष्ठ स्कोर", recentScores: "हाल के स्कोर", weakAreas: "कमजोर क्षेत्र", upcomingGoals: "अगले लक्ष्य", suggestedNextStep: "सुझाया गया अगला कदम", dashboardLoading: "डैशबोर्ड लोड हो रहा है...", downloadDashboardData: "डैशबोर्ड डेटा डाउनलोड करें", scoreTrendChart: "स्कोर रुझान चार्ट", scoresEstimateOnly: "स्कोर केवल अभ्यास अनुमान हैं।", recommendedPractice: "सुझाया गया अभ्यास", weaknessTrend: "कमजोरी का रुझान", noData: "कोई डेटा नहीं", noGraphData: "अभी कोई ग्राफ डेटा नहीं है। रुझान देखने के लिए अभ्यास टेस्ट पूरा करें।", savedQuestionSets: "सहेजे गए प्रश्न सेट", importedLocally: "आयातित सेट स्थानीय SQLite में सहेजे जाते हैं।", noQuestionSets: "अभी कोई प्रश्न सेट नहीं है", importToBegin: "शुरू करने के लिए एक मान्य पूर्ण-टेस्ट CSV आयात करें।", name: "नाम", imported: "आयातित", type: "प्रकार", status: "स्थिति", done: "पूर्ण", spacedReviewLoading: "अंतराल पुनरावृत्ति लोड हो रही है...", dueNow: "अभी देय", upcoming: "आगामी", totalScheduled: "कुल निर्धारित", startReview: "पुनरावृत्ति शुरू करें", caughtUp: "आप पूरी तरह तैयार हैं।", reviewIntervals: "पुनरावृत्ति अंतराल", marketDownloadGithub: "GitHub से मार्केटप्लेस डाउनलोड", marketTitle: "SAT प्रश्न सेट मार्केटप्लेस", marketDescription: "CSV बंडल सीधे इस ऐप में जोड़े जा सकते हैं। सभी बंडल $0 के हैं और स्थानीय SQLite में आयात होते हैं।", loadingMarketplace: "मार्केटप्लेस बंडल लोड हो रहे हैं...", previewCheckout: "पूर्वावलोकन चेकआउट", selectedBundles: "चुने गए बंडल", selectBundles: "मार्केटप्लेस से किसी भी संख्या में बंडल चुनें।", previewPrice: "पूर्वावलोकन मूल्य"
  }
};

Object.assign(TRANSLATIONS.ja, {
  kioskMode: "キオスクモード", kioskModeDescription: "パスワードをこの画面で入力するまで、FREE PREPを全画面かつ最前面に保ちます。FREE PREPを終了または再起動すると解除されます。", startKioskMode: "キオスクモードを開始", endKioskMode: "キオスクモードを終了", kioskModeActive: "キオスクモードは有効です。", kioskModeStarted: "キオスクモードを開始しました。", kioskModeEnded: "キオスクモードを終了しました。", setKioskPassword: "キオスクパスワードを設定", enterKioskPassword: "キオスクパスワードを入力", kioskPassword: "パスワード", confirmKioskPassword: "パスワードを確認", kioskPasswordHint: "6文字以上で設定してください。このパスワードはFREE PREPを終了または再起動するまでだけ有効です。", endKioskModePrompt: "キオスクモード開始時に設定したパスワードを入力してください。", kioskPasswordMismatch: "パスワードが一致しません。", kioskPasswordError: "キオスクモードを更新できませんでした。", cancel: "キャンセル"
});
Object.assign(TRANSLATIONS["zh-CN"], {
  kioskMode: "自助模式", kioskModeDescription: "FREE PREP 将保持全屏并置顶，直到您在此输入本次会话的密码。重启 FREE PREP 会结束此模式。", startKioskMode: "开始自助模式", endKioskMode: "结束自助模式", kioskModeActive: "自助模式已启用。", kioskModeStarted: "自助模式已开始。", kioskModeEnded: "自助模式已结束。", setKioskPassword: "设置自助密码", enterKioskPassword: "输入自助密码", kioskPassword: "密码", confirmKioskPassword: "确认密码", kioskPasswordHint: "请使用至少 6 个字符。该密码仅在 FREE PREP 关闭或重启前有效。", endKioskModePrompt: "请输入开始自助模式时使用的密码。", kioskPasswordMismatch: "两次密码不一致。", kioskPasswordError: "无法更新自助模式。", cancel: "取消"
});
Object.assign(TRANSLATIONS["zh-TW"], {
  kioskMode: "自助模式", kioskModeDescription: "FREE PREP 會維持全螢幕及最上層顯示，直到您在此輸入本次工作階段密碼。重新啟動 FREE PREP 會結束此模式。", startKioskMode: "開始自助模式", endKioskMode: "結束自助模式", kioskModeActive: "自助模式已啟用。", kioskModeStarted: "自助模式已開始。", kioskModeEnded: "自助模式已結束。", setKioskPassword: "設定自助密碼", enterKioskPassword: "輸入自助密碼", kioskPassword: "密碼", confirmKioskPassword: "確認密碼", kioskPasswordHint: "請使用至少 6 個字元。此密碼只在 FREE PREP 關閉或重新啟動前有效。", endKioskModePrompt: "請輸入啟動自助模式時使用的密碼。", kioskPasswordMismatch: "密碼不一致。", kioskPasswordError: "無法更新自助模式。", cancel: "取消"
});
Object.assign(TRANSLATIONS.es, {
  kioskMode: "Modo quiosco", kioskModeDescription: "Mantiene FREE PREP a pantalla completa y en primer plano hasta que introduzcas aquí la contraseña de la sesión. Reiniciar FREE PREP termina el modo quiosco.", startKioskMode: "Iniciar modo quiosco", endKioskMode: "Finalizar modo quiosco", kioskModeActive: "El modo quiosco está activo.", kioskModeStarted: "Modo quiosco iniciado.", kioskModeEnded: "Modo quiosco finalizado.", setKioskPassword: "Establecer contraseña de quiosco", enterKioskPassword: "Introducir contraseña de quiosco", kioskPassword: "Contraseña", confirmKioskPassword: "Confirmar contraseña", kioskPasswordHint: "Usa al menos 6 caracteres. Esta contraseña solo existe hasta que FREE PREP se cierre o reinicie.", endKioskModePrompt: "Introduce la contraseña usada para iniciar el modo quiosco.", kioskPasswordMismatch: "Las contraseñas no coinciden.", kioskPasswordError: "No se pudo actualizar el modo quiosco.", cancel: "Cancelar"
});
Object.assign(TRANSLATIONS.hi, {
  kioskMode: "कियोस्क मोड", kioskModeDescription: "FREE PREP को फ़ुलस्क्रीन और सबसे ऊपर रखता है, जब तक आप यहां सत्र का पासवर्ड नहीं डालते। FREE PREP को फिर से शुरू करने पर यह मोड समाप्त हो जाता है।", startKioskMode: "कियोस्क मोड शुरू करें", endKioskMode: "कियोस्क मोड समाप्त करें", kioskModeActive: "कियोस्क मोड सक्रिय है।", kioskModeStarted: "कियोस्क मोड शुरू हुआ।", kioskModeEnded: "कियोस्क मोड समाप्त हुआ।", setKioskPassword: "कियोस्क पासवर्ड सेट करें", enterKioskPassword: "कियोस्क पासवर्ड डालें", kioskPassword: "पासवर्ड", confirmKioskPassword: "पासवर्ड की पुष्टि करें", kioskPasswordHint: "कम से कम 6 अक्षर उपयोग करें। यह पासवर्ड केवल FREE PREP बंद या फिर से शुरू होने तक रहता है।", endKioskModePrompt: "कियोस्क मोड शुरू करते समय उपयोग किया गया पासवर्ड डालें।", kioskPasswordMismatch: "पासवर्ड मेल नहीं खाते।", kioskPasswordError: "कियोस्क मोड अपडेट नहीं हो सका।", cancel: "रद्द करें"
});

interface TranslationContextValue {
  language: SystemLanguage;
  setLanguage: (language: SystemLanguage) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

export function SystemLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<SystemLanguage>("en");

  useEffect(() => {
    void loadSettings().then((settings) => setLanguage(settings.language)).catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<TranslationContextValue>(() => ({
    language,
    setLanguage,
    t: (key, values) => translate(language, key, values)
  }), [language]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useSystemLanguage(): TranslationContextValue {
  const context = useContext(TranslationContext);
  if (!context) throw new Error("useSystemLanguage must be used inside SystemLanguageProvider.");
  return context;
}

export function translate(language: SystemLanguage, key: TranslationKey, values?: TranslationValues): string {
  const template = language === "en"
    ? ENGLISH[key]
    : (TRANSLATIONS[language]?.[key] ?? LEGACY_UI_COPY[ENGLISH[key]]?.[language] ?? ENGLISH[key]);
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(values?.[name] ?? `{${name}}`));
}

/** Tutorial targets remain step-specific through the highlighted control; this keeps the guidance localised too. */
export function tutorialFallback(language: SystemLanguage): string {
  const messages: Record<SystemLanguage, string> = {
    en: "Follow the highlighted action to continue.",
    ja: "ハイライトされている操作を行って続行してください。",
    "zh-CN": "请执行高亮显示的操作以继续。",
    "zh-TW": "請執行反白顯示的操作以繼續。",
    es: "Realiza la acción resaltada para continuar.",
    hi: "आगे बढ़ने के लिए हाइलाइट की गई कार्रवाई करें।"
  };
  return messages[language];
}

type UiCopy = Record<Exclude<SystemLanguage, "en">, string>;

/**
 * Legacy pages contain a large amount of static UI copy. Keeping this catalogue at
 * the shell level makes those pages localisable without ever touching SAT question
 * content, which deliberately stays in its imported language.
 */
const LEGACY_UI_COPY: Record<string, UiCopy> = {
  "TOTAL TESTS TAKEN": { ja: "受験回数", "zh-CN": "已完成测试", "zh-TW": "已完成測驗", es: "PRUEBAS REALIZADAS", hi: "कुल टेस्ट" },
  "AVERAGE PRACTICE SCORE": { ja: "平均演習スコア", "zh-CN": "平均练习分数", "zh-TW": "平均練習分數", es: "PUNTUACIÓN MEDIA", hi: "औसत अभ्यास स्कोर" },
  "BEST PRACTICE SCORE": { ja: "最高演習スコア", "zh-CN": "最高练习分数", "zh-TW": "最高練習分數", es: "MEJOR PUNTUACIÓN", hi: "सर्वश्रेष्ठ अभ्यास स्कोर" },
  "REVIEW LIST COUNT": { ja: "復習リスト数", "zh-CN": "复习列表数量", "zh-TW": "複習清單數量", es: "ELEMENTOS DE REPASO", hi: "पुनरावृत्ति सूची संख्या" },
  "AVERAGE RW SCORE": { ja: "RW平均スコア", "zh-CN": "RW 平均分数", "zh-TW": "RW 平均分數", es: "MEDIA DE RW", hi: "औसत RW स्कोर" },
  "AVERAGE MATH SCORE": { ja: "Math平均スコア", "zh-CN": "数学平均分数", "zh-TW": "數學平均分數", es: "MEDIA DE MATEMÁTICAS", hi: "औसत गणित स्कोर" },
  "TOTAL QUESTIONS ANSWERED": { ja: "総解答数", "zh-CN": "已回答题目总数", "zh-TW": "已作答題目總數", es: "PREGUNTAS RESPONDIDAS", hi: "कुल उत्तरित प्रश्न" },
  "TOTAL STUDY TIME": { ja: "総学習時間", "zh-CN": "总学习时间", "zh-TW": "總學習時間", es: "TIEMPO TOTAL DE ESTUDIO", hi: "कुल अध्ययन समय" },
  "RANGE": { ja: "期間", "zh-CN": "范围", "zh-TW": "範圍", es: "RANGO", hi: "अवधि" },
  "SCORE": { ja: "スコア", "zh-CN": "分数", "zh-TW": "分數", es: "PUNTUACIÓN", hi: "स्कोर" },
  "Last 5 attempts": { ja: "直近5回", "zh-CN": "最近 5 次", "zh-TW": "最近 5 次", es: "Últimos 5 intentos", hi: "पिछले 5 प्रयास" },
  "Last 10 attempts": { ja: "直近10回", "zh-CN": "最近 10 次", "zh-TW": "最近 10 次", es: "Últimos 10 intentos", hi: "पिछले 10 प्रयास" },
  "Last 30 days": { ja: "直近30日", "zh-CN": "最近 30 天", "zh-TW": "最近 30 天", es: "Últimos 30 días", hi: "पिछले 30 दिन" },
  "All time": { ja: "全期間", "zh-CN": "所有时间", "zh-TW": "所有時間", es: "Todo el tiempo", hi: "सभी समय" },
  "Total + RW + Math": { ja: "合計 + RW + Math", "zh-CN": "总分 + RW + 数学", "zh-TW": "總分 + RW + 數學", es: "Total + RW + Matemáticas", hi: "कुल + RW + गणित" },
  "Total Practice Score": { ja: "合計演習スコア", "zh-CN": "总练习分数", "zh-TW": "總練習分數", es: "Puntuación total", hi: "कुल अभ्यास स्कोर" },
  "RW Practice Score": { ja: "RW演習スコア", "zh-CN": "RW 练习分数", "zh-TW": "RW 練習分數", es: "Puntuación de RW", hi: "RW अभ्यास स्कोर" },
  "Math Practice Score": { ja: "Math演習スコア", "zh-CN": "数学练习分数", "zh-TW": "數學練習分數", es: "Puntuación de matemáticas", hi: "गणित अभ्यास स्कोर" },
  "Domain Trend Chart": { ja: "分野別推移", "zh-CN": "领域趋势图", "zh-TW": "領域趨勢圖", es: "Tendencia por dominio", hi: "विषय रुझान चार्ट" },
  "Skill Trend Chart": { ja: "スキル別推移", "zh-CN": "技能趋势图", "zh-TW": "技能趨勢圖", es: "Tendencia por habilidad", hi: "कौशल रुझान चार्ट" },
  "Strong Areas": { ja: "得意分野", "zh-CN": "优势领域", "zh-TW": "優勢領域", es: "Áreas fuertes", hi: "मजबूत क्षेत्र" },
  "Visual Question Performance": { ja: "図表問題の成績", "zh-CN": "图形题表现", "zh-TW": "圖形題表現", es: "Rendimiento visual", hi: "दृश्य प्रश्न प्रदर्शन" },
  "Visual Type": { ja: "図表タイプ", "zh-CN": "图形类型", "zh-TW": "圖形類型", es: "Tipo visual", hi: "दृश्य प्रकार" },
  "Weak Areas Now": { ja: "現在の苦手分野", "zh-CN": "当前薄弱领域", "zh-TW": "目前弱項", es: "Áreas débiles actuales", hi: "वर्तमान कमजोर क्षेत्र" },
  "Improved Areas": { ja: "改善した分野", "zh-CN": "已改善领域", "zh-TW": "已改善領域", es: "Áreas mejoradas", hi: "सुधरे हुए क्षेत्र" },
  "Declining Areas": { ja: "低下傾向の分野", "zh-CN": "下降领域", "zh-TW": "下降領域", es: "Áreas en descenso", hi: "गिरते हुए क्षेत्र" },
  "Most Missed Topics": { ja: "最も間違えたトピック", "zh-CN": "最常错主题", "zh-TW": "最常錯主題", es: "Temas más fallados", hi: "सबसे अधिक गलत विषय" },
  "Import a SAT-format CSV": { ja: "SAT形式CSVをインポート", "zh-CN": "导入 SAT 格式 CSV", "zh-TW": "匯入 SAT 格式 CSV", es: "Importar un CSV con formato SAT", hi: "SAT-प्रारूप CSV आयात करें" },
  "Validation": { ja: "検証", "zh-CN": "验证", "zh-TW": "驗證", es: "Validación", hi: "सत्यापन" },
  "Choose CSV files": { ja: "CSVファイルを選択", "zh-CN": "选择 CSV 文件", "zh-TW": "選擇 CSV 檔案", es: "Elegir archivos CSV", hi: "CSV फ़ाइलें चुनें" },
  "Select or drag up to 10 CSV files. Parsed locally with Papa Parse.": { ja: "最大10個のCSVファイルを選択またはドラッグしてください。端末上で解析されます。", "zh-CN": "选择或拖入最多 10 个 CSV 文件。将在本地解析。", "zh-TW": "選擇或拖入最多 10 個 CSV 檔案。將在本機解析。", es: "Selecciona o arrastra hasta 10 archivos CSV. Se analizan localmente.", hi: "अधिकतम 10 CSV फ़ाइलें चुनें या खींचें। इन्हें स्थानीय रूप से पार्स किया जाता है।" },
  "A SAT-format CSV file is required.": { ja: "SAT形式のCSVファイルが必要です。", "zh-CN": "需要 SAT 格式的 CSV 文件。", "zh-TW": "需要 SAT 格式的 CSV 檔案。", es: "Se requiere un archivo CSV con formato SAT.", hi: "SAT-प्रारूप CSV फ़ाइल आवश्यक है।" },
  "Active import": { ja: "現在のインポート", "zh-CN": "当前导入", "zh-TW": "目前匯入", es: "Importación activa", hi: "सक्रिय आयात" },
  "No CSV loaded yet": { ja: "CSVはまだ読み込まれていません", "zh-CN": "尚未加载 CSV", "zh-TW": "尚未載入 CSV", es: "Aún no se ha cargado ningún CSV", hi: "अभी कोई CSV लोड नहीं है" },
  "Question set name": { ja: "問題セット名", "zh-CN": "题集名称", "zh-TW": "題組名稱", es: "Nombre del conjunto", hi: "प्रश्न सेट का नाम" },
  "Description": { ja: "説明", "zh-CN": "说明", "zh-TW": "說明", es: "Descripción", hi: "विवरण" },
  "Next unsaved": { ja: "次の未保存", "zh-CN": "下一个未保存", "zh-TW": "下一個未儲存", es: "Siguiente sin guardar", hi: "अगला असहेजा" },
  "Choose a CSV file before saving.": { ja: "保存する前にCSVファイルを選択してください。", "zh-CN": "请先选择 CSV 文件再保存。", "zh-TW": "請先選擇 CSV 檔案再儲存。", es: "Elige un archivo CSV antes de guardar.", hi: "सहेजने से पहले एक CSV फ़ाइल चुनें।" },
  "Save to SQLite": { ja: "SQLiteに保存", "zh-CN": "保存到 SQLite", "zh-TW": "儲存至 SQLite", es: "Guardar en SQLite", hi: "SQLite में सहेजें" },
  "View Question Sets": { ja: "問題セットを見る", "zh-CN": "查看题集", "zh-TW": "查看題組", es: "Ver conjuntos", hi: "प्रश्न सेट देखें" },
  "Select CSV files to see validation results.": { ja: "CSVファイルを選択すると検証結果が表示されます。", "zh-CN": "选择 CSV 文件以查看验证结果。", "zh-TW": "選擇 CSV 檔案以查看驗證結果。", es: "Selecciona archivos CSV para ver los resultados.", hi: "सत्यापन परिणाम देखने के लिए CSV फ़ाइलें चुनें।" }
  ,"The importer checks headers, route rules, question types, duplicate IDs, and the required full-test, RW-only, or Math-only counts.": { ja: "インポーターはヘッダー、出題ルール、問題形式、重複ID、フルテスト・RWのみ・Mathのみの必要問題数を確認します。", "zh-CN": "导入器会检查标题、路由规则、题型、重复 ID，以及完整测试、仅 RW 或仅数学的题目数量。", "zh-TW": "匯入工具會檢查標頭、路由規則、題型、重複 ID，以及完整測驗、僅 RW 或僅數學的題目數量。", es: "El importador verifica encabezados, reglas de ruta, tipos de pregunta, ID duplicados y los recuentos requeridos.", hi: "आयातक हेडर, रूट नियम, प्रश्न प्रकार, डुप्लिकेट ID और आवश्यक प्रश्न संख्या जांचता है।" },
  "Parsing CSV...": { ja: "CSVを解析中...", "zh-CN": "正在解析 CSV...", "zh-TW": "正在解析 CSV...", es: "Analizando CSV...", hi: "CSV पार्स हो रही है..." },
  "Import queue": { ja: "インポートキュー", "zh-CN": "导入队列", "zh-TW": "匯入佇列", es: "Cola de importación", hi: "आयात कतार" },
  "Import sample set": { ja: "サンプルセットをインポート", "zh-CN": "导入示例题集", "zh-TW": "匯入範例題組", es: "Importar conjunto de ejemplo", hi: "नमूना प्रश्न सेट आयात करें" },
  "Sample full practice set": { ja: "サンプルのフル演習セット", "zh-CN": "示例完整练习题集", "zh-TW": "範例完整練習題組", es: "Conjunto completo de ejemplo", hi: "नमूना पूर्ण अभ्यास सेट" },
  "Import Sample Set": { ja: "サンプルセットをインポート", "zh-CN": "导入示例题集", "zh-TW": "匯入範例題組", es: "Importar conjunto de ejemplo", hi: "नमूना सेट आयात करें" },
  "Loading...": { ja: "読み込み中...", "zh-CN": "正在加载...", "zh-TW": "載入中...", es: "Cargando...", hi: "लोड हो रहा है..." },
  "Parse error": { ja: "解析エラー", "zh-CN": "解析错误", "zh-TW": "解析錯誤", es: "Error de análisis", hi: "पार्स त्रुटि" },
  "Saved": { ja: "保存済み", "zh-CN": "已保存", "zh-TW": "已儲存", es: "Guardado", hi: "सहेजा गया" },
  "Ready": { ja: "準備完了", "zh-CN": "已就绪", "zh-TW": "已就緒", es: "Listo", hi: "तैयार" },
  "Pending": { ja: "待機中", "zh-CN": "等待中", "zh-TW": "等待中", es: "Pendiente", hi: "लंबित" },
  "Now validating:": { ja: "検証中:", "zh-CN": "正在验证:", "zh-TW": "正在驗證:", es: "Validando:", hi: "सत्यापित हो रहा है:" },
  "CSV is valid and ready to save.": { ja: "CSVは有効で、保存できます。", "zh-CN": "CSV 有效，可以保存。", "zh-TW": "CSV 有效，可以儲存。", es: "El CSV es válido y está listo para guardarse.", hi: "CSV मान्य है और सहेजने के लिए तैयार है।" },
  "CSV has mixed preview passwords. It can be saved without preview password protection.": { ja: "CSV内でプレビュー用パスワードが混在しています。パスワード保護なしで保存できます。", "zh-CN": "CSV 中混有不同的预览密码。可以不启用预览密码保护而保存。", "zh-TW": "CSV 中混有不同的預覽密碼。可以不啟用預覽密碼保護而儲存。", es: "El CSV contiene contraseñas de vista previa mezcladas. Puede guardarse sin protección.", hi: "CSV में अलग-अलग प्रीव्यू पासवर्ड हैं। इसे पासवर्ड सुरक्षा के बिना सहेजा जा सकता है।" },
  "CSV has errors that must be fixed before saving.": { ja: "CSVにエラーがあります。保存前に修正してください。", "zh-CN": "CSV 有错误，必须在保存前修复。", "zh-TW": "CSV 有錯誤，必須在儲存前修正。", es: "El CSV tiene errores que deben corregirse antes de guardar.", hi: "CSV में त्रुटियां हैं जिन्हें सहेजने से पहले ठीक करना होगा।" },
  "Detected package": { ja: "検出されたパッケージ", "zh-CN": "检测到的包", "zh-TW": "偵測到的套件", es: "Paquete detectado", hi: "पहचाना गया पैकेज" },
  "Unknown": { ja: "不明", "zh-CN": "未知", "zh-TW": "未知", es: "Desconocido", hi: "अज्ञात" },
  "Rows": { ja: "行数", "zh-CN": "行数", "zh-TW": "列數", es: "Filas", hi: "पंक्तियां" },
  "Sections": { ja: "セクション", "zh-CN": "部分", "zh-TW": "區段", es: "Secciones", hi: "सेक्शन" },
  "Module Counts": { ja: "モジュール別問題数", "zh-CN": "模块数量", "zh-TW": "模組數量", es: "Recuentos por módulo", hi: "मॉड्यूल संख्या" },
  "Package Rows": { ja: "パッケージ行数", "zh-CN": "包行数", "zh-TW": "套件列數", es: "Filas del paquete", hi: "पैकेज पंक्तियां" },
  "Visual Types": { ja: "図表タイプ", "zh-CN": "图形类型", "zh-TW": "圖形類型", es: "Tipos visuales", hi: "दृश्य प्रकार" },
  "Content Domains": { ja: "コンテンツ分野", "zh-CN": "内容领域", "zh-TW": "內容領域", es: "Dominios de contenido", hi: "विषय क्षेत्र" },
  "Skill Groups": { ja: "スキルグループ", "zh-CN": "技能组", "zh-TW": "技能群組", es: "Grupos de habilidades", hi: "कौशल समूह" },
  "Issues": { ja: "問題点", "zh-CN": "问题", "zh-TW": "問題", es: "Problemas", hi: "समस्याएं" },
  "No issues found.": { ja: "問題は見つかりませんでした。", "zh-CN": "未发现问题。", "zh-TW": "未發現問題。", es: "No se encontraron problemas.", hi: "कोई समस्या नहीं मिली।" },
  "No data found.": { ja: "データが見つかりません。", "zh-CN": "未找到数据。", "zh-TW": "找不到資料。", es: "No se encontraron datos.", hi: "कोई डेटा नहीं मिला।" },
  "No trend data yet.": { ja: "推移データはまだありません。", "zh-CN": "暂无趋势数据。", "zh-TW": "尚無趨勢資料。", es: "Aún no hay datos de tendencia.", hi: "अभी कोई रुझान डेटा नहीं है।" },
  "No weakness trend data yet.": { ja: "弱点の推移データはまだありません。", "zh-CN": "暂无薄弱趋势数据。", "zh-TW": "尚無弱項趨勢資料。", es: "Aún no hay datos de tendencia de debilidades.", hi: "अभी कमजोरी रुझान डेटा नहीं है।" },
  "Category": { ja: "カテゴリー", "zh-CN": "类别", "zh-TW": "類別", es: "Categoría", hi: "श्रेणी" },
  "Correct": { ja: "正解", "zh-CN": "正确", "zh-TW": "正確", es: "Correctas", hi: "सही" },
  "Total": { ja: "合計", "zh-CN": "总计", "zh-TW": "總計", es: "Total", hi: "कुल" },
  "Accuracy": { ja: "正答率", "zh-CN": "正确率", "zh-TW": "正確率", es: "Precisión", hi: "सटीकता" },
  "Genre Score": { ja: "分野スコア", "zh-CN": "领域分数", "zh-TW": "領域分數", es: "Puntuación de área", hi: "क्षेत्र स्कोर" },
  "Average Time": { ja: "平均時間", "zh-CN": "平均时间", "zh-TW": "平均時間", es: "Tiempo medio", hi: "औसत समय" },
  "Strength": { ja: "評価", "zh-CN": "强度", "zh-TW": "強度", es: "Nivel", hi: "स्तर" },
  "Strong": { ja: "得意", "zh-CN": "强项", "zh-TW": "強項", es: "Fuerte", hi: "मजबूत" },
  "Needs Review": { ja: "要復習", "zh-CN": "需要复习", "zh-TW": "需要複習", es: "Necesita repaso", hi: "पुनरावृत्ति आवश्यक" },
  "Weak": { ja: "苦手", "zh-CN": "薄弱", "zh-TW": "弱項", es: "Débil", hi: "कमजोर" }
  ,"Question Maker Console": { ja: "問題作成コンソール", "zh-CN": "出题控制台", "zh-TW": "出題控制台", es: "Consola de creación", hi: "प्रश्न निर्माण कंसोल" },
  "Download CSV": { ja: "CSVをダウンロード", "zh-CN": "下载 CSV", "zh-TW": "下載 CSV", es: "Descargar CSV", hi: "CSV डाउनलोड करें" },
  "Downloaded": { ja: "ダウンロード済み", "zh-CN": "已下载", "zh-TW": "已下載", es: "Descargado", hi: "डाउनलोड हो गया" },
  "Saved drafts": { ja: "保存した下書き", "zh-CN": "已保存草稿", "zh-TW": "已儲存草稿", es: "Borradores guardados", hi: "सहेजे गए ड्राफ्ट" },
  "Choose a saved draft": { ja: "保存した下書きを選択", "zh-CN": "选择已保存草稿", "zh-TW": "選擇已儲存草稿", es: "Elige un borrador guardado", hi: "सहेजा गया ड्राफ्ट चुनें" },
  "Choose a local set to edit": { ja: "編集するローカルセットを選択", "zh-CN": "选择要编辑的本地题集", "zh-TW": "選擇要編輯的本機題組", es: "Elige un conjunto local para editar", hi: "संपादित करने के लिए स्थानीय सेट चुनें" },
  "Save draft": { ja: "下書きを保存", "zh-CN": "保存草稿", "zh-TW": "儲存草稿", es: "Guardar borrador", hi: "ड्राफ्ट सहेजें" },
  "Saving draft...": { ja: "下書きを保存中...", "zh-CN": "正在保存草稿...", "zh-TW": "正在儲存草稿...", es: "Guardando borrador...", hi: "ड्राफ्ट सहेजा जा रहा है..." },
  "Draft saved": { ja: "下書きを保存しました", "zh-CN": "草稿已保存", "zh-TW": "草稿已儲存", es: "Borrador guardado", hi: "ड्राफ्ट सहेजा गया" },
  "Save changes": { ja: "変更を保存", "zh-CN": "保存更改", "zh-TW": "儲存變更", es: "Guardar cambios", hi: "बदलाव सहेजें" },
  "Saving changes...": { ja: "変更を保存中...", "zh-CN": "正在保存更改...", "zh-TW": "正在儲存變更...", es: "Guardando cambios...", hi: "बदलाव सहेजे जा रहे हैं..." },
  "Changes saved": { ja: "変更を保存しました", "zh-CN": "更改已保存", "zh-TW": "變更已儲存", es: "Cambios guardados", hi: "बदलाव सहेजे गए" },
  "Questions": { ja: "問題", "zh-CN": "题目", "zh-TW": "題目", es: "Preguntas", hi: "प्रश्न" },
  "Question slots": { ja: "問題スロット", "zh-CN": "题目位置", "zh-TW": "題目位置", es: "Espacios de preguntas", hi: "प्रश्न स्लॉट" },
  "Type": { ja: "形式", "zh-CN": "类型", "zh-TW": "類型", es: "Tipo", hi: "प्रकार" },
  "Difficulty": { ja: "難易度", "zh-CN": "难度", "zh-TW": "難度", es: "Dificultad", hi: "कठिनाई" },
  "Passage": { ja: "文章", "zh-CN": "文章", "zh-TW": "文章", es: "Pasaje", hi: "文章" },
  "Question": { ja: "問題", "zh-CN": "题目", "zh-TW": "題目", es: "Pregunta", hi: "प्रश्न" },
  "Correct answer": { ja: "正解", "zh-CN": "正确答案", "zh-TW": "正確答案", es: "Respuesta correcta", hi: "सही उत्तर" },
  "Correct numeric answer": { ja: "正しい数値解答", "zh-CN": "正确数值答案", "zh-TW": "正確數值答案", es: "Respuesta numérica correcta", hi: "सही संख्यात्मक उत्तर" },
  "Answer tolerance": { ja: "解答の許容誤差", "zh-CN": "答案容差", "zh-TW": "答案容差", es: "Tolerancia de respuesta", hi: "उत्तर सहनशीलता" },
  "Visual / diagram": { ja: "図・ダイアグラム", "zh-CN": "图形／示意图", "zh-TW": "圖形／示意圖", es: "Visual / diagrama", hi: "दृश्य / आरेख" },
  "Visual type": { ja: "図表タイプ", "zh-CN": "图形类型", "zh-TW": "圖形類型", es: "Tipo visual", hi: "दृश्य प्रकार" },
  "Equation LaTeX": { ja: "数式LaTeX", "zh-CN": "公式 LaTeX", "zh-TW": "公式 LaTeX", es: "LaTeX de ecuación", hi: "समीकरण LaTeX" },
  "Table markdown": { ja: "表のMarkdown", "zh-CN": "表格 Markdown", "zh-TW": "表格 Markdown", es: "Markdown de tabla", hi: "तालिका Markdown" },
  "Visual JSON": { ja: "図表JSON", "zh-CN": "图形 JSON", "zh-TW": "圖形 JSON", es: "JSON visual", hi: "दृश्य JSON" },
  "Explanation": { ja: "解説", "zh-CN": "解析", "zh-TW": "解析", es: "Explicación", hi: "व्याख्या" },
  "Content domain": { ja: "コンテンツ分野", "zh-CN": "内容领域", "zh-TW": "內容領域", es: "Dominio de contenido", hi: "विषय क्षेत्र" },
  "Skill group": { ja: "スキルグループ", "zh-CN": "技能组", "zh-TW": "技能群組", es: "Grupo de habilidades", hi: "कौशल समूह" },
  "Tags": { ja: "タグ", "zh-CN": "标签", "zh-TW": "標籤", es: "Etiquetas", hi: "टैग" },
  "CSV validation": { ja: "CSV検証", "zh-CN": "CSV 验证", "zh-TW": "CSV 驗證", es: "Validación de CSV", hi: "CSV सत्यापन" },
  "Fix the issues below.": { ja: "以下の問題を修正してください。", "zh-CN": "请修复以下问题。", "zh-TW": "請修正以下問題。", es: "Corrige los problemas siguientes.", hi: "नीचे दी गई समस्याएं ठीक करें।" },
  "Preview": { ja: "プレビュー", "zh-CN": "预览", "zh-TW": "預覽", es: "Vista previa", hi: "पूर्वावलोकन" },
  "Diagram controls": { ja: "図形コントロール", "zh-CN": "图形控件", "zh-TW": "圖形控制項", es: "Controles del diagrama", hi: "आरेख नियंत्रण" },
  "These fields update Visual JSON. Direct JSON editing still works.": { ja: "これらの入力欄は図表JSONを更新します。JSONの直接編集も利用できます。", "zh-CN": "这些字段会更新图形 JSON，仍可直接编辑 JSON。", "zh-TW": "這些欄位會更新圖形 JSON，仍可直接編輯 JSON。", es: "Estos campos actualizan el JSON visual. La edición directa sigue disponible.", hi: "ये फ़ील्ड दृश्य JSON को अपडेट करते हैं। सीधे JSON संपादन भी उपलब्ध है।" },
  "No visual": { ja: "図表なし", "zh-CN": "无图形", "zh-TW": "無圖形", es: "Sin visual", hi: "कोई दृश्य नहीं" },
  "Right triangle": { ja: "直角三角形", "zh-CN": "直角三角形", "zh-TW": "直角三角形", es: "Triángulo rectángulo", hi: "समकोण त्रिभुज" },
  "Triangle": { ja: "三角形", "zh-CN": "三角形", "zh-TW": "三角形", es: "Triángulo", hi: "त्रिभुज" },
  "Rectangle": { ja: "長方形", "zh-CN": "矩形", "zh-TW": "長方形", es: "Rectángulo", hi: "आयत" },
  "Circle": { ja: "円", "zh-CN": "圆", "zh-TW": "圓", es: "Círculo", hi: "वृत्त" },
  "Number line": { ja: "数直線", "zh-CN": "数轴", "zh-TW": "數線", es: "Recta numérica", hi: "संख्या रेखा" },
  "Coordinate plane": { ja: "座標平面", "zh-CN": "坐标平面", "zh-TW": "座標平面", es: "Plano de coordenadas", hi: "निर्देशांक तल" },
  "Function graph": { ja: "関数グラフ", "zh-CN": "函数图像", "zh-TW": "函數圖形", es: "Gráfica de función", hi: "फलन ग्राफ" },
  "Line graph": { ja: "折れ線グラフ", "zh-CN": "折线图", "zh-TW": "折線圖", es: "Gráfico de líneas", hi: "रेखा ग्राफ" },
  "Bar graph": { ja: "棒グラフ", "zh-CN": "柱状图", "zh-TW": "長條圖", es: "Gráfico de barras", hi: "बार ग्राफ" },
  "Scatter plot": { ja: "散布図", "zh-CN": "散点图", "zh-TW": "散佈圖", es: "Diagrama de dispersión", hi: "बिंदु आरेख" },
  "Table": { ja: "表", "zh-CN": "表格", "zh-TW": "表格", es: "Tabla", hi: "तालिका" },
  "Question Set Preview": { ja: "問題セットのプレビュー", "zh-CN": "题集预览", "zh-TW": "題組預覽", es: "Vista previa del conjunto", hi: "प्रश्न सेट पूर्वावलोकन" },
  "Test Overview": { ja: "テスト概要", "zh-CN": "测试概览", "zh-TW": "測驗總覽", es: "Resumen de la prueba", hi: "टेस्ट अवलोकन" },
  "Rules and Tools": { ja: "ルールとツール", "zh-CN": "规则和工具", "zh-TW": "規則和工具", es: "Reglas y herramientas", hi: "नियम और उपकरण" },
  "Device Check": { ja: "デバイスチェック", "zh-CN": "设备检查", "zh-TW": "裝置檢查", es: "Comprobación del dispositivo", hi: "डिवाइस जांच" },
  "Test Setup": { ja: "テスト設定", "zh-CN": "测试设置", "zh-TW": "測驗設定", es: "Configuración de la prueba", hi: "टेस्ट सेटअप" },
  "Practice Test": { ja: "演習テスト", "zh-CN": "练习测试", "zh-TW": "練習測驗", es: "Prueba práctica", hi: "अभ्यास टेस्ट" },
  "Module Review": { ja: "モジュールの確認", "zh-CN": "模块检查", "zh-TW": "模組檢查", es: "Revisión del módulo", hi: "मॉड्यूल समीक्षा" },
  "Section Break": { ja: "セクション休憩", "zh-CN": "部分休息", "zh-TW": "區段休息", es: "Descanso de sección", hi: "सेक्शन विराम" },
  "Result": { ja: "結果", "zh-CN": "结果", "zh-TW": "結果", es: "Resultado", hi: "परिणाम" },
  "Review Answers": { ja: "解答を確認", "zh-CN": "查看答案", "zh-TW": "查看答案", es: "Revisar respuestas", hi: "उत्तर समीक्षा" },
  "Review List Practice": { ja: "復習リスト演習", "zh-CN": "复习列表练习", "zh-TW": "複習清單練習", es: "Práctica de lista de repaso", hi: "पुनरावृत्ति सूची अभ्यास" },
  "Focused Practice": { ja: "集中演習", "zh-CN": "针对性练习", "zh-TW": "重點練習", es: "Práctica enfocada", hi: "केंद्रित अभ्यास" }
};

const originalText = new WeakMap<Text, string>();
const lastRenderedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

export function SystemUiLocalizer({ children }: { children: ReactNode }) {
  const { language } = useSystemLanguage();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let queued = false;
    const localize = () => localizeSystemUi(root, language);
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        localize();
      });
    });
    localize();
    observer.observe(root, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  return <div className="contents" ref={rootRef}>{children}</div>;
}

function localizeSystemUi(root: HTMLElement, language: SystemLanguage): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  for (const node of textNodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest("[data-no-localize]") || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) continue;
    const previous = lastRenderedText.get(node);
    if (!originalText.has(node) || (previous !== undefined && node.data !== previous)) originalText.set(node, node.data);
    const source = originalText.get(node) ?? node.data;
    const translated = localizeUiString(source, language);
    if (node.data !== translated) node.data = translated;
    lastRenderedText.set(node, translated);
  }

  root.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label]").forEach((element) => {
    if (element.closest("[data-no-localize]")) return;
    const stored = originalAttributes.get(element) ?? new Map<string, string>();
    ["placeholder", "title", "aria-label"].forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (current === null) return;
      if (!stored.has(attribute)) stored.set(attribute, current);
      element.setAttribute(attribute, localizeUiString(stored.get(attribute) ?? current, language));
    });
    originalAttributes.set(element, stored);
  });
}

function localizeUiString(value: string, language: SystemLanguage): string {
  if (language === "en") return value;
  const trimmed = value.trim();
  const templates = localizeUiTemplate(trimmed, language);
  if (templates) {
    const prefix = value.slice(0, value.indexOf(trimmed));
    const suffix = value.slice(value.indexOf(trimmed) + trimmed.length);
    return `${prefix}${templates}${suffix}`;
  }
  const translated = LEGACY_UI_COPY[trimmed]?.[language];
  if (!translated) return value;
  const prefix = value.slice(0, value.indexOf(trimmed));
  const suffix = value.slice(value.indexOf(trimmed) + trimmed.length);
  return `${prefix}${translated}${suffix}`;
}

function localizeUiTemplate(value: string, language: SystemLanguage): string | null {
  const targetLanguage = language as Exclude<SystemLanguage, "en">;
  const queued = value.match(/^(\d+) CSV files? queued$/);
  if (queued) {
    const count = queued[1];
    return ({ ja: `${count}個のCSVファイルをキューに追加`, "zh-CN": `已排队 ${count} 个 CSV 文件`, "zh-TW": `已排入 ${count} 個 CSV 檔案`, es: `${count} archivos CSV en cola`, hi: `${count} CSV फ़ाइलें कतार में` })[targetLanguage] ?? null;
  }
  const filesInSession = value.match(/^(\d+) files? in this session$/);
  if (filesInSession) {
    const count = filesInSession[1];
    return ({ ja: `このセッションでは${count}件`, "zh-CN": `本次会话中有 ${count} 个文件`, "zh-TW": `本次工作階段有 ${count} 個檔案`, es: `${count} archivos en esta sesión`, hi: `इस सत्र में ${count} फ़ाइलें` })[targetLanguage] ?? null;
  }
  const maxBatch = value.match(/^(\d+) max per batch$/);
  if (maxBatch) {
    const count = maxBatch[1];
    return ({ ja: `1回につき最大${count}件`, "zh-CN": `每批最多 ${count} 个`, "zh-TW": `每批最多 ${count} 個`, es: `${count} como máximo por lote`, hi: `प्रति बैच अधिकतम ${count}` })[targetLanguage] ?? null;
  }
  return null;
}
