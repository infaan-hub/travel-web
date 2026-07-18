import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'travelagencyproject.settings')
django.setup()
from travelagencyapp.models import Tour, TravelTip

print('=== TOURS ===')
for t in Tour.objects.all():
    img = t.image if t.image else 'NO IMAGE'
    print(f'ID={t.id} title={t.title!r} image={img}')

print()
print('=== TRAVEL TIPS ===')
for t in TravelTip.objects.all():
    img = t.image if t.image else 'NO IMAGE'
    print(f'ID={t.id} title={t.title!r} image={img}')

print()
print('=== MEDIA DIR ===')
media_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'media')
found = False
for root, dirs, files in os.walk(media_root):
    for f in files:
        print(os.path.join(root, f))
        found = True
if not found:
    print('MEDIA DIR IS EMPTY - NO FILES FOUND')
