import { Client, Databases, Account } from "appwrite";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(
    process.env.NEXT_PUBLIC_ENDPOINT || "https://cloud.appwrite.io/v1"
  )
  .setProject(process.env.NEXT_PUBLIC_PROJECT_ID || "");

// Initialize Appwrite services
export const databases = new Databases(client);
export const account = new Account(client);

// Track WebSocket connection status
let wsConnected = false;
let pendingSubscriptions: Array<{
  channels: string[];
  callback: (response: any) => void;
  resolve: (unsubscribe: () => void) => void;
  reject: (error: Error) => void;
}> = [];

// Only set up WebSocket listeners in browser environment
if (isBrowser) {
  // Listen for connection open
  client.subscribe("open", () => {
    console.log("WebSocket connection established");
    wsConnected = true;

    // Process any pending subscriptions
    processPendingSubscriptions();
  });
}

// Process queued subscriptions when connection is ready
function processPendingSubscriptions() {
  if (!wsConnected) return;

  console.log(
    `Processing ${pendingSubscriptions.length} pending subscriptions`
  );

  // Take a copy of the current pending subscriptions
  const subscriptionsToProcess = [...pendingSubscriptions];
  pendingSubscriptions = [];

  // Process each pending subscription
  subscriptionsToProcess.forEach(({ channels, callback, resolve }) => {
    try {
      const unsubscribe = client.subscribe(channels, callback);
      resolve(unsubscribe);
    } catch (error: any) {
      console.error("Error processing queued subscription:", error);
      // Re-queue if still having issues
      if (error.message?.includes("CONNECTING")) {
        pendingSubscriptions.push({
          channels,
          callback,
          resolve,
          reject: (e) => console.error(e),
        });
      }
    }
  });
}

// Enhanced subscribe function with connection state handling
export const subscribe = (
  channels: string[],
  callback: (response: any) => void
) => {
  // Return a no-op function during SSR
  if (!isBrowser) {
    return () => {}; // No-op for server-side rendering
  }

  // If the connection is already established, subscribe immediately
  if (wsConnected) {
    return client.subscribe(channels, callback);
  }

  // Otherwise, queue the subscription for when the connection is ready
  return new Promise<() => void>((resolve, reject) => {
    console.log(`Queuing subscription to channels: ${channels.join(", ")}`);
    pendingSubscriptions.push({ channels, callback, resolve, reject });

    // Set a timeout to reject if connection takes too long
    setTimeout(() => {
      // Check if this subscription is still pending
      const index = pendingSubscriptions.findIndex(
        (sub) => sub.channels === channels && sub.callback === callback
      );

      if (index !== -1) {
        // Remove from pending queue
        const [subscription] = pendingSubscriptions.splice(index, 1);

        // Return a no-op unsubscribe function so the app doesn't crash
        subscription.resolve(() => {
          console.log("No-op unsubscribe for timed-out subscription");
        });

        // Log the timeout
        console.warn(
          "WebSocket connection timeout, returning placeholder subscription"
        );
      }
    }, 5000); // 5 second timeout
  }) as unknown as () => void; // Type assertion to match the expected return type
};

// Export Appwrite constants
export const DATABASE_ID = process.env.DATABASE_ID || "";
export const APPOINTMENT_COLLECTION_ID =
  process.env.APPOINTMENT_COLLECTION_ID || "";

// The client object is also exported for custom operations
export default client;
