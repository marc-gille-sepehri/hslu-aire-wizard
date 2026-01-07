import { FiTarget, FiBarChart2, FiSettings, FiUsers, FiBook, FiTrendingUp, FiShield } from 'react-icons/fi'

export const dimensions = [
  {
    id: 1,
    title: 'Strategie & Orientierung',
    subtitle: 'Fragen zur Klarheit, Priorisierung und strategischen Einbettung von AI.',
    icon: FiTarget,
    questions: [
      'Wir haben ein klares Verständnis davon, warum und wo AI unserem Unternehmen Nutzen bringen kann.',
      'Unsere Geschäftsleitung verfolgt das Thema AI aktiv und regelmässig.',
      'Wir wissen, welche Geschäftsbereiche durch AI am stärksten betroffen sein werden.',
      'Wir haben AI-Potenziale priorisiert und wissen, welche Use Cases wir zuerst angehen wollen.',
      'Wir haben eine übergeordnete AI-Vision oder -Roadmap für das Unternehmen definiert.',
    ],
  },
  {
    id: 2,
    title: 'Daten & Informationsqualität',
    subtitle: 'Fragen zur Verfügbarkeit, Struktur, Qualität und Nutzbarkeit von Daten.',
    icon: FiBarChart2,
    questions: [
      'Unsere Daten sind strukturiert und in einer Form verfügbar, die für Analysen oder AI nutzbar ist.',
      'Wir wissen, wo sich unsere wichtigsten Daten befinden und wer dafür verantwortlich ist.',
      'Wir haben Standards für Datenqualität (z. B. Namenskonventionen, Formate, Aktualität).',
      'Der Zugriff auf Daten erfolgt schnell und ohne Reibungsverluste zwischen Abteilungen.',
      'Unsere Datenqualität ist so hoch, dass AI-Projekte realistisch umsetzbar wären.',
    ],
  },
  {
    id: 3,
    title: 'Prozesse & Systeme',
    subtitle: 'Fragen zur Digitalisierung, Automatisierung und Systemlandschaft.',
    icon: FiSettings,
    questions: [
      'Unsere Kernprozesse (z. B. Bewirtschaftung, Asset Management, Reporting) sind digital klar abgebildet.',
      'Wir nutzen bereits Tools oder Systeme, die AI unterstützen oder Automatisierung ermöglichen.',
      'Unsere Systeme sind ausreichend integriert (Schnittstellen, Datenaustausch).',
      'Es gibt keine kritischen manuellen Prozessbrüche oder Medienbrüche in wichtigen Arbeitsabläufen.',
      'Unsere IT-Landschaft ist flexibel genug, um neue AI-Anwendungen zu integrieren.',
    ],
  },
  {
    id: 4,
    title: 'Organisation & Rollen',
    subtitle: 'Fragen zu Zuständigkeiten, Führungsverantwortung und internen Strukturen.',
    icon: FiUsers,
    questions: [
      'Es gibt klare Verantwortlichkeiten für Digitalisierung, Daten und AI.',
      'Wir haben interne „Champions" oder Schlüsselpersonen, die das Thema aktiv vorantreiben.',
      'Wir arbeiten in funktionsübergreifenden Teams, wenn es um digitale oder AI-Projekte geht.',
      'Entscheidungswege sind schnell genug, um AI-Initiativen effizient umzusetzen.',
      'Unsere Organisation ist offen dafür, Rollen neu zu denken oder anzupassen, wenn es erforderlich ist.',
    ],
  },
  {
    id: 5,
    title: 'Kompetenzen & Skills',
    subtitle: 'Fragen zu Fähigkeit, Verständnis und Lernbereitschaft von Mitarbeitenden & Führung.',
    icon: FiBook,
    questions: [
      'Führungskräfte verfügen über ein grundlegendes Verständnis von AI und ihren Auswirkungen.',
      'Mitarbeitende haben Zugang zu Weiterbildungen zu Digitalisierung, Daten und AI.',
      'Wir haben interne Kompetenzen für die Analyse, Bewertung oder Umsetzung von AI-Projekten.',
      'Es gibt Mitarbeitende, die sicher mit AI-Tools umgehen und andere darin unterstützen können.',
      'Wir investieren gezielt in den Kompetenzaufbau rund um AI und datengetriebene Arbeit.',
    ],
  },
  {
    id: 6,
    title: 'Kultur & Veränderungsbereitschaft',
    subtitle: 'Fragen zu Mindset, Offenheit, Lernbereitschaft und Innovationskultur.',
    icon: FiTrendingUp,
    questions: [
      'Neuen Technologien und Veränderungen wird im Unternehmen grundsätzlich offen begegnet.',
      'Experimentieren und Testen von neuen Lösungen wird gefördert.',
      'Fehler aus Pilotprojekten werden als Lernchance und nicht als Risiko betrachtet.',
      'Mitarbeitende fühlen sich sicher dabei, neue Tools oder Arbeitsweisen auszuprobieren.',
      'Es gibt eine positive Grundhaltung gegenüber datengetriebenen Entscheidungen.',
    ],
  },
  {
    id: 7,
    title: 'Governance & Risiko',
    subtitle: 'Fragen zu Leitplanken, Sicherheit, Compliance und Verantwortungsbewusstsein.',
    icon: FiShield,
    questions: [
      'Wir haben ein Grundverständnis der regulatorischen Anforderungen zu AI.',
      'Es existieren klare Prinzipien für den verantwortungsvollen Einsatz von AI.',
      'Wir prüfen Risiken, Bias und Transparenz bei digitalen oder AI-Anwendungen.',
      'Datenschutz und Sicherheit werden proaktiv berücksichtigt, nicht nur reaktiv.',
      'Wir wissen, welche AI-basierten Anwendungen in unserem Unternehmen potenziell „High Risk" sind.',
    ],
  },
]

export const responseOptions = [
  { value: 1, label: 'Trifft nicht zu' },
  { value: 2, label: 'Trifft eher nicht zu' },
  { value: 3, label: 'Teils / teils' },
  { value: 4, label: 'Trifft eher zu' },
  { value: 5, label: 'Trifft zu' },
]

export const recommendations = [
  {
    id: 'seminar',
    title: 'AI-Fitness in einem Tag',
    message: 'Hast du schon unser "AI-Fitness in einem Tag" Seminar gesehen?',
  },
  {
    id: 'management',
    title: 'Management Circle-Programm',
    message: 'Schau dir doch mal unser Management Circle-Programm an.',
  },
  {
    id: 'research',
    title: 'Innosuisse Forschungsprojekt',
    message: 'Hast du dir mal überlegt mit uns ein Innosuisse-gefördertes Forschungsprojekt aufzusetzen?',
  },
  {
    id: 'startup',
    title: 'Incubator-Programm',
    message: 'Eigentlich müsstest du ein Startup gründen. Kennst du unser Incubator-Programm?',
  },
  {
    id: 'webinar',
    title: 'Webinar Präsentation',
    message: 'Du bisch so cool, du söttisch emol bi üs im Webinar präsentiert.',
  },
  {
    id: 'workshop',
    title: 'Workshops',
    message: 'Hast du schon unsere Workshops (z.B. Bestellen von AI) gesehen?',
  },
]

