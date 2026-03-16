import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const SERVICE_LABELS = {
  api: 'API Server',
  database: 'Database',
};

function StatusDot({ ok }) {
  return (
    <div className={`w-3 h-3 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
  );
}

export default function StatusPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch {
      setError('Unable to reach the server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  const allOk = health?.status === 'ok';

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Bolt Ads</span>
          </Link>
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900">Log in</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">System Status</h1>
            <p className="text-sm text-gray-400">Real-time service health</p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-accent border border-accent/20 rounded-lg hover:bg-accent/5 transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        {/* Overall status banner */}
        {!loading && (
          <div className={`rounded-xl p-5 mb-8 ${
            error ? 'bg-red-50 border border-red-200' :
            allOk ? 'bg-green-50 border border-green-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${
                error ? 'bg-red-500' : allOk ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <p className={`text-lg font-semibold ${
                error ? 'text-red-800' : allOk ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {error ? 'Service Disruption' : allOk ? 'All Systems Operational' : 'Degraded Performance'}
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="glass-card rounded-xl border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <StatusDot ok={false} />
              <div>
                <p className="text-sm font-semibold text-gray-900">API Server</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {health && !loading && (
          <div className="space-y-3">
            {Object.entries(SERVICE_LABELS).map(([key, label]) => {
              const serviceOk = health[key] === 'ok';
              return (
                <div key={key} className="glass-card rounded-xl border border-gray-200 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusDot ok={serviceOk} />
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    serviceOk
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {serviceOk ? 'Operational' : 'Down'}
                  </span>
                </div>
              );
            })}

            {health.timestamp && (
              <p className="text-xs text-gray-400 text-center mt-6">
                Last checked: {new Date(health.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
