-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `rol` VARCHAR(191) NOT NULL DEFAULT '',
    `salon` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `comandas` (
    `id` INTEGER NOT NULL,
    `lugar` VARCHAR(191) NOT NULL,
    `salon` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `horarioInicio` DATETIME(3) NOT NULL,
    `horarioFin` DATETIME(3) NOT NULL,
    `cantidadMayores` INTEGER NOT NULL DEFAULT 0,
    `cantidadMenores` INTEGER NOT NULL DEFAULT 0,
    `deshabilitadaPlanificacion` BOOLEAN NOT NULL DEFAULT false,
    `observaciones` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL DEFAULT '',
    `cantidad` DOUBLE NOT NULL,
    `comandaId` INTEGER NOT NULL,
    `fecha` DATETIME(3) NULL,
    `gestionado` BOOLEAN NOT NULL DEFAULT false,

    INDEX `platos_codigo_idx`(`codigo`),
    INDEX `platos_comandaId_codigo_idx`(`comandaId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Produccion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATETIME(3) NOT NULL,
    `plato` VARCHAR(191) NOT NULL,
    `platoCodigo` VARCHAR(191) NOT NULL DEFAULT '',
    `platoPadre` VARCHAR(191) NOT NULL DEFAULT '',
    `platoPadreCodigo` VARCHAR(191) NOT NULL DEFAULT '',
    `observacion` TEXT NULL,
    `observacionProduccion` TEXT NULL,
    `cantidad` DOUBLE NOT NULL,
    `salon` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Produccion_fecha_salon_idx`(`fecha`, `salon`),
    UNIQUE INDEX `Produccion_platoCodigo_platoPadreCodigo_fecha_salon_key`(`platoCodigo`, `platoPadreCodigo`, `fecha`, `salon`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatoOculto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plato` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expedicion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `subCodigo` VARCHAR(191) NOT NULL,
    `comandaId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materia_prima` (
    `id` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `unidad_medida` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

    INDEX `audit_logs_modulo_createdAt_idx`(`modulo`, `createdAt`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_UserRoles` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_UserRoles_AB_unique`(`A`, `B`),
    INDEX `_UserRoles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `platos` ADD CONSTRAINT `platos_comandaId_fkey` FOREIGN KEY (`comandaId`) REFERENCES `comandas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserRoles` ADD CONSTRAINT `_UserRoles_A_fkey` FOREIGN KEY (`A`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserRoles` ADD CONSTRAINT `_UserRoles_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
