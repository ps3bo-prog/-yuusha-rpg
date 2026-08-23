# 勇者の冒険 REAL v13.3 LIVE AI

今回のエラー:
`ReferenceError: Cannot access 'baseCamp' before initialization`

原因:
- `baseCampBuild()` が `baseCamp` の宣言より先に実行されていたため、JavaScriptが停止していました。

修正:
- `baseCamp` を `baseCampBuild()` より前に初期化
- v13.2の起動順序修正とエラー表示機能も維持
- LIVE AI / アイテム / 職業 / ユニークスキル / 採掘 / 建築 / 自由カメラを維持
- 過去のセーブデータ読み込み互換を維持

GitHub Pagesの `index.html` をこの版に差し替えてCommitしてください。
確認時はURL末尾に `?v=133` を付けてください。
