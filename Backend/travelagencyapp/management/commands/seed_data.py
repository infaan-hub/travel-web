from django.core.management.base import BaseCommand
from travelagencyapp.models import Tour, Attraction, Review, ItineraryItem, HomeSetting

TOUR_DESTINATIONS = {
    'Zanzibar': {'lat': -6.1659, 'lng': 39.2026},
    'Serengeti': {'lat': -2.3333, 'lng': 34.8333},
    'Mount Kilimanjaro': {'lat': -3.0674, 'lng': 37.3556},
    'Ngorongoro': {'lat': -3.1750, 'lng': 35.5450},
    'Tarangire': {'lat': -3.8500, 'lng': 36.0000},
    'Lake Victoria': {'lat': -1.0333, 'lng': 33.0000},
    'Selous': {'lat': -7.9500, 'lng': 37.4333},
    'Ruaha': {'lat': -7.6833, 'lng': 34.9667},
    'Manyara': {'lat': -3.5000, 'lng': 35.8333},
}

def get_coords(title, destination):
    for key, coords in TOUR_DESTINATIONS.items():
        if key.lower() in title.lower() or key.lower() in destination.lower():
            return coords['lat'], coords['lng']
    if 'zanzibar' in destination.lower():
        return -6.1659, 39.2026
    if 'tanzania' in destination.lower():
        return -6.3690, 34.8888
    return None, None

class Command(BaseCommand):
    help = 'Seed the database with Zanzibar and Tanzania travel data'

    def handle(self, *args, **kwargs):
        Tour.objects.all().delete()
        Attraction.objects.all().delete()
        Review.objects.all().delete()
        ItineraryItem.objects.all().delete()

        HomeSetting.objects.get_or_create(id=1)

        tours = [
            {
                'title': 'Zanzibar Beach Paradise',
                'short_description': 'Relax on pristine white beaches of Zanzibar with crystal clear turquoise waters',
                'description': 'Experience the ultimate beach getaway on the stunning island of Zanzibar. This tour takes you to the best beaches including Nungwi, Kendwa, and Paje. Enjoy swimming, snorkeling, sunset dhow cruises, and fresh seafood dining on the beach. Perfect for honeymooners and beach lovers looking for tropical paradise.',
                'price': 899.00, 'duration': '5 Days / 4 Nights',
                'destination': 'Zanzibar, Tanzania', 'category': 'zanzibar',
                'includes': ['Hotel accommodation', 'Breakfast daily', 'Airport transfers', 'Beach activities', 'Snorkeling gear', 'Sunset dhow cruise'],
                'excludes': ['Flights', 'Lunch & dinner', 'Personal expenses', 'Travel insurance'],
                'available': True, 'featured': True,
            },
            {
                'title': 'Zanzibar Stone Town & Spice Tour',
                'short_description': 'Explore the historic Stone Town and visit aromatic spice farms',
                'description': 'Discover the rich history and culture of Zanzibar through its UNESCO World Heritage Site, Stone Town. Wander through narrow alleys, visit the House of Wonders, Old Fort, and the former slave market. Then embark on a spice tour to learn about Zanzibar famous spices like cloves, nutmeg, cinnamon, and vanilla.',
                'price': 549.00, 'duration': '3 Days / 2 Nights',
                'destination': 'Zanzibar, Tanzania', 'category': 'zanzibar',
                'includes': ['Hotel accommodation', 'Guided Stone Town tour', 'Spice farm tour', 'Breakfast', 'Airport transfers'],
                'excludes': ['Flights', 'Lunch & dinner', 'Personal expenses'],
                'available': True, 'featured': True,
            },
            {
                'title': 'Zanzibar Snorkeling & Diving Adventure',
                'short_description': 'Discover vibrant coral reefs and marine life around Zanzibar islands',
                'description': 'Dive into the crystal clear waters of Zanzibar and explore some of the best coral reefs in East Africa. Visit Mnemba Atoll, a protected marine reserve teeming with colorful fish, sea turtles, and dolphins.',
                'price': 699.00, 'duration': '4 Days / 3 Nights',
                'destination': 'Zanzibar, Tanzania', 'category': 'zanzibar',
                'includes': ['Beach resort accommodation', 'Daily breakfast', '2 snorkeling trips', '1 diving session', 'Equipment rental', 'Beach BBQ dinner'],
                'excludes': ['Flights', 'Extra drinks', 'Personal expenses', 'Tips'],
                'available': True, 'featured': False,
            },
            {
                'title': 'Zanzibar Luxury Honeymoon Package',
                'short_description': 'Ultimate romantic getaway in Zanzibar luxury resorts',
                'description': 'Celebrate your love with the ultimate romantic escape in Zanzibar. Stay at 5-star beachfront resorts with private pools and butler service.',
                'price': 1899.00, 'duration': '7 Days / 6 Nights',
                'destination': 'Zanzibar, Tanzania', 'category': 'zanzibar',
                'includes': ['Luxury resort accommodation', 'All meals', 'Couples spa treatment', 'Private dhow cruise', 'Airport transfers', 'Honeymoon cake'],
                'excludes': ['Flights', 'Personal expenses', 'Extra spa treatments'],
                'available': True, 'featured': True,
            },
            {
                'title': 'Jozani Forest & Prison Island Tour',
                'short_description': 'Explore the only national park in Zanzibar and historic Prison Island',
                'description': 'Visit Jozani Chwaka Bay National Park, home to the rare Red Colobus monkeys found only in Zanzibar.',
                'price': 449.00, 'duration': '2 Days / 1 Night',
                'destination': 'Zanzibar, Tanzania', 'category': 'zanzibar',
                'includes': ['Hotel accommodation', 'Park entrance fees', 'Guided forest walk', 'Boat transfer to Prison Island', 'Breakfast'],
                'excludes': ['Flights', 'Lunch', 'Personal expenses'],
                'available': True, 'featured': False,
            },
            {
                'title': 'Zanzibar Cultural & Food Experience',
                'short_description': 'Taste your way through Zanzibar rich culinary heritage',
                'description': 'Immerse yourself in Zanzibari culture through its food. Take a guided food tour through the streets of Stone Town.',
                'price': 599.00, 'duration': '4 Days / 3 Nights',
                'destination': 'Zanzibar, Tanzania', 'category': 'zanzibar',
                'includes': ['Boutique hotel accommodation', 'Daily breakfast', '2 cooking classes', 'Food walking tour', 'Village visit'],
                'excludes': ['Flights', 'Extra meals', 'Personal expenses'],
                'available': True, 'featured': False,
            },
            {
                'title': 'Serengeti Safari Experience',
                'short_description': 'Witness the Great Migration and Big Five in Serengeti National Park',
                'description': 'Embark on the safari of a lifetime in the world-famous Serengeti National Park. Witness the Great Migration of wildebeest and zebras.',
                'price': 2499.00, 'duration': '6 Days / 5 Nights',
                'destination': 'Serengeti, Tanzania', 'category': 'tanzania',
                'includes': ['Full-board accommodation', 'Park entrance fees', 'Game drives', 'Professional guide', 'Airport transfers'],
                'excludes': ['Flights', 'Drinks', 'Tips', 'Travel insurance', 'Visa fees'],
                'available': True, 'featured': True,
            },
            {
                'title': 'Kilimanjaro Trekking Adventure',
                'short_description': 'Conquer the Roof of Africa - Mount Kilimanjaro',
                'description': 'Challenge yourself to climb the highest peak in Africa, Mount Kilimanjaro (5,895m). Follow the scenic Machame Route.',
                'price': 2999.00, 'duration': '8 Days / 7 Nights',
                'destination': 'Mount Kilimanjaro, Tanzania', 'category': 'tanzania',
                'includes': ['Park entrance fees', 'Professional guides', 'Porters', 'Camping equipment', 'All meals on mountain'],
                'excludes': ['Flights', 'Tips', 'Sleeping bag', 'Personal gear', 'Travel insurance'],
                'available': True, 'featured': True,
            },
            {
                'title': 'Ngorongoro Crater Tour',
                'short_description': 'Explore the stunning Ngorongoro Crater - Africa Garden of Eden',
                'description': 'Descend into the Ngorongoro Crater, a UNESCO World Heritage Site and one of the most beautiful natural wonders in Africa.',
                'price': 1599.00, 'duration': '3 Days / 2 Nights',
                'destination': 'Ngorongoro, Tanzania', 'category': 'tanzania',
                'includes': ['Lodge accommodation', 'Full-board meals', 'Crater entrance fee', 'Game drive', 'Professional guide'],
                'excludes': ['Flights', 'Drinks', 'Tips', 'Travel insurance'],
                'available': True, 'featured': True,
            },
            {
                'title': 'Tarangire & Manyara Safari',
                'short_description': 'Discover Tarangire elephants and Lake Manyara tree-climbing lions',
                'description': 'Visit two of Tanzania most beautiful parks. Tarangire National Park is famous for its massive elephant herds.',
                'price': 1299.00, 'duration': '4 Days / 3 Nights',
                'destination': 'Tarangire & Manyara, Tanzania', 'category': 'tanzania',
                'includes': ['Lodge accommodation', 'All meals', 'Park entrance fees', 'Game drives', 'Professional guide'],
                'excludes': ['Flights', 'Drinks', 'Tips', 'Travel insurance'],
                'available': True, 'featured': False,
            },
            {
                'title': 'Tanzania Northern Circuit Grand Safari',
                'short_description': 'Complete safari covering Serengeti, Ngorongoro, Manyara, and Tarangire',
                'description': 'The ultimate Tanzania safari covering all the major parks of the Northern Circuit.',
                'price': 3999.00, 'duration': '10 Days / 9 Nights',
                'destination': 'Tanzania Northern Circuit', 'category': 'tanzania',
                'includes': ['All accommodation', 'All meals', 'Park entrance fees', 'Game drives', 'Professional guide', 'Airport transfers'],
                'excludes': ['Flights', 'Visa', 'Travel insurance', 'Tips', 'Personal expenses'],
                'available': True, 'featured': True,
            },
            {
                'title': 'Selous & Ruaha Wilderness Safari',
                'short_description': 'Off-the-beaten-path safari in Tanzania largest reserves',
                'description': 'Escape the crowds and explore the remote wilderness of Selous Game Reserve and Ruaha National Park.',
                'price': 2799.00, 'duration': '7 Days / 6 Nights',
                'destination': 'Selous & Ruaha, Tanzania', 'category': 'tanzania',
                'includes': ['Camp/lodge accommodation', 'All meals', 'Park fees', 'Game drives', 'Boat safari', 'Walking safari'],
                'excludes': ['Flights', 'Drinks', 'Tips', 'Travel insurance'],
                'available': True, 'featured': False,
            },
            {
                'title': 'Zanzibar & Safari Combo',
                'short_description': 'Best of both worlds - Serengeti safari and Zanzibar beach relaxation',
                'description': 'Experience the perfect combination of an African safari and tropical beach vacation.',
                'price': 3499.00, 'duration': '10 Days / 9 Nights',
                'destination': 'Serengeti & Zanzibar, Tanzania', 'category': 'tanzania',
                'includes': ['All accommodation', 'Park entrance fees', 'Game drives', 'Serengeti-Zanzibar flight', 'Beach resort'],
                'excludes': ['International flights', 'Visa', 'Travel insurance', 'Tips', 'Personal expenses'],
                'available': True, 'featured': True,
            },
            {
                'title': 'Lake Victoria & Rubondo Island Safari',
                'short_description': 'Explore the largest lake in Africa and pristine Rubondo Island',
                'description': 'Discover the hidden gem of Rubondo Island National Park on Lake Victoria.',
                'price': 1899.00, 'duration': '5 Days / 4 Nights',
                'destination': 'Lake Victoria, Tanzania', 'category': 'tanzania',
                'includes': ['Lodge accommodation', 'All meals', 'Park fees', 'Boat excursions', 'Chimpanzee tracking'],
                'excludes': ['Flights', 'Drinks', 'Tips', 'Travel insurance'],
                'available': True, 'featured': False,
            },
        ]

        for tour_data in tours:
            lat, lng = get_coords(tour_data['title'], tour_data['destination'])
            tour_data['destination_lat'] = lat
            tour_data['destination_lng'] = lng
            tour = Tour.objects.create(**tour_data)
            self.stdout.write(f'  Created tour: {tour.title}')

        attractions = [
            {
                'name': 'Serengeti National Park',
                'description': 'One of the most famous wildlife parks in the world, home to the Great Migration.',
                'location': 'Northern Tanzania', 'region': 'Serengeti', 'category': 'national_park',
                'best_time_to_visit': 'June to October', 'entry_fee': '$70 per person per day',
                'activities': 'Game drives, Hot air balloon safaris, Walking safaris, Photography',
            },
            {
                'name': 'Ngorongoro Crater',
                'description': 'The worlds largest inactive volcanic caldera, "Africa Garden of Eden".',
                'location': 'Arusha Region, Tanzania', 'region': 'Ngorongoro', 'category': 'national_park',
                'best_time_to_visit': 'June to September', 'entry_fee': '$70 per person per day',
                'activities': 'Game drives, Crater rim walks, Maasai village visits',
            },
            {
                'name': 'Mount Kilimanjaro',
                'description': 'The highest peak in Africa at 5,895 meters, one of the Seven Summits.',
                'location': 'Kilimanjaro Region, Tanzania', 'region': 'Kilimanjaro', 'category': 'mountain',
                'best_time_to_visit': 'June to October', 'entry_fee': '$70 per person per day',
                'activities': 'Trekking, Climbing, Photography, Camping',
            },
            {
                'name': 'Tarangire National Park',
                'description': 'Famous for massive elephant herds and iconic baobab trees.',
                'location': 'Manyara Region, Tanzania', 'region': 'Tarangire', 'category': 'national_park',
                'best_time_to_visit': 'June to October', 'entry_fee': '$60 per person per day',
                'activities': 'Game drives, Bird watching, Photography',
            },
            {
                'name': 'Lake Manyara National Park',
                'description': 'Known for tree-climbing lions and large flamingo populations.',
                'location': 'Arusha Region, Tanzania', 'region': 'Manyara', 'category': 'national_park',
                'best_time_to_visit': 'June to October', 'entry_fee': '$60 per person per day',
                'activities': 'Game drives, Canoeing, Bird watching',
            },
            {
                'name': 'Selous Game Reserve',
                'description': 'One of the largest faunal reserves in the world, a UNESCO World Heritage Site.',
                'location': 'Southern Tanzania', 'region': 'Selous', 'category': 'national_park',
                'best_time_to_visit': 'June to October', 'entry_fee': '$50 per person per day',
                'activities': 'Boat safaris, Walking safaris, Game drives, Fishing',
            },
            {
                'name': 'Ruaha National Park',
                'description': 'Tanzania largest national park, known for dramatic landscapes and elephant populations.',
                'location': 'Iringa Region, Tanzania', 'region': 'Ruaha', 'category': 'national_park',
                'best_time_to_visit': 'June to October', 'entry_fee': '$50 per person per day',
                'activities': 'Game drives, Walking safaris, Bird watching',
            },
            {
                'name': 'Stone Town',
                'description': 'UNESCO World Heritage Site, historic heart of Zanzibar City.',
                'location': 'Zanzibar City, Zanzibar', 'region': 'Zanzibar', 'category': 'cultural',
                'best_time_to_visit': 'All year round', 'entry_fee': 'Free (guided tours from $20)',
                'activities': 'Walking tours, Shopping, Photography, Food tours',
            },
            {
                'name': 'Nungwi Beach',
                'description': 'One of the most beautiful beaches in Zanzibar with powdery white sand.',
                'location': 'Nungwi, Zanzibar', 'region': 'Zanzibar', 'category': 'beach',
                'best_time_to_visit': 'June to October', 'entry_fee': 'Free',
                'activities': 'Swimming, Snorkeling, Sunset cruises, Diving',
            },
            {
                'name': 'Mnemba Atoll',
                'description': 'A protected marine reserve, paradise for snorkelers and divers.',
                'location': 'Off Matemwe, Zanzibar', 'region': 'Zanzibar', 'category': 'beach',
                'best_time_to_visit': 'All year round', 'entry_fee': '$50-70 for snorkeling trips',
                'activities': 'Snorkeling, Scuba diving, Dolphin watching',
            },
            {
                'name': 'Jozani Chwaka Bay National Park',
                'description': 'Home to the rare Red Colobus monkey found only on Zanzibar.',
                'location': 'Central Zanzibar', 'region': 'Zanzibar', 'category': 'national_park',
                'best_time_to_visit': 'All year round', 'entry_fee': '$10-15 per person',
                'activities': 'Guided forest walks, Monkey watching, Bird watching',
            },
            {
                'name': 'Prison Island (Changuu Island)',
                'description': 'Famous for giant Aldabra tortoises, some over 100 years old.',
                'location': '3 km from Stone Town, Zanzibar', 'region': 'Zanzibar', 'category': 'beach',
                'best_time_to_visit': 'All year round', 'entry_fee': '$10-15 per person',
                'activities': 'Tortoise feeding, Snorkeling, Swimming, History tours',
            },
            {
                'name': 'Kendwa Beach',
                'description': 'Known for powdery white sand and gentle waters, not affected by tides.',
                'location': 'Kendwa, Zanzibar', 'region': 'Zanzibar', 'category': 'beach',
                'best_time_to_visit': 'All year round', 'entry_fee': 'Free',
                'activities': 'Swimming, Sunbathing, Snorkeling, Kayaking',
            },
            {
                'name': 'Paje Beach',
                'description': 'Famous for turquoise waters and world-class kitesurfing conditions.',
                'location': 'Paje, Zanzibar', 'region': 'Zanzibar', 'category': 'beach',
                'best_time_to_visit': 'June to October', 'entry_fee': 'Free',
                'activities': 'Kitesurfing, Windsurfing, Swimming, Yoga',
            },
            {
                'name': 'Spice Farms of Zanzibar',
                'description': 'Zanzibar is known as the Spice Island. Learn about cloves, nutmeg, cinnamon.',
                'location': 'Various locations, Zanzibar', 'region': 'Zanzibar', 'category': 'cultural',
                'best_time_to_visit': 'All year round', 'entry_fee': '$20-25 per person',
                'activities': 'Spice tours, Fruit tasting, Cooking demonstrations',
            },
        ]

        for attr_data in attractions:
            att = Attraction.objects.create(**attr_data)
            self.stdout.write(f'  Created attraction: {att.name}')

        reviews_data = [
            {'author_name': 'Sarah Johnson', 'content': 'The Serengeti safari was absolutely incredible! We saw the Big Five within the first two days.', 'rating': 5, 'tour': Tour.objects.filter(title__icontains='Serengeti').first()},
            {'author_name': 'Michael Chen', 'content': 'Kilimanjaro trek was challenging but rewarding beyond words. Standing at Uhuru Peak was incredible.', 'rating': 5, 'tour': Tour.objects.filter(title__icontains='Kilimanjaro').first()},
            {'author_name': 'Emma Williams', 'content': 'Our honeymoon in Zanzibar was perfect! The beaches were stunning and the sunset dhow cruise was magical.', 'rating': 5, 'tour': Tour.objects.filter(title__icontains='Honeymoon').first()},
            {'author_name': 'James Anderson', 'content': 'Stone Town is a fascinating place full of history and culture. The spice tour was educational and fun.', 'rating': 4, 'tour': Tour.objects.filter(title__icontains='Stone Town').first()},
            {'author_name': 'Lisa Thompson', 'content': 'The Ngorongoro Crater is like nowhere else on earth. The concentration of wildlife is astounding.', 'rating': 5, 'tour': Tour.objects.filter(title__icontains='Ngorongoro').first()},
            {'author_name': 'David Martinez', 'content': 'The snorkeling at Mnemba Atoll was out of this world. Crystal clear water, abundant marine life.', 'rating': 5, 'tour': Tour.objects.filter(title__icontains='Snorkeling').first()},
        ]

        for rev_data in reviews_data:
            if rev_data['tour']:
                Review.objects.create(**rev_data)
                self.stdout.write(f'  Created review by: {rev_data["author_name"]}')

        self.stdout.write(self.style.SUCCESS(f'Seeded: {Tour.objects.count()} tours, {Attraction.objects.count()} attractions, {Review.objects.count()} reviews'))
