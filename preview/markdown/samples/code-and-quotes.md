# Code and quotes

Notes collect commands, errors, and sentences worth keeping intact. Fences and quotations are how markdown does that without leaving the text file.

## A command

The development server:

```bash
npm install
npm run dev
```

Open the preview at `/preview`. The signed-in app is the same server, behind Google sign-in.

## A configuration fragment

The systemd unit on the VM reads a root-owned env file that is not in git. The shape of it, with secrets replaced:

```bash
PUBLIC_ORIGIN=https://your-host.example
AUTH_SECRET=replace-with-a-long-random-string
ALLOWED_EMAILS=you@gmail.com
```

`AUTH_SECRET` only signs the session cookie. The Google client secret and the git token do not belong in a note that you might push. The git token is stored in `data/settings.json` on the server.

## An error, quoted as code

When local and remote have each moved, pull throws a specific failure rather than leaving the clone mid-merge:

```text
Histories have diverged. Choose an AI resolve option, or resolve on another machine.
```

The error carries the code `HISTORIES_DIVERGED`. The client then asks for resolve options. See [AI](../../app/features/AI.md).

## A quotation

A quotation is for a sentence you want set off from the surrounding note. It is not a heading and it is not code.

> Prefer a link to a copy. A procedure described in two files will be updated in one of them.

You can nest a list under a quotation when the quoted material is itself a list:

> The pull rules:
>
> - Clean working tree
> - Fast-forward only
> - Refuse when the histories have diverged

## Inline code inside a sentence

The renderer is `renderMarkdown` in `src/lib/markdown.ts`. It strips a leading front-matter block, parses with marked, and rewrites links. A relative link such as [Tables](tables.md) stays in the preview. An absolute URL such as [marked](https://marked.js.org/) is marked `rel="noopener noreferrer"` and opens in a new tab.

Back to the map: [Welcome](../../welcome.md).
