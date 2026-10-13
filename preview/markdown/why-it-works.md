# Why markdown works

Markdown is a writing convention for plain text. A heading is a line that starts with `#`. A list is a line that starts with `-`. A link is `[label](path)`. There is no document object, no style run, and no application required to recover the words.

That is the advantage. Everything else in this notebook is a consequence of it.

## The file is the note

A rich editor stores a note as a package: XML, a database row, or a binary blob with an embedded preview. Opening it later depends on the program that wrote it. Markdown stores the note as the text you already see. Rename the file, move it to another disk, or open it in a pager, and the note is still there.

MD Viewer leans on that. The tree is the folder tree of a git clone. A file named `why-it-works.md` is the note. There is no second index of titles to keep in sync, except the optional YAML front matter some files carry, and the preview strips that block before rendering so the page starts at the first heading.

```yaml
---
title: Why markdown works
tags: [markdown, notes]
---
```

The front matter is metadata for tools. It is not the note.

## Structure is visible in the source

Headings, lists, and tables are characters, so the outline of a long page is visible before it is rendered. A reader who has never used this app can still see where a section starts. A diff of two versions shows the section that changed, not a compressed binary delta.

Compare that with a typical word-processor file:

| | Markdown | A rich document |
|---|---|---|
| What is stored | The words and the marks | A package the app interprets |
| Diff | A line-level text diff | Often opaque |
| Move to another tool | Copy the file | Export, and lose something |
| Conflict | Two people edited lines | Two people edited a blob |

The cost is that layout is limited. Markdown will not place a figure at an exact coordinate, and it will not keep a pixel-perfect page. For notes, that limit is the feature. The page cannot drift into a design you have to maintain.

## Folders are the taxonomy

A database notes app asks you to tag, backlink, and query. Those are useful, and they are also a second system that has to be migrated when you leave. A folder of markdown files is a taxonomy you can see:

```text
markdown/
  why-it-works.md
  long-note.md
  samples/
    lists-and-tasks.md
    tables.md
    code-and-quotes.md
```

Nesting means a topic can contain a topic. This preview is itself the demonstration: `app/features/` and `app/build/` are two levels under `app/`, and each file is one subject. You do not search a proprietary index to find them. You open the folder.

Links then connect notes that should not be nested under each other. From here, the long example is [A long note](long-note.md), and the app write-up starts at [What it is](../app/overview.md). The link target is a relative path. The viewer rewrites `*.md` links so they open inside the app instead of downloading a file.

## Git is a good store for this kind of text

Because the note is text, git is not a backup format bolted on afterwards. It is a reasonable history of the note.

- A commit is a snapshot of the files you changed, with a message.
- `git diff` is a reading of what the prose did, line by line.
- Two machines can each commit. When the histories diverge, the conflict is in lines of text, which a person (or a careful merge) can still read.
- The remote is a normal git host. The notes are not trapped in an account that only one vendor can export.

MD Viewer uses that model directly. Save writes the working tree. Commit records it. Push sends the branch. Pull fast-forwards when the remote is strictly ahead. The awkward case, both sides having commits the other lacks, is described in [Sync](../app/features/sync.md) and [Challenges](../app/build/challenges.md).

## What you give up

Markdown is a poor fit when the artifact is the layout.

- Precise typography, multi-column pages, and positioned figures belong in a typesetting tool.
- A spreadsheet is a better table when the cells are computed. A markdown table is for reading a small grid, as in [Tables](samples/tables.md).
- Simultaneous editing of the same paragraph is clumsy. Git will show a conflict; it will not merge keystrokes.
- The syntax has dialects. Tables, task lists, and strikethrough are GitHub-flavoured markdown. This app renders with [marked](https://marked.js.org/), which treats those as part of the default. A file full of another dialect's extensions may look plainer here than it did where it was written.

For a personal notebook that should still be a folder of files in ten years, the trade is worth it. The long page next to this one is there so you can see the result, not only the argument: [A long note](long-note.md).
