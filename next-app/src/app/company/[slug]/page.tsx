import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPublicCompany } from "@/lib/services/public-companies";
import TourCard from "@/components/TourCard";
import { Building2, Globe, MapPin, Star } from "@/components/icons";
import { publicImageUrl } from "@/lib/storage/images";
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
          {company.opening_hours ? <p>Hours: {company.opening_hours}</p> : null}
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

      <div className={styles.backLink}>
        <Link href="/companies/">Back to companies</Link>
      </div>
    </div>
  );
}
