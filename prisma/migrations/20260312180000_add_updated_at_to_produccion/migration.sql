-- AlterTable
ALTER TABLE `Produccion`
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Backfill
UPDATE `Produccion`
SET `updatedAt` = `createdAt`;
