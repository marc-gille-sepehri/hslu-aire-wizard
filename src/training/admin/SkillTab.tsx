import { useState } from 'react'
import { apiBaseUrl } from '../../config/configuration'
import { labels } from '../labels'
import { makeZip } from '../lib/zip'
// Canonical skill file — single source of truth (also lives in the repo for Claude Code).
import skillMd from '../../../.claude/skills/kurs-autor/SKILL.md?raw'

const t = labels.adminSkill

const CONNECTOR_URL = `${apiBaseUrl}/mcp/authoring`
const CLI_COMMAND = `claude mcp add --transport http aire \\\n  ${CONNECTOR_URL} \\\n  --header "Authorization: Bearer <admin-jwt>"`

/** A small copy-to-clipboard code block. */
function CodeBlock({ code, mono = true }: { code: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }
  return (
    <div className="relative">
      <pre className={`overflow-x-auto rounded-md border border-mist bg-navy/95 px-3 py-2.5 pr-16 text-xs text-cream ${mono ? 'font-mono' : ''} whitespace-pre-wrap`}>
        {code}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded border border-white/20 px-2 py-0.5 text-[11px] font-semibold text-cream/90 hover:bg-white/10"
      >
        {copied ? t.copied : t.copy}
      </button>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{n}</div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-navy">{title}</h3>
        <div className="mt-1 space-y-2 text-sm text-slate-600">{children}</div>
      </div>
    </div>
  )
}

/**
 * Claude Skill tab: documents how to author courses by prompting Claude — install
 * the skill (zip download), connect the MCP connector, and what OAuth looks like
 * at runtime.
 */
export default function SkillTab() {
  const downloadZip = () => {
    const blob = makeZip([{ name: 'kurs-autor/SKILL.md', content: skillMd }])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kurs-autor.zip'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const card = 'rounded-xl border border-mist bg-white p-5'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-navy">Kurse per Prompt erstellen</h2>
        <p className="mt-1 text-sm text-slate-600">
          Über den MCP-Server <code className="rounded bg-cream px-1">aire-course-authoring</code> kann Claude komplette
          Trainingskurse (Kurs → Module → Sections → Artefakte) anlegen. Die <b>Skill</b> gibt Claude die didaktische
          Anleitung, der <b>Connector</b> die Werkzeuge. Angelegte Kurse erscheinen als <b>unveröffentlichte Entwürfe</b>
          und werden erst nach Freigabe für Lernende sichtbar.
        </p>
      </div>

      {/* Step 1 — Skill */}
      <div className={card}>
        <Step n={1} title="Skill installieren">
          <p>
            Die Skill <code className="rounded bg-cream px-1">kurs-autor</code> enthält die Autoren-Anleitung
            (Kursaufbau, empfohlene Tool-Reihenfolge, Beispielkurs). Lade sie als ZIP herunter:
          </p>
          <button
            type="button"
            onClick={downloadZip}
            className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            {t.download}
          </button>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <b>Claude.ai / Desktop:</b> Einstellungen → <i>Capabilities/Skills</i> → Skill hochladen und die
              <code className="rounded bg-cream px-1">kurs-autor.zip</code> auswählen.
            </li>
            <li>
              <b>Claude Code:</b> ZIP entpacken nach <code className="rounded bg-cream px-1">~/.claude/skills/</code>
              {' '}(oder projektlokal <code className="rounded bg-cream px-1">.claude/skills/</code>), sodass{' '}
              <code className="rounded bg-cream px-1">kurs-autor/SKILL.md</code> entsteht.
            </li>
          </ul>
          <p className="text-slate-500">
            Hinweis: In Claude.ai übernimmt zusätzlich der eingebaute Prompt <code className="rounded bg-cream px-1">author_course</code>
            {' '}des Connectors die Anleitung — die Skill ist vor allem für Claude Code nützlich.
          </p>
        </Step>
      </div>

      {/* Step 2 — Connector */}
      <div className={card}>
        <Step n={2} title="MCP-Connector verbinden">
          <p><b>Claude.ai / Desktop</b> — Einstellungen → <i>Connectors</i> → <i>Custom Connector hinzufügen</i>, diese URL eintragen:</p>
          <CodeBlock code={CONNECTOR_URL} />
          <p>Beim ersten Aufruf öffnet sich die OAuth-Anmeldung (siehe Schritt 3).</p>
          <p className="pt-1"><b>Claude Code</b> — alternativ mit statischem Admin-Token (ohne OAuth):</p>
          <CodeBlock code={CLI_COMMAND} />
        </Step>
      </div>

      {/* Step 3 — OAuth runtime */}
      <div className={card}>
        <Step n={3} title="OAuth zur Laufzeit">
          <p>Beim Verbinden führt Claude automatisch den OAuth-2.1-Ablauf durch — du machst nur die Anmeldung:</p>
          <ol className="ml-4 list-decimal space-y-1.5">
            <li>Claude ruft <code className="rounded bg-cream px-1">/mcp/authoring</code> auf und erhält <code className="rounded bg-cream px-1">401</code> mit Verweis auf die Metadaten.</li>
            <li>Claude liest die Discovery-Metadaten und <b>registriert sich selbst</b> (Dynamic Client Registration) — kein manuelles Anlegen von Client-IDs.</li>
            <li>
              Dein Browser öffnet die <b>AI@RE-Anmeldeseite</b>: E-Mail eingeben → 6-stelligen <b>Einmal-Code</b> aus der Mail eingeben.
              Nur <b>Administrator</b>-Konten werden zugelassen.
            </li>
            <li>Nach erfolgreicher Anmeldung tauscht Claude einen Autorisierungscode (mit PKCE) gegen ein Zugriffstoken und ist verbunden.</li>
            <li>Alle weiteren Tool-Aufrufe laufen mit diesem Token; es wird bei Ablauf automatisch erneuert (Refresh-Token).</li>
          </ol>
          <div className="mt-2 rounded-md border border-mist bg-cream/60 p-3 text-slate-600">
            <p className="text-xs">
              <b>Sicherheit:</b> Das Zugriffstoken entspricht deiner Administrator-Identität. Der Login nutzt denselben
              E-Mail-Code wie das Portal. Die Anmeldeseite und die Token liegen ausschließlich beim AI@RE-Server —
              Claude sieht nie dein Passwort oder deinen Code.
            </p>
          </div>
        </Step>
      </div>

      {/* Step 4 — Usage */}
      <div className={card}>
        <Step n={4} title="Nutzung">
          <p>Sobald Skill + Connector verbunden sind, genügt ein Prompt, z. B.:</p>
          <CodeBlock mono={false} code={'„Erstelle einen Kurs über KI-Grundlagen im Immobilienwesen mit 3 Modulen. Nutze Wissensblöcke, je eine Multiple-Choice-Frage und eine Reflexion pro Modul."'} />
          <p>Claude arbeitet dann mit diesen Tools:</p>
          <ul className="ml-4 grid grid-cols-1 gap-x-6 gap-y-0.5 text-xs text-slate-600 sm:grid-cols-2">
            {[
              'describe_course_schema — Metamodell abfragen',
              'list_courses — vorhandene Kurse',
              'get_course — Kurs inkl. Inhalte lesen',
              'create_course — Kurs (Entwurf) anlegen',
              'create_module — Modul mit Inhalten',
              'update_module — Modul bearbeiten',
              'set_course_modules — Reihenfolge',
              'publish_course / set_active_version — freigeben',
            ].map((x) => (
              <li key={x} className="flex gap-1.5">
                <span className="text-gold">•</span>
                <code className="rounded bg-cream px-1">{x}</code>
              </li>
            ))}
          </ul>
          <p className="text-slate-500">
            Ergebnis prüfen: Der neue Kurs erscheint unter <b>Training → Bearbeiten</b> als Entwurf. Über die Kurs-Versionierung
            lässt er sich veröffentlichen und aktiv schalten.
          </p>
        </Step>
      </div>
    </div>
  )
}
