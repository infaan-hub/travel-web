export type PrivateHireVehicle = {
  id: number;
  name: string;
  plate_number: string;
  category: string;
  capacity: number;
  luggage_capacity: number;
  description: string;
  includes: string[];
  excludes: string[];
  front_image_url: string | null;
  side_image_url: string | null;
  back_image_url: string | null;
};

export type PrivateHireDriver = {
  id: number;
  name: string;
  phone: string;
  email: string;
  image_url: string | null;
  license_number: string;
  id_number: string;
};

export type PrivateHireService = {
  id: number;
  title: string;
  description: string;
  price: string;
  pricing_type: string;
  vehicle: PrivateHireVehicle | null;
  driver: PrivateHireDriver | null;
  company: {
    id: number;
    name: string;
    slug: string;
    contact_phone: string;
    contact_email: string;
    logo_image_url: string | null;
  } | null;
};

export const PRICING_LABELS: Record<string, string> = {
  per_trip: "per trip",
  per_day: "per day",
  per_hour: "per hour",
};

/**
 * Placeholder listings used when the private-hire API is unavailable so the
 * transport directory still demonstrates its card and detail layouts.
 */
export const SAMPLE_PRIVATE_HIRE_SERVICES: PrivateHireService[] = [
  {
    id: 101,
    title: "First class private hire travel service",
    description:
      "First class private hire travel service across Zanzibar with luxury air-conditioned vehicle, complimentary mineral water, luggage assistance, and meet & greet at airport or hotel.",
    price: "90",
    pricing_type: "per_trip",
    vehicle: {
      id: 201,
      name: "Toyota Alphard",
      plate_number: "Z454AAD",
      category: "Minivan",
      capacity: 5,
      luggage_capacity: 5,
      description: "Executive 5-seater luxury minivan with leather seating, climate control, and privacy glass.",
      includes: [
        "Fuel & Highway Tolls",
        "Air Conditioning",
        "Bottled Mineral Water",
        "Flight Delay Tracking",
        "Luggage Assistance",
      ],
      excludes: ["Driver Gratuity", "National Park Entry Fees"],
      front_image_url:
        "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80",
      side_image_url:
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
      back_image_url: null,
    },
    driver: {
      id: 301,
      name: "hameed abdul",
      phone: "+255 777 454 000",
      email: "hameed.driver@infaan.com",
      image_url: null,
      license_number: "DL-ZN-45401",
      id_number: "19880412-32100-00002-19",
    },
    company: {
      id: 401,
      name: "infaan private hire ltd",
      slug: "infaan-private-hire-ltd",
      contact_phone: "+255777454000",
      contact_email: "support@infaan.com",
      logo_image_url: null,
    },
  },
  {
    id: 102,
    title: "Executive VIP Island Transfer",
    description:
      "Comfortable chauffeured transfers between Abeid Amani Karume International Airport (ZNZ), Stone Town, and coastal beach resorts.",
    price: "85",
    pricing_type: "per_trip",
    vehicle: {
      id: 202,
      name: "Toyota Alphard Executive",
      plate_number: "Z942AB",
      category: "Minivan",
      capacity: 5,
      luggage_capacity: 5,
      description: "VIP private hire passenger transport vehicle.",
      includes: ["Air Conditioning", "Airport Meet & Greet", "Cold Towels & Water", "Luggage Porterage"],
      excludes: ["Driver Tip"],
      front_image_url:
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
      side_image_url: null,
      back_image_url: null,
    },
    driver: {
      id: 302,
      name: "Rashid Salim",
      phone: "+255 778 123 789",
      email: "rashid.driver@infaan.com",
      license_number: "DL-ZN-98214",
      id_number: "19910515-32100-00004-22",
      image_url: null,
    },
    company: {
      id: 401,
      name: "infaan private hire ltd",
      slug: "infaan-private-hire-ltd",
      contact_phone: "+255777454000",
      contact_email: "support@infaan.com",
      logo_image_url: null,
    },
  },
];
