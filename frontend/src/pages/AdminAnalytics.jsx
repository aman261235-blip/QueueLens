
import { useEffect, useState } from "react";
import apiClient from "../api/apiClient.js";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

function StatCard({ title, value, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-800">{value}</h2>
      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.get("/admin/analytics");
      setAnalytics(response.data);

    } catch (err) {
      setError(
        err.userMessage ||
        err.response?.data?.detail ||
        "Unable to load admin analytics. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg font-medium text-slate-500">
          Loading global analytics...
        </p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <h2 className="font-semibold">Analytics Error</h2>

        <p className="mt-2 text-sm">
          {error || "Analytics data is unavailable."}
        </p>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        >
          Retry
        </button>
      </div>
    );
  }

  const summary = analytics.summary;

  const crowdData = Object.entries(
    analytics.crowd_distribution
  ).map(([name, value]) => ({ name, value }));

  const activityData = analytics.queue_activity.map((item) => ({
    date: item.date,
    updates: item.updates,
    averagePeople: item.average_people,
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Global Analytics
          </h1>

          <p className="mt-2 text-slate-500">
            Overview of users, locations and queue activity across QueueLens.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            title="Total Users"
            value={summary.total_users}
            description={`${summary.total_admins} admins and ${summary.total_normal_users} normal users`}
          />

          <StatCard
            title="Total Locations"
            value={summary.total_locations}
            description="Registered queue locations"
          />

          <StatCard
            title="People Waiting"
            value={summary.total_people_waiting}
            description="Across all locations"
          />

          <StatCard
            title="Queue Records"
            value={summary.total_queue_records}
            description="Total historical queue updates"
          />

          <StatCard
            title="Average Queue"
            value={summary.average_queue}
            description="Average people waiting per record"
          />

          <StatCard
            title="Estimated Wait"
            value={`${summary.average_wait_time} min`}
            description="Estimated average waiting time"
          />

          <StatCard
            title="Administrators"
            value={summary.total_admins}
            description="Users with admin access"
          />

          <StatCard
            title="Normal Users"
            value={summary.total_normal_users}
            description="Users with standard access"
          />

        </div>

        {/* Charts */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Queue Activity */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-800">
              Queue Activity
            </h2>

            {activityData.length === 0 ? (
              <p className="py-16 text-center text-slate-400">
                No queue activity available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="updates"
                    name="Queue Updates"
                    stroke="#2563eb"
                    strokeWidth={3}
                  />

                  <Line
                    type="monotone"
                    dataKey="averagePeople"
                    name="Average People"
                    stroke="#16a34a"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Crowd Distribution */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-800">
              Global Crowd Distribution
            </h2>

            {crowdData.length === 0 ? (
              <p className="py-16 text-center text-slate-400">
                No crowd data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={crowdData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {crowdData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Average Queue by Date */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-5 text-lg font-bold text-slate-800">
              Average Queue by Date
            </h2>

            {activityData.length === 0 ? (
              <p className="py-16 text-center text-slate-400">
                No queue activity available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />

                  <Bar
                    dataKey="averagePeople"
                    name="Average People Waiting"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>

        <p className="mt-6 text-xs text-slate-400">
          Estimated waiting time is calculated using QueueLens' current
          average-wait estimation formula.
        </p>

      </div>
    </div>
  );
}
