CREATE DATABASE ParkingDb;
GO

USE ParkingDb;
GO
CREATE TABLE ParkingSlot (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SlotCode NVARCHAR(10) NOT NULL,
    IsAvailable BIT NOT NULL DEFAULT 1
);
CREATE TABLE Reservation (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SlotCode NVARCHAR(10) NOT NULL,
    Name NVARCHAR(100),
    Email NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(20) NOT NULL,
    ReservedAt DATETIME NOT NULL DEFAULT GETDATE(),
    ExpiresAt DATETIME,
    IsConfirmed BIT NOT NULL DEFAULT 0
);

CREATE TABLE [User] (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100),
    Email NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(MAX) NOT NULL
);
ALTER TABLE Reservation
ADD UserId INT NULL;

ALTER TABLE Reservation
ADD CONSTRAINT FK_Reservation_User FOREIGN KEY (UserId)
    REFERENCES [User](Id);

INSERT INTO [User] (Name, Email, PasswordHash)
VALUES 
(N'Test User 1', 'test1@mail.com', '8d969eef6ecad3c29a3a629280e686cff8ca9d6d47fcd4f0ec27a05c1fcd3b3a'),
(N'Test User 2', 'test2@mail.com', '8d969eef6ecad3c29a3a629280e686cff8ca9d6d47fcd4f0ec27a05c1fcd3b3a');

INSERT INTO ParkingSlot (SlotCode, IsAvailable)
VALUES 
('A1', 1),
('A2', 1),
('A3', 1),
('B1', 1),
('B2', 1),
('C1', 1);

/*trường hợ Đặt chổ không đăng nhập */

INSERT INTO Reservation (SlotCode, Name, Email, Phone, ReservedAt, ExpiresAt, IsConfirmed, UserId)
VALUES
('A1', N'Nguyễn Văn A', 'a@gmail.com', '0123456789', GETDATE(), DATEADD(MINUTE, 10, GETDATE()), 0, NULL);

/*Trường hợp 2: Đặt chỗ khi đã đăng nhập (liên kết UserId)*/

INSERT INTO Reservation (SlotCode, Name, Email, Phone, ReservedAt, ExpiresAt, IsConfirmed, UserId)
VALUES
('A2', N'Test User 1', 'test1@mail.com', '0987654321', GETDATE(), DATEADD(MINUTE, 10, GETDATE()), 1, 1);

SELECT * FROM [User];
SELECT * FROM ParkingSlot;
SELECT * FROM Reservation;

UPDATE ParkingSlot
SET IsAvailable = 1;

DELETE FROM Reservation
WHERE Id != 1;

