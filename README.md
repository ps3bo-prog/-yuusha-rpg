# 勇者の冒険 REAL v13.4 LIVE AI

今回のエラー:
`ReferenceError: Cannot access 'equippedSet' before initialization`

原因:
- 初期 `equipWeapon('sword')` が早い位置で実行されていた
- `equipWeapon()` → `refreshMenus()` が呼ばれる
- `refreshMenus()` が `equippedSet` / ITEM_DB / inventory などを参照
- それらの初期化前だったためJavaScriptが停止

修正:
- 初期武器装備を、全データ・UI関数の初期化後へ移動
- baseCamp初期化順序の修正を維持
- LIVE AI初期化順序の修正を維持
- 起動エラー表示を維持
- 過去セーブデータの読み込み互換を維持

GitHub Pagesの `index.html` をこの版に差し替えてCommitしてください。
確認URL末尾に `?v=134` を付けてください。
