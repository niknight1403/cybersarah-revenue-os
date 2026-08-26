# Google-Play-Policy-Fundstellen

## Account-Löschung

Google Play verlangt bei Apps mit Account-Erstellung einen In-App-Pfad zur Löschung des Accounts und der zugehörigen Daten sowie eine öffentlich erreichbare Webressource, über die Nutzer die Löschung anfordern können. Zusätzlich sind die Datenlöschungsfragen im Play-Console-Data-Safety-Formular auszufüllen.

Quelle: [Google Play Console Help — Understanding Google Play’s app account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

## Billing

Google Play Billing ist für digitale Güter, digitale Funktionen, Abonnements und Cloud-Software/-Services erforderlich, sofern keine Ausnahme der Payments Policy greift. Physische Waren und physische Dienstleistungen gehören zu den ausdrücklich genannten Ausnahmen. Für CyberSarahs digitale HARA-Funktionen und mögliche Abo-Entitlements muss daher ein echter Play-Billing-/RevenueCat-Vertrag vor Veröffentlichung eingerichtet und getestet werden; ein Sandbox- oder Stripe-only-Vertrag ist kein Produktionsnachweis.

Quelle: [Google Play Console Help — Understanding Google Play’s Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en).

## Trusted Web Activity

Für eine TWA muss `/.well-known/assetlinks.json` auf der Website auf die Android-App und ihre Signaturmetadaten verweisen. Bei fehlender Verifikation fällt der Browser auf eine Custom Tab zurück. Die aktuell angelegte leere Assetlinks-Datei ist daher nur ein neutraler Platzhalter; vor einer echten TWA-/APK-Veröffentlichung müssen Paketname und SHA-256-Zertifikat aus dem tatsächlichen Signierungsprozess ergänzt werden.

Quelle: [Android Developers — Trusted Web Activities Quick Start Guide](https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2).
