CREATE TABLE "stored_images" (
    "id" UUID NOT NULL,
    "data" BYTEA NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_images_pkey" PRIMARY KEY ("id")
);
