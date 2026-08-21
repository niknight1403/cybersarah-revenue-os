import { AlertTriangle } from "lucide-react";
import React from "react";

export function RevenueQueryError({ subject }: { subject: string }) {
  return <div role="alert" className="cyber-panel border-red-300/30 p-6 text-red-100"><AlertTriangle className="mr-2 inline h-5 w-5" /> {subject} konnte nicht geladen werden. Bitte aktualisieren Sie die Seite.</div>;
}

export function RevenueMutationError({ action }: { action: string }) {
  return <p role="alert" className="text-xs text-red-200">{action} konnte nicht gespeichert werden. Bitte erneut versuchen.</p>;
}
