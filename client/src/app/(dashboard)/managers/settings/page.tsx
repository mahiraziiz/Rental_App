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
import { toast } from "sonner";

const ManagerSettings = () => {
  const { user } = useAuth(); // ✅ Get user from context
  const { data: authUser, isLoading } = useGetAuthUserQuery();
  const [updateManager] = useUpdateManagerSettingsMutation();
  const [deleteManagerAccount] = useDeleteManagerAccountMutation();
  const { logout } = useAuth();
  const router = useRouter();

  const initialData = useMemo(
    () => ({
      name: authUser?.userInfo?.name ?? user?.name ?? "",
      email: authUser?.userInfo?.email ?? user?.email ?? "",
      phoneNumber: authUser?.userInfo?.phoneNumber ?? "",
    }),
    [
      authUser?.userInfo?.name,
      authUser?.userInfo?.email,
      authUser?.userInfo?.phoneNumber,
      user?.name,
      user?.email,
    ],
  );

  if (isLoading || !authUser) return <>Loading...</>;

  const handleSubmit = async (data: typeof initialData) => {
    try {
      await updateManager({
        userId: user?.id, 
        ...data,
      }).unwrap();
      toast.success("Settings updated successfully!");
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast.error(error?.data?.message || "Failed to update settings");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (!user?.id) {
        toast.error("No user ID found");
        return;
      }

      await deleteManagerAccount({
        userId: user.id,
      }).unwrap();

      await logout();
      router.replace("/login");
      toast.success("Account deleted successfully");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error?.data?.message || "Failed to delete account");
    }
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
