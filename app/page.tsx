import Header from "@/components/Header"; // ✅ Import Header
import Link from "next/link";

import { PatientForm } from "@/components/forms/PatientForm";
import { PasskeyModal } from "@/components/PasskeyModal";

const Home = ({ searchParams }: SearchParamProps) => {
  const isAdmin = searchParams?.admin === "true";

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <Header /> {/* ✅ Add Header at the top */}

      <div className="flex flex-grow">
        {isAdmin && <PasskeyModal />}

        <section className="remove-scrollbar container my-auto">
          <div className="sub-container max-w-[496px]">
            <PatientForm />

            <div className="text-14-regular mt-20 flex justify-between">
              <p className="justify-items-end text-dark-600 xl:text-left">
                © 2025 E-CatSulta
              </p>
              <Link href="/?admin=true" className="text-green-500">
                Admin
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home; 