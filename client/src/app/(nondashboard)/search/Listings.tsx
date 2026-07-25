// client/src/components/Listings.tsx
"use client";

import {
  useAddFavoritePropertyMutation,
  useGetAuthUserQuery,
  useGetPropertiesQuery,
  useGetTenantQuery,
  useRemoveFavoritePropertyMutation,
} from "@/state/api";
import { useAppSelector } from "@/state/redux";
import { Property } from "@/types/prismaTypes";
import Card from "@/components/Card";
import React, { useMemo, useState } from "react";
import CardCompact from "@/components/CardCompact";
import {
  AlertTriangle,
  Grid3X3,
  List,
  Loader2,
  MapPin,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const Listings = () => {
  const { user } = useAuth();
  const { data: authUser } = useGetAuthUserQuery();
  const isTenant = user?.role?.toLowerCase() === "tenant";
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<number | null>(
    null,
  );

  // Use user.id for the tenant query
  const { data: tenant, refetch: refetchTenant } = useGetTenantQuery(
    user?.id || "",
    {
      skip: !user?.id || !isTenant,
    },
  );

  const [addFavorite] = useAddFavoritePropertyMutation();
  const [removeFavorite] = useRemoveFavoritePropertyMutation();
  const viewMode = useAppSelector((state) => state.global.viewMode);
  const filters = useAppSelector((state) => state.global.filters);

  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  const favoriteIds = useMemo(
    () => new Set((tenant?.favorites || []).map((fav: Property) => fav.id)),
    [tenant?.favorites],
  );

  const locationLabel =
    filters.location?.trim() ||
    (filters.coordinates?.[0] || filters.coordinates?.[1]
      ? "selected area"
      : "all locations");

  // Update the handleFavoriteToggle function
  const handleFavoriteToggle = async (propertyId: number) => {
    if (!user) {
      toast.error("Please login to add favorites");
      return;
    }

    if (!isTenant) {
      toast.error("Only tenants can add favorites");
      return;
    }

    setIsTogglingFavorite(propertyId);

    try {
      const isFavorite = tenant?.favorites?.some(
        (fav: Property) => fav.id === propertyId,
      );

      console.log("🔍 Favorite Toggle Debug:", {
        userId: user.id,
        propertyId,
        isFavorite,
      });

      if (isFavorite) {
        const result = await removeFavorite({
          userId: user.id, // Changed from cognitoId to userId
          propertyId,
        }).unwrap();
        console.log("✅ Remove favorite result:", result);
        toast.success("Removed from favorites");
      } else {
        const result = await addFavorite({
          userId: user.id, // Changed from cognitoId to userId
          propertyId,
        }).unwrap();
        console.log("✅ Add favorite result:", result);
        toast.success("Added to favorites");
      }
      await refetchTenant();
    } catch (error: any) {
      console.error("❌ Favorite toggle error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to update favorites";
      toast.error(errorMessage);
    } finally {
      setIsTogglingFavorite(null);
    }
  };

  if (isLoading) {
    return (
      <section className="w-full h-full rounded-3xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-4 sm:p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="h-3 w-28 rounded-full bg-slate-200 animate-pulse" />
            <div className="mt-2 h-6 w-48 rounded-full bg-slate-200 animate-pulse" />
          </div>
          <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 rounded-2xl border border-slate-200 bg-white animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (isError || !properties) {
    return (
      <section className="w-full h-full rounded-3xl border border-red-200 bg-red-50/70 p-6">
        <div className="mx-auto mt-10 max-w-sm text-center">
          <AlertTriangle className="mx-auto h-9 w-9 text-red-500" />
          <h3 className="mt-3 text-lg font-semibold text-red-900">
            Couldn&apos;t load listings
          </h3>
          <p className="mt-1 text-sm text-red-700">
            Please refresh the page or adjust your filters and try again.
          </p>
        </div>
      </section>
    );
  }

  const isGrid = viewMode === "grid";

  return (
    <section className="w-full h-full rounded-3xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-4 sm:p-5">
      <header className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Search Results
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {properties.length} {properties.length === 1 ? "place" : "places"}{" "}
              in {locationLabel}
            </h3>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {isGrid ? (
              <Grid3X3 className="h-3.5 w-3.5" />
            ) : (
              <List className="h-3.5 w-3.5" />
            )}
            {isGrid ? "Grid view" : "List view"}
          </span>
        </div>
      </header>

      {properties.length === 0 ? (
        <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
          <SearchX className="mx-auto h-10 w-10 text-slate-500" />
          <h4 className="mt-3 text-lg font-semibold text-slate-900">
            No properties found
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            Try widening your filters or selecting a nearby area on the map.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <MapPin className="h-3.5 w-3.5" />
            Current area: {locationLabel}
          </p>
        </div>
      ) : (
        <div
          className={
            isGrid ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "space-y-4"
          }
        >
          {properties.map((property) =>
            isGrid ? (
              <Card
                key={property.id}
                property={property}
                isFavorite={favoriteIds.has(property.id)}
                onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                showFavoriteButton={!!user && isTenant}
                propertyLink={`/search/${property.id}`}
                isLoading={isTogglingFavorite === property.id}
              />
            ) : (
              <CardCompact
                key={property.id}
                property={property}
                isFavorite={favoriteIds.has(property.id)}
                onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                showFavoriteButton={!!user && isTenant}
                propertyLink={`/search/${property.id}`}
                isLoading={isTogglingFavorite === property.id}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
};

export default Listings;
