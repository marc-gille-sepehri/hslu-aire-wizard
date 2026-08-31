---
description: Veröffentlicht den aktuellen Stand auf ai-in-real-estate.ch und verfolgt den Vorgang mit
---

Veröffentliche den aktuellen Stand dieses Repos und begleite die Person dabei.

## Ablauf

1. **Prüfe zuerst, ob etwas Ungespeichertes offen ist** (`git status --short`).
   - Sind Änderungen offen: sag, welche Dateien betroffen sind, und frag, ob sie mit
     veröffentlicht werden sollen. Nur bei Zustimmung committen und pushen. Ein Push veröffentlicht
     sofort — sag das dazu.
   - Ist alles sauber: weiter mit Schritt 2.

2. **Prüfe, ob der lokale Stand schon hochgeladen ist**
   (`git rev-list --count origin/main..main` nach einem `git fetch`).
   - Ist etwas nicht hochgeladen: `git push`. Der Push startet die Veröffentlichung von selbst,
     ein zusätzlicher Anstoss ist dann falsch.
   - Ist alles hochgeladen und es soll trotzdem neu veröffentlicht werden:
     `gh workflow run deploy.yml`.

3. **Verfolge den Vorgang mit:**

   ```
   gh run watch
   ```

4. **Bei Erfolg** meldest du in einem Satz, dass es durch ist, und nennst die Adresse:
   <https://ai-in-real-estate.ch> — mit dem Hinweis, im Browser `Strg+F5` zu drücken, damit die
   neue Fassung geladen wird.

5. **Bei Fehlschlag** meldest du das klar und sagst dazu, dass die bisherige Fassung der Seite
   weiterhin online ist — es ist nichts kaputt. Schlage dann vor:

   ```
   git revert HEAD --no-edit
   git push
   ```

   **Führe das nicht von dir aus aus.** Warte auf ein Ja. Danach erneut `gh run watch`, und wenn
   das durch ist, sag der Person, dass sie Marc kurz Bescheid geben soll — was geändert war und
   wann.

## Regeln

- Hole vor dem Push nie eigenmächtig `git pull --rebase` oder Ähnliches. Kommt der Push wegen
  fremder Änderungen nicht durch, sag das und schlage `git pull` vor.
- Fasse `.github/` nicht an, auch nicht wenn der Workflow scheitert. Das ist Marcs Bereich.
- Die Laufzeit liegt bei etwa einer Minute. Wenn `gh run watch` deutlich länger braucht, sag es,
  statt still zu warten.
