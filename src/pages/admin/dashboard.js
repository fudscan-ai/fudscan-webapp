import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/Layout';
import adminApi, { AdminApiError } from '../../lib/adminApi';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    clients: 0,
    knowledgeBases: 0,
    documents: 0,
    totalSize: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch clients count
      const clientsData = await adminApi.clients.list({ limit: 1 });
      
      // Fetch knowledge bases count
      const kbData = await adminApi.knowledgeBases.list({ limit: 1 });

      setStats({
        clients: clientsData.pagination?.total || 0,
        knowledgeBases: kbData.pagination?.total || 0,
        documents: 0, // We'll implement this later
        totalSize: 0
      });
    } catch (error) {
      if (error instanceof AdminApiError) {
        console.error('Error fetching stats:', error.message);
        // 401 错误已经在 adminApi 中处理了，会自动跳转到登录页
      } else {
        console.error('Error fetching stats:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = 'indigo' }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`text-2xl text-${color}-600`}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {loading ? '...' : value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Overview of your RAG management system
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Clients"
            value={stats.clients}
            icon="👥"
            color="blue"
          />
          <StatCard
            title="Knowledge Bases"
            value={stats.knowledgeBases}
            icon="📚"
            color="green"
          />
          <StatCard
            title="Documents"
            value={stats.documents}
            icon="📄"
            color="yellow"
          />
          <StatCard
            title="Storage Used"
            value={`${(stats.totalSize / 1024 / 1024).toFixed(1)} MB`}
            icon="💾"
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Quick Actions
            </h3>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/admin/clients"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-indigo-500"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-indigo-50 text-indigo-600 ring-4 ring-white">
                    👥
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Manage Clients
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Add, edit, and manage client accounts
                  </p>
                </div>
              </Link>

              <Link
                href="/admin/knowledge-bases"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-indigo-500"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-600 ring-4 ring-white">
                    📚
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Knowledge Bases
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Create and manage knowledge bases
                  </p>
                </div>
              </Link>

              <Link
                href="/admin/rag-test"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-indigo-500"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-600 ring-4 ring-white">
                    🤖
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Test RAG
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Test RAG queries and responses
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Activity
            </h3>
            <div className="mt-5">
              <div className="text-sm text-gray-500">
                Activity tracking will be implemented in future updates.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
