import { VerifyClient } from "./verify-client";

export const metadata = { title: "Confirmer la connexion" };

export default function Page() {
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-10">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <VerifyClient />
      </div>
    </div>
  );
}
