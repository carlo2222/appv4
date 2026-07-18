import { Mail, LifeBuoy } from "lucide-react";

export const metadata = {
  title: "Assistenza | Concorso PRO",
};

export default function HelpPage() {
  const supportEmail = "riassuntiprovendita@gmail.com";

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="card p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <LifeBuoy size={24} strokeWidth={2.25} />
        </span>
        <h1 className="font-display mt-4 text-2xl font-bold text-slate-800">
          Hai bisogno di assistenza?
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Scrivici e ti risponderemo il prima possibile per aiutarti con
          qualsiasi problema riguardante il tuo account o le simulazioni.
        </p>

        <a
          href={`mailto:${supportEmail}`}
          className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2"
        >
          <Mail size={18} />
          {supportEmail}
        </a>

        <p className="mt-4 text-xs text-slate-400">
          Puoi anche copiare l&apos;indirizzo e scriverci dalla tua app di posta preferita.
        </p>
      </div>
    </div>
  );
}
