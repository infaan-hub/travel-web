"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { publicCompaniesAPI } from "@/lib/api/client";
import { Search, Building2, MapPin, Globe } from "@/components/icons";
import styles from "@/features/pages/company-public.module.css";

type Company = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  business_type: string;
  logo_image_url: string | null;
  cover_image_url: string | null;
  locality: string | null;
  district: string | null;
  region: string | null;
  country: string | null;
  public_path: string;
  tours_count: number;
  website: string | null;
};

const BUSINESS_TYPES = [
  "TOUR_OPERATOR",
  "SAFARI_OPERATOR",
  "EXCURSION_PROVIDER",
  "DESTINATION_MANAGEMENT",
  "ACCOMMODATION_PROVIDER",
  "TRANSPORT_PROVIDER",
  "OTHER",
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [region, setRegion] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (businessType) params.business_type = businessType;
      if (region.trim()) params.region = region.trim();
      const res = await publicCompaniesAPI.getAll(params);
      const data = res.data;
      setCompanies(Array.isArray(data) ? data : data.results || []);
      setTotal(Array.isArray(data) ? data.length : data.total || 0);
    } catch (error) {
      console.error(error);
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, businessType, region, page]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Boolean(search.trim() || businessType || region.trim());

  return (
    <div className={`page ${styles.page}`}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Tourism providers</p>
        <h1 className={styles.title}>Meet the companies behind the experiences</h1>
        <p className={styles.lead}>
          Compare public company profiles, service areas and published tours, safaris and local experiences.
        </p>
        <div className={styles.filters}>
          <label className={styles.searchField}>
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search companies, regions or services"
            />
          </label>
          <select
            value={businessType}
            onChange={(event) => {
              setPage(1);
              setBusinessType(event.target.value);
            }}
            aria-label="Business type"
          >
            <option value="">All business types</option>
            {BUSINESS_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.toLowerCase().replace(/_/g, " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())}
              </option>
            ))}
          </select>
          <input
            value={region}
            onChange={(event) => {
              setPage(1);
              setRegion(event.target.value);
            }}
            placeholder="Region"
            aria-label="Region"
          />
        </div>
      </section>

      {loading ? (
        <div className={styles.loading}>Loading companies...</div>
      ) : companies.length === 0 ? (
        <div className={styles.empty}>
          <Building2 size={28} />
          <h2>{hasFilters ? "No companies match these filters" : "No companies are listed yet"}</h2>
          <p>{hasFilters ? "Try a broader search or clear the filters to see all listed providers." : "Published company profiles will appear here when providers join the marketplace."}</p>
          {hasFilters ? (
            <button className="btn btn-secondary" type="button" onClick={() => { setSearch(""); setBusinessType(""); setRegion(""); setPage(1); }}>
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {companies.map((company) => (
              <article className={styles.card} key={company.id}>
                {company.cover_image_url ? (
                  <img
                    className={styles.cover}
                    src={company.cover_image_url}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.coverFallback}>
                    <Building2 size={28} />
                  </div>
                )}
                <div className={styles.cardBody}>
                  <div className={styles.identity}>
                    {company.logo_image_url ? (
                      <img
                        className={styles.logo}
                        src={company.logo_image_url}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className={styles.logoFallback}>
                        <Building2 size={18} />
                      </span>
                    )}
                    <div>
                      <h2 className={styles.cardTitle}>{company.name}</h2>
                      <p className={styles.cardMeta}>
                        {company.business_type.replace(/_/g, " ")}
                        {company.locality || company.region
                          ? ` · ${[company.locality, company.region, company.country]
                              .filter(Boolean)
                              .join(", ")}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {company.description ? (
                    <p className={styles.description}>{company.description}</p>
                  ) : null}
                  <div className={styles.stats}>
                    <span>
                      <Globe size={14} /> {company.tours_count} published experiences
                    </span>
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noreferrer">
                        Website
                      </a>
                    ) : null}
                  </div>
                  <Link className={styles.viewLink} href={company.public_path}>
                    View company
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {totalPages > 1 ? (
            <div className={styles.pagination}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
