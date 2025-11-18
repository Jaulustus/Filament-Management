-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ean" TEXT,
    "internalCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL DEFAULT 0,
    "specialNote" TEXT,
    "imageUrl" TEXT,
    "imageFile" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_ean_key" ON "InventoryItem"("ean");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_internalCode_key" ON "InventoryItem"("internalCode");
