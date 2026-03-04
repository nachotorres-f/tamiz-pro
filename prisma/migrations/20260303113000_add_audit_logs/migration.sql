-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `modulo` VARCHAR(191) NOT NULL,
    `accion` VARCHAR(191) NOT NULL,
    `ruta` VARCHAR(191) NOT NULL,
    `metodo` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'success',
    `resumen` TEXT NULL,
    `detalle` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `audit_logs_modulo_createdAt_idx` ON `audit_logs`(`modulo`, `createdAt`);

-- CreateIndex
CREATE INDEX `audit_logs_createdAt_idx` ON `audit_logs`(`createdAt`);
