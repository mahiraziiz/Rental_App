"use client";

import { NAVBAR_HEIGHT } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/state/redux";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import FiltersBar from "./FiltersBar";
import FiltersFull from "./FiltersFull";
import { FiltersState, setFilters } from "@/state";
import Map from "./Map";
import Listings from "./Listings";

// Inner component that uses useSearchParams
function SearchPageContent() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const isFiltersFullOpen = useAppSelector(
    (state) => state.global.isFiltersFullOpen,
  );

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

    const hasSearchParams = searchParams.toString().length > 0;

    if (!hasSearchParams) {
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

    const initialFilters = Array.from(searchParams.entries()).reduce<
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

    dispatch(setFilters(initialFilters));
  }, [searchParams, dispatch]);

  return (
    <div
      className="w-full mx-auto px-4 sm:px-5 flex flex-col bg-linear-to-b from-slate-100 via-white to-slate-100"
      style={{
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
      }}
    >
      <FiltersBar />
      <div className="flex justify-between flex-1 overflow-hidden gap-3 pb-4">
        <div
          className={`h-full overflow-auto rounded-2xl border border-slate-200 bg-white/85 shadow-sm transition-all duration-300 ease-in-out ${
            isFiltersFullOpen
              ? "w-3/12 min-w-70 opacity-100 visible"
              : "w-0 opacity-0 invisible"
          }`}
        >
          <FiltersFull />
        </div>
        <Map />
        <div className="basis-4/12 overflow-y-auto">
          <Listings />
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
