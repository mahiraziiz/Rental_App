"use client";

import SettingsForm from "@/components/SettingForm";
import {
  useDeleteTenantAccountMutation,
  useGetAuthUserQuery,
  useUpdateTenantSettingsMutation,
} from "@/state/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";

const TenantSettings = () => {
  const { data: authUser, isLoading } = useGetAuthUserQuery();
  const [updateTenant] = useUpdateTenantSettingsMutation();
  const [deleteTenantAccount] = useDeleteTenantAccountMutation();
  const { logout } = useAuth();
  const router = useRouter();

  const initialData = useMemo(
    () => ({
      name: authUser?.userInfo?.name ?? "",
      email: authUser?.userInfo?.email ?? "",
      phoneNumber: authUser?.userInfo?.phoneNumber ?? "",
    }),
    [
      authUser?.userInfo?.name,
      authUser?.userInfo?.email,
      authUser?.userInfo?.phoneNumber,
    ],
  );

  if (isLoading || !authUser) return <>Loading...</>;

  const handleSubmit = async (data: typeof initialData) => {
    await updateTenant({
      cognitoId: authUser?.cognitoInfo?.userId,
      ...data,
    });
  };

  const handleDeleteAccount = async () => {
    await deleteTenantAccount({
      cognitoId: authUser.cognitoInfo.userId,
    }).unwrap();
    // Use our custom logout instead of AWS signOut
    await logout();
    router.replace("/login"); // Redirect to login page
  };

  return (
    <SettingsForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onDeleteAccount={handleDeleteAccount}
      userType="tenant"
    />
  );
};

export default TenantSettings;