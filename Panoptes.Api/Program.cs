using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Persistence;
using Panoptes.Infrastructure.Services;
using Panoptes.Infrastructure.Configurations;
using Panoptes.Api.Workers;
using Microsoft.AspNetCore.Authentication.JwtBearer; // Required for JWT
using Microsoft.IdentityModel.Tokens; // Required for Token Validation

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// --- 1. CONFIGURATION FOR COGNITO ---
// Ensure these exist in your appsettings.json
var cognitoAuthority = builder.Configuration["AWS:CognitoAuthority"]; // e.g. https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxx
var cognitoAudience = builder.Configuration["AWS:CognitoClientId"];   // Your App Client ID

// --- 2. REGISTER AUTHENTICATION SERVICES ---
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.Authority = cognitoAuthority;
    options.Audience = cognitoAudience;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = false, // Cognito access tokens sometimes don't include audience in the standard field
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        NameClaimType = "cognito:username" // or "sub"
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() 
            ?? new[] { "http://localhost:3000", "https://localhost:3000", "http://localhost:5173" }; // Added 5173 for Vite
        
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.Configure<PanoptesConfig>(builder.Configuration.GetSection("Argus"));
builder.Services.AddDataProtection();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
builder.Services.AddHttpClient();
builder.Services.AddScoped<IWebhookDispatcher, WebhookDispatcher>();
builder.Services.AddScoped<PanoptesReducer>();

builder.Services.AddHostedService<ArgusWorker>();
builder.Services.AddHostedService<WebhookRetryWorker>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

// --- 3. ENABLE AUTHENTICATION MIDDLEWARE ---
// MUST be before UseAuthorization
app.UseAuthentication(); 
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<AppDbContext>();
        Console.WriteLine("Applying EF Core Migrations...");
        db.Database.Migrate(); 
    }
    catch (Exception ex)
    {
        Console.WriteLine($"CRITICAL: Could not connect to PostgreSQL: {ex.Message}");
    }
}

app.Run();