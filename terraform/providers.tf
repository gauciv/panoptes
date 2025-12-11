terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# 1. Default Provider (Singapore)
# Used for Lightsail, S3, Cognito, etc.
provider "aws" {
  region = "ap-southeast-1"
}

# 2. Certificate Provider (Virginia)
# Used ONLY for the SSL Certificate
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}