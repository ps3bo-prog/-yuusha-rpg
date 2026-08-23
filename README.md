# REAL v19.2 CACHE RESET SAFE

この版は、古いPWA Service Worker / Cache Storageが過去のindex.htmlを返し続ける問題を除去するための救済版です。

## GitHubで必ず差し替える2ファイル
1. `index.html`
2. `service-worker.js`

古い `service-worker.js` を残したまま `index.html` だけ更新すると、古いゲームがキャッシュから返される場合があります。

## 公開後
Safariを一度完全に閉じてから開き直し、URL末尾を

`?v=192&clean=1`

にしてください。

v19.2の `service-worker.js` は、既存キャッシュを削除し、自分自身の登録も解除するための一時的な「自爆型」Service Workerです。

正常起動後はこのまま置いても構いませんが、将来PWAを復活させる場合は新しいService Worker設計へ置き換えてください。
