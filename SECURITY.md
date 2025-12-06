# Security Policy

## 🔐 Reporting Security Vulnerabilities

If you discover a security vulnerability in Panoptes, please report it responsibly:

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please email: [your-email@domain.com]

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond within 48 hours and will work with you to address the issue promptly.

---

## 🛡️ Security Best Practices

### API Key Protection

#### ⚠️ CRITICAL: Never Commit API Keys

**Protected Files (Already Gitignored):**
- `appsettings.Local.json` - Your local development secrets
- `appsettings.Development.json` - Development environment secrets
- `appsettings.*.json` (all variants except `appsettings.json`)
- `.env` files

**If You Accidentally Commit a Key:**

1. **Revoke the key immediately** on Demeter.run
2. **Generate a new API key**
3. **Update your local config:**
   ```bash
   # Edit with new key
   nano Panoptes.Api/appsettings.Local.json
   ```
4. **Remove from Git history:**
   ```bash
   # Option 1: Use BFG Repo-Cleaner
   bfg --replace-text passwords.txt
   
   # Option 2: Manual filter-branch
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch Panoptes.Api/appsettings.Local.json" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push (use with caution)
   git push origin --force --all
   ```

### Configuration Management

#### Local Development
```bash
# Step 1: Copy template
cp Panoptes.Api/appsettings.json Panoptes.Api/appsettings.Local.json

# Step 2: Edit with your secrets
nano Panoptes.Api/appsettings.Local.json

# Step 3: Verify it's gitignored
git status  # Should NOT show appsettings.Local.json
```

#### Production Deployment

**Option 1: Environment Variables** (Recommended)
```bash
export Argus__ApiKey="your-production-key"
export ApiKey="your-webhook-auth-key"
dotnet run --project Panoptes.Api
```

**Option 2: Azure Key Vault / AWS Secrets Manager**
```csharp
// In Program.cs
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{keyVaultName}.vault.azure.net/"),
    new DefaultAzureCredential());
```

**Option 3: Docker Secrets**
```yaml
# docker-compose.yml
services:
  panoptes-api:
    image: panoptes:latest
    secrets:
      - demeter_api_key
    environment:
      - Argus__ApiKey=/run/secrets/demeter_api_key

secrets:
  demeter_api_key:
    external: true
```

---

## 🔒 Webhook Security

### Securing Your Webhook Endpoints

#### 1. Use HTTPS Only
```json
{
  "TargetUrl": "https://your-domain.com/webhook"  ✅
  "TargetUrl": "http://your-domain.com/webhook"   ❌
}
```

#### 2. Implement Signature Verification

**On Your Webhook Endpoint:**
```csharp
[HttpPost]
public async Task<IActionResult> ReceiveWebhook(
    [FromBody] dynamic payload,
    [FromHeader("X-Panoptes-Signature")] string signature)
{
    // Verify HMAC signature
    var secret = Configuration["WebhookSecret"];
    var computedSignature = ComputeHmacSha256(payload, secret);
    
    if (!signature.Equals(computedSignature))
    {
        return Unauthorized("Invalid signature");
    }
    
    // Process webhook...
}
```

#### 3. IP Whitelisting
```nginx
# nginx.conf
location /webhook {
    allow 1.2.3.4;      # Panoptes server IP
    deny all;
    
    proxy_pass http://backend;
}
```

#### 4. Rate Limiting on Your Side
```csharp
// Add to your webhook endpoint
[EnableRateLimiting("webhook")]
public async Task<IActionResult> ReceiveWebhook()
```

---

## 🚨 Known Security Considerations

### Current Limitations

1. **Input Amounts Not Hydrated**
   - Panoptes doesn't fetch previous transaction outputs
   - This limits some attack detection capabilities
   - **Mitigation**: Implement balance validation on your end if critical

2. **SQLite in Production**
   - SQLite is suitable for development but not for high-scale production
   - **Recommendation**: Migrate to PostgreSQL for production deployments

3. **No Built-in Webhook Signature Verification**
   - Currently, Panoptes doesn't sign webhook payloads
   - **Roadmap**: HMAC-SHA256 signatures planned for v2.0
   - **Workaround**: Use API key authentication on your webhook endpoint

### Security Hardening Checklist

- [ ] API keys stored in gitignored files or environment variables
- [ ] HTTPS enforced on all webhook URLs
- [ ] Webhook endpoints implement authentication
- [ ] Rate limiting configured appropriately
- [ ] Database backups automated
- [ ] Logs monitored for suspicious activity
- [ ] Demeter API key rotated quarterly
- [ ] Dependencies updated regularly (`dotnet list package --outdated`)

---

## 🔄 Dependency Security

### Automated Scanning

**GitHub Dependabot:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "nuget"
    directory: "/"
    schedule:
      interval: "weekly"
      
  - package-ecosystem: "npm"
    directory: "/Panoptes.Client"
    schedule:
      interval: "weekly"
```

**Manual Checks:**
```bash
# .NET packages
dotnet list package --vulnerable
dotnet list package --outdated

# npm packages
cd Panoptes.Client
npm audit
npm audit fix
```

---

## 📋 Compliance Notes

### Data Handling

- **No PII Storage**: Panoptes doesn't store personal identifiable information
- **Blockchain Data**: All data is public blockchain information
- **Webhook URLs**: Stored in database - ensure your URLs don't contain secrets
- **Logs**: May contain transaction hashes and addresses (public data)

### GDPR Considerations

Since Panoptes only processes public blockchain data, GDPR impact is minimal. However:

1. **Webhook URLs**: If users include identifiable information in webhook URLs, this must be secured
2. **Delivery Logs**: Contains webhook URLs and timestamps - consider retention policies
3. **Right to Deletion**: Implement subscription deletion (already supported)

---

## 🆘 Incident Response

### If You Detect Unauthorized Access

1. **Immediately revoke all API keys**
2. **Check delivery logs for unusual webhook activity**
3. **Review subscription list for unauthorized entries**
4. **Rotate database credentials if applicable**
5. **Review server access logs**
6. **Contact the Panoptes team**

### Post-Incident

1. Document the incident
2. Analyze root cause
3. Implement additional controls
4. Update this security policy

---

## 📞 Contact

**Security Issues**: [security@your-domain.com]  
**General Support**: [GitHub Issues](https://github.com/gauciv/panoptes/issues)

---

*Last Updated: December 6, 2025*
