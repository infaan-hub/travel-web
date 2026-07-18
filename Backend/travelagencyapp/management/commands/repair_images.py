from django.core.management.base import BaseCommand
from django.conf import settings
from travelagencyapp.models import Tour, TravelTip, Attraction
import os


class Command(BaseCommand):
    help = 'Repair invalid image paths in existing records'

    def handle(self, *args, **kwargs):
        models_to_check = [
            (Tour, 'image'),
            (Tour, 'image2'),
            (Tour, 'image3'),
            (TravelTip, 'image'),
            (Attraction, 'image'),
        ]

        fixed_count = 0
        for model_class, field_name in models_to_check:
            records = model_class.objects.all()
            for obj in records:
                field_file = getattr(obj, field_name, None)
                if field_file and field_file.name:
                    full_path = os.path.join(settings.MEDIA_ROOT, field_file.name)
                    if not os.path.exists(full_path):
                        setattr(obj, field_name, None)
                        obj.save(update_fields=[field_name])
                        self.stdout.write(
                            f'  Cleared {field_name} on {model_class.__name__} ID={obj.id}: '
                            f'"{field_file.name}" (file not found: {full_path})'
                        )
                        fixed_count += 1

        if fixed_count == 0:
            self.stdout.write(self.style.SUCCESS('No invalid image paths found'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Fixed {fixed_count} invalid image path(s)'))
