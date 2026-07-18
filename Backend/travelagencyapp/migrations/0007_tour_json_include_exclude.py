import json
from django.db import migrations, models


def parse_items(value):
    if not value:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass
        return [i.strip() for i in value.split(',') if i.strip()]
    return []


def convert_to_json(apps, schema_editor):
    Tour = apps.get_model('travelagencyapp', 'Tour')
    for tour in Tour.objects.all():
        tour.includes_json = parse_items(tour.includes)
        tour.excludes_json = parse_items(tour.excludes)
        tour.save(update_fields=['includes_json', 'excludes_json'])


def convert_back(apps, schema_editor):
    Tour = apps.get_model('travelagencyapp', 'Tour')
    for tour in Tour.objects.all():
        tour.includes = ', '.join(tour.includes_json) if isinstance(tour.includes_json, list) else str(tour.includes_json or '')
        tour.excludes = ', '.join(tour.excludes_json) if isinstance(tour.excludes_json, list) else str(tour.excludes_json or '')
        tour.save(update_fields=['includes', 'excludes'])


class Migration(migrations.Migration):

    dependencies = [
        ('travelagencyapp', '0006_attraction_updated_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='tour',
            name='includes_json',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='tour',
            name='excludes_json',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(convert_to_json, convert_back),
        migrations.RemoveField(
            model_name='tour',
            name='includes',
        ),
        migrations.RemoveField(
            model_name='tour',
            name='excludes',
        ),
        migrations.RenameField('tour', 'includes_json', 'includes'),
        migrations.RenameField('tour', 'excludes_json', 'excludes'),
    ]
