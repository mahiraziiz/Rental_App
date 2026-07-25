"use client";

import { NAVBAR_HEIGHT } from "@/lib/constants";
import { useGetApplicationsQuery, useGetAuthUserQuery } from "@/state/api";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo } from "react";
import { Bell, MessageCircle, Plus, Search } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { SidebarTrigger } from "./ui/sidebar";

const Navbar = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const { logout } = useAuth(); // Use our custom logout instead of AWS signOut
  const router = useRouter();
  const pathname = usePathname();
  const userRole = authUser?.userRole?.toLowerCase();

  const { data: applications } = useGetApplicationsQuery(
    {
      userId: authUser?.cognitoInfo?.userId,
      userType: userRole === "manager" ? "manager" : "tenant",
    },
    {
      skip: !userRole || !authUser?.cognitoInfo?.userId,
    },
  );

  const notifications = useMemo(() => {
    if (!applications || !userRole) return [];

    const sorted = [...applications].sort(
      (a, b) =>
        new Date(b.applicationDate).getTime() -
        new Date(a.applicationDate).getTime(),
    );

    if (userRole === "manager") {
      return sorted
        .filter((application) => application.status === "Pending")
        .map((application) => ({
          id: application.id,
          title: "New Application",
          description: `${application.tenant?.name || "A tenant"} applied for ${application.property?.name || "your property"}`,
          href: "/managers/applications",
        }));
    }

    return sorted
      .filter((application) => application.status !== "Pending")
      .map((application) => ({
        id: application.id,
        title: "Application Update",
        description: `${application.property?.name || "Property"}: ${application.status}`,
        href: "/tenants/applications",
      }));
  }, [applications, userRole]);

  const isDashboardPage =
    pathname.includes("/managers") || pathname.includes("/tenants");

  const handleSignOut = async () => {
    await logout(); // Use our custom logout function
    // No need for window.location.href as logout handles redirect
  };

  return (
    <div
      className="fixed top-0 left-0 w-full z-50 shadow-xl"
      style={{ height: `${NAVBAR_HEIGHT}px` }}
    >
      <div className="flex justify-between items-center w-full py-3 px-8 bg-primary-700 text-white">
        <div className="flex items-center gap-4 md:gap-6">
          {isDashboardPage && (
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
          )}
          <Link
            href="/"
            className="cursor-pointer hover:text-primary-300!"
            scroll={false}
          >
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Rentiful Logo"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="text-xl font-bold">
                RENT
                <span className="text-secondary-500 font-light hover:text-primary-300!">
                  IFUL
                </span>
              </div>
            </div>
          </Link>
          {isDashboardPage && authUser && (
            <Button
              variant="secondary"
              className="md:ml-4 bg-primary-50 text-primary-700 hover:bg-secondary-500 hover:text-primary-50"
              onClick={() =>
                router.push(
                  authUser.userRole?.toLowerCase() === "manager"
                    ? "/managers/newproperty"
                    : "/search",
                )
              }
            >
              {authUser.userRole?.toLowerCase() === "manager" ? (
                <>
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:block ml-2">Add New Property</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span className="hidden md:block ml-2">
                    Search Properties
                  </span>
                </>
              )}
            </Button>
          )}
        </div>
        {!isDashboardPage && (
          <p className="text-primary-200 hidden md:block">
            Discover your perfect rental apartment with our advanced search
          </p>
        )}
        <div className="flex items-center gap-5">
          {authUser ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger className="relative hidden md:block focus:outline-none">
                  <MessageCircle className="w-6 h-6 cursor-pointer text-primary-200 hover:text-primary-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white text-primary-700 w-80 p-2">
                  <div className="px-2 py-1 text-sm font-semibold text-primary-700">
                    Messages
                  </div>
                  <DropdownMenuSeparator className="bg-primary-200" />
                  <div className="px-2 py-6 text-sm text-primary-500 text-center">
                    No messages
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="relative hidden md:block focus:outline-none">
                  <Bell className="w-6 h-6 cursor-pointer text-primary-200 hover:text-primary-400" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-secondary-700 rounded-full"></span>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white text-primary-700 w-90 p-2">
                  <div className="px-2 py-1 text-sm font-semibold text-primary-700">
                    Notifications
                  </div>
                  <DropdownMenuSeparator className="bg-primary-200" />
                  {notifications.length === 0 ? (
                    <div className="px-2 py-6 text-sm text-primary-500 text-center">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="cursor-pointer py-3 px-2 hover:bg-primary-100!"
                        onClick={() =>
                          router.push(notification.href, { scroll: false })
                        }
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-primary-800">
                            {notification.title}
                          </span>
                          <span className="text-xs text-primary-600">
                            {notification.description}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none">
                  <Avatar>
                    <AvatarImage src={authUser.userInfo?.image} />
                    <AvatarFallback className="bg-primary-600">
                      {authUser.userRole?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-primary-200 hidden md:block">
                    {authUser.userInfo?.name}
                  </p>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white text-primary-700">
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-primary-700! hover:text-primary-100! font-bold"
                    onClick={() =>
                      router.push(
                        authUser.userRole?.toLowerCase() === "manager"
                          ? "/managers/properties"
                          : "/tenants/favorites",
                        { scroll: false },
                      )
                    }
                  >
                    Go to Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-primary-200" />
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-primary-700! hover:text-primary-100!"
                    onClick={() =>
                      router.push(
                        `/${authUser.userRole?.toLowerCase()}s/settings`,
                        { scroll: false },
                      )
                    }
                  >
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-primary-700! hover:text-primary-100!"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="text-white border-white bg-transparent hover:bg-white hover:text-primary-700 rounded-lg"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="secondary"
                  className="text-white bg-secondary-600 hover:bg-white hover:text-primary-700 rounded-lg"
                >
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
