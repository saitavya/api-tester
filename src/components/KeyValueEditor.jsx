function KeyValueEditor({ items, setItems, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }) {
  const updateItem = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeItem = (id) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const addItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1
    setItems([...items, { id: newId, key: '', value: '', enabled: true }])
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => updateItem(item.id, 'enabled', e.target.checked)}
            className="w-4 h-4"
          />
          <input
            type="text"
            value={item.key}
            onChange={(e) => updateItem(item.id, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600 placeholder-slate-400 text-sm"
          />
          <input
            type="text"
            value={item.value}
            onChange={(e) => updateItem(item.id, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600 placeholder-slate-400 text-sm"
          />
          <button
            onClick={() => removeItem(item.id)}
            disabled={items.length === 1}
            className="text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed px-2"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-2"
      >
        + Add row
      </button>
    </div>
  )
}

export default KeyValueEditor