# 1. The User Pool
resource "aws_cognito_user_pool" "panoptes_pool" {
  name                     = "panoptes-users"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }
}

# 2. Google Identity Provider
resource "aws_cognito_identity_provider" "google_provider" {
  user_pool_id  = aws_cognito_user_pool.panoptes_pool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "email profile openid"
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

# 3. Cognito Domain
resource "aws_cognito_user_pool_domain" "panoptes_domain" {
  domain       = "panoptes-dev-${random_string.suffix.result}"
  user_pool_id = aws_cognito_user_pool.panoptes_pool.id
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# 4. The App Client
resource "aws_cognito_user_pool_client" "panoptes_client" {
  name = "panoptes-frontend"

  user_pool_id = aws_cognito_user_pool.panoptes_pool.id
  
  generate_secret = false
  
  # --- TOKEN VALIDITY SETTINGS (FIXED) ---
  # We must set BOTH the value and the unit to avoid "Invalid Range" errors
  
  # 1. Access Token (Short lived, for API calls)
  access_token_validity = 60
  
  # 2. ID Token (Contains user profile info)
  id_token_validity = 60
  
  # 3. Refresh Token (Long lived, keeps user logged in)
  refresh_token_validity = 3
  
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
  # ----------------------------------------

  # IMPORTANT: Update these with your final production URLs
  # Note: The CloudFront URL is dynamic, so we reference the resource directly
  callback_urls = [
    "http://localhost:5173/", 
    "https://dr9btopcgp9z.cloudfront.net"
  ]
  
  logout_urls = [
    "http://localhost:5173/", 
    "https://dr9btopcgp9z.cloudfront.net"
  ]

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  
  supported_identity_providers = ["COGNITO", "Google"]
  depends_on = [aws_cognito_identity_provider.google_provider]
}