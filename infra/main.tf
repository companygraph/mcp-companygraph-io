# Everything below the project that CI may create, applied on merge to main with the image
# the same run pushed. State lives in the bucket the bootstrap made; the resources themselves
# are the shared module's, and this deployment's own values come from deployment.json.
terraform {
  required_version = ">= 1.9"
  required_providers {
    google      = { source = "hashicorp/google", version = "~> 8.0" }
    google-beta = { source = "hashicorp/google-beta", version = "~> 8.0" }
  }
  backend "gcs" {
    bucket = "companygraph-io-mcp-tfstate"
    prefix = "infra"
  }
}

locals { d = jsondecode(file("${path.module}/../deployment.json")) }
variable "image" { type = string }

provider "google" {
  project = local.d.project
  region  = local.d.region
}
provider "google-beta" {
  project = local.d.project
  region  = local.d.region
}

module "mcp" {
  source          = "git::https://github.com/companygraph/mcp-server.git//deploy/terraform?ref=v0.24.0"
  project         = local.d.project
  project_number  = local.d.project_number
  billing_account = local.d.billing_account
  region          = local.d.region
  domain          = local.d.domain
  site_id         = local.d.site_id
  budget_chf      = local.d.budget_chf
  run_host        = local.d.run_host
  image           = var.image
}

output "service_url" { value = module.mcp.service_url }
output "run_host" { value = module.mcp.run_host }
output "hosting_url" { value = module.mcp.hosting_url }
output "dns_records" { value = module.mcp.dns_records }
