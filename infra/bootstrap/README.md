# Bootstrap

What GitHub Actions needs before it can authenticate: the state bucket `companygraph-io-mcp-tfstate`, the identity pool and its GitHub provider, the `terraform`, `terraform-plan` and `deploy` service accounts, the image registry, the organization policy override that lets `../` make the server public, and the managed constraint that narrows that override back to what the server needs. The resources are the module `companygraph/mcp-server` ships under `deploy/bootstrap`, at the release `main.tf` names, and every value it takes is read from `../../deployment.json`.

The owner applies it, locally, under their own login, when the module's release or the repository in `deployment.json` changes. Its state is local and stays on the owner's machine, never in the bucket it creates, so a second copy of `terraform.tfstate` kept somewhere safe is the only backup it has. The state file is ignored by git and never committed.

A re-apply restores that state first: copy `~/companygraph-io-mcp-bootstrap.tfstate` to `infra/bootstrap/terraform.tfstate` before running anything. The plan that follows must not add the pool, the bucket, the service accounts `terraform` and `deploy` or the registry — a plan that does means the state is missing rather than the infrastructure, so stop and find the copy before applying anything. Once the apply finishes, copy the state back out to the same file, and to the second safe copy.

    gcloud auth application-default login
    cp ~/companygraph-io-mcp-bootstrap.tfstate infra/bootstrap/terraform.tfstate
    terraform -chdir=infra/bootstrap init
    terraform -chdir=infra/bootstrap plan
    terraform -chdir=infra/bootstrap apply
    cp infra/bootstrap/terraform.tfstate ~/companygraph-io-mcp-bootstrap.tfstate

The budget in `../` is a resource of the billing account, not of the project, and only a billing administrator can grant the role that creates it. The owner is one, so the module grants `terraform@companygraph-io-mcp.iam.gserviceaccount.com` the Billing Account Costs Manager role on the billing account, and `terraform-plan@` the Billing Account Viewer role that reads it; CI's own accounts never could.

The project belongs to the flatland.ch organization, whose domain-restricted sharing refuses a binding to `allUsers`, and a public server is nothing but such a binding. The module overrides that policy on this project alone, which needs the Organization Policy Administrator role on the organization; the owner granted it to themselves for mcp.blust.ch, and a role on the organization holds for every project in it.
