using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Panoptes.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DemeterConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    GrpcEndpoint = table.Column<string>(type: "text", nullable: false),
                    ApiKeyEncrypted = table.Column<string>(type: "text", nullable: false),
                    Network = table.Column<string>(type: "text", nullable: false, defaultValue: "Preprod"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DemeterConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SystemStates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemStates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WebhookSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    TargetUrl = table.Column<string>(type: "text", nullable: false),
                    EventType = table.Column<string>(type: "text", nullable: false),
                    TargetAddress = table.Column<string>(type: "text", nullable: true),
                    PolicyId = table.Column<string>(type: "text", nullable: true),
                    SecretKey = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsPaused = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PausedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WalletAddresses = table.Column<List<string>>(type: "jsonb", nullable: true),
                    MaxWebhooksPerMinute = table.Column<int>(type: "integer", nullable: false),
                    MaxWebhooksPerHour = table.Column<int>(type: "integer", nullable: false),
                    EnableBatching = table.Column<bool>(type: "boolean", nullable: false),
                    BatchWindowSeconds = table.Column<int>(type: "integer", nullable: false),
                    WebhooksInLastMinute = table.Column<int>(type: "integer", nullable: false),
                    WebhooksInLastHour = table.Column<int>(type: "integer", nullable: false),
                    LastWebhookAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsRateLimited = table.Column<bool>(type: "boolean", nullable: false),
                    IsSyncing = table.Column<bool>(type: "boolean", nullable: false),
                    ConsecutiveFailures = table.Column<int>(type: "integer", nullable: false),
                    LastFailureAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FirstFailureInWindowAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsCircuitBroken = table.Column<bool>(type: "boolean", nullable: false),
                    CircuitBrokenReason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebhookSubscriptions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DeliveryLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ResponseStatusCode = table.Column<int>(type: "integer", nullable: false),
                    PayloadJson = table.Column<string>(type: "text", nullable: false),
                    ResponseBody = table.Column<string>(type: "text", nullable: false),
                    LatencyMs = table.Column<double>(type: "double precision", nullable: false),
                    AttemptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    MaxRetries = table.Column<int>(type: "integer", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    RetryAfterSeconds = table.Column<int>(type: "integer", nullable: true),
                    IsRateLimitRetry = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeliveryLogs_WebhookSubscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "WebhookSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryLogs_AttemptedAt",
                table: "DeliveryLogs",
                column: "AttemptedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryLogs_SubscriptionId",
                table: "DeliveryLogs",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryLogs_SubscriptionId_AttemptedAt",
                table: "DeliveryLogs",
                columns: new[] { "SubscriptionId", "AttemptedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DemeterConfigs_IsActive",
                table: "DemeterConfigs",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeliveryLogs");

            migrationBuilder.DropTable(
                name: "DemeterConfigs");

            migrationBuilder.DropTable(
                name: "SystemStates");

            migrationBuilder.DropTable(
                name: "WebhookSubscriptions");
        }
    }
}
