variable "domain_name" {
  default = "panoptes.dev"
}

# 1. Request the SSL Certificate (Must be in US-EAST-1)
resource "aws_acm_certificate" "cert" {
  provider          = aws.us_east_1 # Uses the special provider we just added
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "www.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }
}

# 2. Output the Validation Records
# You will need to copy-paste these into your Namecheap/Godaddy DNS dashboard
output "acm_certificate_validation_records" {
  value = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
}

output "acm_certificate_arn" {
  value = aws_acm_certificate.cert.arn
}