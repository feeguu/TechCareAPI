-- AlterTable
ALTER TABLE `activity` MODIFY `description` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `care` MODIFY `endTime` TIME NOT NULL,
    MODIFY `startTime` TIME NOT NULL;
