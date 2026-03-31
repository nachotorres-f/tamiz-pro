-- CreateTable
CREATE TABLE IF NOT EXISTS `materia_prima` (
    `id` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `unidad_medida` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
