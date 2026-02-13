using Microsoft.EntityFrameworkCore.Migrations;

namespace SmartAccountant.API.Migrations
{
    /// <inheritdoc />
    public partial class AddGdprComplianceToAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataExportDate",
                table: "Accounts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ScheduledDeletionDate",
                table: "Accounts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ConsentGiven",
                table: "Accounts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TaxId",
                table: "Accounts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Accounts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "Accounts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ZipCode",
                table: "Accounts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CountryId",
                table: "Accounts",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastDataExportDate",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "ScheduledDeletionDate",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "ConsentGiven",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TaxId",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "City",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "ZipCode",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "CountryId",
                table: "Accounts");
        }
    }
}
