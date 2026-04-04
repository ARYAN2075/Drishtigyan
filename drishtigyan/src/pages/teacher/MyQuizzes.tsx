import { useEffect, useState } from 'react';
import client from '@/api/client';
import { Button } from '@/components/ui/Button';

export default function MyQuizzes() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    client
      .get('/api/teacher/quizzes')
      .then((res) => setQuizzes(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const togglePublish = async (quizId: number, current: boolean) => {
    setToggling(quizId);
    try {
      const res = await client.patch(`/api/teacher/quizzes/${quizId}/publish`, { is_published: !current });
      setQuizzes((prev) => prev.map((q) => (q.id === quizId ? { ...q, is_published: res.data.is_published } : q)));
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-primary-mid border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">📝 My Quizzes</h1>
          <p className="text-text-secondary text-sm mt-0.5">Manage published assessments</p>
        </div>
        <Button onClick={load} variant="secondary">
          Refresh
        </Button>
      </div>

      <div className="bg-bg-surface rounded-2xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-bg-elevated">
              <tr className="text-xs uppercase text-text-muted">
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Topic</th>
                <th className="px-6 py-4">Questions</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {quizzes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-text-muted">
                    No quizzes created yet.
                  </td>
                </tr>
              ) : (
                quizzes.map((q) => (
                  <tr key={q.id} className="hover:bg-bg-hover/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-text-primary">{q.title}</td>
                    <td className="px-6 py-4 text-text-secondary">{q.topic}</td>
                    <td className="px-6 py-4 text-text-secondary">{q.question_count}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                          q.is_published ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}
                      >
                        {q.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="text-primary-mid hover:underline text-xs font-semibold disabled:opacity-50"
                        onClick={() => togglePublish(q.id, q.is_published)}
                        disabled={toggling === q.id}
                      >
                        {toggling === q.id ? 'Updating...' : q.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
