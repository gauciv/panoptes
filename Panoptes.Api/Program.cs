using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Persistence;
using Panoptes.Infrastructure.Services;
using Panoptes.Infrastructure.Configurations;
using Panoptes.Api.Workers;
using System;
using System.IO;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Configuration
builder.Services.Configure<PanoptesConfig>(builder.Configuration.GetSection("Argus"));

// Register Persistence
var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "panoptes.db");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

builder.Services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

// Register Services
builder.Services.AddHttpClient();
builder.Services.AddScoped<IWebhookDispatcher, WebhookDispatcher>();
builder.Services.AddScoped<PanoptesReducer>();

// Register Worker
builder.Services.AddHostedService<ArgusWorker>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

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
        db.Database.EnsureCreated();
        Console.WriteLine("Database created successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"An error occurred creating the DB: {ex.Message}");
    }
}

app.Run();
