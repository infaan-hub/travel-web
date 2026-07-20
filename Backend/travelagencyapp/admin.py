from django.contrib import admin
from .models import (Tour, Booking, ContactMessage, Attraction, Review,
                     ItineraryItem, TravelTip, VisitorTracking, HomeSetting,
                     TourGalleryImage, TravelDriver, TravelVehicle, Hotel,
                     Room, Workspace, WorkspaceTask)


class ItineraryItemInline(admin.TabularInline):
    model = ItineraryItem
    extra = 1


class TourGalleryImageInline(admin.TabularInline):
    model = TourGalleryImage
    extra = 1


@admin.register(Tour)
class TourAdmin(admin.ModelAdmin):
    list_display = ['title', 'destination', 'category', 'price', 'duration', 'featured', 'available', 'created_at']
    list_filter = ['category', 'available', 'featured', 'destination']
    search_fields = ['title', 'destination', 'description']
    inlines = [ItineraryItemInline, TourGalleryImageInline]


@admin.register(Attraction)
class AttractionAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'region', 'category', 'best_time_to_visit', 'updated_at']
    list_filter = ['category', 'region']
    search_fields = ['name', 'location']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['user', 'tour', 'rating', 'status', 'created_at']
    list_filter = ['rating', 'status', 'created_at']
    search_fields = ['user__username', 'content']
    list_editable = ['status']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'tour', 'email', 'phone', 'travelers', 'travel_date', 'status', 'created_at']
    list_filter = ['status', 'travel_date']
    search_fields = ['full_name', 'email', 'phone']


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'email', 'subject']


@admin.register(TravelTip)
class TravelTipAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'published', 'author', 'created_at']
    list_filter = ['published', 'category']
    search_fields = ['title', 'content']


@admin.register(HomeSetting)
class HomeSettingAdmin(admin.ModelAdmin):
    list_display = ['id', 'updated_at']


@admin.register(TourGalleryImage)
class TourGalleryImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'tour', 'order', 'created_at']
    list_filter = ['tour']
    ordering = ['tour', 'order']


@admin.register(VisitorTracking)
class VisitorTrackingAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'page_url', 'is_authenticated', 'created_at']
    list_filter = ['is_authenticated', 'created_at']
    search_fields = ['session_id', 'page_url']


@admin.register(TravelDriver)
class TravelDriverAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'created_at']
    search_fields = ['name', 'phone']


@admin.register(TravelVehicle)
class TravelVehicleAdmin(admin.ModelAdmin):
    list_display = ['car_name', 'plate_number', 'created_at']
    search_fields = ['car_name', 'plate_number']


@admin.register(Hotel)
class HotelAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'phone', 'created_at']
    search_fields = ['name', 'location']


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'hotel', 'price', 'created_at']
    list_filter = ['hotel']
    search_fields = ['name']


class WorkspaceTaskInline(admin.TabularInline):
    model = WorkspaceTask
    extra = 1


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ['tourist_name', 'tourist_email', 'status', 'total_price', 'message_sent', 'created_at']
    list_filter = ['status', 'message_sent']
    search_fields = ['tourist_name', 'tourist_email']
    inlines = [WorkspaceTaskInline]


@admin.register(WorkspaceTask)
class WorkspaceTaskAdmin(admin.ModelAdmin):
    list_display = ['workspace', 'day', 'title', 'completed', 'created_at']
    list_filter = ['completed', 'day']
    search_fields = ['title']
