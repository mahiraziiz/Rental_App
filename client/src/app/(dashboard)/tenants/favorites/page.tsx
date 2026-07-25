"use client";

import Card from "@/components/Card";
import DashboardPropertyFilters from "@/components/DashboardPropertyFilters";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  useGetAuthUserQuery,
  useGetPropertiesQuery,
  useGetTenantQuery,
} from "@/state/api";
import { useAppSelector } from "@/state/redux";
import React from "react";
import { useAuth } from "@/context/AuthContext";

const Favorites = () => {
  const { user } = useAuth(); // ✅ Get user from context
  const { data: authUser } = useGetAuthUserQuery();
  const filters = useAppSelector((state) => state.global.filters);
  const isTenant = user?.role?.toLowerCase() === "tenant"; // ✅ Use user from context

  const { data: tenant } = useGetTenantQuery(
    user?.id || "",
    {
      skip: !user?.id || !isTenant,
    },
  );

  const {
    data: favoriteProperties,
    isLoading,
    error,
  } = useGetPropertiesQuery(
    {
      ...filters,
      favoriteIds: tenant?.favorites?.map((fav: { id: number }) => fav.id),
    },
    { skip: !tenant?.favorites || tenant?.favorites.length === 0 },
  );

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading favorites</div>;

  return (
    <div className="dashboard-container">
      <Header
        title="Favorited Properties"
        subtitle="Browse and manage your saved property listings"
      />
      <DashboardPropertyFilters />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favoriteProperties?.map((property) => (
          <Card
            key={property.id}
            property={property}
            isFavorite={true}
            onFavoriteToggle={() => {}}
            showFavoriteButton={false}
            propertyLink={`/search/${property.id}`}
          />
        ))}
      </div>
      {(!favoriteProperties || favoriteProperties.length === 0) && (
        <p>You don&lsquo;t have any favorited properties</p>
      )}
    </div>
  );
};

export default Favorites;
