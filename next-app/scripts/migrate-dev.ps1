param(
    [string]$migrationName = "fix_bookings_fk"
)
& npx prisma migrate dev --name $migrationName --schema prisma/schema.prisma
