using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Persistence;
using Panoptes.Infrastructure.Services;
using Panoptes.Infrastructure.Configurations;
using Panoptes.Api.Workers;
using System;
using System.IO;

var builder = WebApplication.CreateBuilder(args);

// Add appsettings.Local.json explicitly (for local secrets)
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Add services to the container.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // Get allowed origins from configuration for production
        var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() 
            ?? new[] { "http://localhost:3000", "https://localhost:3000" };
        
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Configuration
builder.Services.Configure<PanoptesConfig>(builder.Configuration.GetSection("Argus"));

// Register Data Protection for encrypting sensitive data (API keys)
builder.Services.AddDataProtection();
// Keys are automatically persisted to ~/.aspnet/DataProtection-Keys/ by default

// Register Persistence
var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "panoptes.db");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

builder.Services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

// Register Services
builder.Services.AddHttpClient();
builder.Services.AddScoped<IWebhookDispatcher, WebhookDispatcher>();
builder.Services.AddScoped<PanoptesReducer>(); // Scoped to allow access to scoped services

// Register Workers
builder.Services.AddHostedService<ArgusWorker>();
builder.Services.AddHostedService<WebhookRetryWorker>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthorization();

app.UseCors(policy => policy
    .AllowAnyHeader()
    .AllowAnyMethod()
    .SetIsOriginAllowed(origin => true)
    .AllowCredentials());
app.UseAuthorization();

app.MapControllers();

// Ensure database is created (optional but helpful for this context)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<AppDbContext>();
        Console.WriteLine($"Using database at: {dbPath}");
        
        // For development: Delete and recreate if schema changes detected
        // In production, you'd use proper migrations
        if (File.Exists(dbPath))
        {
            try
            {
                // Test if schema is valid by querying
                _ = db.WebhookSubscriptions.FirstOrDefault();
                Console.WriteLine("Database schema is valid.");
            }
            catch (Exception schemaEx)
            {
                Console.WriteLine($"Schema mismatch detected: {schemaEx.Message}");
                Console.WriteLine("Deleting old database and recreating with new schema...");
                db.Database.EnsureDeleted();
                db.Database.EnsureCreated();
                Console.WriteLine("Database recreated successfully with new schema.");
            }
        }
        else
        {
            db.Database.EnsureCreated();
            Console.WriteLine("Database created successfully.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"An error occurred with the DB: {ex.Message}");
    }
}

app.Run();
