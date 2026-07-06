terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

 backend "s3" {
  bucket         = "arabic-app-state"
  key            = "terraform.tfstate"
 region         = "eu-west-2"
    use_lockfile = true
   encrypt        = true
 }
}

provider "aws" {
  region = "eu-west-2"
}