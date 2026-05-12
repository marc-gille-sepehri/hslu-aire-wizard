import { labels } from '../labels'
import type { ValidationFailure } from '../schema/validate'

export default function SchemaError({ failures }: { failures: ValidationFailure[] }) {
  return (
    <div className="max-w-prose mx-auto px-4 py-10">
      <div className="rounded-md border border-red-300 bg-red-50 p-5">
        <h2 className="text-lg font-semibold text-red-800 mb-2">{labels.validationError}</h2>
        <ul className="space-y-2">
          {failures.map((f, i) => (
            <li key={i} className="text-sm text-red-900">
              <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono">{f.path}</code>
              <span className="ml-2">{f.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
