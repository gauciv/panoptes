using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Persistence;
using Panoptes.Infrastructure.Services;
using Panoptes.Infrastructure.Configurations;
using Panoptes.Api.Workers;
using System;

var builder = WebApplication.CreateBuilder(args);

// Add appsettings.Local.json explicitly
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Add services to the container.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
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

// Register Data Protection
builder.Services.AddDataProtection();

// CHANGED: Register Persistence (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

// Register Services
builder.Services.AddHttpClient();
builder.Services.AddScoped<IWebhookDispatcher, WebhookDispatcher>();
builder.Services.AddScoped<PanoptesReducer>();

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
app.MapControllers();

// CHANGED: Simplified DB Initialization for Postgres
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<AppDbContext>();
        Console.WriteLine($"Connecting to PostgreSQL...");
        
        
        Console.WriteLine("Applying EF Core Migrations...");
        db.Database.Migrate(); 
        Console.WriteLine("Migrations applied successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"CRITICAL: Could not connect to PostgreSQL: {ex.Message}");
    }
}

app.Run();