import { cleanParams, withToast } from "@/lib/utils";
import {
  Application,
  Lease,
  Manager,
  Payment,
  Property,
  Tenant,
} from "@/types/prismaTypes";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { FiltersState } from ".";

// Define types
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface UserDetailsResponse {
  data: User;
}

interface PropertyData {
  [key: string]: unknown;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  reducerPath: "api",
  tagTypes: [
    "Managers",
    "Tenants",
    "Properties",
    "PropertyDetails",
    "Leases",
    "Payments",
    "Applications",
    "Auth",
  ],
  endpoints: (build) => ({
    getAuthUser: build.query<User, void>({
      queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            return {
              error: {
                status: "CUSTOM_ERROR" as const,
                error: "No token found",
                data: undefined,
              },
            };
          }

          const response = await fetchWithBQ("/auth/me");

          if (response.error) {
            return {
              error: {
                status: "CUSTOM_ERROR" as const,
                error: "Could not fetch user data",
                data: undefined,
              },
            };
          }

          const userData = response.data as UserDetailsResponse;
          const user = userData.data;

          const userRole = user.role;
          const endpoint =
            userRole === "manager"
              ? `/managers/${user.id}`
              : `/tenants/${user.id}`;

          let userDetailsResponse = await fetchWithBQ(endpoint);

          if (
            userDetailsResponse.error &&
            userDetailsResponse.error.status === 404
          ) {
            userDetailsResponse = await fetchWithBQ({
              url: endpoint,
              method: "POST",
              body: {
                userId: user.id,
                email: user.email,
                name: user.name,
              },
            });
          }

          return {
            data: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              userInfo: userDetailsResponse.data as Tenant | Manager,
              userRole: user.role,
            },
          };
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : "Could not fetch user data";
          return {
            error: {
              status: "CUSTOM_ERROR" as const,
              error: message,
              data: undefined,
            },
          };
        }
      },
      providesTags: ["Auth"],
    }),

    // property related endpoints
    getProperties: build.query<
      Property[],
      Partial<FiltersState> & {
        favoriteIds?: number[];
        managerUserId?: string;
      }
    >({
      query: (filters) => {
        console.log("[RTK Query] getProperties called with filters:", filters);

        const params = cleanParams({
          location: filters.location,
          priceMin: filters.priceRange?.[0],
          priceMax: filters.priceRange?.[1],
          beds: filters.beds,
          baths: filters.baths,
          propertyType: filters.propertyType,
          squareFeetMin: filters.squareFeet?.[0],
          squareFeetMax: filters.squareFeet?.[1],
          amenities: Array.isArray(filters.amenities)
            ? filters.amenities.join(",")
            : undefined,
          availableFrom: filters.availableFrom,
          favoriteIds: Array.isArray(filters.favoriteIds)
            ? filters.favoriteIds.join(",")
            : undefined,
          managerUserId: filters.managerUserId,
          latitude:
            filters.coordinates?.length === 2 &&
            (filters.coordinates[0] !== 0 || filters.coordinates[1] !== 0)
              ? filters.coordinates[1]
              : undefined,
          longitude:
            filters.coordinates?.length === 2 &&
            (filters.coordinates[0] !== 0 || filters.coordinates[1] !== 0)
              ? filters.coordinates[0]
              : undefined,
        });

        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          searchParams.append(key, String(value));
        });
        const queryString = searchParams.toString();

        console.log("[RTK Query] After cleanParams, sending params:", params);
        console.log("[RTK Query] API URL: /properties?", queryString);

        return queryString ? `properties?${queryString}` : "properties";
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as const, id })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch properties.",
        });
      },
    }),

    getProperty: build.query<Property, number>({
      query: (id) => `properties/${id}`,
      providesTags: (result, error, id) => [{ type: "PropertyDetails", id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load property details.",
        });
      },
    }),

    // tenant related endpoints
    getTenant: build.query<Tenant, string>({
      query: (userId) => `tenants/${userId}`,
      providesTags: (result) => [{ type: "Tenants", id: result?.id }],
    }),

    getCurrentResidences: build.query<Property[], string>({
      query: (userId) => `tenants/${userId}/current-residences`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as const, id })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
    }),

    updateTenantSettings: build.mutation<
      Tenant,
      { userId: string } & Partial<Tenant>
    >({
      query: ({ userId, ...updatedTenant }) => ({
        url: `tenants/${userId}`,
        method: "PUT",
        body: updatedTenant,
      }),
      invalidatesTags: (result) => [{ type: "Tenants", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully!",
          error: "Failed to update settings.",
        });
      },
    }),

    deleteTenantAccount: build.mutation<
      { message: string },
      { userId: string }
    >({
      query: ({ userId }) => ({
        url: `tenants/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Tenants", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Account deleted successfully.",
          error: "Failed to delete account.",
        });
      },
    }),

    addFavoriteProperty: build.mutation<
      Tenant,
      {
        userId: string;
        propertyId: number;
      }
    >({
      query: ({ userId, propertyId }) => ({
        url: `tenants/${userId}/favorites/${propertyId}`,
        method: "POST",
      }),
      invalidatesTags: (result) => [
        {
          type: "Tenants",
          id: result?.id,
        },
        {
          type: "Properties",
          id: "LIST",
        },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Added to favorites!!",
          error: "Failed to add to favorites",
        });
      },
    }),

    removeFavoriteProperty: build.mutation<
      Tenant,
      {
        userId: string;
        propertyId: number;
      }
    >({
      query: ({ userId, propertyId }) => ({
        url: `tenants/${userId}/favorites/${propertyId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result) => [
        {
          type: "Tenants",
          id: result?.id,
        },
        {
          type: "Properties",
          id: "LIST",
        },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Removed from favorites!",
          error: "Failed to remove from favorites.",
        });
      },
    }),

    // manager related endpoints
    getManagerProperties: build.query<Property[], string>({
      query: (userId) => `managers/${userId}/properties`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as const, id })),
              {
                type: "Properties",
                id: "LIST",
              },
            ]
          : [
              {
                type: "Properties",
                id: "LIST",
              },
            ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load manager profile.",
        });
      },
    }),

    updateManagerSettings: build.mutation<
      Manager,
      {
        userId: string;
      } & Partial<Manager>
    >({
      query: ({ userId, ...updatedManager }) => ({
        url: `managers/${userId}`,
        method: "PUT",
        body: updatedManager,
      }),
      invalidatesTags: (result) => [{ type: "Managers", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully!",
          error: "Failed to update settings.",
        });
      },
    }),

    deleteManagerAccount: build.mutation<
      { message: string },
      { userId: string }
    >({
      query: ({ userId }) => ({
        url: `managers/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Managers", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Account deleted successfully.",
          error: "Failed to delete account.",
        });
      },
    }),

    createProperty: build.mutation<Property, PropertyData>({
      query: (propertyData) => ({
        url: `properties`,
        method: "POST",
        body: propertyData,
        headers: {
          "Content-Type": "application/json",
        },
      }),
      invalidatesTags: (result) => [
        {
          type: "Properties",
          id: "LIST",
        },
        {
          type: "Managers",
          id: result?.managerUserId,
        },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property created successfully!",
          error: "Failed to create property.",
        });
      },
    }),

    updateProperty: build.mutation<
      Property,
      { id: number; propertyData: PropertyData }
    >({
      query: ({ id, propertyData }) => ({
        url: `properties/${id}`,
        method: "PUT",
        body: propertyData,
        headers: {
          "Content-Type": "application/json",
        },
      }),
      invalidatesTags: (result, error, { id }) => [
        {
          type: "PropertyDetails",
          id,
        },
        {
          type: "Properties",
          id,
        },
        {
          type: "Properties",
          id: "LIST",
        },
        {
          type: "Managers",
          id: result?.manager?.id,
        },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property updated successfully!",
          error: "Failed to update property.",
        });
      },
    }),

    getLeases: build.query<Lease[], string | void>({
      query: (userId) => {
        const params = new URLSearchParams();
        if (userId) {
          params.append("userId", userId);
        }
        const queryString = params.toString();
        return queryString ? `leases?${queryString}` : "leases";
      },
      providesTags: ["Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch leases.",
        });
      },
    }),

    getPropertyLeases: build.query<Lease[], number>({
      query: (propertyId) => `leases/property/${propertyId}`,
      providesTags: ["Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch property leases.",
        });
      },
    }),

    getPayments: build.query<Payment[], number>({
      query: (leaseId) => `leases/${leaseId}/payments`,
      providesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch payment info.",
        });
      },
    }),

    // application related endpoints
    getApplications: build.query<
      Application[],
      {
        userId?: string;
        userType?: string;
      }
    >({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.userId) {
          queryParams.append("userId", params.userId.toString());
        }
        if (params.userType) {
          queryParams.append("userType", params.userType);
        }

        const queryString = queryParams.toString();
        return queryString ? `applications?${queryString}` : "applications";
      },
      providesTags: ["Applications"],
    }),

    updateApplicationStatus: build.mutation<
      Application & {
        lease?: Lease;
      },
      {
        id: number;
        status: string;
      }
    >({
      query: ({ id, status }) => ({
        url: `applications/${id}/status`,
        method: "PUT",
        body: {
          status,
        },
      }),
      invalidatesTags: ["Applications", "Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Application status updated successfully!",
          error: "Failed to update application settings.",
        });
      },
    }),

    createApplication: build.mutation<Application, Partial<Application>>({
      query: (body) => ({
        url: `applications`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Application created successfully!",
          error: "Failed to create applications.",
        });
      },
    }),
  }),
});

export const {
  useGetAuthUserQuery,
  useUpdateTenantSettingsMutation,
  useDeleteTenantAccountMutation,
  useUpdateManagerSettingsMutation,
  useDeleteManagerAccountMutation,
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useGetCurrentResidencesQuery,
  useGetManagerPropertiesQuery,
  useCreatePropertyMutation,
  useUpdatePropertyMutation,
  useGetTenantQuery,
  useAddFavoritePropertyMutation,
  useRemoveFavoritePropertyMutation,
  useGetLeasesQuery,
  useGetPropertyLeasesQuery,
  useGetPaymentsQuery,
  useGetApplicationsQuery,
  useUpdateApplicationStatusMutation,
  useCreateApplicationMutation,
} = api;
