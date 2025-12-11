output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.panoptes_pool.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.panoptes_client.id
}

output "cognito_domain" {
  value = "https://${aws_cognito_user_pool_domain.panoptes_domain.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "frontend_url" {
  value = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.frontend_bucket.id
}

output "backend_ip" {
  value = aws_lightsail_static_ip.backend_ip.ip_address
}