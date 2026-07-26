"use client";

import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "@/components/AppSidebar";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import React, { Suspense, useEffect, useState } from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiltersState, setFilters } from "@/state";
import { useAppDispatch } from "@/state/redux";

interface AppSidebarProps {
  userType: "manager" | "tenant" | null;
}

// Inner component that uses useSearchParams
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(true);

  const userRole = authUser?.role?.toLowerCase();
  const sidebarUserType: AppSidebarProps["userType"] | null =
    userRole === "manager"
      ? "manager"
      : userRole === "tenant"
        ? "tenant"
        : null;

  useEffect(() => {
    const filterKeys: Array<keyof FiltersState> = [
      "location",
      "beds",
      "baths",
      "propertyType",
      "amenities",
      "availableFrom",
      "priceRange",
      "squareFeet",
      "coordinates",
    ];

    if (!searchParams.toString()) {
      dispatch(
        setFilters({
          location: "",
          beds: "any",
          baths: "any",
          propertyType: "any",
          amenities: [],
          availableFrom: "any",
          priceRange: [null, null],
          squareFeet: [null, null],
          coordinates: [0, 0],
        }),
      );
      return;
    }

    const parsedFilters = Array.from(searchParams.entries()).reduce<
      Partial<FiltersState>
    >((acc, [key, value]) => {
      if (!filterKeys.includes(key as keyof FiltersState)) {
        return acc;
      }

      if (key === "priceRange" || key === "squareFeet") {
        acc[key] = value
          .split(",")
          .map((v) =>
            v === "" ? null : Number(v),
          ) as FiltersState[typeof key];
        return acc;
      }

      if (key === "coordinates") {
        acc.coordinates = value
          .split(",")
          .map(Number) as FiltersState["coordinates"];
        return acc;
      }

      if (key === "amenities") {
        acc.amenities = value.split(",").filter(Boolean);
        return acc;
      }

      acc[
        key as Exclude<
          keyof FiltersState,
          "priceRange" | "squareFeet" | "coordinates" | "amenities"
        >
      ] = value;

      return acc;
    }, {});

    dispatch(setFilters(parsedFilters));
  }, [searchParams, dispatch]);

  useEffect(() => {
    if (authUser) {
      if (
        (userRole === "manager" && pathname.startsWith("/tenants")) ||
        (userRole === "tenant" && pathname.startsWith("/managers"))
      ) {
        router.push(
          userRole === "manager"
            ? "/managers/properties"
            : "/tenants/favorites",
          { scroll: false },
        );
      } else {
        setIsLoading(false);
      }
    }
  }, [authUser, router, pathname, userRole]);

  if (authLoading || isLoading) return <>Loading...</>;

  if (!authUser?.role || !sidebarUserType) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-primary-100">
        <Navbar />
        <div style={{ marginTop: `${NAVBAR_HEIGHT}px` }}>
          <main className="flex">
            <Sidebar userType={sidebarUserType} />
            <div className="grow transition-all duration-300">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Main component with Suspense boundary
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
