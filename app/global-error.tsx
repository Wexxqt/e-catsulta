// filepath: c:\Users\Jomagran\Desktop\e-catsulta\healthcare\app\global-error.tsx
"use client";

import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error); // Log the error to the console
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={500} title="Something went wrong!" />
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
