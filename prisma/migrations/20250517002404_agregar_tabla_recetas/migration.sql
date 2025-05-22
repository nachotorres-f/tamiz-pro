-- CreateTable
CREATE TABLE `recetas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombreProducto` VARCHAR(191) NOT NULL,
    `proceso` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `subCodigo` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `unidadMedida` VARCHAR(191) NULL,
    `porcionBruta` DOUBLE NOT NULL,
    `porcionNeta` DOUBLE NOT NULL,
    `MO` INTEGER NOT NULL,
    `dueno` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
