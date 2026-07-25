"use client";

import { ApplicationCard } from "@/components/ApplicationCard";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { downloadAgreementFile } from "@/lib/agreementDownload";
import { useGetApplicationsQuery, useGetAuthUserQuery } from "@/state/api";
import { CircleCheckBig, Clock, Download, XCircle } from "lucide-react";
import React from "react";
import { useAuth } from "@/context/AuthContext";

const Applications = () => {
  const { user } = useAuth(); // ✅ Get user from context
  const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery();
  const isTenant = user?.role?.toLowerCase() === "tenant";
  const tenantId = user?.id;

  const {
    data: applications,
    isLoading,
    isError,
    isUninitialized,
  } = useGetApplicationsQuery(
    {
      userId: tenantId,
      userType: "tenant",
    },
    {
      skip: !tenantId || !isTenant,
    },
  );

  if (authLoading || isLoading || isUninitialized) return <Loading />;

  if (!isTenant) {
    return <div className="dashboard-container">Tenant account not found.</div>;
  }

  if (isError) return <div>Error fetching applications</div>;

  const safeApplications = applications ?? [];

  return (
    <div className="dashboard-container">
      <Header
        title="Applications"
        subtitle="Track and manage your property rental applications"
      />
      <div className="w-full">
        {safeApplications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-gray-600">
            No applications found yet.
          </div>
        ) : (
          safeApplications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              userType="tenant"
            >
              <div className="flex justify-between gap-5 w-full pb-4 px-4">
                {application.status === "Approved" ? (
                  <div className="bg-green-100 p-4 text-green-700 grow flex items-center">
                    <CircleCheckBig className="w-5 h-5 mr-2" />
                    The property is being rented by you until{" "}
                    {new Date(application.lease?.endDate).toLocaleDateString()}
                  </div>
                ) : application.status === "Pending" ? (
                  <div className="bg-yellow-100 p-4 text-yellow-700 grow flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Your application is pending approval
                  </div>
                ) : (
                  <div className="bg-red-100 p-4 text-red-700 grow flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    Your application has been denied
                  </div>
                )}

                <button
                  className={`bg-white border border-gray-300 text-gray-700 py-2 px-4
                          rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50`}
                  onClick={() =>
                    downloadAgreementFile({
                      agreementId: String(application.id),
                      propertyName: application.property?.name,
                      tenantName: authUser?.userInfo?.name || user?.name,
                      tenantEmail: authUser?.userInfo?.email || user?.email,
                      managerName: application.manager?.name,
                      status: application.status,
                      startDate: application.lease?.startDate,
                      endDate: application.lease?.endDate,
                      monthlyRent: application.lease?.rent,
                      deposit: application.lease?.deposit,
                    })
                  }
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Agreement
                </button>
              </div>
            </ApplicationCard>
          ))
        )}
      </div>
    </div>
  );
};

export default Applications;
