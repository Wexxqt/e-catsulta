import Header from "@/components/Header";
import Link from "next/link";

import { PatientForm } from "@/components/forms/PatientForm";
import { PasskeyModal } from "@/components/PasskeyModal";
import { DoctorPasskeyModal } from "@/components/DoctorPasskeyModal";
import { StaffPasskeyModal } from "@/components/StaffPasskeyModal";

const Home = ({ searchParams }: SearchParamProps) => {
  const isAdmin = searchParams?.admin === "true";
  const isDoctor = searchParams?.doctor === "true";
  const isStaff = searchParams?.staff === "true";

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <Header />

      <div className="flex flex-grow">
        {isAdmin && <PasskeyModal />}
        {isDoctor && <DoctorPasskeyModal />}
        {isStaff && <StaffPasskeyModal />}

        <section className="remove-scrollbar container my-auto">
          <div className="sub-container max-w-[496px]">
            <PatientForm />

            <div className="text-14-regular mt-20 flex justify-between items-center">
              <p className="justify-items-end text-dark-600 xl:text-left">
                © 2025 e-catsulta
              </p>
              <div className="flex gap-3 text-sm">
                <Link href="/?admin=true" className="text-blue-500 hover:underline">Admin</Link>
                <Link href="/?doctor=true" className="text-blue-500 hover:underline">Doctor</Link>
                <Link href="/?staff=true" className="text-blue-500 hover:underline">Staff</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
