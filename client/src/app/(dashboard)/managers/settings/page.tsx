"use client";

import SettingsForm from "@/components/SettingForm";
import {
  useDeleteManagerAccountMutation,
  useGetAuthUserQuery,
  useUpdateManagerSettingsMutation,
} from "@/state/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";

const ManagerSettings = () => {
  const { data: authUser, isLoading } = useGetAuthUserQuery();
  const [updateManager] = useUpdateManagerSettingsMutation();
  const [deleteManagerAccount] = useDeleteManagerAccountMutation();
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
    await updateManager({
      cognitoId: authUser?.cognitoInfo?.userId,
      ...data,
    });
  };

  const handleDeleteAccount = async () => {
    await deleteManagerAccount({
      cognitoId: authUser.cognitoInfo.userId,
    }).unwrap();
    await logout();
    router.replace("/login");
  };

  return (
    <SettingsForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onDeleteAccount={handleDeleteAccount}
      userType="manager"
    />
  );
};

export default ManagerSettings;
