terraform {
  required_version = "= 0.13.5" # Pin to a specific version to avoid accidental upgrading of the statefile

  backend "s3" {
    bucket = "identity-remote-state"
    key    = "terraform.tfstate"
    region = "eu-west-1"
  }
}

data "aws_caller_identity" "current" {}
