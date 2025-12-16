using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Panoptes.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "WebhookSubscriptions",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UserId",
                table: "WebhookSubscriptions");
        }
    }
}
