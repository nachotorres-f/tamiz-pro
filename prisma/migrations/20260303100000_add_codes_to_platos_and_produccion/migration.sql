-- AlterTable
ALTER TABLE `platos`
    ADD COLUMN `codigo` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `Produccion`
    ADD COLUMN `platoCodigo` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `platoPadreCodigo` VARCHAR(191) NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX `platos_codigo_idx` ON `platos`(`codigo`);

-- CreateIndex
CREATE INDEX `platos_comandaId_codigo_idx` ON `platos`(`comandaId`, `codigo`);

-- CreateIndex
CREATE INDEX `Produccion_platoCodigo_platoPadreCodigo_fecha_salon_idx`
    ON `Produccion`(`platoCodigo`, `platoPadreCodigo`, `fecha`, `salon`);

-- CreateIndex
CREATE INDEX `Produccion_fecha_salon_idx` ON `Produccion`(`fecha`, `salon`);
