import Image from "next/image";
import { useState } from "react";
import { Button } from "./ui/button";
import { loginWithGoogle, loginWithFacebook } from "@/lib/auth.service";

const SocialLogin = () => {
  const [isLoading, setIsLoading] = useState({
    google: false,
    facebook: false
  });

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(prev => ({ ...prev, google: true }));
      await loginWithGoogle();
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, google: false }));
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setIsLoading(prev => ({ ...prev, facebook: true }));
      await loginWithFacebook();
    } catch (error) {
      console.error("Facebook login failed:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, facebook: false }));
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

      <div className="flex gap-4 w-full">
        <Button
          type="button"
          variant="outline"
          className="flex-1 flex items-center gap-2 bg-dark-400 border-dark-500 hover:bg-dark-500 transition-colors duration-200"
          onClick={handleGoogleLogin}
          disabled={isLoading.google}
        >
          {isLoading.google ? (
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

        <Button
          type="button"
          variant="outline"
          className="flex-1 flex items-center gap-2 bg-dark-400 border-dark-500 hover:bg-dark-500 transition-colors duration-200"
          onClick={handleFacebookLogin}
          disabled={isLoading.facebook}
        >
          {isLoading.facebook ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Image
              src="/assets/icons/facebook.svg"
              alt="Facebook"
              width={20}
              height={20}
            />
          )}
          <span className="text-14-medium">Facebook</span>
        </Button>
      </div>
    </div>
  );
};

export default SocialLogin; 