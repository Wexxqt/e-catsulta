import { Account, Client, ID, Models, OAuthProvider } from "appwrite";
import { getPatient } from "./actions/patient.actions";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.PROJECT_ID || "676eecb00010826361f7");

const account = new Account(client);

const handleOAuthRedirect = async (userId: string) => {
  try {
    // Check if user exists in our database
    const patient = await getPatient(userId);
    
    // Determine redirect URL based on whether user exists
    const redirectUrl = patient 
      ? `${window.location.origin}/patients/${userId}/new-appointment`
      : `${window.location.origin}/patients/${userId}/register`;
      
    return redirectUrl;
  } catch (error) {
    console.error("Error checking user existence:", error);
    // Default to registration if there's an error
    return `${window.location.origin}/patients/${userId}/register`;
  }
};

export const loginWithGoogle = async () => {
  try {
    // Create OAuth2 session for Google using Appwrite's domain
    await account.createOAuth2Session(
      OAuthProvider.Google,
      "https://cloud.appwrite.io/auth/oauth2/success?redirect=https://book-ecatsulta.com/auth/callback",  // Success URL with redirect
      "https://cloud.appwrite.io/auth/oauth2/failure?redirect=https://book-ecatsulta.com/login-failed",   // Failure URL with redirect
      ['profile', 'email']
    );
  } catch (error) {
    console.error("Google login error:", error);
    throw error;
  }
};

export const loginWithFacebook = async () => {
  try {
    // Create OAuth2 session for Facebook using Appwrite's domain
    await account.createOAuth2Session(
      OAuthProvider.Facebook,
      "https://cloud.appwrite.io/auth/oauth2/success?redirect=https://book-ecatsulta.com/auth/callback",  // Success URL with redirect
      "https://cloud.appwrite.io/auth/oauth2/failure?redirect=https://book-ecatsulta.com/login-failed",   // Failure URL with redirect
      ['email', 'public_profile']
    );
  } catch (error) {
    console.error("Facebook login error:", error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const currentUser = await account.get();
    return currentUser;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
};

export const logout = async () => {
  try {
    await account.deleteSession('current');
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}; 