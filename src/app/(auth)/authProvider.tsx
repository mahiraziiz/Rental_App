import React, { useEffect } from "react";
import { Amplify } from "aws-amplify";

import {
  Authenticator,
  Heading,
  Radio,
  RadioGroupField,
  useAuthenticator,
  View,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { useRouter, usePathname } from "next/navigation";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID as string,
      userPoolClientId: process.env
        .NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID as string,
    },
  },
});

const components = {
  Header() {
    return (
      <View className="mt-4 mb-7">
        <Heading level={3} className="text-2xl! font-bold!">
          Rent
          <span className="text-secondary-500 font-light hover:text-primary-300!">
            IFUL
          </span>
          <p className="text-muted-foreground mt-2">
            <span className="font-bold">Please Sign In to continue</span>
          </p>
        </Heading>
      </View>
    );
  },
  SignIn: {
    Footer() {
      const { toSignUp } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{" "}
            <button
              className="text-primary-500 hover:underline font-medium bg-transparent border-0 p-0 ml-1 cursor-pointer"
              onClick={toSignUp}
            >
              Sign Up
            </button>
          </p>
        </View>
      );
    },
  },
  SignUp: {
    FormFields() {
      const { validationErrors } = useAuthenticator();

      return (
        <>
          <Authenticator.SignUp.FormFields />
          <RadioGroupField
            legend="Role"
            name="custom:role"
            errorMessage={validationErrors["custom:role"]}
            hasError={!!validationErrors["custom:role"]}
            isRequired
          >
            <Radio value="tenant">Renter</Radio>
            <Radio value="landlord">Property Owner</Radio>
          </RadioGroupField>
        </>
      );
    },
    Footer() {
      const { toSignIn } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <button
              className="text-primary-500 hover:underline font-medium bg-transparent border-0 p-0 ml-1 cursor-pointer"
              onClick={toSignIn}
            >
              Sign In
            </button>
          </p>
        </View>
      );
    },
  },
};

const formFields = {
  signIn: {
    username: {
      placeholder: "Enter your username",
      label: "Email or Username",
      isRequired: true,
    },
    password: {
      placeholder: "Enter your password",
      label: "Password",
      isRequired: true,
    },
  },

  signUp: {
    username: {
      order: 1,
      placeholder: "Choose a username",
      label: "Email or Username",
      isRequired: true,
    },
    email: {
      order: 2,
      placeholder: "Enter your email",
      label: "Email",
      isRequired: true,
    },
    password: {
      order: 3,
      placeholder: "Enter your password",
      label: "Password",
      isRequired: true,
    },
    confirm_password: {
      order: 4,
      placeholder: "Confirm your password",
      label: "Confirm Password",
      isRequired: true,
    },
  },
};

const Auth = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthenticator((context) => [context.user]);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname.match(/^\/(signin|signup)$/);
  const isDashboardPage =
    pathname.startsWith("/landlord") || pathname.startsWith("/tenant");

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (user && isAuthPage) {
      router.push("/"); // Redirect to home or dashboard
    }
  }, [user, isAuthPage, router]);

  // Allow access to auth pages only for unauthenticated users
  useEffect(() => {
    if (!user && isDashboardPage) {
      router.push("/signin"); // Redirect to sign-in page
    }
  }, [user, isDashboardPage, router]);

  return (
    <div className="h-full">
      <Authenticator
        initialState={pathname === "/signup" ? "signUp" : "signIn"}
        formFields={formFields}
        components={components}
      >
        {() => <> {children} </>}
      </Authenticator>
    </div>
  );
};

export default Auth;
