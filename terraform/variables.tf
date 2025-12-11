variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  default     = "ap-southeast-1"
}