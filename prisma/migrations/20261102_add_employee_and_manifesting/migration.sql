-- AlterTable bookings: Add manifesting and SPPD fields
ALTER TABLE `bookings` 
  ADD COLUMN `driverName` VARCHAR(255) NULL,
  ADD COLUMN `driverPhone` VARCHAR(20) NULL,
  ADD COLUMN `passengerCount` INT NULL DEFAULT 1,
  ADD COLUMN `passengers` JSON NULL,
  ADD COLUMN `passengerNotes` TEXT NULL,
  ADD COLUMN `hasSppd` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `sppdPhotoPath` VARCHAR(500) NULL;

-- CreateTable employees (Master Data Guru & Tendik)
CREATE TABLE IF NOT EXISTS `employees` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `nip` VARCHAR(50) NULL,
    `nuptk` VARCHAR(50) NULL,
    `pangkatGol` VARCHAR(100) NULL,
    `jabatan` VARCHAR(255) NULL,
    `unit` VARCHAR(255) NULL,
    `phoneWa` VARCHAR(20) NULL,
    `gender` VARCHAR(10) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `employees_name_idx`(`name`),
    INDEX `employees_nip_idx`(`nip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
