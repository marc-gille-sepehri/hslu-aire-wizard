// Italienischer Katalog.
//
// ⚠️ IN ARBEIT — siehe en.ts. Was noch nicht übersetzt ist, kommt über `...de`
// herein und ist damit Deutsch. Sichtbare Zwischenstufe, kein Rückfall.
//
// Ton: das deutsche Sie wird zum italienischen „Lei“ (Verbform in der dritten
// Person Einzahl). Das ist in der Geschäftskommunikation die richtige Anrede
// und passt zur bestehenden deutschen Fassung; ein Wechsel zum „tu“ wäre eine
// inhaltliche Änderung und nicht eine Übersetzung.

import { de } from './de'
import type { Labels } from './index'

export const it: Labels = {
  ...de,

  catalog: {
    heading: 'Corsi e moduli',
    intro: 'Scelga un corso e un modulo per iniziare.',
    empty: 'Al momento non è disponibile alcun corso.',
    loadError: 'Non è stato possibile caricare i corsi.',
    inProgress: 'In corso',
    open: 'Apri',
    backToCatalog: '← Tutti i corsi',
    onlyPublished: 'Solo pubblicati',
    unpublishedTag: 'Non pubblicato',
    priceTitle: 'Prezzo di listino. Agli ordini si aggiunge l’IVA svizzera dell’8,1 %.',
  },

  dashboard: {
    completedCourses: 'Corsi completati',
    ofCourses: (done: number, total: number) => `${done} di ${total} corsi`,
    certificates: 'Attestati',
    inProgressHeading: 'In corso',
    completedTag: 'Completato',
    noStarted: 'Nessun corso ancora iniziato — ne scelga uno qui sotto per cominciare.',
  },

  seat: {
    title: 'Nessun accesso a questo corso',
    noOrder:
      'Per questo corso non risulta alcun ordine della Sua organizzazione. Si rivolga alla Sua amministrazione.',
    noSeats:
      'Per questo corso tutti i posti sono occupati. Si rivolga alla Sua amministrazione.',
    generic: 'Non è stato possibile salvare i Suoi progressi.',
    close: 'Chiudi',
  },

  auth: {
    heading: 'Accesso all’area di formazione',
    intro: 'L’area di formazione è protetta. Acceda con il Suo indirizzo e-mail.',
    emailLabel: 'Indirizzo e-mail',
    emailPlaceholder: 'nome.cognome@hslu.ch',
    requestCode: 'Richiedi il codice',
    sending: 'Invio del codice…',
    codeHeading: 'Inserisca il codice',
    codeSentTo: (email: string) =>
      `Abbiamo inviato un codice di sei cifre a ${email}. È valido per 10 minuti.`,
    codeLabel: 'Codice di accesso',
    codePlaceholder: '123456',
    verify: 'Accedi',
    verifying: 'Verifica in corso…',
    back: 'Usa un altro indirizzo e-mail',
    resend: 'Invia un nuovo codice',
    checking: 'Verifica dell’accesso…',
    logout: 'Esci',
    genericRequestError: 'Non è stato possibile inviare il codice. Riprovi.',
    wrongCode: 'Codice errato. Riprovi.',
    wrongCodeRemaining: (n: number) =>
      n === 1 ? 'Codice errato. Resta 1 tentativo.' : `Codice errato. Restano ${n} tentativi.`,
    expiredCode: 'Il codice non è valido o è scaduto. Ne richieda uno nuovo.',
    lockedCode: 'Troppi tentativi. Richieda un nuovo codice.',
    noUser: 'Per questo indirizzo non esiste alcun accesso.',
    invalidEmail: 'Inserisca un indirizzo e-mail valido.',
  },
}
