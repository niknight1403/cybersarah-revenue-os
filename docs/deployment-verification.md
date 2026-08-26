# Veröffentlichungs- und Validierungsstatus

Die CyberSarah-Revenue-OS-Instanz ist unter `https://civappopt-itwkmp92.manus.space` öffentlich erreichbar. Die Landingpage liefert den erwarteten Produkt- und Governance-Kontext aus.

Die veröffentlichte Route `/growth` ist korrekt durch Manus OAuth geschützt und fordert ohne aktive Sitzung zur Anmeldung auf. Die beiden offenen Persistenznachweise werden erst nach einer authentifizierten Sitzung in der veröffentlichten Growth-Control ausgeführt. Dabei werden keine künstlichen Kunden, Umsätze, Zahlungen oder Revenue-Ereignisse angelegt.


## Nachweis nach Autonomie-Startknopf-Release

Am 26. August 2026 wurde die Live-Route `https://civappopt-itwkmp92.manus.space/tasks` nach dem Checkpoint `cb8852bf` erneut geprüft. Die veröffentlichte Domain war erreichbar und lieferte bei der nicht authentifizierten Sandbox-Sitzung korrekt den Manus-OAuth-Schutz. Der Nutzer bestätigte anschließend in seiner angemeldeten Chrome-Sitzung, dass der **Autonomie-starten**-Button sichtbar ist. Die Prüfung löste keine Zahlung, kein Posting und keine Kundenkommunikation aus.

Die persistenten A/B- und Telemetrie-Nachweise bleiben von dieser Sichtbarkeitsprüfung getrennt: Sie benötigen echte, bewusst ausgelöste Signale und wurden nicht durch künstliche Testdaten ersetzt.
