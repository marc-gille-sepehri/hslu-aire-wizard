import { useEffect, useState } from 'react'
import { FileCard } from '../components/artifacts/Media'

// Eine Download-Karte für eine beliebige Adresse.
//
// Der Anlass: ein ZIP als Fliesstext-Link mitten im Absatz. Der Link ist
// gestylt und trotzdem falsch — nichts daran sagt, dass ein Klick eine Datei
// holt statt eine Seite zu öffnen, wie gross sie ist oder was drin ist. Ein
// Download ist ein Angebot und gehört als solches gezeigt.
//
// Die Grösse holt ein HEAD-Aufruf. Schlägt er fehl — fremder Host ohne CORS,
// Netz weg —, zeigt die Karte eben keine Grösse. Sie deswegen gar nicht zu
// zeigen wäre die schlechtere Wahl: der Download funktioniert auch ohne, dass
// wir seine Länge kennen.

function dateinameAus(url: string): string {
  try {
    const pfad = new URL(url, window.location.origin).pathname
    return decodeURIComponent(pfad.split('/').filter(Boolean).pop() ?? '') || url
  } catch {
    return url
  }
}

export default function DownloadCard({ url, label }: { url: string; label?: string }) {
  const [groesse, setGroesse] = useState<number | undefined>(undefined)
  const name = label || dateinameAus(url)
  const endung = (dateinameAus(url).split('.').pop() ?? '').toLowerCase().slice(0, 5)

  useEffect(() => {
    let abgebrochen = false
    fetch(url, { method: 'HEAD' })
      .then((res) => {
        const laenge = Number(res.headers.get('content-length'))
        if (!abgebrochen && Number.isFinite(laenge) && laenge > 0) setGroesse(laenge)
      })
      .catch(() => {
        // Keine Grösse. Die Karte bleibt vollständig genug.
      })
    return () => {
      abgebrochen = true
    }
  }, [url])

  return <FileCard url={url} ext={endung || 'datei'} filename={name} filesize={groesse} />
}
