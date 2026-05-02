import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

function Header({ onOpenEnvManager, onImportCurl }) {
  const environments = useLiveQuery(() => db.environments.toArray())
  const activeEnv = environments?.find((e) => e.isActive === 1)

  const setActive = async (id) => {
    if (!environments) return
    await Promise.all(
      environments.map((env) =>
        db.environments.update(env.id, { isActive: env.id === id ? 1 : 0 })
      )
    )
  }

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-white">API Tester</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={onImportCurl}
          className="text-slate-300 hover:text-white text-sm border border-slate-600 px-3 py-1.5 rounded hover:bg-slate-700"
          title="Import from cURL"
        >
          ↓ Import cURL
        </button>

        <select
          value={activeEnv?.id || ''}
          onChange={(e) => {
            const val = e.target.value
            setActive(val ? parseInt(val, 10) : null)
          }}
          className="bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600 text-sm"
        >
          <option value="">No environment</option>
          {environments &&
            environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
        </select>

        <button
          onClick={onOpenEnvManager}
          className="text-slate-300 hover:text-white text-sm border border-slate-600 px-3 py-1.5 rounded hover:bg-slate-700"
          title="Manage environments"
        >
          ⚙ Environments
        </button>
      </div>
    </header>
  )
}

export default Header