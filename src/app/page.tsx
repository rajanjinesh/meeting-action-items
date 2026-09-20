'use client';

import React, { useState } from 'react';
import { ActionItem } from '@/lib/analyzeTranscript';

type FlowState = 'idle' | 'analyzing' | 'reviewing' | 'approved' | 'no_action_items' | 'error';

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<FlowState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.toLowerCase().endsWith('.txt')) {
        alert('Only TXT files are supported.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert('Please select a TXT transcript file.');
      return;
    }

    setStatus('analyzing');
    setStatusMessage('Analyzing...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus('error');
        setStatusMessage(data.error || "We couldn't analyze the transcript. Please try again.");
        return;
      }

      if (data.status === 'NO_ACTION_ITEMS' || !data.actionItems || data.actionItems.length === 0) {
        setStatus('no_action_items');
        setStatusMessage('No action items found.');
      } else if (data.status === 'ACTION_ITEMS_EXTRACTED' && Array.isArray(data.actionItems)) {
        setActionItems(data.actionItems);
        setStatus('reviewing');
      } else {
        setStatus('error');
        setStatusMessage("We couldn't analyze the transcript. Please try again.");
      }
    } catch (err) {
      setStatus('error');
      setStatusMessage("We couldn't analyze the transcript. Please try again.");
    }
  };

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
        body: JSON.stringify({ actionItems })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to save approved action items.');
      } else {
        setSavedCount(data.savedCount || actionItems.length);
        setStatus('approved');
      }
    } catch (err) {
      alert('An error occurred while approving action items.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setActionItems([]);
    setStatus('idle');
    setStatusMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Meeting Action Items
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Upload a meeting transcript (.txt) to extract and review action items
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">

          {/* 1. Upload Form State */}
          {(status === 'idle' || status === 'analyzing' || status === 'error' || status === 'no_action_items') && (
            <form onSubmit={handleAnalyze} className="space-y-6">
              <div>
                <label htmlFor="transcript" className="block text-sm font-medium text-gray-700">
                  Meeting Transcript (.txt)
                </label>
                <div className="mt-1">
                  <input
                    id="transcript"
                    name="transcript"
                    type="file"
                    accept=".txt,text/plain"
                    required
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {file && (
                  <p className="mt-2 text-xs text-gray-500">
                    Selected file: <span className="font-semibold text-gray-700">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={status === 'analyzing'}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {status === 'analyzing' ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>

              {/* Status Display */}
              {status !== 'idle' && (
                <div className="pt-4 border-t border-gray-200 text-center">
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p
                    className={`mt-2 text-lg font-bold ${
                      status === 'no_action_items'
                        ? 'text-amber-600'
                        : status === 'error'
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {statusMessage}
                  </p>
                </div>
              )}
            </form>
          )}

          {/* 2. Review & Edit State */}
          {status === 'reviewing' && (
            <div>
              <div className="border-b border-gray-200 pb-5 mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Review & Edit Action Items</h2>
                  <p className="text-xs text-gray-500">Verify or edit extracted items before saving</p>
                </div>
                <button
                  type="button"
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
                          type="button"
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

              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isApproving || actionItems.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-md shadow-sm text-sm disabled:opacity-50"
                >
                  {isApproving ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          )}

          {/* 3. Approved & Saved State */}
          {status === 'approved' && (
            <div className="text-center py-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 text-2xl font-bold">
                ✓
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Approved and saved</h2>
              <p className="mt-2 text-sm text-gray-600">
                Successfully stored {savedCount} action item(s) in Supabase.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Process Another Transcript
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
