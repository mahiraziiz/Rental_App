import { NAVBAR_HEIGHT } from "@/lib/constants";
import Link from "next/link";
import Image from "next/image";
import React from "react";
import { Button } from "./ui/button";

const Navbar = () => {
  return (
    <div
      className="fixed top-0 left-0 w-full z-50 shadow-xl bg-white"
      style={{ height: `${NAVBAR_HEIGHT}px` }}
    >
      <div className="flex justify-between items-center w-full py-3 px-8 bg-primary-700 text-white">
        {/* Left: Logo + tagline */}
        <div className="flex items-center gap-4 md:gap-6">
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
          <p className="text-primary-200 hidden md:block">
            Discover your perfect rental apartment with our advanced search
            features.
          </p>
        </div>

        {/* Right: Auth buttons */}
        <div className="flex items-center gap-5 md:gap-6">
          <Link href="/signin" className="text-white hover:text-gray-300">
            <Button
              variant="outline"
              className="text-white border-white bg-transparent hover:bg-white hover:text-primary-700 rounded-lg"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/signup" className="text-white hover:text-gray-300">
            <Button
              variant="secondary"
              className="text-white border-secondary-600 bg-transparent hover:bg-white hover:text-primary-700 rounded-lg"
            >
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
