-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `nip` VARCHAR(50) NULL,
    `jabatan` VARCHAR(255) NULL,
    `unit` VARCHAR(255) NULL,
    `phoneWa` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `passwordHash` VARCHAR(255) NULL,
    `role` ENUM('PEMOHON', 'ADMIN', 'APPROVER', 'SUPER_ADMIN') NOT NULL DEFAULT 'PEMOHON',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_nip_key`(`nip`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `brand` VARCHAR(100) NULL,
    `type` VARCHAR(100) NULL,
    `plateNumber` VARCHAR(20) NOT NULL,
    `year` INTEGER NULL,
    `color` VARCHAR(50) NULL,
    `fuelType` VARCHAR(50) NULL,
    `seatCapacity` INTEGER NULL,
    `status` ENUM('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED') NOT NULL DEFAULT 'AVAILABLE',
    `currentOdometer` INTEGER NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `vehicles_plateNumber_key`(`plateNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `bookingCode` VARCHAR(20) NOT NULL,
    `applicantName` VARCHAR(255) NOT NULL,
    `applicantNip` VARCHAR(50) NULL,
    `applicantJabatan` VARCHAR(255) NOT NULL,
    `applicantUnit` VARCHAR(255) NULL,
    `applicantPhoneWa` VARCHAR(20) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `purposeCategory` VARCHAR(100) NOT NULL,
    `purposeNotes` TEXT NULL,
    `originAddress` TEXT NOT NULL,
    `originLat` DOUBLE NULL,
    `originLng` DOUBLE NULL,
    `destinationName` VARCHAR(255) NOT NULL,
    `destinationAddress` TEXT NOT NULL,
    `destinationLat` DOUBLE NULL,
    `destinationLng` DOUBLE NULL,
    `routeDistanceKm` DOUBLE NULL,
    `mapProvider` ENUM('OSM', 'GOOGLE') NULL,
    `routeFetchedAt` DATETIME(3) NULL,
    `extraStops` JSON NULL,
    `departureDatetime` DATETIME(3) NOT NULL,
    `returnDatetime` DATETIME(3) NOT NULL,
    `actualDepartureAt` DATETIME(3) NULL,
    `actualReturnAt` DATETIME(3) NULL,
    `status` ENUM('MENUNGGU_PERSETUJUAN', 'DISETUJUI', 'DITOLAK', 'MENUNGGU_PEMERIKSAAN_AWAL', 'SIAP_BERANGKAT', 'SEDANG_DIGUNAKAN', 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN', 'PERLU_PERBAIKAN_BUKTI', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'MENUNGGU_PERSETUJUAN',
    `isOverdue` BOOLEAN NOT NULL DEFAULT false,
    `additionalNotes` TEXT NULL,
    `approvalNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `bookings_bookingCode_key`(`bookingCode`),
    INDEX `bookings_vehicleId_status_departureDatetime_returnDatetime_idx`(`vehicleId`, `status`, `departureDatetime`, `returnDatetime`),
    INDEX `bookings_bookingCode_idx`(`bookingCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_approvals` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `approverId` VARCHAR(191) NOT NULL,
    `action` ENUM('APPROVED', 'REJECTED') NOT NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_status_history` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorName` VARCHAR(255) NOT NULL,
    `actorRole` VARCHAR(50) NULL,
    `fromStatus` ENUM('MENUNGGU_PERSETUJUAN', 'DISETUJUI', 'DITOLAK', 'MENUNGGU_PEMERIKSAAN_AWAL', 'SIAP_BERANGKAT', 'SEDANG_DIGUNAKAN', 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN', 'PERLU_PERBAIKAN_BUKTI', 'SELESAI', 'DIBATALKAN') NULL,
    `toStatus` ENUM('MENUNGGU_PERSETUJUAN', 'DISETUJUI', 'DITOLAK', 'MENUNGGU_PEMERIKSAAN_AWAL', 'SIAP_BERANGKAT', 'SEDANG_DIGUNAKAN', 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN', 'PERLU_PERBAIKAN_BUKTI', 'SELESAI', 'DIBATALKAN') NOT NULL,
    `reason` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_status_history_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_inspections` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `type` ENUM('PRE', 'POST') NOT NULL,
    `odometer` INTEGER NULL,
    `fuelFilled` BOOLEAN NULL,
    `fuelNotes` TEXT NULL,
    `incidentNotes` TEXT NULL,
    `existingDamage` TEXT NULL,
    `submittedById` VARCHAR(191) NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `reviewAction` ENUM('APPROVED', 'NEEDS_REVISION') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicle_inspections_bookingId_type_key`(`bookingId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspection_photos` (
    `id` VARCHAR(191) NOT NULL,
    `inspectionId` VARCHAR(191) NOT NULL,
    `category` ENUM('SPEEDOMETER_PRE', 'SPEEDOMETER_POST', 'INTERIOR_FRONT_PRE', 'INTERIOR_FRONT_POST', 'SEAT_REAR_PRE', 'SEAT_REAR_POST', 'EXTERIOR_PRE', 'EXTERIOR_POST', 'FUEL_RECEIPT', 'OTHER') NOT NULL,
    `filePath` VARCHAR(500) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isSuperseded` BOOLEAN NOT NULL DEFAULT false,
    `supersedesId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inspection_photos_inspectionId_category_idx`(`inspectionId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `recipientPhone` VARCHAR(20) NOT NULL,
    `eventType` ENUM('BOOKING_CREATED_APPLICANT', 'BOOKING_CREATED_ADMIN', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'REMINDER_DEPARTURE', 'REMINDER_RETURN', 'OVERDUE_WARNING', 'RETURN_EVIDENCE_RECEIVED', 'BOOKING_COMPLETED', 'REVISION_NEEDED', 'NOTIFICATION_FAILED_ALERT') NOT NULL,
    `messageBody` TEXT NOT NULL,
    `status` ENUM('QUEUED', 'SENT', 'DELIVERED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `providerMessageId` VARCHAR(255) NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `lastAttemptAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `scheduledFor` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notifications_status_scheduledFor_idx`(`status`, `scheduledFor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_maintenance` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `scheduledAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `odometerAt` INTEGER NULL,
    `cost` DOUBLE NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `description` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorName` VARCHAR(255) NULL,
    `actorRole` VARCHAR(50) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `entityId` VARCHAR(50) NULL,
    `oldValue` JSON NULL,
    `newValue` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `audit_logs_actorId_idx`(`actorId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_approvals` ADD CONSTRAINT `booking_approvals_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_approvals` ADD CONSTRAINT `booking_approvals_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_inspections` ADD CONSTRAINT `vehicle_inspections_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_inspections` ADD CONSTRAINT `vehicle_inspections_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_inspections` ADD CONSTRAINT `vehicle_inspections_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspection_photos` ADD CONSTRAINT `inspection_photos_inspectionId_fkey` FOREIGN KEY (`inspectionId`) REFERENCES `vehicle_inspections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspection_photos` ADD CONSTRAINT `inspection_photos_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspection_photos` ADD CONSTRAINT `inspection_photos_supersedesId_fkey` FOREIGN KEY (`supersedesId`) REFERENCES `inspection_photos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_maintenance` ADD CONSTRAINT `vehicle_maintenance_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_maintenance` ADD CONSTRAINT `vehicle_maintenance_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
