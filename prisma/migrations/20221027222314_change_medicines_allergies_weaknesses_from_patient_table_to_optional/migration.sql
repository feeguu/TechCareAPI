-- AlterTable
ALTER TABLE `care` MODIFY `endTime` TIME NOT NULL,
    MODIFY `startTime` TIME NOT NULL;

-- AlterTable
ALTER TABLE `patient` MODIFY `allergies` VARCHAR(191) NULL,
    MODIFY `medicines` VARCHAR(191) NULL,
    MODIFY `weaknesses` VARCHAR(191) NULL;
