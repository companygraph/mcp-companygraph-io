# What has to exist before GitHub Actions can authenticate and push: applied once by the owner
# under their own login, with local state, and changed only when the module or the repository changes.
# Everything below the project that CI can create lives in ../ and is applied by CI. The
# resources are the shared module's, and this deployment's own values come from deployment.json.
terraform {
  required_version = ">= 1.9"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 8.0" }
  }
}

locals { d = jsondecode(file("${path.module}/../../deployment.json")) }

# The Organization Policy API bills its calls to a quota project, and a user's local
# credentials name none, so the provider names this project rather than gcloud's default. A
# module cannot configure its own provider and still serve more than one deployment, which is
# why this block lives here and not in the module.
provider "google" {
  project               = local.d.project
  region                = local.d.region
  user_project_override = true
  billing_project       = local.d.project
}

module "bootstrap" {
  source          = "git::https://github.com/companygraph/mcp-server.git//deploy/bootstrap?ref=v0.29.0"
  project         = local.d.project
  region          = local.d.region
  billing_account = local.d.billing_account
  repository      = local.d.repository
  repository_id   = local.d.repository_id
}

output "workload_identity_provider" { value = module.bootstrap.workload_identity_provider }
output "terraform_service_account" { value = module.bootstrap.terraform_service_account }
output "plan_service_account" { value = module.bootstrap.plan_service_account }
output "deploy_service_account" { value = module.bootstrap.deploy_service_account }
output "registry" { value = module.bootstrap.registry }
output "state_bucket" { value = module.bootstrap.state_bucket }
