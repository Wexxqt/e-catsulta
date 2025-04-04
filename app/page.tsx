import Header from "@/components/Header";
import Link from "next/link";

import { PatientForm } from "@/components/forms/PatientForm";
import { PasskeyModal } from "@/components/PasskeyModal";
import { DoctorPasskeyModal } from "@/components/DoctorPasskeyModal";

const Home = ({ searchParams }: SearchParamProps) => {
  const isAdmin = searchParams?.admin === "true";
  const isDoctor = searchParams?.doctor === "true";

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <Header />

      <div className="flex flex-grow">
        {isAdmin && <PasskeyModal />}
        {isDoctor && <DoctorPasskeyModal />}

        <section className="remove-scrollbar container my-auto">
          <div className="sub-container max-w-[496px]">
            <PatientForm />

            <div className="text-14-regular mt-20 flex justify-between">
              <p className="justify-items-end text-dark-600 xl:text-left">
                © 2025 E-CatSulta
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
