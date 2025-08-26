/*
  Warnings:

  - You are about to alter the column `cantidad` on the `platos` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.

*/
-- AlterTable
ALTER TABLE `platos` MODIFY `cantidad` DOUBLE NOT NULL;
