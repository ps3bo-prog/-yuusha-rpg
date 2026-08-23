# Safari公開用Webアプリ

このフォルダをそのまま静的Webホスティングへアップロードしてください。

## 最短で公開する方法
### GitHub Pages
1. 新しいGitHubリポジトリを作成
2. このフォルダ内のファイルをアップロード
3. Settings → Pages
4. Deploy from a branch を選択
5. main / root を選択
6. 公開URLをSafariで開く

### Netlify
1. Netlifyへログイン
2. このフォルダをドラッグ＆ドロップ
3. 発行されたHTTPS URLをSafariで開く

## iPhone
Safariで公開URLを開き、
共有 → ホーム画面に追加
でアプリのように起動できます。

## 重要
SafariでのWebアプリ動作には、file:// ではなく HTTPS で配信する必要があります。
Service WorkerもHTTPS配信時に有効になります。
