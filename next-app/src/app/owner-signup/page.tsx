"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { authAPI } from "@/lib/api/client";
import { companiesAPI } from "@/lib/api/client";
import { CompanyBusinessType } from "@/features/pages/types";
import { ArrowLeft, Loader, X } from "@/components/icons";

type OwnerSignupFormValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  businessType: CompanyBusinessType;
  description: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber?: string;
  address: string;
  locality: string;
  district: string;
  region: string;
  country: string;
  website?: string;
};

export default function OwnerSignupPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<OwnerSignupFormValues>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    businessType: "TRANSPORT_OPERATOR",
    description: "",
    contactEmail: "",
    contactPhone: "",
    whatsappNumber: "",
    address: "",
    locality: "",
    district: "",
    region: "",
    country: "Tanzania",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => setShowPassword((prev) => !prev);

  const onSubmit = async (values: OwnerSignupFormValues) => {
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Step 1: Create the user account with temporary password via auth API
      const userResponse = await authAPI.register({
        username: form.username,
        email: form.email,
        password: form.password,
      });

      // Step 2: Create the company profile linked to the new user
      const companyResponse = await companiesAPI.create({
        name: form.companyName,
        slug: form.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "private-hire-company",
        description: form.description,
        business_type: form.businessType,
        contact_email: form.contactEmail,
        contact_phone: form.contactPhone,
        whatsapp_number: form.whatsappNumber || "",
        address: form.address,
        locality: form.locality,
        district: form.district,
        region: form.region,
        country: form.country,
        website: form.website || "",
        is_public: false,
      });

      toast.success(
        `Account created successfully! Your company "${companyResponse.data.name}" is pending review.`
      );

      // Redirect to login
      router.push("/login");
    } catch (caught: any) {
      const message =
        caught.response?.data?.message ||
        caught.message ||
        "Failed to create account. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Private Hire Company Owner Signup</h2>
          <button
            onClick={() => router.push("/admin/companies")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} /> Back to admin
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800">
            {error}
          </div>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              Username
              <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="text"
              placeholder="e.g. private-hire-operator"
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email
              <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="email"
              placeholder="user@privatehire.example.com"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Temporary Password
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                type={showPassword ? "text" : "password"}
                placeholder="Enter temporary password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                required
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Confirm Password
              <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="password"
              placeholder="Confirm temporary password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Company Name
              <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="text"
              value={form.companyName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, companyName: e.target.value }))
              }
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              This will be the public name of your private hire company.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Business Type
              <span className="text-red-500">*</span>
            </label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={form.businessType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  businessType: e.target.value as CompanyBusinessType,
                }))
              }
            >
              <option value="TRANSPORT_OPERATOR">Transport operator</option>
              <option value="CAR_RENTAL">Car rental</option>
              <option value="SHUTTLE_OPERATOR">Shuttle operator</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
              <span className="text-red-500">*</span>
            </label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 resize-none min-h-[80px]"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              required
              rows={3}
              placeholder="Describe your private hire services, routes, and offerings..."
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Contact Email
              <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="email"
              value={form.contactEmail}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contactEmail: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Contact Phone
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="tel"
              value={form.contactPhone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contactPhone: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              WhatsApp Number
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="tel"
              value={form.whatsappNumber || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))
              }
            />
            <p className="text-sm text-gray-500 mt-1">Optional</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Address
              <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="text"
              value={form.address}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, address: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Locality / Town
              <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="text"
              value={form.locality}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, locality: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              District
              <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="text"
              value={form.district}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, district: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Region
              <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="text"
              value={form.region}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, region: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Country
              <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="text"
              value={form.country}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, country: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Website (optional)
            </label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              type="url"
              value={form.website || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, website: e.target.value }))
              }
            />
            <p className="text-sm text-gray-500 mt-1">Optional</p>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting ? <Loader size={18} /> : "Create Account & Company"}
          </button>
        </form>
      </div>
    </div>
  );
}