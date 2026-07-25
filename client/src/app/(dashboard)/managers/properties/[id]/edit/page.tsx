"use client";

import { CustomFormField } from "@/components/FormField";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { propertyEditSchema } from "@/lib/schemas";
import { formatEnumString } from "@/lib/utils";
import { AmenityEnum, HighlightEnum, PropertyTypeEnum } from "@/lib/constants";
import {
  useGetAuthUserQuery,
  useGetPropertyQuery,
  useUpdatePropertyMutation,
} from "@/state/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const EditProperty = () => {
  const router = useRouter();
  const { id } = useParams();
  const propertyId = Number(id);
  const { user } = useAuth(); // ✅ Get user from context

  const { data: authUser } = useGetAuthUserQuery();
  const { data: property, isLoading: propertyLoading } = useGetPropertyQuery(
    propertyId,
    {
      skip: Number.isNaN(propertyId),
    },
  );
  const [updateProperty, { isLoading: isUpdating }] =
    useUpdatePropertyMutation();

  type PropertyEditFormInput = z.input<typeof propertyEditSchema>;

  const form = useForm<PropertyEditFormInput>({
    resolver: zodResolver(propertyEditSchema),
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
      propertyType: PropertyTypeEnum.Apartment,
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      latitude: "",
      longitude: "",
    },
  });

  useEffect(() => {
    if (!property) return;

    form.reset({
      name: property.name,
      description: property.description,
      pricePerMonth: property.pricePerMonth,
      securityDeposit: property.securityDeposit,
      applicationFee: property.applicationFee,
      isPetsAllowed: property.isPetsAllowed,
      isParkingIncluded: property.isParkingIncluded,
      photoUrls: [],
      amenities: property.amenities?.[0] ?? "",
      highlights: property.highlights?.[0] ?? "",
      beds: property.beds,
      baths: property.baths,
      squareFeet: property.squareFeet,
      propertyType: property.propertyType,
      address: property.location?.address ?? "",
      city: property.location?.city ?? "",
      state: property.location?.state ?? "",
      country: property.location?.country ?? "",
      postalCode: property.location?.postalCode ?? "",
      latitude: property.location?.coordinates?.latitude ?? "",
      longitude: property.location?.coordinates?.longitude ?? "",
    });
  }, [form, property]);

  const onSubmit = async (data: PropertyEditFormInput) => {
    const managerId = user?.id;
    if (!managerId) {
      toast.error("No manager ID found. Please login again.");
      return;
    }

    if (user?.role?.toLowerCase() !== "manager") {
      toast.error("Only managers can edit properties.");
      return;
    }

    try {
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
        propertyType: data.propertyType,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
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

      console.log("📤 Updating property with data:", requestBody);

      await updateProperty({
        id: propertyId,
        propertyData: requestBody,
      }).unwrap();

      toast.success("Property updated successfully!");
      router.push(`/managers/properties/${propertyId}`);
    } catch (error: any) {
      console.error("❌ Error updating property:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to update property";
      toast.error(errorMessage);
    }
  };

  if (propertyLoading) return <Loading />;
  if (!property) {
    return <div className="dashboard-container">Property not found</div>;
  }

  return (
    <div className="dashboard-container">
      <Link
        href={`/managers/properties/${propertyId}`}
        className="flex items-center mb-4 hover:text-primary-500"
        scroll={false}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span>Back to Property</span>
      </Link>

      <Header
        title="Edit Property"
        subtitle="Update listing details for your property"
      />

      <div className="bg-white rounded-xl p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 space-y-10"
          >
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

            <div>
              <h2 className="text-lg font-semibold mb-4">Photos (Optional)</h2>
              <CustomFormField
                name="photoUrls"
                label="Replace Property Photos"
                type="file"
                accept="image/*"
              />
            </div>

            <hr className="my-6 border-gray-200" />

            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">
                Additional Information
              </h2>
              <CustomFormField name="address" label="Address" />
              <div className="flex justify-between gap-4">
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
              disabled={isUpdating}
            >
              {isUpdating ? "Saving Changes..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EditProperty;
