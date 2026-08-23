# 勇者の冒険 REAL v14 STABLE + SELF HEAL AI

JavaScript構文チェック: PASS

初期化順チェック:
- baseCamp → baseCampBuild: PASS (222 → 231)
- equippedSet → bootGame: PASS (346 → 947)
- liveAI → enemy spawn: PASS (351 → 383)
- refreshMenus → bootGame: PASS (841 → 947)
- SELF_HEAL → bootGame: PASS (399 → 947)

SELF HEAL AI:
- 実行時エラーをゲーム内記録
- 問題が出たサブシステムのみ自動隔離
- SAFE MODE再起動
- 壊れたセーブの隔離/バックアップ
- LIVE AI/敵/仲間/HUD/ミニマップ/ワールドイベント/レンダラー個別監視
- ゲーム内🛠️メニューから状態確認・再起動

GitHub Pagesでは index.html を差し替えてCommitしてください。
通常確認: ?v=14
安全モード: ?v=14&safe=1
