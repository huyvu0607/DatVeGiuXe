using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParkingReservationSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordResetColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PasswordResetToken",
                table: "User",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordResetTokenExpiry",
                table: "User",
                type: "datetime2",
                nullable: true);

            /*migrationBuilder.AddColumn<int>(
                name: "Floor",
                table: "ParkingSlot",
                type: "int",
                nullable: false,
                defaultValue: 0);*/
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PasswordResetToken",
                table: "User");

            migrationBuilder.DropColumn(
                name: "PasswordResetTokenExpiry",
                table: "User");

            /*migrationBuilder.DropColumn(
                name: "Floor",
                table: "ParkingSlot");*/
        }
    }
}
