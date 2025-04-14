import Image from "next/image";
import Link from "next/link";

import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { getPatient } from "@/lib/actions/patient.actions";

const Appointment = async ({ params: { userId } }: SearchParamProps) => {
  const patient = await getPatient(userId);

  if (!patient) {
    // Redirect to the registration page if the patient is not found
    return redirect(`/patients/${userId}/register`);
  }

  return (
    <div className="flex h-screen max-h-screen">
      <section className="remove-scrollbar container my-auto">
        <div className="sub-container max-w-[860px] flex-1 justify-between">
          {/* Clickable Logo - Redirects to Patient Dashboard */}
          <Link href={`/patients/${userId}/dashboard`}>
            <Image
              src="/assets/icons/logo-full.svg"
              height={1000}
              width={1000}
              alt="logo"
              className="mb-12 h-10 w-fit mx-auto cursor-pointer"
            />
          </Link>

          <AppointmentForm
            patientId={patient?.$id}
            userId={userId}
            type="create"
          />

          <p className="mt-10 py-12 text-dark-600">© 2025 e-catsulta</p>
        </div>
      </section>

      <Image
        src="/assets/images/appointment-img.png"
        height={1500}
        width={1500}
        alt="appointment"
        className="side-img max-w-[390px] bg-bottom"
      />
    </div>
  );
};

export default Appointment;
function redirect(arg0: string) {
  throw new Error("Function not implemented.");
}

