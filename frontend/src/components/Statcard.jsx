
function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

      <p className="text-slate-400 text-sm">
        {title}
      </p>

      <h2 className="text-3xl font-bold text-white mt-3">
        {value}
      </h2>

      <p className="text-blue-400 text-sm mt-2">
        {subtitle}
      </p>

    </div>
  )
}

export default StatCard
