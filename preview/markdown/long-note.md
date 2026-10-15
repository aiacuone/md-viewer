# A long note

This file is long on purpose. The preview should show what a real page does when it has more than a heading and a paragraph: several levels of heading, a list you have to scan, a table, a quotation, a block of code, and links back to the shorter notes around it.

The subject is the same as [Why it works](why-it-works.md). Here the structure is the demonstration.

## A notebook is a directory

Treat one repository as the notebook and one folder as a subject. A file is one sitting: something you can finish, link to, and diff. When a sitting grows until the headings no longer belong together, split it. The split is a new file and a link, not a new database row.

This preview is arranged that way.

1. `welcome.md` is the map.
2. `markdown/` argues for the format and shows how it renders.
3. `markdown/samples/` isolates one construct per file, so a quick look does not require this whole page.
4. `app/` describes the program that is rendering the page you are reading.
5. `app/features/` and `app/build/` are a second level of nesting, which is as deep as this sample goes.

Nothing in that list is metadata stored beside the files. The list is the files.

### What goes in a single file

A file earns its length when one question holds it together. This one asks how a long markdown note should be shaped so it is still readable in source and in the preview.

- Open with the point, not with a table of contents that duplicates the headings.
- Use a second-level heading for a section you might link to or split out later.
- Use a third-level heading for a step inside that section.
- Keep a fourth-level heading rare. If you need it often, the page is two pages.

#### A fourth-level heading

It still renders. In a notes app it is a sign to stop subdividing and start a new file, for example [Lists and tasks](samples/lists-and-tasks.md) rather than another layer here.

## Prose, emphasis, and asides

Paragraphs should stay short enough to re-read in a diff. One idea, then a break. **Bold** is for a term you will use again, or for a warning. *Italic* is for a title or a word used as a word, such as the mark `*` itself. `Inline code` is for file names, commands, and identifiers: `renderMarkdown`, `preview/markdown/long-note.md`, `npm run build`.

An aside that is not part of the argument belongs in a quotation:

> The file is the note. If the program that renders it disappears, the folder should still make sense.

That sentence is also the test for a feature in MD Viewer. Favourites, the default repo, and the DeepSeek key are app state. They live in `data/settings.json` on the machine that runs the app, not inside the markdown, so a clone of the notes does not depend on them.

Strikethrough marks a claim you withdrew but want to leave visible: ~~the preview stores your edits~~. It does not. In this preview, Save, Commit, and AI are shown and disabled.

## A list you can actually use

The daily shape of a notebook is a list. Markdown keeps the list in the source, so reordering is a matter of moving lines.

### Unordered

- Capture a thought in the folder you will look in later, not in an inbox you have to file.
- Prefer a link to a copy. [Sync](../app/features/sync.md) should be described once.
- When a bullet grows a paragraph, promote it to a heading.

Nested bullets are for parts, not for a second essay:

- A commit
  - A message that says why
  - The files in the working tree that you meant to include
  - A remote that can receive the push
- A pull
  - A clean working tree
  - A remote that is strictly ahead
  - A fast-forward, not a merge you then have to finish by hand

### Ordered

Use numbers when the order is the content.

1. Write the note in the folder it belongs to.
2. Read it in the preview. Fix headings that do not scan.
3. Save, which writes the working tree and does not yet publish anything.
4. Commit, with a message a later reader can use.
5. Push, so the other machine can pull.

### Tasks

Task lists are a GitHub-flavoured extension. Marked renders them as checkboxes. They are a good fit for a personal list that is not worth a tracker.

- [x] Keep the note as a file
- [x] Link it from the map in `welcome.md`
- [ ] Split anything that no longer answers the question in the first paragraph
- [ ] Delete a section rather than leave a heading with nothing under it

More of this pattern is in [Lists and tasks](samples/lists-and-tasks.md).

## A small table

A table is for a grid you will read, not for data you will sum. This one is the decision between leaving a section here and moving it.

| Signal | Leave it in this file | Move it |
|---|---|---|
| It supports the first paragraph | Yes | |
| It is a different question | | Yes, and link it |
| It is mostly syntax | | Yes, under `samples/` |
| It is three lines | Yes | |
| It has its own headings | | Yes |

The samples are the result of that test. [Tables](samples/tables.md) has more than one grid. [Code and quotes](samples/code-and-quotes.md) has the fenced blocks that would have interrupted this section.

## A procedure, shown as code

When the note is a procedure, a fenced block is easier to copy than a paragraph. This is the local development loop for the app, not a command you need to run to read this preview:

```bash
npm install
npm run dev
```

The dev server serves both the signed-in app and this preview. A fenced block can name a language. A markdown example has to be indented or wrapped so the inner fences survive:

```md
## Still a heading

- Still a list
```

Inline, the same idea is `` `npm run dev` ``. A longer note about the stack is [Stack](../app/build/stack.md). The problems that showed up while building the app are [Challenges](../app/build/challenges.md), which is the other long page in this notebook.

## How a change reads later

Suppose this section is rewritten next month. The diff is the old lines and the new lines. A reader who was not present can see that a paragraph moved, or that a bullet was added, without opening a comparison view that only the original app understands.

That is why the app bothers to show a diff at all. Before you commit, you can read the unified diff of the working tree against the last commit, and you can read the unsaved buffer against what is already saved. The implementation is described with the rest of editing in [Browse and edit](../app/features/browse-and-edit.md).

A change that should not be blended into this page is a change of subject. The history of how the app is deployed is a different note: [Running it](../app/build/running-it.md).

## Links are the cross-reference

A long note fails when it tries to contain its neighbours. These are the pages this one deliberately does not repeat:

- [Why it works](why-it-works.md) for the argument in shorter form
- [Lists and tasks](samples/lists-and-tasks.md), [Tables](samples/tables.md), and [Code and quotes](samples/code-and-quotes.md) for one construct at a time
- [What it is](../app/overview.md) for the program
- [Welcome](../welcome.md) to go back to the map

An external link leaves the preview. The renderer marks it to open in a new tab. The markdown site itself is a fair example: [CommonMark](https://commonmark.org/) is the spec the syntax here mostly follows, and the tables and tasks are the GitHub additions on top of it.

## What this page is for

If the preview is doing its job, you have scrolled through one file and seen headings, nested lists, tasks, a table, a quotation, and code, without a toolbar that hides the structure. The source of this page is the same words, with `#` and `-` left in.

The next long page is not about the syntax. It is about building the app that renders it: [Challenges](../app/build/challenges.md).
