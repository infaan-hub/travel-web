from django.db import models
from django.contrib.auth.models import User

class Tour(models.Model):
    CATEGORY_CHOICES = [
        ('zanzibar', 'Zanzibar Tours'),
        ('tanzania', 'Tanzania Safaris'),
        ('international', 'International'),
    ]
    title = models.CharField(max_length=200)
    description = models.TextField()
    short_description = models.CharField(max_length=300, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration = models.CharField(max_length=100)
    destination = models.CharField(max_length=200)
    destination_lat = models.FloatField(blank=True, null=True)
    destination_lng = models.FloatField(blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='international')
    image = models.ImageField(upload_to='tours/', blank=True, null=True)
    image2 = models.ImageField(upload_to='tours/', blank=True, null=True)
    image3 = models.ImageField(upload_to='tours/', blank=True, null=True)
    includes = models.JSONField(default=list, blank=True)
    excludes = models.JSONField(default=list, blank=True)
    available = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class TourGalleryImage(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='gallery_images')
    image = models.ImageField(upload_to='tours/gallery/')
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Gallery image {self.order} for {self.tour.title}"

class ItineraryItem(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='itinerary')
    day = models.IntegerField()
    title = models.CharField(max_length=200)
    description = models.TextField()

    class Meta:
        ordering = ['day']

    def __str__(self):
        return f"Day {self.day}: {self.title} - {self.tour.title}"

class Attraction(models.Model):
    CATEGORY_CHOICES = [
        ('national_park', 'National Park'),
        ('mountain', 'Mountain'),
        ('beach', 'Beach / Island'),
        ('cultural', 'Cultural / Historical'),
        ('city', 'City / Urban'),
    ]
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    location = models.CharField(max_length=200)
    region = models.CharField(max_length=100, blank=True, default='', help_text="e.g. Zanzibar, Arusha, Serengeti")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, blank=True, default='')
    image = models.ImageField(upload_to='attractions/', blank=True, null=True)
    best_time_to_visit = models.CharField(max_length=200, blank=True)
    entry_fee = models.CharField(max_length=200, blank=True)
    activities = models.TextField(blank=True, help_text="Comma separated list of activities")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Review(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('deleted', 'Deleted'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='reviews', null=True, blank=True)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    content = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [['user', 'tour']]

    def __str__(self):
        name = self.user.username if self.user else f"User #{self.user_id}"
        return f"{name} - {self.rating}/5"

class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings', null=True, blank=True)
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name='bookings')
    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    travelers = models.IntegerField()
    travel_date = models.DateField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    user_lat = models.FloatField(blank=True, null=True)
    user_lng = models.FloatField(blank=True, null=True)
    distance_km = models.FloatField(blank=True, null=True)
    estimated_time_mins = models.IntegerField(blank=True, null=True)
    google_maps_url = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} - {self.tour.title} ({self.travel_date})"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=200, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    address = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='profiles/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

class ContactMessage(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, default='')
    subject = models.CharField(max_length=300)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.subject}"

class TravelTip(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    category = models.CharField(max_length=100, blank=True, help_text="e.g. Safety, Culture, Packing")
    image = models.ImageField(upload_to='tips/', blank=True, null=True)
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

class HomeSetting(models.Model):
    hero_image = models.ImageField(upload_to='home/', blank=True, null=True)
    zanzibar_image = models.ImageField(upload_to='home/', blank=True, null=True)
    tanzania_image = models.ImageField(upload_to='home/', blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Home Setting"
        verbose_name_plural = "Home Settings"

    def __str__(self):
        return "Home Page Settings"

class VisitorTracking(models.Model):
    session_id = models.CharField(max_length=100)
    page_url = models.CharField(max_length=500)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    is_authenticated = models.BooleanField(default=False)
    tour_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.session_id} - {self.page_url}"
