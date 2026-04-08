# Lessons Learned

## sandbox環境での gh pr create / git config --global は使えない

### 背景
Claude Code のsandbox環境では `gh pr create` がTLSエラーで失敗する。
macOS Security Frameworkへのアクセスが遮断されるため、`gh` CLIのTLS証明書検証が通らない。
また `git config --global` も `~/.gitconfig` への書き込みが制限されるため実行できない。

### エラー
```
Post "https://api.github.com/graphql": tls: failed to verify certificate: x509: OSStatus -26276
error: could not lock config file /Users/.../.gitconfig: Operation not permitted
```

### ルール
- `gh pr create` は sandbox では使えないと割り切る
- ブランチのpushは `git push https://x-access-token:${GH_TOKEN}@github.com/<owner>/<repo>.git <branch>` で実行する
- PRはブラウザで作成するようユーザーに依頼し、以下のURLを案内する：
  `https://github.com/<owner>/<repo>/compare/main...<branch>?quick_pull=1`
- `GH_CONFIG_DIR` を設定しても TLS 問題は解決しない

---

## Git Worktree では husky の pre-commit フックが動作しない

### 背景
husky の `.husky/pre-commit` に `npm run build` を設定していても、
**Git worktree から `git commit` を実行するとフックがスキップされる**。

### 原因
husky は `core.hooksPath = ".husky"` を設定するが、worktree では
`GIT_DIR` がメインリポジトリの `.git/` ではなく worktree 用の参照ファイルを指す。
そのため相対パス `.husky` の解決に失敗し、フックがサイレントに無視される。

### ルール
**worktree 内でコミットする前に、必ず手動で `npm run build` を実行して型・ビルドエラーがないことを確認する。**

```bash
npm run build && git add ... && git commit ...
```

### 補足
- `npx tsc --noEmit` では不十分。`tsc -b`（`npm run build` 内）はテストファイルを含む
  全プロジェクト参照をチェックするため、`--noEmit` では拾えないエラーが存在する。
- pre-push フックも同様に動作しない可能性がある。
