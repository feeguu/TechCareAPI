/*
  Warnings:

  - You are about to drop the column `endDatetime` on the `care` table. All the data in the column will be lost.
  - You are about to drop the column `startDatetime` on the `care` table. All the data in the column will be lost.
  - Added the required column `endTime` to the `Care` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `Care` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `care` DROP COLUMN `endDatetime`,
    DROP COLUMN `startDatetime`,
    ADD COLUMN `endTime` TIME NOT NULL,
    ADD COLUMN `startTime` TIME NOT NULL;
