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
ungünstigen Fall zu erwarten ist**. Die Stufen folgen GEFMA 192, Tabelle 1.

Anders als bei einer Kodierung gibt es hier **keine richtige Antwort**. Gefragt
ist Ihr fachliches Urteil. Ausgewertet wird, worin Sachverständige
übereinstimmen — und wie weit ein maschinelles Ableitungsverfahren davon
abweicht. Ihre Urteile sind dabei der Massstab, nicht der Prüfling.

## Was Sie sehen und was nicht

Sie bekommen die Situation als Fliesstext: Anlage, Gefährdung, Nutzung und wer
sich dort aufhält. **Die einschlägige Vorschrift wird bewusst nicht gezeigt.**
Wer das Prüfregime daneben liest, bewertet mit, wie streng reguliert wird, statt
wie schwer der Schaden wäre — und genau diese beiden Dinge sollen sich hier
nicht vermischen.

Aus demselben Grund tragen die Antwortstufen **keine Zahlen**. Es soll die
Beschreibung verglichen werden, nicht der Zahlenwert.

## Die Schadensart steht fest

Je Situation wird **nur eine Schadensachse** gefragt — Personen-, Umwelt- oder
Sach-/Vermögensschaden. Welche es ist, ergibt sich aus der Gefährdung und ist
vorgegeben. Sie entscheiden die Schwere innerhalb dieser Achse, nicht die Achse
selbst.

## Der ungünstige Fall

Gemeint ist der Schaden, der bei Versagen der Anlage **realistischerweise** zu
erwarten ist — nicht der denkbar schlimmste und nicht der wahrscheinlichste.
Die Eintrittswahrscheinlichkeit spielt hier keine Rolle; sie wird an anderer
Stelle des Verfahrens berücksichtigt.

## Ähnliche Situationen

Einige Situationen ähneln einander und unterscheiden sich nur im Kontext, etwa
in der Nutzungsart des Gebäudes. Das ist beabsichtigt: gerade der Unterschied
zwischen ihnen ist die Messgrösse. Bewerten Sie jede Situation für sich, ohne
zu versuchen, sich an eine frühere zu erinnern.

## „Nicht entscheidbar" ist eine Antwort

Wenn die Situation die Frage nicht beantwortet, wählen Sie **nicht
entscheidbar**. Eine geratene Einstufung ist schlechter als keine: wir wollen
gerade wissen, wo die Beschreibung nicht ausreicht.

## Die Begründung

Zu jeder Einstufung gehört ein bis zwei Sätze dazu, **was den Ausschlag gegeben
hat**. Das ist kein Beiwerk. Das Ableitungsverfahren erzeugt eigene
Begründungen, und ohne Ihre gibt es nichts, woran sich deren
Nachvollziehbarkeit prüfen liesse.

## Ablauf

Sie erhalten die Situationen einzeln und in einer für Sie festgelegten
Reihenfolge. Es gibt kein Zeitlimit und keinen Timer. Eine frühere Antwort
können Sie über „Frühere Antwort korrigieren" ändern; die ursprüngliche bleibt
erhalten, die Korrektur wird als neue Fassung gespeichert.
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

Nehmen Sie sich die Zeit, die der Text braucht. Es gibt kein Zeitlimit und
keinen sichtbaren Timer.

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
