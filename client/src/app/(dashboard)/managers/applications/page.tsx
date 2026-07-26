"use client";

import { CustomFormField } from "@/components/FormField";
import Header from "@/components/Header";
import { Form } from "@/components/ui/form";
import { formatEnumString } from "@/lib/utils";
import { propertySchema } from "@/lib/schemas";
import { useCreatePropertyMutation, useGetAuthUserQuery } from "@/state/api";
import { AmenityEnum, HighlightEnum, PropertyTypeEnum } from "@/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { Suspense } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Define error interface
interface ApiError {
  data?: {
    message?: string;
  };
  message?: string;
}

// Inner component that uses useSearchParams
function NewPropertyContent() {
  const [createProperty] = useCreatePropertyMutation();
  const { data: authUser, isLoading } = useGetAuthUserQuery();
  const router = useRouter();

  // You can use searchParams here if needed
  // const someParam = searchParams?.get("someKey");

  type PropertyFormInput = z.input<typeof propertySchema>;

  const form = useForm<PropertyFormInput>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      description: "",
      pricePerMonth: 1000,
      securityDeposit: 500,
      applicationFee: 100,
      isPetsAllowed: true,
      isParkingIncluded: true,
      photoUrls: [],
      amenities: "",
      highlights: "",
      beds: 1,
      baths: 1,
      squareFeet: 1000,
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      latitude: "",
      longitude: "",
    },
  });

  const onSubmit = async (data: PropertyFormInput) => {
    if (!authUser?.id) {
      toast.error("No manager ID found. Please login again.");
      return;
    }

    if (authUser.role?.toLowerCase() !== "manager") {
      toast.error("Only managers can create properties.");
      return;
    }

    try {
      console.log("📝 Creating property with data:", data);

      const requestBody = {
        name: data.name,
        description: data.description,
        pricePerMonth: parseFloat(String(data.pricePerMonth)),
        securityDeposit: parseFloat(String(data.securityDeposit)),
        applicationFee: parseFloat(String(data.applicationFee)),
        isPetsAllowed: data.isPetsAllowed,
        isParkingIncluded: data.isParkingIncluded,
        beds: parseInt(String(data.beds)),
        baths: parseFloat(String(data.baths)),
        squareFeet: parseInt(String(data.squareFeet)),
        propertyType: data.propertyType || "Apartment",
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        managerUserId: authUser.id,
        photoUrls: [],
        amenities: data.amenities ? [data.amenities] : [],
        highlights: data.highlights ? [data.highlights] : [],
        coordinates:
          data.latitude && data.longitude
            ? {
                lat: parseFloat(String(data.latitude)),
                lng: parseFloat(String(data.longitude)),
              }
            : undefined,
      };

      await createProperty(requestBody).unwrap();
      toast.success("Property created successfully!");
      router.push("/managers/properties");
    } catch (error) {
      console.error("❌ Error creating property:", error);
      const apiError = error as ApiError;
      const errorMessage =
        apiError?.data?.message ||
        apiError?.message ||
        "Failed to create property";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <Header title="Add New Property" subtitle="Loading..." />
        <div className="bg-white rounded-xl p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header
        title="Add New Property"
        subtitle="Create a new property listing with detailed information"
      />
      <div className="bg-white rounded-xl p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 space-y-10"
          >
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="space-y-4">
                <CustomFormField name="name" label="Property Name" />
                <CustomFormField
                  name="description"
                  label="Description"
                  type="textarea"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Fees */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Fees</h2>
              <CustomFormField
                name="pricePerMonth"
                label="Price per Month"
                type="number"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomFormField
                  name="securityDeposit"
                  label="Security Deposit"
                  type="number"
                />
                <CustomFormField
                  name="applicationFee"
                  label="Application Fee"
                  type="number"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Property Details */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CustomFormField
                  name="beds"
                  label="Number of Beds"
                  type="number"
                />
                <CustomFormField
                  name="baths"
                  label="Number of Baths"
                  type="number"
                />
                <CustomFormField
                  name="squareFeet"
                  label="Square Feet"
                  type="number"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <CustomFormField
                  name="isPetsAllowed"
                  label="Pets Allowed"
                  type="boolean-segmented"
                />
                <CustomFormField
                  name="isParkingIncluded"
                  label="Parking Included"
                  type="boolean-segmented"
                />
              </div>
              <div className="mt-4">
                <CustomFormField
                  name="propertyType"
                  label="Property Type"
                  type="select"
                  placeholder="Select property type"
                  options={Object.keys(PropertyTypeEnum).map((type) => ({
                    value: type,
                    label: formatEnumString(type),
                  }))}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Amenities and Highlights */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Amenities and Highlights
              </h2>
              <div className="space-y-6">
                <CustomFormField
                  name="amenities"
                  label="Amenities"
                  type="select"
                  placeholder="Select an amenity"
                  options={Object.keys(AmenityEnum).map((amenity) => ({
                    value: amenity,
                    label: formatEnumString(amenity),
                  }))}
                />
                <CustomFormField
                  name="highlights"
                  label="Highlights"
                  type="select"
                  placeholder="Select a highlight"
                  options={Object.keys(HighlightEnum).map((highlight) => ({
                    value: highlight,
                    label: formatEnumString(highlight),
                  }))}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Photos */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Photos</h2>
              <CustomFormField
                name="photoUrls"
                label="Property Photos"
                type="file"
                accept="image/*"
                multiple
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload up to 10 images (JPEG, PNG, GIF, WebP)
              </p>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Additional Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">
                Additional Information
              </h2>
              <CustomFormField name="address" label="Address" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CustomFormField name="city" label="City" className="w-full" />
                <CustomFormField
                  name="state"
                  label="State"
                  className="w-full"
                />
                <CustomFormField
                  name="postalCode"
                  label="Postal Code"
                  className="w-full"
                />
              </div>
              <CustomFormField name="country" label="Country" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomFormField
                  name="latitude"
                  label="Latitude (Optional)"
                  type="number"
                  placeholder="e.g. 40.7128"
                />
                <CustomFormField
                  name="longitude"
                  label="Longitude (Optional)"
                  type="number"
                  placeholder="e.g. -74.0060"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="bg-primary-700 text-white w-full mt-8"
            >
              Create Property
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function NewProperty() {
  return (
    <Suspense
      fallback={
        <div className="dashboard-container">
          <Header title="Add New Property" subtitle="Loading..." />
          <div className="bg-white rounded-xl p-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
            </div>
          </div>
        </div>
      }
    >
      <NewPropertyContent />
    </Suspense>
  );
}
