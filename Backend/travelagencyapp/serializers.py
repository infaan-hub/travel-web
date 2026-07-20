import json

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (Tour, Booking, ContactMessage, Attraction, Review,
                     ItineraryItem, TravelTip, VisitorTracking, HomeSetting,
                     TourGalleryImage, Profile, TravelDriver, TravelVehicle,
                     Hotel, Room, Workspace, WorkspaceTask)


class ItemsListField(serializers.Field):
    def to_representation(self, value):
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, TypeError):
                return [i.strip() for i in value.split(',') if i.strip()]
        return []

    def to_internal_value(self, data):
        if isinstance(data, list):
            return data
        if isinstance(data, str):
            try:
                parsed = json.loads(data)
                return parsed if isinstance(parsed, list) else [data]
            except (json.JSONDecodeError, TypeError):
                return [i.strip() for i in data.split(',') if i.strip()]
        return []


class UserSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'is_staff', 'date_joined', 'profile_image_url']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'is_staff': {'read_only': True},
            'date_joined': {'read_only': True},
        }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        Profile.objects.get_or_create(user=user)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

    def get_profile_image_url(self, obj):
        try:
            profile = obj.profile
            if profile.image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.image.url)
                return profile.image.url
        except Profile.DoesNotExist:
            pass
        return None


class UserDetailSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined', 'profile_image_url']

    def get_profile_image_url(self, obj):
        try:
            profile = obj.profile
            if profile.image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.image.url)
                return profile.image.url
        except Profile.DoesNotExist:
            pass
        return None


class ItineraryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItineraryItem
        fields = '__all__'


class TourGalleryImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    tour = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TourGalleryImage
        fields = ['id', 'tour', 'image', 'image_url', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    tour_title = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'status']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.username
        return None

    def get_tour_title(self, obj):
        if obj.tour:
            return obj.tour.title
        return None


class TourSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    main_image_url = serializers.SerializerMethodField()
    image2_url = serializers.SerializerMethodField()
    image3_url = serializers.SerializerMethodField()
    latitude = serializers.FloatField(source='destination_lat', read_only=True)
    longitude = serializers.FloatField(source='destination_lng', read_only=True)
    gallery_images = TourGalleryImageSerializer(many=True, read_only=True)
    gallery_image_urls = serializers.SerializerMethodField()
    itinerary = ItineraryItemSerializer(many=True, read_only=True)
    reviews = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    included_items = ItemsListField(source='includes', read_only=True)
    excluded_items = ItemsListField(source='excludes', read_only=True)
    includes = ItemsListField(write_only=True, required=False)
    excludes = ItemsListField(write_only=True, required=False)

    class Meta:
        model = Tour
        fields = '__all__'

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_main_image_url(self, obj):
        return self.get_image_url(obj)

    def get_image2_url(self, obj):
        if obj.image2:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image2.url)
            return obj.image2.url
        return None

    def get_image3_url(self, obj):
        if obj.image3:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image3.url)
            return obj.image3.url
        return None

    def get_gallery_image_urls(self, obj):
        request = self.context.get('request')
        urls = []
        for gi in obj.gallery_images.all():
            if gi.image:
                if request:
                    urls.append(request.build_absolute_uri(gi.image.url))
                else:
                    urls.append(gi.image.url)
        return urls

    def get_reviews(self, obj):
        reviews = obj.reviews.filter(status='approved')
        return ReviewSerializer(reviews, many=True, context=self.context).data

    def get_average_rating(self, obj):
        reviews = obj.reviews.filter(status='approved')
        if reviews:
            return sum(r.rating for r in reviews) / len(reviews)
        return None

    def get_review_count(self, obj):
        return obj.reviews.filter(status='approved').count()


class TourListSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    main_image_url = serializers.SerializerMethodField()
    image2_url = serializers.SerializerMethodField()
    image3_url = serializers.SerializerMethodField()
    latitude = serializers.FloatField(source='destination_lat', read_only=True)
    longitude = serializers.FloatField(source='destination_lng', read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    included_items = ItemsListField(source='includes', read_only=True)
    excluded_items = ItemsListField(source='excludes', read_only=True)

    class Meta:
        model = Tour
        fields = ['id', 'title', 'short_description', 'description', 'price',
                  'duration', 'destination', 'latitude', 'longitude',
                  'destination_lat', 'destination_lng',
                  'category', 'image_url', 'main_image_url', 'image2_url', 'image3_url',
                  'available', 'featured',
                  'average_rating', 'review_count', 'included_items', 'excluded_items', 'created_at',
                  'updated_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_main_image_url(self, obj):
        return self.get_image_url(obj)

    def get_image2_url(self, obj):
        if obj.image2:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image2.url)
            return obj.image2.url
        return None

    def get_image3_url(self, obj):
        if obj.image3:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image3.url)
            return obj.image3.url
        return None

    def get_average_rating(self, obj):
        reviews = obj.reviews.filter(status='approved')
        if reviews:
            return sum(r.rating for r in reviews) / len(reviews)
        return None

    def get_review_count(self, obj):
        return obj.reviews.filter(status='approved').count()


class AttractionSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Attraction
        fields = '__all__'

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class BookingSerializer(serializers.ModelSerializer):
    tour_title = serializers.ReadOnlyField(source='tour.title')
    tour_price = serializers.ReadOnlyField(source='tour.price')
    tour_destination = serializers.ReadOnlyField(source='tour.destination')
    tour_destination_lat = serializers.ReadOnlyField(source='tour.destination_lat')
    tour_destination_lng = serializers.ReadOnlyField(source='tour.destination_lng')
    total_price = serializers.SerializerMethodField()
    tour_image = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['user', 'status', 'created_at']

    def get_total_price(self, obj):
        return float(obj.tour.price) * obj.travelers

    def get_tour_image(self, obj):
        if obj.tour.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.tour.image.url)
            return obj.tour.image.url
        return None

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.username
        return None


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['id', 'full_name', 'email', 'phone', 'address', 'profile_image']

    def get_profile_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'
        read_only_fields = ['created_at']


class TravelTipSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TravelTip
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.username
        return None

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class HomeSettingSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    zanzibar_image_url = serializers.SerializerMethodField()
    tanzania_image_url = serializers.SerializerMethodField()

    class Meta:
        model = HomeSetting
        fields = '__all__'

    def get_hero_image_url(self, obj):
        if obj.hero_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.hero_image.url)
            return obj.hero_image.url
        return None

    def get_zanzibar_image_url(self, obj):
        if obj.zanzibar_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.zanzibar_image.url)
            return obj.zanzibar_image.url
        return None

    def get_tanzania_image_url(self, obj):
        if obj.tanzania_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.tanzania_image.url)
            return obj.tanzania_image.url
        return None


class VisitorTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitorTracking
        fields = '__all__'
        read_only_fields = ['created_at']


class TravelDriverSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TravelDriver
        fields = '__all__'
        read_only_fields = ['created_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class TravelVehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TravelVehicle
        fields = '__all__'
        read_only_fields = ['created_at']


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'
        read_only_fields = ['created_at']


class HotelSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    rooms = RoomSerializer(many=True, read_only=True)

    class Meta:
        model = Hotel
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class WorkspaceTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceTask
        fields = '__all__'
        read_only_fields = ['created_at']


class WorkspaceSerializer(serializers.ModelSerializer):
    tourist_name_display = serializers.SerializerMethodField()
    tourist_email_display = serializers.SerializerMethodField()
    hotel_name = serializers.SerializerMethodField()
    driver_name = serializers.SerializerMethodField()
    vehicle_name = serializers.SerializerMethodField()
    tasks = WorkspaceTaskSerializer(many=True, read_only=True)
    selected_tours_details = serializers.SerializerMethodField()
    selected_rooms_details = RoomSerializer(many=True, read_only=True)

    class Meta:
        model = Workspace
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_tourist_name_display(self, obj):
        return obj.tourist_name or (obj.tourist.username if obj.tourist else '')

    def get_tourist_email_display(self, obj):
        return obj.tourist_email or (obj.tourist.email if obj.tourist else '')

    def get_hotel_name(self, obj):
        return obj.selected_hotel.name if obj.selected_hotel else None

    def get_driver_name(self, obj):
        return obj.selected_travel_driver.name if obj.selected_travel_driver else None

    def get_vehicle_name(self, obj):
        return f"{obj.selected_travel_vehicle.car_name} ({obj.selected_travel_vehicle.plate_number})" if obj.selected_travel_vehicle else None

    def get_selected_tours_details(self, obj):
        tours = obj.selected_tours.all()
        return TourListSerializer(tours, many=True, context=self.context).data
