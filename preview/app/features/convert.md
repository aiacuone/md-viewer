# Convert and resolve

Two features call DeepSeek. Both are off in this preview. Both require an API key under Settings, and both fail with a clear message when the key is missing or the network call does not succeed.

The model name in the server is `deepseek-flash`. Requests go to `https://api.deepseek.com/chat/completions` with JSON mode where the reply has to be an object. Temperature defaults to `0.3`. The system prompt tells the model not to invent facts and not to wrap the markdown in fences.

## Convert

Convert starts from pasted text and the folder you currently have open.

- **New file.** The model returns markdown, a kebab-case filename, and a short title. The server sanitises the filename so it cannot contain a path. You can read the result, switch to a rendered preview of that result, and edit the wording before it is written.
- **Append.** The paste is folded into an existing note instead of a new file.
- **Adjust.** A follow-up instruction revises the current markdown. The prompt says to apply only that change and to keep YAML front matter unless the instruction asks to change it.

Front matter, when the model adds it, looks like this:

```yaml
---
title: Short title
date: 2026-10-13
source: pasted
tags: []
---
```

The file viewer strips that block before rendering, so the reading view starts at the first real line.

Convert does not commit. The new or updated file lands in the working tree, like a save, and waits for the commit dialog.

## Resolve

Resolve runs only when a fetch shows the branch is both ahead and behind, and the working tree is clean. The options request sends DeepSeek the ahead and behind counts and a bounded view of the two sides. The reply is a list of choices. Each choice must use one of three strategies the server already knows how to perform: `keep_remote`, `keep_local`, or `ai_merge`. If the model returns fewer than two usable options, the server substitutes the fixed list.

Applying `ai_merge` is a second step. The server lists files whose blobs differ between `HEAD` and `origin/<branch>`, within the content root, and the model proposes the contents. The commit that records the result has two parents, so later history shows the join instead of a rewritten branch.

`keep_local` is the dangerous one. It force-pushes. The UI asks before it runs, and the summary says that remote-only commits will be lost.

If DeepSeek cannot be reached, or the key is rejected, the sync dialog still explains the failure. It does not invent a merge.

The surrounding git rules are [Sync](sync.md). Why the app refuses to run a normal merge is [Challenges](../build/challenges.md).
