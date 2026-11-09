
import { useState } from 'react'

function QueueCard({ name, people, waitTime, crowdLevel, onUpdate }) {

  const [newPeople, setNewPeople] = useState(String(people))
  const [saving, setSaving] = useState(false)

  const crowdColors = {
    Low: 'bg-green-500/10 text-green-400',
    Medium: 'bg-yellow-500/10 text-yellow-400',
    High: 'bg-red-500/10 text-red-400',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const count = Number(newPeople)

    if (!Number.isInteger(count) || count < 0) {
      alert('Enter a valid number.')
      return
    }

    setSaving(true)

    try {
      await onUpdate(count)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

      <div className="flex justify-between items-center">
        <h3 className="text-white text-lg font-semibold">
          {name}
        </h3>

        <span className={`px-3 py-1 rounded-full text-xs font-medium ${crowdColors[crowdLevel] || crowdColors.Low}`}>
          {crowdLevel} Crowd
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">

        <div>
          <p className="text-slate-400 text-sm">
            People Waiting
          </p>
          <h2 className="text-3xl font-bold text-white mt-2">
            {people}
          </h2>
        </div>

        <div>
          <p className="text-slate-400 text-sm">
            Estimated Wait
          </p>
          <h2 className="text-3xl font-bold text-blue-400 mt-2">
            {waitTime} min
          </h2>
        </div>

      </div>

      <form onSubmit={handleSubmit} className="mt-6 border-t border-slate-800 pt-4">

        <label className="text-slate-400 text-sm">
          Update people waiting
        </label>

        <div className="flex gap-2 mt-2">

          <input
            type="number"
            min="0"
            step="1"
            value={newPeople}
            onChange={(e) => setNewPeople(e.target.value)}
            className="w-full min-w-0 bg-slate-800 text-white p-3 rounded-lg"
          />

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 rounded-lg"
          >
            {saving ? 'Saving...' : 'Update'}
          </button>

        </div>

      </form>

    </div>
  )
}

export default QueueCard
