import json
import urllib.request
import urllib.parse
from rest_framework import generics, permissions, status, filters, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q, Count, Avg
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta, datetime
from .models import (Tour, Booking, ContactMessage, Attraction, Review,
                     TravelTip, VisitorTracking, HomeSetting, TourGalleryImage,
                     Profile)
from .serializers import (
    UserSerializer, UserDetailSerializer, TourSerializer,
    TourListSerializer, BookingSerializer, ContactSerializer,
    AttractionSerializer, ReviewSerializer, TravelTipSerializer,
    VisitorTrackingSerializer, HomeSettingSerializer,
    TourGalleryImageSerializer, ProfileSerializer
)


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None:
        errors = response.data
        message = ''
        if isinstance(errors, dict):
            for key, val in errors.items():
                if isinstance(val, list):
                    message = str(val[0])
                elif isinstance(val, str):
                    message = val
                break
        elif isinstance(errors, list):
            message = str(errors[0]) if errors else ''
        else:
            message = str(errors)
        response.data = {
            'success': False,
            'message': message or str(getattr(exc, 'detail', 'An error occurred')),
            'errors': errors,
        }
    return response


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


class AdminRegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        user.is_staff = True
        user.save()


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class AllUsersView(generics.ListAPIView):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class UserManageView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAdminUser]


# ─── GEOCODING ──────────────────────────────────────────────────────

class GeocodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        location = request.query_params.get('location', '')
        if not location:
            return Response({'error': 'Location parameter required'}, status=400)
        try:
            url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({
                'q': location + ', Tanzania',
                'format': 'json',
                'limit': 1,
            })
            req = urllib.request.Request(url, headers={'User-Agent': 'TravelAgencyApp/1.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                if data:
                    return Response({
                        'lat': float(data[0]['lat']),
                        'lng': float(data[0]['lon']),
                        'display_name': data[0]['display_name'],
                    })
                return Response({'error': 'Location not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ─── TOURS ──────────────────────────────────────────────────────────

class TourListCreateView(generics.ListCreateAPIView):
    serializer_class = TourListSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'destination', 'description', 'category']
    ordering_fields = ['price', 'created_at', 'duration']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TourSerializer
        return TourListSerializer

    def get_queryset(self):
        queryset = Tour.objects.all()
        category = self.request.query_params.get('category', None)
        destination = self.request.query_params.get('destination', None)
        featured = self.request.query_params.get('featured', None)
        search = self.request.query_params.get('search', None)
        if category:
            queryset = queryset.filter(category=category)
        if destination:
            queryset = queryset.filter(destination__icontains=destination)
        if featured:
            queryset = queryset.filter(featured=True)
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(destination__icontains=search) | Q(description__icontains=search))
        return queryset


class TourDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tour.objects.all()
    serializer_class = TourSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# ─── TOUR GALLERY ───────────────────────────────────────────────────

class TourGalleryListView(generics.ListCreateAPIView):
    serializer_class = TourGalleryImageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        tour_id = self.kwargs.get('tour_id')
        return TourGalleryImage.objects.filter(tour_id=tour_id)

    def list(self, request, *args, **kwargs):
        tour_id = self.kwargs.get('tour_id')
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'tour_id': tour_id,
            'gallery_images': serializer.data
        })

    def perform_create(self, serializer):
        tour_id = self.kwargs.get('tour_id')
        get_object_or_404(Tour, id=tour_id)
        serializer.save(tour_id=tour_id)


class TourGalleryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TourGalleryImageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        tour_id = self.kwargs.get('tour_id')
        if tour_id:
            return TourGalleryImage.objects.filter(tour_id=tour_id)
        return TourGalleryImage.objects.all()


class TourGalleryReorderView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def put(self, request, tour_id):
        order_data = request.data.get('order', [])
        for item in order_data:
            TourGalleryImage.objects.filter(id=item['id'], tour_id=tour_id).update(order=item['order'])
        return Response({'status': 'reordered'})


# ─── ATTRACTIONS ────────────────────────────────────────────────────

class AttractionListCreateView(generics.ListCreateAPIView):
    queryset = Attraction.objects.all()
    serializer_class = AttractionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'location', 'region', 'category']

    def get_queryset(self):
        queryset = Attraction.objects.all()
        region = self.request.query_params.get('region', None)
        category = self.request.query_params.get('category', None)
        if region:
            queryset = queryset.filter(region__icontains=region)
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class AttractionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Attraction.objects.all()
    serializer_class = AttractionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


# ─── REVIEWS ────────────────────────────────────────────────────────

class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Review.objects.all()
        tour_id = self.request.query_params.get('tour', None)
        status = self.request.query_params.get('status', None)
        if tour_id:
            queryset = queryset.filter(tour_id=tour_id)
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user, status='pending')


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAdminUser]


class UserReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        try:
            return Review.objects.get(pk=pk, user=self.request.user)
        except Review.DoesNotExist:
            return None

    def patch(self, request, pk):
        review = self.get_object(pk)
        if not review:
            return Response({'error': 'Review not found or not yours'}, status=404)
        if review.status != 'pending':
            return Response({'error': 'Can only edit pending reviews'}, status=400)
        review.rating = request.data.get('rating', review.rating)
        review.content = request.data.get('content', review.content)
        review.save()
        return Response(ReviewSerializer(review, context={'request': request}).data)

    def delete(self, request, pk):
        review = self.get_object(pk)
        if not review:
            return Response({'error': 'Review not found or not yours'}, status=404)
        review.status = 'deleted'
        review.save()
        return Response({'status': 'deleted'})


class TourReviewListView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        tour_id = self.kwargs.get('tour_id')
        return Review.objects.filter(tour_id=tour_id, status='approved')


class TourReviewCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, tour_id):
        tour = get_object_or_404(Tour, id=tour_id)
        if Review.objects.filter(user=request.user, tour=tour).exclude(status='deleted').exists():
            return Response({'error': 'You already reviewed this tour'}, status=400)
        rating = request.data.get('rating')
        content = request.data.get('content')
        if not rating or not content:
            return Response({'error': 'Rating and content are required'}, status=400)
        review = Review.objects.create(
            user=request.user, tour=tour,
            rating=int(rating), content=content,
            status='pending'
        )
        return Response(ReviewSerializer(review, context={'request': request}).data, status=201)


class ReviewApproveView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        try:
            review = Review.objects.get(pk=pk)
            new_status = request.data.get('status')
            if new_status in ('approved', 'pending', 'deleted'):
                review.status = new_status
            elif request.data.get('approved') is True:
                review.status = 'approved'
            elif request.data.get('approved') is False:
                review.status = 'pending'
            review.save()
            return Response(ReviewSerializer(review, context={'request': request}).data)
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'}, status=404)


class ReviewStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        all_reviews = Review.objects.all()
        return Response({
            'total': all_reviews.count(),
            'approved': all_reviews.filter(status='approved').count(),
            'pending': all_reviews.filter(status='pending').count(),
            'deleted': all_reviews.filter(status='deleted').count(),
            'average_rating': all_reviews.filter(status='approved').aggregate(avg=Avg('rating'))['avg'],
            'rating_distribution': {
                str(i): all_reviews.filter(rating=i, status='approved').count() for i in range(1, 6)
            },
        })


# ─── BOOKINGS ───────────────────────────────────────────────────────

class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Booking.objects.filter(user=user).order_by('-created_at')
        return Booking.objects.none()

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


class BookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]


class AllBookingsView(generics.ListAPIView):
    queryset = Booking.objects.all().order_by('-created_at')
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        queryset = Booking.objects.all().order_by('-created_at')
        status = self.request.query_params.get('status', None)
        tour_id = self.request.query_params.get('tour', None)
        search = self.request.query_params.get('search', None)
        if status:
            queryset = queryset.filter(status=status)
        if tour_id:
            queryset = queryset.filter(tour_id=tour_id)
        if search:
            queryset = queryset.filter(Q(full_name__icontains=search) | Q(email__icontains=search))
        return queryset


# ─── PROFILE ────────────────────────────────────────────────────────

ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
MAX_IMAGE_SIZE = 5 * 1024 * 1024

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response(ProfileSerializer(profile, context={'request': request}).data)

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data

        email = data.get('email')
        if email:
            request.user.email = email
            request.user.save()

        if 'full_name' in data:
            profile.full_name = data['full_name']
        if 'phone' in data:
            profile.phone = data['phone']
        if 'address' in data:
            profile.address = data['address']

        image_file = request.FILES.get('image')
        if image_file:
            if image_file.content_type not in ALLOWED_IMAGE_TYPES:
                return Response({'error': f'Invalid image type. Allowed: JPG, PNG, WEBP'}, status=400)
            if image_file.size > MAX_IMAGE_SIZE:
                return Response({'error': 'Image too large. Maximum 5MB.'}, status=400)
            if profile.image:
                profile.image.delete()
            profile.image = image_file

        profile.save()
        return Response(ProfileSerializer(profile, context={'request': request}).data)

    def delete(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if profile.image:
            profile.image.delete()
            profile.image = None
            profile.save()
        return Response({'status': 'image removed'})


# ─── CONTACT ────────────────────────────────────────────────────────

class ContactCreateView(generics.CreateAPIView):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [permissions.AllowAny]

class ContactMessageListView(generics.ListAPIView):
    queryset = ContactMessage.objects.all().order_by('-created_at')
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAdminUser]

class ContactMessageManageView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAdminUser]


# ─── DASHBOARD ──────────────────────────────────────────────────────

class CustomerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_bookings = Booking.objects.filter(user=request.user)
        return Response({
            'total_bookings': user_bookings.count(),
            'pending_bookings': user_bookings.filter(status='pending').count(),
            'confirmed_bookings': user_bookings.filter(status='confirmed').count(),
            'recent_bookings': BookingSerializer(user_bookings.order_by('-created_at')[:3], many=True, context={'request': request}).data,
        })


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        return Response({
            'total_tours': Tour.objects.count(),
            'total_bookings': Booking.objects.count(),
            'total_attractions': Attraction.objects.count(),
            'total_reviews': Review.objects.count(),
            'total_users': User.objects.count(),
            'total_tips': TravelTip.objects.count(),
            'new_users_today': User.objects.filter(date_joined__date=today).count(),
            'new_users_week': User.objects.filter(date_joined__date__gte=week_ago).count(),
            'new_users_month': User.objects.filter(date_joined__date__gte=month_ago).count(),
            'pending_bookings': Booking.objects.filter(status='pending').count(),
            'confirmed_bookings': Booking.objects.filter(status='confirmed').count(),
            'cancelled_bookings': Booking.objects.filter(status='cancelled').count(),
            'zanzibar_tours': Tour.objects.filter(category='zanzibar').count(),
            'tanzania_tours': Tour.objects.filter(category='tanzania').count(),
            'total_visitors': VisitorTracking.objects.count(),
            'unique_visitors': VisitorTracking.objects.values('session_id').distinct().count(),
            'logged_in_visitors': VisitorTracking.objects.filter(is_authenticated=True).values('user').distinct().count(),
            'guest_visitors': VisitorTracking.objects.filter(is_authenticated=False).values('session_id').distinct().count(),
            'visitors_today': VisitorTracking.objects.filter(created_at__date=today).values('session_id').distinct().count(),
            'visitors_week': VisitorTracking.objects.filter(created_at__date__gte=week_ago).values('session_id').distinct().count(),
            'visitors_month': VisitorTracking.objects.filter(created_at__date__gte=month_ago).values('session_id').distinct().count(),
        })


class AnalyticsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        today = timezone.now().date()
        days_30 = [today - timedelta(days=i) for i in range(29, -1, -1)]
        days_7 = [today - timedelta(days=i) for i in range(6, -1, -1)]

        visitors_by_day = []
        for d in days_30:
            count = VisitorTracking.objects.filter(created_at__date=d).values('session_id').distinct().count()
            visitors_by_day.append({'date': d.isoformat(), 'count': count})

        new_users_by_day = []
        for d in days_30:
            count = User.objects.filter(date_joined__date=d).count()
            new_users_by_day.append({'date': d.isoformat(), 'count': count})

        bookings_by_month = []
        for i in range(5, -1, -1):
            month = today.month - i
            year = today.year
            while month < 1:
                month += 12
                year -= 1
            count = Booking.objects.filter(created_at__month=month, created_at__year=year).count()
            bookings_by_month.append({'month': f'{year}-{month:02d}', 'count': count})

        tour_views = VisitorTracking.objects.exclude(tour_id__isnull=True).values('tour_id').annotate(count=Count('session_id')).order_by('-count')[:5]
        popular_tours = []
        for tv in tour_views:
            try:
                tour = Tour.objects.get(id=tv['tour_id'])
                popular_tours.append({'name': tour.title, 'views': tv['count']})
            except Tour.DoesNotExist:
                pass

        logged_in = VisitorTracking.objects.filter(is_authenticated=True).values('session_id').distinct().count()
        guests = VisitorTracking.objects.filter(is_authenticated=False).values('session_id').distinct().count()

        return Response({
            'visitors_by_day': visitors_by_day,
            'new_users_by_day': new_users_by_day,
            'bookings_by_month': bookings_by_month,
            'popular_tours': popular_tours,
            'logged_in_vs_guests': {'logged_in': logged_in, 'guests': guests},
        })


# ─── TRACKING ───────────────────────────────────────────────────────

class TrackVisitView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        session_id = data.get('session_id')
        if not session_id:
            session_id = f'anon_{timezone.now().timestamp()}'
        page_url = data.get('page_url', data.get('page', ''))
        user = request.user if request.user.is_authenticated else None
        VisitorTracking.objects.create(
            session_id=session_id,
            page_url=page_url,
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            is_authenticated=request.user.is_authenticated,
            tour_id=data.get('tour_id'),
        )
        return Response({'status': 'tracked'})


# ─── TRAVEL TIPS ────────────────────────────────────────────────────

class TravelTipListCreateView(generics.ListCreateAPIView):
    queryset = TravelTip.objects.all()
    serializer_class = TravelTipSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content', 'category']

    def perform_create(self, serializer):
        serializer.save(author=self.request.user if self.request.user.is_authenticated else None)


class TravelTipDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TravelTip.objects.all()
    serializer_class = TravelTipSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# ─── ROUTE CALCULATION ──────────────────────────────────────────────

import math as _math

class RouteCalculateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            origin_lat = float(request.data.get('origin_lat', 0))
            origin_lng = float(request.data.get('origin_lng', 0))
            dest_lat = float(request.data.get('destination_lat', 0))
            dest_lng = float(request.data.get('destination_lng', 0))
        except (TypeError, ValueError):
            return Response({'error': 'Invalid coordinates'}, status=400)

        if not all([origin_lat, origin_lng, dest_lat, dest_lng]):
            return Response({'error': 'Origin and destination coordinates are required'}, status=400)

        R = 6371
        dlat = _math.radians(dest_lat - origin_lat)
        dlng = _math.radians(dest_lng - origin_lng)
        a = _math.sin(dlat/2)**2 + _math.cos(_math.radians(origin_lat)) * _math.cos(_math.radians(dest_lat)) * _math.sin(dlng/2)**2
        c = 2 * _math.atan2(_math.sqrt(a), _math.sqrt(1-a))
        distance_km = round(R * c, 2)

        speed_kph = 50
        duration_min = round((distance_km / speed_kph) * 60)

        return Response({
            'distance': f'{distance_km} km',
            'distance_km': distance_km,
            'duration': f'{duration_min} minutes',
            'duration_min': duration_min,
            'origin': {'lat': origin_lat, 'lng': origin_lng},
            'destination': {'lat': dest_lat, 'lng': dest_lng},
        })

# ─── HOME SETTINGS ──────────────────────────────────────────────────

class HomeSettingView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        setting, _ = HomeSetting.objects.get_or_create(id=1)
        return Response(HomeSettingSerializer(setting, context={'request': request}).data)

    def patch(self, request):
        setting, _ = HomeSetting.objects.get_or_create(id=1)
        serializer = HomeSettingSerializer(setting, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class HomeSettingAdminView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request):
        setting, _ = HomeSetting.objects.get_or_create(id=1)
        data = request.data.copy()
        if data.get('clear_hero') == 'true':
            setting.hero_image.delete()
            setting.hero_image = None
        if data.get('clear_zanzibar') == 'true':
            setting.zanzibar_image.delete()
            setting.zanzibar_image = None
        if data.get('clear_tanzania') == 'true':
            setting.tanzania_image.delete()
            setting.tanzania_image = None
        serializer = HomeSettingSerializer(setting, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


# ─── WHATSAPP / EMAIL ──────────────────────────────────────────────

class SendBookingWhatsAppView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        full_name = data.get('full_name', '')
        email = data.get('email', '')
        phone = data.get('phone', '')
        tour = data.get('tour', '')
        travelers = data.get('travelers', '')
        travel_date = data.get('travel_date', '')
        address = data.get('address', '')
        notes = data.get('notes', '')
        message = f"New Booking Request%0A%0AName: {full_name}%0AEmail: {email}%0APhone: {phone}%0ATour: {tour}%0ATravelers: {travelers}%0ADate: {travel_date}%0AAddress: {address}%0ANotes: {notes}"
        whatsapp_number = data.get('whatsapp_number', '255711252758')
        whatsapp_url = f"https://wa.me/{whatsapp_number}?text={message}"
        return Response({'whatsapp_url': whatsapp_url, 'message': 'WhatsApp link generated successfully'}, status=status.HTTP_200_OK)


class SendBookingEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        full_name = data.get('full_name', '')
        email = data.get('email', '')
        phone = data.get('phone', '')
        tour = data.get('tour', '')
        travelers = data.get('travelers', '')
        travel_date = data.get('travel_date', '')
        notes = data.get('notes', '')
        destination = data.get('destination', '')
        children = data.get('children', 0)
        recipient_email = data.get('recipient_email', 'infaanhameed@gmail.com')

        if not settings.EMAIL_HOST_PASSWORD:
            return Response({
                'success': False,
                'message': 'Email system not configured. Please contact support.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not full_name or not email or not tour:
            return Response({
                'success': False,
                'message': 'Missing required booking fields.',
                'errors': {'fields': ['full_name', 'email', 'tour']}
            }, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        created_at = timezone.now().strftime('%B %d, %Y at %I:%M %p')

        subject = 'New Tour Booking'
        body = f"""New Tour Booking Received

Customer Information:
Name: {full_name}
Email: {email}
Phone: {phone}

Tour Information:
Tour Name: {tour}
Destination: {destination}
Travel Date: {travel_date}
Number of Adults: {travelers}
Number of Children: {children}

Additional Information:
Special Requests: {notes}

Booking Time: {created_at}
"""
        try:
            send_mail(subject, body, settings.EMAIL_HOST_USER, [recipient_email], fail_silently=False)
            return Response({
                'success': True,
                'message': 'Booking submitted successfully'
            }, status=status.HTTP_200_OK)
        except Exception:
            return Response({
                'success': False,
                'message': 'Unable to send booking email'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
