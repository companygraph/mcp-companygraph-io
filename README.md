# mcp.companygraph.io

CompanyGraph's own model, `companygraph/mental-model`, served over MCP at `https://mcp.companygraph.io/mcp`. That model is the company behind the meta-model, described in the vocabulary it publishes, with no person anywhere in it. This repository pins one commit of the model and one release of `companygraph/mcp-server`, builds an image that carries the model's snapshot, and runs it on Cloud Run in Zurich behind Firebase Hosting. Everything below the Google Cloud project is Terraform, applied by GitHub Actions.

It is the second deployment of the server, after `robertblust/mcp-blust-ch`, and it is built entirely from the parts the server ships under `deploy/`: the Terraform modules, the build command, the shared tests and the workflows. What is this deployment's own is its values in `deployment.json`, its brand, its page styles and its instance tests.

## Using it

Add `https://mcp.companygraph.io/mcp` as a custom connector in Claude, or as a remote MCP server in ChatGPT's developer mode or the Gemini CLI. No authentication. The page at `https://mcp.companygraph.io` lists the tools with what each returns, from the server's own list: the types and their schemas, what the types declare about each other, the rules, and the entities with their references. Every answer names the model commit it was read from.

## What pins what

`source.json` names the model commit and `package.json` the server release. Moving either is a pull request; the merge builds the image, applies the infrastructure with it and checks that the service reports the new commit.

## Building it

    npm ci
    npm run snapshot      # writes dist/snapshot.json from the pinned commit
    npm run page-css      # writes dist/page.css from the design package's blocks and own.css
    npm run jsonld        # writes dist/jsonld.json from the snapshot
    npm test              # the server's shared deployment tests and this instance's own
    docker build -t mcp-companygraph-io:local .

## Infrastructure

`infra/bootstrap/` is applied by the owner, with the state `infra/bootstrap/README.md` says how to restore, and holds what CI needs before it can authenticate: the state bucket, the identity pool, the service accounts and the image registry. A pull request plans as `terraform-plan@`, which reads and changes nothing, and only a run on `main` may apply as `terraform@` or push as `deploy@`. `infra/` is applied by CI on every merge: its state in the bucket the bootstrap made, and one call into the module `companygraph/mcp-server` ships under `deploy/terraform`, with this deployment's own values read from `deployment.json`. The two workflows in `.github/workflows/` only call the package's own `deployment.yml` and `registry.yml`, by the release `package.json` pins.

Publishing to the MCP Registry runs in the `registry` environment, which requires the owner's review of every run. The signing key lives there as an environment secret, `MCP_PRIVATE_KEY`, never as a repository secret, because a repository secret would be readable by any workflow on any branch and the review gate would protect nothing.

## The owner's steps

The record of how the deployment was stood up: the owner's steps, done once, in this order, kept here so the commands stay correct as a record rather than as work still to do. The key commands need OpenSSL 3 and `/usr/bin/openssl` on macOS is LibreSSL, so every step ran in a shell that had first run:

    export PATH=/opt/homebrew/bin:$PATH

1. Create the project and link it to the billing account, then write the project number into `deployment.json` as `project_number`, in a commit on the pull request:

        gcloud projects create companygraph-io-mcp --organization=14986580178
        gcloud billing projects link companygraph-io-mcp --billing-account=011DEB-4A45A0-3A52BB
        gcloud projects describe companygraph-io-mcp --format='value(projectNumber)'

2. Enable the Cloud Billing API on the new project:

        gcloud services enable cloudbilling.googleapis.com --project companygraph-io-mcp

3. Apply the bootstrap before the merge, because the merge's deploy signs in with what it creates. Until then `infra/bootstrap/` exists only on the pull request's branch, so it was applied from the worktree that had the branch checked out. Its state is a local file git ignores, and `git worktree remove` deletes ignored files without a word, so the state was copied out of the worktree the moment the apply finished, kept outside the repository at `~/companygraph-io-mcp-bootstrap.tfstate`, with a second copy somewhere safe as well, because it is the bootstrap's only state. `infra/bootstrap/README.md` says how to restore it before a re-apply:

        brew tap hashicorp/tap && brew install hashicorp/tap/terraform
        gcloud auth application-default login
        terraform -chdir=infra/bootstrap init && terraform -chdir=infra/bootstrap apply
        cp infra/bootstrap/terraform.tfstate ~/companygraph-io-mcp-bootstrap.tfstate

4. Merge the pull request. The first deploy fails at the live check, and its `run_host` warning names the host; write it into `deployment.json` as `run_host` and merge that.

5. Make the Registry's signing key outside the repository, so it can never be committed, and store the private key as `MCP_PRIVATE_KEY` in the repository's `registry` environment, which the fourth and fifth commands create with the owner as its required reviewer and tags `v*` as the only refs that may deploy to it. The third command prints the TXT record step 6 publishes; keep that line. Move `"$K/key.pem"` into a password manager before the last command if the key is to be kept, because the last command deletes it:

        K=$(mktemp -d)
        openssl genpkey -algorithm Ed25519 -out "$K/key.pem"
        echo "companygraph.io. IN TXT \"v=MCPv1; k=ed25519; p=$(openssl pkey -in "$K/key.pem" -pubout -outform DER | tail -c 32 | base64)\""
        echo '{"reviewers":[{"type":"User","id":7037057}],"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}' | gh api -X PUT repos/companygraph/mcp-companygraph-io/environments/registry --input -
        gh api -X POST repos/companygraph/mcp-companygraph-io/environments/registry/deployment-branch-policies -f name='v*' -f type=tag
        openssl pkey -in "$K/key.pem" -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n' | gh secret set MCP_PRIVATE_KEY --env registry --repo companygraph/mcp-companygraph-io
        rm -rf "$K"

6. At Hostpoint, add the records the deployment names for `mcp.companygraph.io`, replacing the default record, and the TXT record step 5 printed, at the apex of `companygraph.io`:

        terraform -chdir=infra init
        terraform -chdir=infra output dns_records

7. Once the server is live and the model names its surface, tag `v1.0.0` on `main` as GitHub has it and approve the `registry` run:

        git fetch origin && git tag v1.0.0 origin/main && git push origin v1.0.0

## The chat

`chat.companygraph.io` is the chat over this host: a visitor's question on companygraph.io goes to it, it asks `mcp.companygraph.io` through the tools, and Claude Sonnet 5 on Vertex AI in this project writes the answer from what the tools said. It is `companygraph/chat-server`, deployed from this repository beside the server: `chat/` holds what is this deployment's own for it, `chat/package.json` pinning the release, `chat/chat.json` naming the domain, the site, the host it reads, the page origins it answers and the month's ceiling in input-equivalent tokens, the Dockerfile, the brand, the stylesheet and the tests; `infra/chat/` is its Terraform root, applied by CI with its own state prefix in the same bucket; `.github/workflows/chat.yml` calls the chat server's own workflow. The release is named in those three places and the chat server's pin test holds them to one. The budget in `deployment.json` covers both services.

Nothing the chat spends escapes its ceiling. The service refuses before it asks the model, an address gets twenty requests an hour, and a meter in this project's Firestore database counts every model call against a day's share and a month's ceiling, CHF 30 a month at the model's price. The chat is stopped by hand where the meter keeps it: the `(default)` database, document `chat/meter`, field `closed` set to `true`, which refuses the next message and spends nothing, and back to `false` to open it; the day and the month there are UTC.

Four steps are the owner's, because Terraform cannot do them. Claude's terms are accepted and Sonnet 5 enabled in Vertex AI's Model Garden, once for this project, and until it is done the first message fails as `internal`. The model's quota is lowered on the project's Quotas page to about sixty requests and 300,000 input tokens a minute. The first deploy fails at its live check by design, since `chat/chat.json` names no `run_host` yet; the apply's warning names the address the service was given, and a second pull request writes it in. The domain's records are set at Hostpoint from `terraform -chdir=infra/chat output dns_records`, run after `terraform -chdir=infra/chat init`. Then one message is sent by hand, because the deploy's `GET /chat` proves the route and the host and never the model:

    curl -N -H 'X-Chat: 1' -H 'content-type: application/json' https://chat.companygraph.io/chat -d '{"messages":[{"role":"user","content":"What does the model say about the owner?"}],"lang":"en"}'

## License

CC BY 4.0 for the text here; the model's own license is its own.
