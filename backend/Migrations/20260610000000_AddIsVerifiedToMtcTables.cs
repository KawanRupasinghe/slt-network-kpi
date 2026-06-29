using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class AddIsVerifiedToMtcTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_verified",
                schema: "dbo",
                table: "towermtcdata",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_verified",
                schema: "dbo",
                table: "msanmtcdata",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_verified",
                schema: "dbo",
                table: "slbnmtcdata",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_verified",
                schema: "dbo",
                table: "PowerAndAC",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "is_verified", schema: "dbo", table: "towermtcdata");
            migrationBuilder.DropColumn(name: "is_verified", schema: "dbo", table: "msanmtcdata");
            migrationBuilder.DropColumn(name: "is_verified", schema: "dbo", table: "slbnmtcdata");
            migrationBuilder.DropColumn(name: "is_verified", schema: "dbo", table: "PowerAndAC");
        }
    }
}
