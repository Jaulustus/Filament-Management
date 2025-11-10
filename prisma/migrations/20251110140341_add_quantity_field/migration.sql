-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Filament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "diameterMm" DECIMAL NOT NULL,
    "density" DECIMAL NOT NULL,
    "netWeightG" INTEGER NOT NULL,
    "remainingG" DECIMAL NOT NULL,
    "gramsPerMeter" DECIMAL NOT NULL,
    "colorsHex" TEXT,
    "priceNewEUR" DECIMAL,
    "productUrl" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Filament" ("archived", "colorsHex", "createdAt", "density", "diameterMm", "gramsPerMeter", "id", "location", "manufacturer", "material", "name", "netWeightG", "notes", "priceNewEUR", "productUrl", "remainingG", "updatedAt") SELECT "archived", "colorsHex", "createdAt", "density", "diameterMm", "gramsPerMeter", "id", "location", "manufacturer", "material", "name", "netWeightG", "notes", "priceNewEUR", "productUrl", "remainingG", "updatedAt" FROM "Filament";
DROP TABLE "Filament";
ALTER TABLE "new_Filament" RENAME TO "Filament";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
