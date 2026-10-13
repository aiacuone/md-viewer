# Lists and tasks

Lists are the construct you will use most, so they have their own page. The longer argument is [A long note](../long-note.md). This file is only the shapes.

## Bullets

A bullet is one line. Nest only when the child is a part of the parent.

- Repo
  - Remote URL
  - Optional content root, when the notes are a subfolder of a larger repository
  - Default branch, discovered after clone if the name you typed was wrong
- File
  - Path inside the content root
  - Markdown body
  - Optional front matter, removed before render

## Numbers

Numbers are for an order. The source can say `1.` for every item; the renderer numbers them.

1. Clone the remote into `data/repos/` on the machine running the app.
2. Browse the content root.
3. Edit a markdown file and save it to the working tree.
4. Commit, then push.

## Tasks

Checkboxes are GitHub-flavoured markdown. They are stored as text (`[x]` and `[ ]`), so a diff shows which line flipped.

- [x] Preview renders the list
- [x] The source stays readable without the preview
- [ ] Checking a box in the preview writes the file back (it does not; editing happens in the editor after you sign in)

## Mixed

A numbered procedure can contain a bullet where the step has parts.

1. Pull
   - Working tree must be clean
   - Remote must be strictly ahead
   - Otherwise the app refuses and explains which case you are in
2. If both sides have commits the other lacks, open the resolve choices instead of pulling
   - Use the remote, and drop local-only commits
   - Keep this device, and force-push
   - Ask DeepSeek for a merge of the two sides

Those three choices are written up in [Sync](../../app/features/sync.md).
