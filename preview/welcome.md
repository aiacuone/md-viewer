# Welcome

This notebook is the public preview of MD Viewer. Nothing here is a git repository, and the buttons that would save, commit, or call DeepSeek stay off until you sign in. The pages themselves are real markdown, rendered the same way a signed-in repo is rendered.

Open a folder in the list below, then open a file. Links inside a page stay inside the preview.

## Why markdown

A note written in markdown is still a text file. You can read it in this app, in an editor, or in `git diff`, and the structure (headings, lists, tables, links) is part of the text rather than a separate format.

- [Why it works](markdown/why-it-works.md) is the argument: plain text, diffs, folders as topics, and what you give up.
- [A long note](markdown/long-note.md) is one file long enough to scroll, using the constructs the preview actually renders.
- Shorter samples live under [markdown/samples](markdown/samples/lists-and-tasks.md): lists and tasks, tables, and code.

## The app

MD Viewer is a small SvelteKit app for markdown that already lives in git. You browse a clone, edit in the browser, and commit back to the remote.

- [What it is](app/overview.md)
- Features: [browse and edit](app/features/browse-and-edit.md), [sync](app/features/sync.md), [AI](app/features/AI.md)
- Building it: [stack](app/build/stack.md), [challenges](app/build/challenges.md), [running it](app/build/running-it.md)
