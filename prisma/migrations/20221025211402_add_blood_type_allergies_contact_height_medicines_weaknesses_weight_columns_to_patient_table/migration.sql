/*
  Warnings:

  - Added the required column `allergies` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bloodType` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contact` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `height` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medicines` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weaknesses` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weight` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `patient` ADD COLUMN `allergies` VARCHAR(191) NOT NULL,
    ADD COLUMN `bloodType` VARCHAR(191) NOT NULL,
    ADD COLUMN `contact` VARCHAR(191) NOT NULL,
    ADD COLUMN `height` DOUBLE NOT NULL,
    ADD COLUMN `medicines` VARCHAR(191) NOT NULL,
    ADD COLUMN `weaknesses` VARCHAR(191) NOT NULL,
    ADD COLUMN `weight` DOUBLE NOT NULL;
