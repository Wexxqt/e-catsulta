import Image from "next/image";
import { useState } from "react";
import { Button } from "./ui/button";
import { loginWithGoogle } from "@/lib/auth.service";

const SocialLogin = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await loginWithGoogle();
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-dark-500" />
        </div>
        <span className="relative bg-dark-400 px-4 text-14-regular text-dark-600">
          Or continue with
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="flex-1 flex items-center gap-2 bg-dark-400 border-dark-500 hover:bg-dark-500 transition-colors duration-200"
        onClick={handleGoogleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Image
            src="/assets/icons/google.svg"
            alt="Google"
            width={20}
            height={20}
          />
        )}
        <span className="text-14-medium">Google</span>
      </Button>
    </div>
  );
};

export default SocialLogin; 