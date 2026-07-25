import { CustomFormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ApplicationFormData, applicationSchema } from "@/lib/schemas";
import { useCreateApplicationMutation, useGetAuthUserQuery } from "@/state/api";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: number;
}

const ApplicationModal = ({
  isOpen,
  onClose,
  propertyId,
}: ApplicationModalProps) => {
  const [createApplication] = useCreateApplicationMutation();
  const { user } = useAuth();
  const { data: authUser } = useGetAuthUserQuery();

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      message: "",
    },
  });

  const onSubmit = async (data: ApplicationFormData) => {
    if (!user) {
      toast.error("Please login to submit an application");
      return;
    }

    if (user.role?.toLowerCase() !== "tenant") {
      toast.error("Only tenants can submit applications");
      return;
    }

    try {
      await createApplication({
        message: data.message,
        status: "Pending",
        propertyId: propertyId,
        tenantUserId: user.id,
      }).unwrap();

      toast.success("Application submitted successfully!");
      form.reset();
      onClose();
    } catch (error: any) {
      console.error("Application submission failed", error);
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        "Failed to submit application";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white">
        <DialogHeader className="mb-4">
          <DialogTitle>Submit Application for this Property</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <CustomFormField
              name="message"
              label="Message (Optional)"
              type="textarea"
              placeholder="Enter any additional information"
            />
            <Button type="submit" className="bg-primary-700 text-white w-full">
              Submit Application
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationModal;
