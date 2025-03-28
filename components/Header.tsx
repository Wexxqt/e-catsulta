"use client"; // ✅ Ensure it's a client component

import Image from "next/image";
import Link from "next/link";

const Header = () => {
  return (
    <header className="admin-header flex justify-between items-center py-4 px-6 bg-white shadow-md">
      <Link href="/" className="cursor-pointer">
        <Image
          src="/assets/icons/logo-full.svg"
          height={32}
          width={162}
          alt="logo"
          className="h-8 w-fit"
        />
      </Link>

      <Link href="https://sites.google.com/view/e-catsulta/home?authuser=0" 
  target="_blank" 
  rel="noopener noreferrer" 
  className="text-green-500"
>
  View Services
      </Link>
    </header>
  );
};

export default Header;
