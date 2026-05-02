import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import KeyValueEditor from './KeyValueEditor'

function EnvironmentManager({ onClose }) {
  const environments = useLiveQuery(() => db.environments.toArray())
  const [selectedId, setSelectedId] = useState(null)
  const [name, setName] = useState('')
  const [variables, setVariables] = useState([{ id: 1, key: '', value: '', enabled: true }])

  useEffect(() => {
    if (!environments) return
    if (selectedId === null && environments.length > 0) {
      selectEnv(environments[0])
    }
  }, [environments])

  const selectEnv = (env) => {
    setSelectedId(env.id)
    setName(env.name)
    const vars =
      env.variables && env.variables.length > 0
        ? env.variables.map((v, i) => ({ ...v, id: i + 1 }))
        : [{ id: 1, key: '', value: '', enabled: true }]
    setVariables(vars)
  }

  const createEnv = async () => {
    const newId = await db.environments.add({
      name: 'New Environment',
      variables: [],
      isActive: 0,
      createdAt: Date.now(),
    })
    const env = await db.environments.get(newId)
    selectEnv(env)
  }

  const saveEnv = async () => {
    if (selectedId === null) return
    await db.environments.update(selectedId, {
      name: name.trim() || 'Untitled',
      variables: variables.filter((v) => v.key),
    })
  }

  const deleteEnv = async () => {
    if (selectedId === null) return
    if (!confirm('Delete this environment?')) return
    await db.environments.delete(selectedId)
    setSelectedId(null)
    setName('')
    setVariables([{ id: 1, key: '', value: '', enabled: true }])
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg w-[800px] h-[500px] flex overflow-hidden">
        {/* Left: list of environments */}
        <div className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Environments</h3>
            <button
              onClick={createEnv}
              className="text-blue-400 hover:text-blue-300 text-sm"
              title="New"
            >
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {environments && environments.length === 0 && (
              <div className="p-4 text-slate-400 text-xs">No environments yet</div>
            )}
            {environments &&
              environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => selectEnv(env)}
                  className={`w-full text-left px-4 py-2 text-sm border-b border-slate-700/50 ${
                    selectedId === env.id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {env.name}
                </button>
              ))}
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {selectedId !== null ? 'Edit environment' : 'Select or create an environment'}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
              ✕ Close
            </button>
          </div>

          {selectedId !== null ? (
            <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-2">Variables</label>
                <KeyValueEditor
                  items={variables}
                  setItems={setVariables}
                  keyPlaceholder="Variable name"
                  valuePlaceholder="Value"
                />
              </div>

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={saveEnv}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={deleteEnv}
                  className="bg-slate-700 hover:bg-red-600 text-white px-4 py-2 rounded text-sm border border-slate-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Click + to create your first environment
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EnvironmentManager