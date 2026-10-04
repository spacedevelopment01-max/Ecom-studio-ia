import { CancelRecovery } from "./cancel";

export const metadata = { title: "Annuler la récupération du coffre" };

export default function Page() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-10">
      <div className="card w-full max-w-md p-6 sm:p-8"><CancelRecovery /></div>
    </div>
  );
}
