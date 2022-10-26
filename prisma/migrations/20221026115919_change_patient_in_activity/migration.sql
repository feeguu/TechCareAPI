/*
  Warnings:

  - Made the column `patientId` on table `activity` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `activity` DROP FOREIGN KEY `Activity_patientId_fkey`;

-- AlterTable
ALTER TABLE `activity` MODIFY `patientId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
