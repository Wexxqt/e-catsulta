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
      ? `${window.location.origin}/patients/${userId}/dashboard`
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
    // Create OAuth2 session for Google
    await account.createOAuth2Session(
      OAuthProvider.Google,
      `${window.location.origin}/auth/callback`, // Success URL - redirect to our callback handler
      `${window.location.origin}/login-failed`,  // Failure URL
      ['profile', 'email']                       // Requesting basic profile info and email
    );
  } catch (error) {
    console.error("Google login error:", error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    // Get basic user data
    const currentUser = await account.get();
    
    // Get user preferences including OAuth providers data (which contains profile image)
    try {
      const prefs = await account.getPrefs();
      
      // Combine user data with preferences
      return {
        ...currentUser,
        prefs
      };
    } catch (prefsError) {
      console.error("Error getting user preferences:", prefsError);
      return currentUser;
    }
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
};

export const logout = async () => {
  try {
    console.log("Deleting current session...");
    const result = await account.deleteSession('current');
    console.log("Session deleted successfully:", result);
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}; 