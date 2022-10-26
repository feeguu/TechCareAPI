/*
  Warnings:

  - Added the required column `weekday` to the `Care` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `care` ADD COLUMN `weekday` INTEGER NOT NULL;
