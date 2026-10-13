# Sync

Sync is git, exposed as a few actions. The server talks to the remote with [isomorphic-git](https://isomorphic-git.org/) over HTTPS. There is no `git` binary on the request path.

## The status line

The trigger on a repo shows the branch and a short status:

- `clean` when the working tree matches the index and `HEAD`
- `N uncommitted` when files differ
- `ahead N` when the local branch has commits the remote does not
- `behind N` when the remote has commits the local branch does not

Ahead and behind can both be set. That is the diverged case below.

## Commit and push

Commit takes a message and commits the changes in the working tree, using the author name and email from Settings. "Commit + push" then pushes that branch.

Push needs a personal access token in Settings. The token is sent as the HTTP password with username `x-access-token`, which GitHub accepts and which many GitLab and Gitea HTTPS remotes also accept. A 401 or 403 becomes "check the token under Settings" rather than the raw client error.

A push that is not a fast-forward is rejected. The message tells you to pull first. The app does not force-push from the normal push button. Force-push exists only as the "keep this device" resolve, and it asks for confirmation because remote-only commits are then lost.

## Pull

Pull is deliberately narrow.

1. If the working tree is dirty, pull stops. Commit or discard first.
2. The server fetches the remote.
3. If ahead and behind are both greater than zero, pull stops with `HISTORIES_DIVERGED`.
4. If the branch is only ahead, pull stops and tells you to push.
5. If the branch is only behind, the server fast-forwards.

There is no merge commit from the Pull button, and no conflict markers left in the files. That choice is explained in [Challenges](../build/challenges.md).

Opening a repo can also fetch and fast-forward on its own when the tree is clean and the branch is strictly behind. If that fetch fails, the page still loads with the status it has.

## When the histories diverge

Divergence means each side has commits the other does not. A fast-forward cannot express that. The sync dialog offers three strategies. If DeepSeek is configured, the titles and summaries can be written for this particular ahead/behind pair. If it is not, the same three strategies are still offered with fixed wording.

| Strategy | What happens |
|---|---|
| Use remote | Local-only commits are dropped. The branch is reset to `origin/<branch>` and checked out. |
| Keep this device | Force-push. Remote-only commits are overwritten. The dialog asks you to confirm. |
| AI merge both | DeepSeek sees the files that differ between the two commits and proposes contents. The server writes those files and creates one commit with both the local commit and the remote commit as parents, then that result can be pushed. |

The merge does not put the clone into a conflicted index. The server walks the two trees, collects paths whose blobs differ, and asks the model for a resolution per file. Applying it requires a clean working tree.

The convert flow, which is the other DeepSeek feature, is [Convert and resolve](convert.md).
