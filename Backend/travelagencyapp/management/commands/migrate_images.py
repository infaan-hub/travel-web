from django.core.management.base import BaseCommand
from travelagencyapp.models import Tour, TourGalleryImage


class Command(BaseCommand):
    help = 'Migrate existing image2/image3 to gallery and backfill coordinates'

    def handle(self, *args, **kwargs):
        tours = Tour.objects.all()

        for tour in tours:
            migrated = 0

            for field_name in ['image2', 'image3']:
                field = getattr(tour, field_name, None)
                if field and field.name:
                    exists = TourGalleryImage.objects.filter(tour=tour, image=field.name).exists()
                    if not exists:
                        TourGalleryImage.objects.create(tour=tour, image=field.name, order=migrated)
                        self.stdout.write(f'  Migrated {field_name} for tour "{tour.title}"')
                        migrated += 1

            if not tour.destination_lat or not tour.destination_lng:
                if 'Zanzibar' in tour.destination:
                    tour.destination_lat = -6.1659
                    tour.destination_lng = 39.2026
                    tour.save(update_fields=['destination_lat', 'destination_lng'])
                    self.stdout.write(f'  Set Zanzibar coords for "{tour.title}"')
                elif 'Serengeti' in tour.destination:
                    tour.destination_lat = -2.3333
                    tour.destination_lng = 34.8333
                    tour.save(update_fields=['destination_lat', 'destination_lng'])
                    self.stdout.write(f'  Set Serengeti coords for "{tour.title}"')
                elif 'Kilimanjaro' in tour.destination:
                    tour.destination_lat = -3.0674
                    tour.destination_lng = 37.3556
                    tour.save(update_fields=['destination_lat', 'destination_lng'])
                    self.stdout.write(f'  Set Kilimanjaro coords for "{tour.title}"')
                elif 'Ngorongoro' in tour.destination:
                    tour.destination_lat = -3.1750
                    tour.destination_lng = 35.5450
                    tour.save(update_fields=['destination_lat', 'destination_lng'])
                    self.stdout.write(f'  Set Ngorongoro coords for "{tour.title}"')

        self.stdout.write(self.style.SUCCESS('Migration complete'))
