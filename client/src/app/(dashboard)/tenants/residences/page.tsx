"use client";

import Card from "@/components/Card";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  useGetAuthUserQuery,
  useGetCurrentResidencesQuery,
  useGetTenantQuery,
} from "@/state/api";
import React from "react";
import { useAuth } from "@/context/AuthContext";

const Residences = () => {
  const { user } = useAuth();
  const { data: authUser } = useGetAuthUserQuery();
  const isTenant = user?.role?.toLowerCase() === "tenant";

  const { data: tenant } = useGetTenantQuery(user?.id || "", {
    skip: !user?.id || !isTenant,
  });

  const {
    data: currentResidences,
    isLoading,
    error,
  } = useGetCurrentResidencesQuery(user?.id || "", {
    skip: !user?.id || !isTenant,
  });

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading current residences</div>;

  return (
    <div className="dashboard-container">
      <Header
        title="Current Residences"
        subtitle="View and manage your current living spaces"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentResidences?.map((property) => (
          <Card
            key={property.id}
            property={property}
            isFavorite={
              tenant?.favorites?.some(
                (favorite: { id: number }) => favorite.id === property.id,
              ) || false
            }
            onFavoriteToggle={() => {}}
            showFavoriteButton={false}
            propertyLink={`/tenants/residences/${property.id}`}
          />
        ))}
      </div>
      {(!currentResidences || currentResidences.length === 0) && (
        <p>You don&lsquo;t have any current residences</p>
      )}
    </div>
  );
};

export default Residences;
