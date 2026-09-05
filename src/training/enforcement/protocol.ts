// The coding protocol, shown in full before the first item and reachable as a
// panel throughout. The coder API does not carry it (no /protocol endpoint), so
// it lives here.
//
// ⚠️ ENTWURF. The text below is scaffolded from the `helpDe` fields in
// data/enforcement-signal/attributes.json plus the decision rules Spec 3 names
// explicitly. It is NOT the study's authoritative protocol. Replace it with the
// approved wording and set PROTOCOL_DRAFT to false — the UI shows a draft
// notice until that happens, because coders must not mistake a scaffold for the
// rules they are being measured against.

export const PROTOCOL_DRAFT = true

/**
 * Das Protokoll richtet sich nach dem Modus der laufenden Erhebung.
 *
 * Nicht kosmetisch: das Kodierprotokoll unten erklärt die Verweisungsregel,
 * Intervalle in Monaten und Sanktionen — lauter Regeln, die es im
 * Schweregrad-Modus nicht gibt. Wer sie dort zu lesen bekommt, sucht im Text
 * nach etwas, das gar nicht gefragt ist, und die Bewertung misst am Ende die
 * Verwirrung mit.
 */
export function protocolFor(mode: 'coding' | 'severity' | undefined): string {
  return mode === 'severity' ? SEVERITY_PROTOCOL_MARKDOWN : PROTOCOL_MARKDOWN
}

export const SEVERITY_PROTOCOL_MARKDOWN = `
## Worum es geht

Sie bewerten Situationen aus dem Gebäudebetrieb danach, **welcher Schaden im
ungünstigen Fall zu erwarten ist**. Die Antwortstufen sind die Schadensklassen
aus **GEFMA 192, Tabelle 1**.

Die Erhebung gehört zu einem Forschungsprojekt der **Hochschule Luzern** zur
Frage, wie einheitlich Schadensschwere im Facility Management eingeschätzt wird.
Die Klassenbeschreibungen sind GEFMA 192 : 2013-03, Tabelle 1 entnommen.

## Was das für Sie heisst

**Es gibt keine richtige Antwort.** Sie werden hier nicht geprüft, und es wird
nichts ausgewertet, was auf Sie als Person zurückführt. Gefragt ist Ihr
fachliches Urteil — gerade auch dort, wo es von dem anderer abweicht.

## Aufwand

- **Etwa eine Stunde**, verteilt auf rund 45 Situationen.
- **In Etappen möglich.** Jede Antwort wird sofort gespeichert. Wer nach zwanzig
  Situationen aufhört, macht Tage später an derselben Stelle weiter — die
  Reihenfolge bleibt dieselbe.
- **Kein Zeitlimit.** Nehmen Sie sich die Zeit, die eine Situation braucht; es
  wird Ihnen kein Timer angezeigt.

## Was Sie sehen und was nicht

Sie bekommen die Situation als kurzen Fliesstext: um welche Anlage es geht, um
welche Gefährdung, wie das Gebäude genutzt wird und wer sich dort aufhält.

**Die einschlägige Vorschrift wird bewusst nicht gezeigt.** Wer das Prüfregime
daneben liest, bewertet mit, wie streng etwas reguliert ist, statt wie schwer
der Schaden wäre — und beides soll sich hier nicht vermischen. Aus demselben
Grund tragen die Antwortstufen **keine Zahlen**: verglichen werden soll die
Beschreibung, nicht der Zahlenwert.

## Die vier Regeln

**1 — Die Schadensart steht fest.** Je Situation wird nur **eine** Achse gefragt:
Personen-, Umwelt- oder Sach-/Vermögensschaden. Welche es ist, ergibt sich aus
der Gefährdung und ist vorgegeben. Sie entscheiden die Schwere innerhalb dieser
Achse, nicht die Achse selbst.

**2 — Gemeint ist der ungünstige, nicht der schlimmstmögliche Fall.** Also der
Schaden, der bei Versagen der Anlage **realistischerweise** eintritt. Die
Eintrittswahrscheinlichkeit spielt keine Rolle; sie wird an anderer Stelle
berücksichtigt.

**3 — Einige Situationen ähneln einander.** Bewerten Sie jede für sich, ohne
sich an eine frühere zu erinnern und daraus abzuleiten.

**4 — „Nicht entscheidbar" ist eine vollwertige Antwort.** Wenn die Beschreibung
die Frage nicht hergibt, wählen Sie sie. Eine geratene Einstufung ist schlechter
als keine: wo die Beschreibung nicht ausreicht, ist selbst ein Ergebnis.

## Die Begründung

Zu jeder Einstufung gehören ein bis zwei Sätze, **was den Ausschlag gegeben
hat**. Ein Halbsatz genügt oft — „weil sich dort regelmässig Publikum aufhält".

Das ist kein Beiwerk, sondern der zweite Teil der Erhebung: uns interessiert
nicht nur, *wie* Fachleute einstufen, sondern *woran* sie es festmachen. Bei
„nicht entscheidbar" ist die Begründung freiwillig.

## Was mit Ihren Angaben geschieht

- Ihre Bewertungen werden unter einem **Pseudonym** gespeichert. Der
  Auswertungsdatensatz enthält weder Namen noch E-Mail-Adressen.
- Neben Ihren Antworten wird erfasst, **wie lange Sie je Situation brauchen**.
  Das dient der Qualitätssicherung der Erhebung, nicht der Bewertung Ihrer
  Person.
- Ausgewertet wird **aggregiert**, nie einzeln. Es gibt keine Rückmeldung an
  Ihren Arbeitgeber und keine Bewertung Ihrer Person.
- Sie können jederzeit aufhören. Was bis dahin gespeichert ist, bleibt im
  Datensatz, sofern Sie nichts anderes sagen.
- Eine frühere Antwort können Sie über „Frühere Antwort korrigieren" ändern. Die
  ursprüngliche bleibt erhalten, die Korrektur wird als neue Fassung gespeichert
  — das ist Nachvollziehbarkeit, keine Kontrolle.

## Zur genauen Fragestellung

Welche Hypothese die Erhebung prüft, sagen wir **vorher bewusst nicht**. Wer
weiss, worauf eine Studie hinauswill, bewertet unwillkürlich darauf hin. Sie
erhalten die vollständige Fragestellung und die Ergebnisse nach Abschluss der
Erhebung; fragen Sie gern jederzeit nach, dann bekommen Sie sie sofort — dann
allerdings bewerten Sie danach nicht mehr weiter.
`.trim()

export const PROTOCOL_MARKDOWN = `
## Worum es geht

Sie kodieren Auszüge aus Rechtsvorschriften danach, **welches Enforcement-Signal
die Norm aussendet**: wer prüfen muss, wie oft, mit welcher Qualifikation, und
was ein Verstoß nach sich zieht.

Kodiert wird **ausschliesslich der vorgelegte Auszug**. Nicht das, was Sie über
die Vorschrift wissen, und nicht das, was fachlich sinnvoll wäre.

## Ablauf

Sie erhalten die Items einzeln und in einer für Sie festgelegten Reihenfolge.
Zurückblättern ist nicht vorgesehen; eine frühere Antwort können Sie über
„Frühere Antwort korrigieren" ändern. Die ursprüngliche Antwort bleibt dabei
erhalten, die Korrektur wird als neue Fassung gespeichert.

Nehmen Sie sich die Zeit, die der Text braucht. Es gibt kein Zeitlimit, und es
wird Ihnen kein Timer angezeigt. Neben Ihren Antworten wird erfasst, wie lange
Sie je Item brauchen — das dient der Qualitätssicherung der Erhebung, nicht der
Bewertung Ihrer Person.

## „nicht entscheidbar" ist eine Antwort

Jedes Attribut lässt sich als **nicht entscheidbar** kodieren. Nutzen Sie das,
wann immer der Auszug die Frage nicht beantwortet. Eine geratene Antwort ist
schlechter als ein „nicht entscheidbar": wir wollen gerade wissen, an welchen
Stellen die Norm offen bleibt.

## Zweifelsfälle

**Verweisungsregel.** Verweist der Auszug auf eine andere Vorschrift, kodieren
Sie nur, was **im vorgelegten Text selbst** steht. Der Inhalt der in Bezug
genommenen Norm wird nicht mitkodiert — auch dann nicht, wenn Sie ihn kennen.
Bleibt das Attribut dadurch offen, ist es **nicht entscheidbar**.

**Mehrere Angaben.** Nennt der Auszug mehrere Stufen oder Fristen, gilt bei der
Prüferqualifikation die **höchste** genannte Stufe und beim Prüfintervall das
**längste zulässige** Intervall.

**Einheiten.** Intervalle werden in **Monaten** kodiert. Jahresangaben rechnen
Sie um (1 Jahr = 12 Monate).

**Sanktionen.** Kodiert wird nur, was der Auszug selbst an Folgen nennt. Eine
allgemeine Bußgeldvorschrift, die nicht im Auszug steht, zählt nicht.

## Nachschlagen

Nachschlagen ist **erlaubt und erwünscht**. Kreuzen Sie in diesem Fall bitte an,
dass Sie über den gezeigten Text hinaus nachgeschlagen haben. Das ist keine
Regelverletzung — die Angabe wird gezählt, damit der Vergleich mit einem Modell,
das nur den Auszug gesehen hat, fair bewertet werden kann.

## Bemerkungen

Das Bemerkungsfeld ist optional. Es lohnt sich vor allem dann, wenn Sie „nicht
entscheidbar" wählen und den Grund festhalten wollen.
`.trim()
