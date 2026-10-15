# Sync

Sync is git, as a few actions. The server talks to the remote with [isomorphic-git](https://isomorphic-git.org/) over HTTPS. There is no `git` binary on the request path.

## Status

The repo trigger shows the branch and a short status: `clean`, `N uncommitted`, `ahead N`, or `behind N`. Ahead and behind can both be set. That is the diverged case below.

## Commit and push

Commit uses the author name and email from Settings. "Commit + push" then pushes that branch.

Push needs a personal access token in Settings, sent as the HTTP password with username `x-access-token`. A 401 or 403 becomes "check the token under Settings".

A push that is not a fast-forward is rejected, and the message tells you to pull first. The normal push button does not force-push. Force-push exists only as the "keep this device" resolve, and it asks for confirmation because remote-only commits are then lost.

## Pull

Pull is narrow.

1. A dirty working tree stops it. Commit or discard first.
2. The server fetches.
3. If the branch is both ahead and behind, pull stops with `HISTORIES_DIVERGED`.
4. If it is only ahead, pull tells you to push.
5. If it is only behind, the server fast-forwards.

Pull does not create a merge commit or leave conflict markers. That choice is explained in [Challenges](../build/challenges.md). Opening a repo can also fetch and fast-forward when the tree is clean and the branch is strictly behind. Folder and file browsing reuse that check for about 30 seconds. A save, commit, push, pull, or delete drops it, and Pull always fetches.

## When histories diverge

Each side has commits the other does not, so a fast-forward cannot join them. If DeepSeek is configured, it can write the titles and summaries for this ahead/behind pair. If it is not, the same three strategies are offered with fixed wording.

| Strategy | What happens |
|---|---|
| Use remote | Local-only commits are dropped. The branch resets to `origin/<branch>`. |
| Keep this device | Force-push. Remote-only commits are overwritten, after you confirm. |
| AI merge both | DeepSeek proposes contents for files that differ. The server writes them and commits with both sides as parents, then that result can be pushed. |

The merge does not leave a conflicted index. The server compares the two trees and asks the model for a resolution per changed file. Applying it needs a clean working tree.

How those calls work is [AI](AI.md).
