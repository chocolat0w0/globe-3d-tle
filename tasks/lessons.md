# Lessons Learned

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
