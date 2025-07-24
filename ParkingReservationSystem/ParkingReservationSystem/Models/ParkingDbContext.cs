using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace ParkingReservationSystem.Models;

public partial class ParkingDbContext : DbContext
{
    public ParkingDbContext()
    {
    }

    public ParkingDbContext(DbContextOptions<ParkingDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ParkingSlot> ParkingSlots { get; set; }

    public virtual DbSet<Reservation> Reservations { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=DESKTOP-I957D0S;Database=ParkingDb;Trusted_Connection=True;TrustServerCertificate=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ParkingSlot>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ParkingS__3214EC0765372584");

            entity.ToTable("ParkingSlot");

            entity.Property(e => e.IsAvailable).HasDefaultValue(true);
            entity.Property(e => e.SlotCode).HasMaxLength(10);
        });

        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.ParkingSlot) // navigation trong Reservation
            .WithMany()                 // ParkingSlot không cần collection ngược
            .HasForeignKey(r => r.SlotCode)     // FK trong Reservation
            .HasPrincipalKey(p => p.SlotCode);  // PK không phải là Id, mà là SlotCode

        modelBuilder.Entity<Reservation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Reservat__3214EC07C8B42328");

            entity.ToTable("Reservation");

            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime");
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.ReservedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.SlotCode).HasMaxLength(10);

            entity.HasOne(d => d.User).WithMany(p => p.Reservations)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_Reservation_User");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__User__3214EC0757A39002");

            entity.ToTable("User");

            entity.HasIndex(e => e.Email, "UQ__User__A9D10534DC89D22C").IsUnique();

            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.Name).HasMaxLength(100);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
