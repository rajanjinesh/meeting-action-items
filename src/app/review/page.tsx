'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ActionItem } from '@/lib/analyzeTranscript';

function ReviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing approval token.');
      setLoading(false);
      return;
    }

    async function fetchPending() {
      try {
        const res = await fetch(`/api/approval?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Invalid or expired approval token.');
        } else {
          setEmail(data.pendingApproval.email || '');
          setActionItems(data.pendingApproval.actionItems || []);
        }
      } catch (err) {
        setError('Failed to load pending action items for review.');
      } finally {
        setLoading(false);
      }
    }

    fetchPending();
  }, [token]);

  const handleItemChange = (index: number, field: keyof ActionItem, value: string) => {
    const updated = [...actionItems];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setActionItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = actionItems.filter((_, idx) => idx !== index);
    setActionItems(updated);
  };

  const handleAddItem = () => {
    setActionItems([
      ...actionItems,
      { action: '', owner: 'unspecified', dueDate: 'unspecified' }
    ]);
  };

  const handleApprove = async () => {
    if (!token) return;

    // Validate that actions are filled out
    const invalidItems = actionItems.filter(item => !item.action.trim());
    if (invalidItems.length > 0) {
      alert('Action is required for all action items. Please fill in or remove incomplete items.');
      return;
    }

    setIsApproving(true);

    try {
      const res = await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          actionItems
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to save approved action items.');
      } else {
        setApproved(true);
        setApprovedCount(data.savedCount || actionItems.length);
      }
    } catch (err) {
      alert('An error occurred while approving action items.');
    } finally {
      setIsApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading action items for review...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded-lg shadow-sm text-center">
          <h2 className="text-xl font-bold text-red-600">Link Invalid or Expired</h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <a
            href="/"
            className="mt-6 inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Back to Upload
          </a>
        </div>
      </div>
    );
  }

  if (approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 border border-green-200 rounded-lg shadow-sm text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 text-2xl font-bold">
            ✓
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Action items approved and saved.</h2>
          <p className="mt-2 text-sm text-gray-600">
            Successfully stored {approvedCount} action item(s) in Supabase.
          </p>
          <div className="mt-6">
            <a
              href="/"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Process Another Transcript
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 pb-5 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review & Approve Action Items</h1>
              {email && <p className="mt-1 text-sm text-gray-500">Submitted for: {email}</p>}
            </div>
            <button
              onClick={handleAddItem}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded font-medium border border-gray-300"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-6">
            {actionItems.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-md bg-gray-50 relative">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Action Item #{index + 1}
                  </span>
                  {actionItems.length > 1 && (
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Action (Required)
                    </label>
                    <input
                      type="text"
                      required
                      value={item.action}
                      onChange={(e) => handleItemChange(index, 'action', e.target.value)}
                      placeholder="Required action description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Owner
                      </label>
                      <input
                        type="text"
                        value={item.owner}
                        onChange={(e) => handleItemChange(index, 'owner', e.target.value)}
                        placeholder='Owner (or "unspecified")'
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="text"
                        value={item.dueDate}
                        onChange={(e) => handleItemChange(index, 'dueDate', e.target.value)}
                        placeholder='Due Date (or "unspecified")'
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleApprove}
              disabled={isApproving || actionItems.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-md shadow-sm text-sm disabled:opacity-50"
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
