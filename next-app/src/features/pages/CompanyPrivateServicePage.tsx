"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { companyAPI } from "@/lib/api/client";
import {
  Car,
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  CreditCard,
  Briefcase,
  Users,
  Eye,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Loader,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import styles from "./company-private-service.module.css";

type Vehicle = {
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
  is_available: boolean;
};

type Driver = {
  id: number;
  name: string;
  phone: string;
  email: string;
  image_url: string | null;
  license_number: string;
  id_type: string;
  id_number: string;
  is_active: boolean;
};

type PrivateHireService = {
  id: number;
  company_id: number;
  vehicle_id: number;
  driver_id: number;
  title: string;
  description: string;
  price: string;
  pricing_type: string;
  is_active: boolean;
  vehicle: Vehicle | null;
  driver: Driver | null;
  created_at: string;
};

export default function CompanyPrivateServicePage() {
  const toast = useToast();
  const [services, setServices] = useState<PrivateHireService[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [previewService, setPreviewService] = useState<PrivateHireService | null>(null);
  const [editingService, setEditingService] = useState<PrivateHireService | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [driverId, setDriverId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [svcRes, vehRes, drvRes] = await Promise.all([
        companyAPI.privateHireServices({ search: search.trim() || undefined }),
        companyAPI.privateHireVehicles(),
        companyAPI.privateHireDrivers(),
      ]);
      setServices(svcRes.data?.results || []);
      setVehicles(vehRes.data?.results || []);
      setDrivers(drvRes.data?.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load services";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingService(null);
    setTitle("");
    setVehicleId(vehicles.length > 0 ? vehicles[0].id : "");
    setDriverId(drivers.length > 0 ? drivers[0].id : "");
    setDescription("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (s: PrivateHireService) => {
    setEditingService(s);
    setTitle(s.title);
    setVehicleId(s.vehicle_id);
    setDriverId(s.driver_id);
    setDescription(s.description || "");
    setIsActive(s.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a service title.");
      return;
    }
    if (!vehicleId) {
      toast.error("Please select a Private Hire Vehicle.");
      return;
    }
    if (!driverId) {
      toast.error("Please select a Private Hire Driver.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        vehicle_id: vehicleId,
        driver_id: driverId,
        description: description.trim(),
        is_active: isActive,
      };

      if (editingService) {
        await companyAPI.updatePrivateHireService(editingService.id, payload);
        toast.success("Private Hire Service updated successfully.");
      } else {
        await companyAPI.createPrivateHireService(payload);
        toast.success("Private Hire Service registered successfully.");
      }

      setModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save service";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this service?")) return;
    try {
      await companyAPI.deletePrivateHireService(id);
      toast.success("Service removed.");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete service";
      toast.error(msg);
    }
  };

  return (
    <div className={styles.root}>
      {/* Top Header */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/company/dashboard/">Company workspace</Link>
            <span aria-hidden="true">/</span>
            <span>Private services</span>
          </nav>
          <p className={styles.eyebrow}>Service management</p>
          <h1>
            <Briefcase size={22} aria-hidden="true" />
            Private Hire Services
          </h1>
          <p>
            Pair your registered vehicles and drivers into bookable private-hire services.
          </p>
        </div>
        <div className={styles.actionsArea}>
          <div className={styles.searchBox}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className={styles.primaryBtn} onClick={openCreateModal}>
            <Plus size={18} />
            Create Service
          </button>
        </div>
      </div>

      <section className={styles.overview} aria-label="Service catalogue overview">
        <div className={styles.overviewMain}>
          <div className={styles.overviewHeading}>
            <span className={styles.overviewIcon} aria-hidden="true"><Briefcase size={21} /></span>
            <div>
              <h2>Service catalogue</h2>
              <p>Build clear hire options from vehicles and drivers in your company fleet.</p>
            </div>
          </div>
          <ul className={styles.stats}>
            <li><span>Total services</span><strong>{services.length}</strong><small>In your catalogue</small></li>
            <li><span>Active</span><strong>{services.filter((service) => service.is_active).length}</strong><small>Visible to customers</small></li>
            <li><span>Fleet readiness</span><strong>{vehicles.length} / {drivers.length}</strong><small>Vehicles / drivers</small></li>
          </ul>
        </div>
        <aside className={styles.overviewAside}>
          <span>Bookable services</span>
          <strong>{services.filter((service) => service.is_active).length.toLocaleString()}</strong>
          <p>Active private-hire options</p>
          <button type="button" onClick={openCreateModal}><Plus size={16} /> Create a service</button>
        </aside>
      </section>

      {/* Services List */}
      {loading ? (
        <div className={styles.emptyState}>
          <Loader className="animate-spin" size={32} color="#08428c" />
          <div className={styles.emptyStateSub}>Loading Private Hire Services...</div>
        </div>
      ) : services.length === 0 ? (
        <div className={styles.emptyState}>
          <Briefcase size={48} color="#94a3b8" />
          <div className={styles.emptyStateTitle}>No Private Hire Services Created Yet</div>
          <div className={styles.emptyStateSub}>
            Combine a registered vehicle and driver to offer airport transfers, day hire, or private island journeys.
          </div>
          <button className={styles.primaryBtn} onClick={openCreateModal}>
            <Plus size={18} /> Create Your First Service
          </button>
        </div>
      ) : (
        <div className={styles.servicesGrid}>
          {services.map((svc) => (
            <div key={svc.id} className={styles.serviceCard}>
              <div className={styles.serviceHeader}>
                <div className={styles.serviceTitleGroup}>
                  <h3 className={styles.serviceTitle}>{svc.title}</h3>
                  <span className="text-xs text-slate-500">
                    Service #{svc.id} • {svc.is_active ? "Active" : "Paused"}
                  </span>
                </div>
              </div>

              <div className={styles.serviceBody}>
                {svc.description && (
                  <p className="text-xs text-slate-600 m-0 line-clamp-2">{svc.description}</p>
                )}

                <div className={styles.pairedBlock}>
                  {/* Vehicle Section */}
                  <div className={styles.subSectionCard}>
                    <div className={styles.sectionHeaderRow}>
                      <Car size={14} /> Assigned Vehicle
                    </div>
                    {svc.vehicle ? (
                      <>
                        <div className={styles.vehicleThumbArea}>
                          {svc.vehicle.front_image_url ? (
                            <Image
                              src={svc.vehicle.front_image_url}
                              alt={svc.vehicle.name}
                              fill
                              className={styles.thumbImg}
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-200">
                              <Car size={24} color="#64748b" />
                            </div>
                          )}
                          <span className={styles.plateMiniBadge}>{svc.vehicle.plate_number}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <strong className="text-xs font-semibold text-slate-800">
                            {svc.vehicle.name} ({svc.vehicle.category})
                          </strong>
                          <span className="text-[11px] text-slate-500">
                            {svc.vehicle.capacity} seats • {svc.vehicle.luggage_capacity} bags
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-red-500">No vehicle assigned</span>
                    )}
                  </div>

                  {/* Driver Section */}
                  <div className={styles.subSectionCard}>
                    <div className={styles.sectionHeaderRow}>
                      <UserCheck size={14} /> Assigned Driver
                    </div>
                    {svc.driver ? (
                      <>
                        <div className={styles.driverInfoArea}>
                          {svc.driver.image_url ? (
                            <Image
                              src={svc.driver.image_url}
                              alt={svc.driver.name}
                              width={48}
                              height={48}
                              className={styles.driverAvatarMini}
                              unoptimized
                            />
                          ) : (
                            <div className={styles.driverAvatarFallback}>
                              {svc.driver.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className={styles.driverDetailsMini}>
                            <span className={styles.driverNameMini}>{svc.driver.name}</span>
                            <span className={styles.driverContactMini}>{svc.driver.phone}</span>
                            {svc.driver.email && (
                              <span className={styles.driverContactMini}>{svc.driver.email}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 flex flex-col gap-0.5">
                          <span>License: <strong>{svc.driver.license_number}</strong></span>
                          <span>ID: <strong>{svc.driver.id_number}</strong></span>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-red-500">No driver assigned</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.serviceFooter}>
                <button
                  className={styles.btnPreview}
                  onClick={() => setPreviewService(svc)}
                >
                  <Eye size={14} /> Tourist View
                </button>
                <div className={styles.cardActions}>
                  <button className={styles.btnSecondary} onClick={() => openEditModal(svc)}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button className={styles.btnDanger} onClick={() => handleDelete(svc.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingService ? "Edit Private Hire Service" : "Create Private Hire Service"}</h2>
              <button className={styles.closeBtn} onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formBody}>
                <div className={styles.formField}>
                  <label>
                    Service Title <span className={styles.requiredMark}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.inputControl}
                    placeholder="e.g. Airport VIP Transfer to Kendwa / Nungwi"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGrid}>
                  {/* Select Vehicle */}
                  <div className={styles.formField}>
                    <label>
                      Select Private Hire Vehicle <span className={styles.requiredMark}>*</span>
                    </label>
                    <select
                      className={styles.selectControl}
                      value={vehicleId}
                      onChange={(e) => setVehicleId(parseInt(e.target.value, 10) || "")}
                      required
                    >
                      <option value="">-- Choose a Vehicle --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.plate_number}) - {v.capacity} Pax
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Driver */}
                  <div className={styles.formField}>
                    <label>
                      Select Private Hire Driver <span className={styles.requiredMark}>*</span>
                    </label>
                    <select
                      className={styles.selectControl}
                      value={driverId}
                      onChange={(e) => setDriverId(parseInt(e.target.value, 10) || "")}
                      required
                    >
                      <option value="">-- Choose a Driver --</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formField}>
                  <label>Service Description & Notes</label>
                  <textarea
                    rows={3}
                    className={styles.textareaControl}
                    placeholder="Describe pickup points, meet-and-greet details, air-conditioning, baby seat availability..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="svc_active_chk"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="svc_active_chk" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Publish this service for customer bookings
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={styles.primaryBtn}
                >
                  {submitting ? (
                    <>
                      <Loader className="animate-spin" size={16} /> Saving...
                    </>
                  ) : editingService ? (
                    "Update Service"
                  ) : (
                    "Register Service"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer-facing service preview */}
      {previewService && (
        <div className={styles.modalBackdrop}>
          <div className={styles.previewContent}>
            <div className={styles.previewHeader}>
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">
                  Customer booking view
                </span>
                <h2 className={styles.previewHeaderTitle}>{previewService.title}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-white hover:opacity-75 p-1"
                  onClick={() => setPreviewService(null)}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className={styles.previewBody}>
              <div className={styles.touristCallout}>
                <ShieldCheck size={20} />
                  <span>
                    <strong>Verified transport information:</strong> Customers booking this service can review the assigned vehicle and driver details below.
                </span>
              </div>

              {/* 1. Vehicle Full Details */}
              {previewService.vehicle && (
                <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car size={18} color="#08428c" />
                      <strong className="text-base text-slate-900">{previewService.vehicle.name}</strong>
                    </div>
                    <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-1 rounded">
                      Plane / Plate: {previewService.vehicle.plate_number}
                    </span>
                  </div>

                  {/* Vehicle Images Gallery */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">Front View (Main)</span>
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-200">
                        {previewService.vehicle.front_image_url ? (
                          <Image
                            src={previewService.vehicle.front_image_url}
                            alt="Front View"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">Side View</span>
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-200">
                        {previewService.vehicle.side_image_url ? (
                          <Image
                            src={previewService.vehicle.side_image_url}
                            alt="Side View"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                            Optional (None)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">Back View</span>
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-200">
                        {previewService.vehicle.back_image_url ? (
                          <Image
                            src={previewService.vehicle.back_image_url}
                            alt="Back View"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                            Optional (None)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Capacities & Inclusions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block mb-1">Capacity</span>
                      <div className="flex gap-4 text-xs text-slate-600">
                        <span>👥 {previewService.vehicle.capacity} Passengers</span>
                        <span>🧳 {previewService.vehicle.luggage_capacity} Luggage Bags</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-700 block mb-1">Vehicle Category</span>
                      <span className="text-xs text-blue-800 font-medium">{previewService.vehicle.category}</span>
                    </div>
                  </div>

                  {/* Inclusions and Exclusions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                    <div>
                      <span className="text-xs font-bold text-emerald-700 block mb-1 uppercase tracking-wide">
                        What&apos;s Included:
                      </span>
                      <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc m-0">
                        {previewService.vehicle.includes?.map((inc, i) => (
                          <li key={i}>{inc}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-rose-700 block mb-1 uppercase tracking-wide">
                        What&apos;s Excluded:
                      </span>
                      <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc m-0">
                        {previewService.vehicle.excludes?.map((exc, i) => (
                          <li key={i}>{exc}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Driver Full Details */}
              {previewService.driver && (
                <div className="border border-sky-100 rounded-xl p-4 bg-sky-50/30 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} color="#0284c7" />
                    <strong className="text-base text-slate-900">Assigned Private Hire Driver</strong>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {previewService.driver.image_url ? (
                      <Image
                        src={previewService.driver.image_url}
                        alt={previewService.driver.name}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-full object-cover border-2 border-sky-400"
                        unoptimized
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-sky-200 text-sky-700 font-bold text-2xl flex items-center justify-center">
                        {previewService.driver.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 flex-1 text-center sm:text-left">
                      <h4 className="text-base font-bold text-slate-800 m-0">{previewService.driver.name}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 justify-center sm:justify-start">
                        <span className="flex items-center gap-1">
                          <Phone size={13} color="#0284c7" /> {previewService.driver.phone}
                        </span>
                        {previewService.driver.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={13} color="#0284c7" /> {previewService.driver.email}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500 pt-1">
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                          License: <strong>{previewService.driver.license_number}</strong>
                        </span>
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                          ID: <strong>{previewService.driver.id_number}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => setPreviewService(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
