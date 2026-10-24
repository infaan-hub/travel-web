import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPublicCompany } from "@/lib/services/public-companies";
import TourCard from "@/components/TourCard";
import { Building2, Globe, MapPin, Star } from "@/components/icons";
import { publicImageUrl } from "@/lib/storage/images";
import { openingHoursEntries } from "@/lib/company-opening-hours";
import styles from "@/features/pages/company-public.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = (await getPublicCompany(slug)) as any;
  if (!company) return { title: "Company not found" };
  return {
    title: company.name,
    description: company.description || `Tours operated by ${company.name}.`,
  };
}

export default async function CompanyProfilePage({ params }: Props) {
  const { slug } = await params;
  const company = (await getPublicCompany(slug)) as any;
  if (!company) notFound();

  const tours = Array.isArray(company.tours) ? company.tours : [];
  const trips = Array.isArray(company.trips) ? company.trips : [];
  const companyHours = openingHoursEntries(company.opening_hours);

  return (
    <div className={`page ${styles.page}`}>
      <section className={styles.profileHero}>
        {company.cover_image_url ? (
          <img
            className={styles.profileCover}
            src={company.cover_image_url}
            alt=""
          />
        ) : (
          <div className={styles.profileCoverFallback} />
        )}
        <div className={styles.profileIdentity}>
          {company.logo_image_url ? (
            <Image
              src={company.logo_image_url}
              alt=""
              width={72}
              height={72}
              className={styles.profileLogo}
            />
          ) : (
            <span className={styles.profileLogoFallback}>
              <Building2 size={28} />
            </span>
          )}
          <div>
            <p className={styles.eyebrow}>{company.business_type.replace(/_/g, " ")}</p>
            <h1 className={styles.title}>{company.name}</h1>
            <p className={styles.lead}>
              {[company.locality, company.district, company.region, company.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.profileGrid}>
        <article className={styles.profileCard}>
          <h2>About</h2>
          <p>{company.description || "No company description provided."}</p>
          {company.website ? (
            <a href={company.website} target="_blank" rel="noreferrer">
              <Globe size={16} /> Website
            </a>
          ) : null}
          {company.map_url ? (
            <a href={company.map_url} target="_blank" rel="noreferrer">
              <MapPin size={16} /> View on OpenStreetMap
            </a>
          ) : company.address ? (
            <p className={styles.address}>{company.address}</p>
          ) : null}
          {company.contact_email ? <p>Email: {company.contact_email}</p> : null}
          {company.contact_phone ? <p>Phone: {company.contact_phone}</p> : null}
          {companyHours.length ? (
            <div>
              <h3>Opening hours</h3>
              <ul>
                {companyHours.map((entry) => (
                  <li key={entry.day}>
                    <strong>{entry.day}:</strong> {entry.hours}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {company.review_count > 0 ? (
            <p className={styles.rating}>
              <Star size={16} /> {Number(company.average_rating ?? 0).toFixed(1)} from{" "}
              {company.review_count} approved review
              {company.review_count === 1 ? "" : "s"}
            </p>
          ) : null}
        </article>

        <article className={styles.profileCard}>
          <h2>Location</h2>
          {company.latitude !== null && company.longitude !== null ? (
            <p>
              Coordinates: {company.latitude}, {company.longitude}
            </p>
          ) : (
            <p>Address details are provided; no map marker is available.</p>
          )}
          {company.address ? <p>{company.address}</p> : null}
        </article>
      </section>

      <section className={styles.toursSection}>
        <div className={styles.sectionHead}>
          <h2>Published tours</h2>
          <p>{tours.length} available tour{tours.length === 1 ? "" : "s"}</p>
        </div>
        {tours.length === 0 ? (
          <div className={styles.empty}>
            <Building2 size={28} />
            <p>This company has no published tours yet.</p>
          </div>
        ) : (
          <div className="tours-grid">
            {tours.map((tour: any) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}
      </section>

      <section className={styles.toursSection}>
        <div className={styles.sectionHead}>
          <h2>Trips and places</h2>
          <p>{trips.length} trip{trips.length === 1 ? "" : "s"}</p>
        </div>
        {trips.length === 0 ? (
          <div className={styles.empty}>
            <Building2 size={28} />
            <p>This company has no trip listings yet.</p>
          </div>
        ) : (
          <div className={styles.tripsGrid}>
            {trips.map((trip: any) => (
              <article className={styles.tripCard} key={trip.id}>
                {trip.image_url ? (
                  <img
                    className={styles.tripImage}
                    src={trip.image_url}
                    alt={trip.title}
                  />
                ) : null}
                <div className={styles.tripBody}>
                  <h3>{trip.title}</h3>
                  <p><MapPin size={14} /> {trip.place}</p>
                  {trip.description ? <p>{trip.description}</p> : null}
                  <p className={styles.tripPrice}>
                    ${Number(trip.price ?? 0).toLocaleString("en-US")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className={styles.backLink}>
        <Link href="/companies/">Back to companies</Link>
      </div>
    </div>
  );
}
