# AI

Two signed-in actions call DeepSeek. Both are off in this preview. Both need an API key under Settings, and both say so when the key is missing or the call fails.

The browser never sees the key. The server posts to `https://api.deepseek.com/chat/completions` as `deepseek-flash`. Temperature defaults to `0.3`. When the reply has to be an object, the request asks for JSON. The prompt says not to invent facts and not to wrap markdown in fences.

## Notes

The AI button starts from pasted text and the folder you have open. Nothing is committed. The file lands in the working tree and waits for the commit dialog.

- **New file.** The model returns markdown, a kebab-case filename, and a short title. The server strips any path from the filename. You can preview and edit the result before it is written.
- **Append.** The paste is folded into an existing note.
- **Adjust.** A follow-up instruction revises the current markdown and leaves YAML front matter alone unless you ask to change it.

Front matter, when added, is a `title`, `date`, `source`, and `tags` block. The file viewer strips it before rendering.

## Diverged history

This runs only when a fetch shows the branch is both ahead and behind, and the working tree is clean. DeepSeek sees the counts and a bounded view of both sides, and must answer with `keep_remote`, `keep_local`, or `ai_merge`. Fewer than two usable options, and the server uses a fixed list of the same three.

`ai_merge` is a second call. The server lists files whose blobs differ between `HEAD` and `origin/<branch>`, and the model proposes the contents. The commit has two parents, so later history shows the join.

`keep_local` force-pushes. The UI asks first, and the summary says remote-only commits will be lost.

If DeepSeek cannot be reached, the dialog reports the failure. It does not invent a merge.

The git rules around that dialog are [Sync](sync.md). Why a normal merge is refused is [Challenges](../build/challenges.md).
