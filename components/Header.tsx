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

      <Link href="https://l.facebook.com/l.php?u=https%3A%2F%2Fsites.google.com%2Fview%2Fe-catsulta%2Fhome%3Fread_current%3D1%26fbclid%3DIwZXh0bgNhZW0CMTAAAR1k4hGzxUnN0EPp0d_jrV5MG-2Y7rkaPMtlw7RjetLuloIq9GPTM_1UFFI_aem_zMcI9U5-XNo37cZ3VCEKjA&h=AT3FgZq0jsbZmHUBeMLqPS5SET8TGs3BPpIrxwwAIJmvLQ5h22aaLpsYhhRLpbfGAShM07ttndr63uV6fGRSPUQz4C1wixwZEkddHPiabBsp22QH3R7aeda4MKW_CTjzshiyYg" 
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
