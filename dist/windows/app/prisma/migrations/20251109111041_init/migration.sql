-- CreateTable
CREATE TABLE "Filament" (
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
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filamentId" TEXT NOT NULL,
    "usedG" DECIMAL NOT NULL,
    "source" TEXT NOT NULL,
    "jobName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageLog_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
