# The chat beside the server: a second root in the same project, with its own state prefix in
# the bucket the bootstrap made, and one call into the module companygraph/chat-server ships.
# The chat's values are chat/chat.json's; the project's are deployment.json's, stated once.
terraform {
  required_version = ">= 1.9"
  required_providers {
    google      = { source = "hashicorp/google", version = "~> 8.0" }
    google-beta = { source = "hashicorp/google-beta", version = "~> 8.0" }
  }
  backend "gcs" {
    bucket = "companygraph-io-mcp-tfstate"
    prefix = "chat"
  }
}

locals {
  d = jsondecode(file("${path.module}/../../deployment.json"))
  c = jsondecode(file("${path.module}/../../chat/chat.json"))
}
variable "image" { type = string }

provider "google" {
  project = local.d.project
  region  = local.d.region
}
provider "google-beta" {
  project = local.d.project
  region  = local.d.region
}

module "chat" {
  source         = "git::https://github.com/companygraph/chat-server.git//deploy/terraform?ref=v0.12.6"
  project        = local.d.project
  project_number = local.d.project_number
  region         = local.d.region
  domain         = local.c.domain
  site_id        = local.c.site_id
  mcp_url        = local.c.mcp_url
  origins        = local.c.origins
  month_tokens   = local.c.month_tokens
  run_host       = local.c.run_host
  model_provider = lookup(local.c, "provider", "vertex")
  image          = var.image
}

output "service_url" { value = module.chat.service_url }
output "run_host" { value = module.chat.run_host }
output "hosting_url" { value = module.chat.hosting_url }
output "dns_records" { value = module.chat.dns_records }
