<!-- conventions · v1.26.0 -->
Shared conventions of the robertblust, guestgraph and companygraph organizations live in `conventions/`, vendored from robertblust/conventions at the release `conventions.json` names. Read them before writing or committing anything here.

- `conventions/WRITING.md` — how we write: one voice, three registers, English and German.
- `conventions/WORKING.md` — how we work with git and GitHub.
- `conventions/REPOSITORIES.md` — the family: what each repository is and what pins what.
- `conventions/WRITER.md`, `conventions/TRANSLATOR.md`, `conventions/GLOSSARY.md` — the two roles that
  make a text, and the terms they keep.

Everything below this block is this repository's own. `sh conventions/conventions-sync check` says whether the copy matches the release, `sync` brings it to the release the pin names, and `sh conventions/conventions-check` holds this repository's own Markdown to `WRITING.md`, and `sh conventions/conventions-format` to its one form, which `fix` writes. Edit a shared file in robertblust/conventions, never here.
<!-- end conventions -->

## This repository

mcp.companygraph.io: CompanyGraph's own model served over MCP, the second deployment of `companygraph/mcp-server` and the twin of `robertblust/mcp-blust-ch`. Three pins, each moved only in a pull request: `source.json` names the commit of `companygraph/mental-model` the image serves, `package.json` names the release of `companygraph/mcp-server` that serves it and the release of `@robertblust/design` whose blocks the landing page is styled from. The required checks on `main` are `conventions / conventions` and `deploy / build`, the job that writes the snapshot, runs the tests and builds the image. The build, the tests that are not this instance's own, the Terraform modules and the two workflows are `companygraph/mcp-server`'s, under its `deploy/`, and the release `package.json` pins is named again in both workflows and in both modules' `?ref=`; a shared test holds the three to one. What is this deployment's own is `deployment.json`, `brand.html`, `own.css`, `favicon.svg`, `robots.txt`, the two Terraform roots in `infra/main.tf` and `infra/bootstrap/main.tf`, and `test/instance.test.mjs`. `infra/bootstrap/` is the owner's, applied once by hand; `infra/` is CI's, applied on every merge. Nothing here commits to the model or the server.

The Google Cloud project is `companygraph-io-mcp`, and `deployment.json` holds its number and the Cloud Run host, both given by the owner's steps in `README.md`.

The page serves JSON-LD, an Organization and a WebAPI, because the model names the surface `mcp.companygraph.io MCP server`, built-by this repository. The build writes `dist/jsonld.json` from the snapshot, the shared page test holds the served page to what the build wrote, and `test/instance.test.mjs` holds what the build wrote to the model, field by field, as `robertblust/mcp-blust-ch` does for its own surface. `robots.txt` is written by hand and committed, because a rule about what may be crawled is a decision rather than a derivation.

`dist/snapshot.json` and `dist/page.css` are built, never committed: the snapshot from the model commit, the stylesheet from the design package's own blocks with the fonts inlined, because a page rendered by a server has no static directory to serve them from. Both are written by CI before the image is built, and the server is told to use them.

`brand.html` and `favicon.svg` are committed rather than built: they are the lockup and the mark companygraph.io carries, copied here because a surface inlines its own copy in this family — the design package styles `.brand` and ships no SVG for it. Two copies that can drift, and the cost is accepted for files that change about never; a change to companygraph.io's mark moves both.

The host rewrites every path to the service rather than only `/mcp`, so the server owns `/`, `/health` and its own 404. A path the server grows later needs no apply.

## What checks the page

The page tests the server ships under `deploy/test/` open a browser and measure the rendered page: the shell's measure and gutter, where the mark sits, that the wordmark is two colors and one line, and that nothing scrolls sideways at 360px. They are the only thing here that needs a browser, and the workflows install chromium for it. They are also the test of `own.css`: its rules for the mark are companygraph.io's, and a mark that is not 28px at the shell's gutter, or a wordmark whose second half is not the accent, fails them.

`own.css` is a file and not a string in the page-css build for the reason `robertblust/mcp-blust-ch` found: a backtick in it, in a comment naming a class, ended the template literal that used to hold it and broke that build three times. A rule that has to be remembered is a rule that gets forgotten.
