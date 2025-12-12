using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Panoptes.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddJsonbAndMinAda : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "MinimumLovelace",
                table: "WebhookSubscriptions",
                type: "numeric(20,0)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MinimumLovelace",
                table: "WebhookSubscriptions");
        }
    }
}
