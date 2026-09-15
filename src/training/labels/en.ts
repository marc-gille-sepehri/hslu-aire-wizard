// English catalogue.
//
// ⚠️ IN ARBEIT. Übersetzt sind bisher nur die unten ausdrücklich aufgeführten
// Bereiche; alles Weitere kommt über `...de` herein und ist damit noch Deutsch.
// Der Spread ist eine SICHTBARE Zwischenstufe, kein Rückfallmechanismus: sobald
// alle Bereiche stehen, fällt er weg, und ab dann ist ein fehlender Schlüssel
// wieder ein Bauzeitfehler.
//
// Ton: Sie-Form des Deutschen wird im Englischen zu neutralem „you“ — eine
// Entsprechung gibt es nicht, und gestelztes Englisch wäre die schlechtere
// Annäherung als eine natürliche.

import { de } from './de'
import type { Labels } from './index'

export const en: Labels = {
  ...de,

  catalog: {
    heading: 'Courses & modules',
    intro: 'Pick a course and a module to get started.',
    empty: 'No courses are available at the moment.',
    loadError: 'Courses could not be loaded.',
    inProgress: 'In progress',
    open: 'Open',
    backToCatalog: '← All courses',
    onlyPublished: 'Published only',
    unpublishedTag: 'Unpublished',
    priceTitle: 'List price. Orders are subject to 8.1 % Swiss VAT.',
  },

  dashboard: {
    completedCourses: 'Completed courses',
    ofCourses: (done: number, total: number) => `${done} of ${total} courses`,
    certificates: 'Certificates',
    inProgressHeading: 'In progress',
    completedTag: 'Completed',
    noStarted: 'No courses started yet — pick one below to begin.',
  },

  seat: {
    title: 'No access to this course',
    noOrder:
      'There is no order from your organisation for this course. Please contact your administrator.',
    noSeats: 'All seats for this course are taken. Please contact your administrator.',
    generic: 'Your progress could not be saved.',
    close: 'Close',
  },

  auth: {
    heading: 'Sign in to the training area',
    intro: 'The training area is protected. Please sign in with your email address.',
    emailLabel: 'Email address',
    emailPlaceholder: 'first.last@hslu.ch',
    requestCode: 'Request code',
    sending: 'Sending code…',
    codeHeading: 'Enter code',
    // „6-stellig“ wird zu „six-digit“: Ziffern im Fliesstext liest man als
    // Daten, und hier ist es ein Eigenschaftswort.
    codeSentTo: (email: string) =>
      `We have sent a six-digit code to ${email}. It is valid for 10 minutes.`,
    codeLabel: 'Sign-in code',
    codePlaceholder: '123456',
    verify: 'Sign in',
    verifying: 'Checking…',
    back: 'Use a different email address',
    resend: 'Send a new code',
    checking: 'Checking your session…',
    logout: 'Sign out',
    genericRequestError: 'The code could not be sent. Please try again.',
    wrongCode: 'Wrong code. Please try again.',
    // Das deutsche „Versuch(e)“ umgeht den Plural; im Englischen gibt es keinen
    // Grund dazu.
    wrongCodeRemaining: (n: number) =>
      n === 1 ? 'Wrong code. 1 attempt left.' : `Wrong code. ${n} attempts left.`,
    expiredCode: 'The code is invalid or has expired. Please request a new one.',
    lockedCode: 'Too many attempts. Please request a new code.',
    noUser: 'There is no access for this address.',
    invalidEmail: 'Please enter a valid email address.',
  },
}
