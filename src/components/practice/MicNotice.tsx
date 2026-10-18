// Aviso de microfone na 1ª vez (PRD §9.3, `micNoticeSeen`): o áudio é
// processado pelo navegador (no Chrome o reconhecimento costuma ir a um
// serviço do próprio navegador); o app não envia nada a servidores próprios.

import { Button } from "@/components/ui/button";
import { updateSettings } from "@/lib/storage";
import { mutateAppState, useAppState } from "@/lib/useAppState";

export function MicNotice() {
  const { settings } = useAppState();
  if (settings.micNoticeSeen) return null;
  return (
    <div
      role="note"
      aria-label="Aviso sobre o microfone"
      className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
    >
      <p className="text-foreground">
        O microfone é usado apenas neste navegador: o reconhecimento de voz e a gravação acontecem
        no seu dispositivo (no Chrome o reconhecimento pode usar um serviço do próprio navegador). O
        app não envia nada para servidores próprios.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2 min-h-11"
        onClick={() => {
          mutateAppState((s) => updateSettings(s, { micNoticeSeen: true }));
        }}
      >
        Entendi
      </Button>
    </div>
  );
}
