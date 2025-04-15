import Image from "next/image";
import { redirect } from "next/navigation";

import RegisterForm from "@/components/forms/RegisterForm";
import { getPatient, getUser } from "@/lib/actions/patient.actions";
import { DeviceOptimizer } from "@/components/deviceOptimizer";
import { OptimizedImage } from "@/components/OptimizedImage";

const Register = async ({ params: { userId } }: SearchParamProps) => {
  const user = await getUser(userId);
  const patient = await getPatient(userId);

  if (patient) redirect(`/patients/${userId}/dashboard`);

  return (
    <DeviceOptimizer pageType="register">
      <div className="flex h-screen max-h-screen">
        <section className="remove-scrollbar container">
          <div className="sub-container max-w-[860px] flex-1 flex-col py-10">
            <OptimizedImage
              src="/assets/icons/logo-full.svg"
              height={32}
              width={162}
              alt="logo"
              className="mb-12 h-10 w-fit"
              priority={true}
            />

            <RegisterForm user={user} />

            <p className="copyright py-12">© 2025 e-catsulta</p>
          </div>
        </section>

        <Image
          src="/assets/images/register-img.png"
          height={1000}
          width={1000}
          alt="patient"
          className="side-img max-w-[390px]"
          priority={false}
        />
      </div>
    </DeviceOptimizer>
  );
};

export default Register;