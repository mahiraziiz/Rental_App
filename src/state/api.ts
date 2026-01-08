import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import type { FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

interface Tenant {
  userId: string;
  email: string;
  phoneNumber?: string;
  address?: string;
}

interface Manager {
  userId: string;
  email: string;
  companyName?: string;
  phoneNumber?: string;
}

interface AuthUser {
  cognitoInfo: {
    username: string;
    userId: string;
  };
  userInfo: Tenant | Manager;
  userRole: string;
}

interface CognitoUser {
  userId: string;
  username: string;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  }),
  reducerPath: "api",
  tagTypes: ["User"],
  endpoints: (build) => ({
    getAuthUser: build.query<AuthUser, void>({
      queryFn: async (_arg, _queryApi, _extraOptions, fetchWithBQ) => {
        try {
          const session = await fetchAuthSession();
          const { idToken } = session.tokens ?? {};
          const user = (await getCurrentUser()) as CognitoUser;
          const userRole = (idToken?.payload["custom:role"] as string) || "";

          const endpoint =
            userRole === "manager"
              ? `/managers/${user.userId}`
              : `/tenants/${user.userId}`;

          let userDetailsResponse = await fetchWithBQ(endpoint);

          // if user doesn't exist, create new user
          if (
            userDetailsResponse.error &&
            userDetailsResponse.error.status === 404
          ) {
            const newUserData =
              userRole === "manager"
                ? {
                    userId: user.userId,
                    email: user.username,
                    companyName: idToken?.payload.name || "",
                  }
                : {
                    userId: user.userId,
                    email: user.username,
                    phoneNumber: idToken?.payload.phone_number || "",
                  };

            const createEndpoint =
              userRole === "manager" ? "/managers" : "/tenants";

            userDetailsResponse = await fetchWithBQ({
              url: createEndpoint,
              method: "POST",
              body: JSON.stringify(newUserData),
            } as FetchArgs);
          }

          if (userDetailsResponse.error) {
            return { error: userDetailsResponse.error };
          }

          return {
            data: {
              cognitoInfo: {
                username: user.username,
                userId: user.userId,
              },
              userInfo: userDetailsResponse.data as Tenant | Manager,
              userRole,
            },
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Could not fetch user data";
          return {
            error: {
              status: 500,
              data: errorMessage,
            } as FetchBaseQueryError,
          };
        }
      },
    }),
  }),
});

export const { useGetAuthUserQuery } = api;
