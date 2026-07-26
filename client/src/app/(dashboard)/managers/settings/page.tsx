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

// Define the User type with userInfo
interface UserInfo {
  name: string;
  email: string;
  phoneNumber?: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  userInfo?: UserInfo;
  userRole?: string;
}

// Define error interface
interface ApiError {
  data?: {
    message?: string;
  };
  message?: string;
}

interface SettingsData {
  name: string;
  email: string;
  phoneNumber: string;
}

const ManagerSettings = () => {
  const { user } = useAuth();
  const { data: authUser, isLoading } = useGetAuthUserQuery() as {
    data: AuthUser | undefined;
    isLoading: boolean;
  };
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

  const handleSubmit = async (data: SettingsData) => {
    try {
      await updateManager({
        userId: user?.id,
        ...data,
      }).unwrap();
      toast.success("Settings updated successfully!");
    } catch (error) {
      console.error("Error updating settings:", error);
      const apiError = error as ApiError;
      toast.error(apiError?.data?.message || "Failed to update settings");
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
    } catch (error) {
      console.error("Error deleting account:", error);
      const apiError = error as ApiError;
      toast.error(apiError?.data?.message || "Failed to delete account");
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
