/*
  Warnings:

  - You are about to alter the column `cantidad` on the `Produccion` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.

*/
-- AlterTable
ALTER TABLE `Produccion` MODIFY `cantidad` DOUBLE NOT NULL;
