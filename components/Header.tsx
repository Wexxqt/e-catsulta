"use client"; // ✅ Ensure it's a client component

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ButtonGhost() {
  return (
    <Link href="https://ecatsulta.com/">
      <Button variant="ghost">View Services</Button>
    </Link>
  );
}

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

      <ButtonGhost />
    </header>
  );
};

export default Header;