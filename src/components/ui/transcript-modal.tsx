'use client'

import type { TranscriptEntry } from '@/types'

interface TranscriptModalProps {
  callerNumber: string
  transcript: TranscriptEntry[]
  onClose: () => void
}

export function TranscriptModal({ callerNumber, transcript, onClose }: TranscriptModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <p className="font-semibold text-gray-900">{callerNumber}</p>
            <p className="text-xs text-gray-500">{transcript.length} messages</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex flex-col gap-3 flex-1">
          {transcript.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No messages yet.</p>
          )}
          {transcript.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  msg.direction === 'outbound'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}
              >
                <p>{msg.body}</p>
                <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
