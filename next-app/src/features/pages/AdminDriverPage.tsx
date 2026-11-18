"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { CheckCircle2, CarFront, LoaderCircle, UserRound, BriefcaseBusiness } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import dashStyles from "@/features/pages/admin-dashboard.module.css";
import styles from "@/features/pages/admin-driver.module.css";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  license_number: "",
  id_type: "ZAN_ID",
  id_number: "",
  vehicle_name: "",
  plate_number: "",
  category: "Sedan",
  capacity: "4",
  luggage_capacity: "2",
  vehicle_description: "",
  includes: "A/C\nFuel\nMineral Water",
  excludes: "Driver Tips\nPark Entry Fees",
  service_title: "",
  price: "45.00",
  pricing_type: "per_trip",
  service_description: "",
};

export default function AdminDriverPage() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [driverImage, setDriverImage] = useState<File | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));
      if (frontFile) fd.append("front_image", frontFile);
      if (sideFile) fd.append("side_image", sideFile);
      if (backFile) fd.append("back_image", backFile);
      if (driverImage) fd.append("driver_image", driverImage);

      const response = await fetch("/api/admin/drivers", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to register driver");
      }
      setSuccess(true);
      toast.success("Public hire driver registered successfully.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to register driver";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const registerAnother = () => {
    setForm(initialForm);
    setFrontFile(null);
    setSideFile(null);
    setBackFile(null);
    setDriverImage(null);
    setSuccess(false);
  };

  return (
    <div className={dashStyles.dashboardRoot}>
      <header className={dashStyles.dashMasthead}>
        <div className={dashStyles.dashMastheadText}>
          <p className={dashStyles.dashEyebrow}>Admin workspace</p>
          <h1 className={dashStyles.dashTitle}><CarFront size={22} /> Public hire drivers</h1>
          <p className={dashStyles.dashCopy}>
            Register an independent driver, their vehicle, and the service they offer.
          </p>
        </div>
      </header>

      {success ? (
        <section className={dashStyles.dashPanel} aria-live="polite">
          <div className={styles.successState}>
            <span className={styles.successIcon}><CheckCircle2 size={26} /></span>
            <div>
              <h2>Driver registered</h2>
              <p>The public hire driver and service were added successfully.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={registerAnother}>
              Register another driver
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className={styles.driverForm}>
          <section className={dashStyles.dashPanel} aria-labelledby="driver-details-heading">
            <div className={dashStyles.dashPanelHead}>
              <div className={dashStyles.dashPanelHeadMain}>
                <span className={dashStyles.dashPanelIcon} aria-hidden="true"><UserRound size={17} /></span>
                <div>
                  <h2 className={dashStyles.dashPanelTitle} id="driver-details-heading">Driver details</h2>
                  <p className={dashStyles.dashPanelCopy}>Contact and identity information for this driver.</p>
                </div>
              </div>
            </div>
            <div className={styles.fieldGrid}>
              <label className={styles.field}><span>Full name <b>*</b></span><input name="name" required value={form.name} onChange={handleChange} autoComplete="name" /></label>
              <label className={styles.field}><span>Phone <b>*</b></span><input name="phone" required type="tel" value={form.phone} onChange={handleChange} autoComplete="tel" /></label>
              <label className={styles.field}><span>Email</span><input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" /></label>
              <label className={styles.field}><span>License number <b>*</b></span><input name="license_number" required value={form.license_number} onChange={handleChange} /></label>
              <label className={styles.field}><span>ID type</span>
                <select name="id_type" value={form.id_type} onChange={handleChange}>
                  <option value="ZAN_ID">ZanID</option><option value="NIDA">NIDA</option><option value="PASSPORT">Passport</option>
                </select>
              </label>
              <label className={styles.field}><span>ID number <b>*</b></span><input name="id_number" required value={form.id_number} onChange={handleChange} /></label>
            </div>
            <div className={styles.fileGrid}>
              <label className={styles.fileField}><span>Driver photo</span><input type="file" accept="image/*" onChange={(event) => setDriverImage(event.target.files?.[0] ?? null)} /><small>{driverImage?.name ?? "Optional · JPG, PNG or WebP"}</small></label>
            </div>
          </section>

          <section className={dashStyles.dashPanel} aria-labelledby="vehicle-details-heading">
            <div className={dashStyles.dashPanelHead}>
              <div className={dashStyles.dashPanelHeadMain}>
                <span className={dashStyles.dashPanelIcon} aria-hidden="true"><CarFront size={17} /></span>
                <div>
                  <h2 className={dashStyles.dashPanelTitle} id="vehicle-details-heading">Vehicle details</h2>
                  <p className={dashStyles.dashPanelCopy}>Vehicle capacity, description, and photos.</p>
                </div>
              </div>
            </div>
            <div className={styles.fieldGrid}>
              <label className={styles.field}><span>Vehicle name / model <b>*</b></span><input name="vehicle_name" required value={form.vehicle_name} onChange={handleChange} /></label>
              <label className={styles.field}><span>Plate number <b>*</b></span><input name="plate_number" required value={form.plate_number} onChange={handleChange} /></label>
              <label className={styles.field}><span>Category</span>
                <select name="category" value={form.category} onChange={handleChange}>
                  {["Sedan", "SUV 4x4", "Minivan", "Safari Cruiser", "Coaster Bus", "Luxury VIP"].map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className={styles.field}><span>Passenger seats</span><input name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange} /></label>
              <label className={styles.field}><span>Luggage bags</span><input name="luggage_capacity" type="number" min="0" value={form.luggage_capacity} onChange={handleChange} /></label>
              <label className={styles.field}><span>Vehicle description</span><textarea name="vehicle_description" rows={3} value={form.vehicle_description} onChange={handleChange} /></label>
              <label className={styles.field}><span>Included (one per line)</span><textarea name="includes" rows={4} value={form.includes} onChange={handleChange} /></label>
              <label className={styles.field}><span>Excluded (one per line)</span><textarea name="excludes" rows={4} value={form.excludes} onChange={handleChange} /></label>
            </div>
            <div className={styles.fileGrid}>
              <label className={styles.fileField}><span>Front vehicle photo</span><input type="file" accept="image/*" onChange={(event) => setFrontFile(event.target.files?.[0] ?? null)} /><small>{frontFile?.name ?? "Optional · JPG, PNG or WebP"}</small></label>
              <label className={styles.fileField}><span>Side vehicle photo</span><input type="file" accept="image/*" onChange={(event) => setSideFile(event.target.files?.[0] ?? null)} /><small>{sideFile?.name ?? "Optional · JPG, PNG or WebP"}</small></label>
              <label className={styles.fileField}><span>Rear vehicle photo</span><input type="file" accept="image/*" onChange={(event) => setBackFile(event.target.files?.[0] ?? null)} /><small>{backFile?.name ?? "Optional · JPG, PNG or WebP"}</small></label>
            </div>
          </section>

          <section className={dashStyles.dashPanel} aria-labelledby="service-details-heading">
            <div className={dashStyles.dashPanelHead}>
              <div className={dashStyles.dashPanelHeadMain}>
                <span className={dashStyles.dashPanelIcon} aria-hidden="true"><BriefcaseBusiness size={17} /></span>
                <div>
                  <h2 className={dashStyles.dashPanelTitle} id="service-details-heading">Service details</h2>
                  <p className={dashStyles.dashPanelCopy}>Set the public title, price, and service description.</p>
                </div>
              </div>
            </div>
            <div className={styles.fieldGrid}>
              <label className={styles.field}><span>Service title <b>*</b></span><input name="service_title" required value={form.service_title} onChange={handleChange} /></label>
              <label className={styles.field}><span>Price <b>*</b></span><input name="price" required type="number" step="0.01" min="0" value={form.price} onChange={handleChange} /></label>
              <label className={styles.field}><span>Pricing unit</span>
                <select name="pricing_type" value={form.pricing_type} onChange={handleChange}>
                  <option value="per_trip">Per trip</option><option value="per_day">Per day</option><option value="per_hour">Per hour</option>
                </select>
              </label>
              <label className={styles.field}><span>Service description</span><textarea name="service_description" rows={4} value={form.service_description} onChange={handleChange} /></label>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <LoaderCircle className={styles.spinner} size={16} /> : null}
                {submitting ? "Registering driver…" : "Register public hire driver"}
              </button>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}

