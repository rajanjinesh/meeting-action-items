'use me';
'use client';

import React, { useState } from 'react';

type AnalysisState = 'idle' | 'analyzing' | 'sent_for_approval' | 'no_action_items' | 'error';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AnalysisState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [approvalToken, setApprovalToken] = useState<string | null>(null);

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

    if (!email) {
      alert('Please enter your email address.');
      return;
    }

    if (!file) {
      alert('Please select a TXT transcript file.');
      return;
    }

    setStatus('analyzing');
    setStatusMessage('Analyzing...');
    setApprovalToken(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.status === 'AI_FAILURE' || data.error?.includes("couldn't analyze")) {
          setStatus('error');
          setStatusMessage("We couldn't analyze the transcript. Please try again.");
        } else {
          setStatus('error');
          setStatusMessage(data.error || "We couldn't analyze the transcript. Please try again.");
        }
        return;
      }

      if (data.status === 'NO_ACTION_ITEMS') {
        setStatus('no_action_items');
        setStatusMessage('No action items found.');
      } else if (data.status === 'SENT_FOR_APPROVAL') {
        setStatus('sent_for_approval');
        setStatusMessage('Sent for approval');
        if (data.token) {
          setApprovalToken(data.token);
        }
      } else {
        setStatus('error');
        setStatusMessage("We couldn't analyze the transcript. Please try again.");
      }
    } catch (err) {
      setStatus('error');
      setStatusMessage("We couldn't analyze the transcript. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Meeting Action Items
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Upload a meeting transcript to extract action items & send for approval
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form onSubmit={handleAnalyze} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                />
              </div>
            </div>

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
          </form>

          {/* Status Display */}
          {status !== 'idle' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p
                  className={`mt-2 text-lg font-bold ${
                    status === 'sent_for_approval'
                      ? 'text-green-600'
                      : status === 'no_action_items'
                      ? 'text-amber-600'
                      : status === 'error'
                      ? 'text-red-600'
                      : 'text-blue-600'
                  }`}
                >
                  {statusMessage}
                </p>

                {/* Local Dev Direct Review Link */}
                {approvalToken && status === 'sent_for_approval' && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md text-left">
                    <p className="text-xs text-blue-800 font-medium">Review Page Link:</p>
                    <a
                      href={`/review?token=${approvalToken}`}
                      className="text-xs text-blue-600 underline font-semibold break-all hover:text-blue-800"
                    >
                      /review?token={approvalToken}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
