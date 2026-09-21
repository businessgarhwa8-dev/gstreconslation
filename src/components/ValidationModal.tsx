import React from 'react';
import { useGst } from '../context/GstContext';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToRecord?: (recordId: string) => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { validationIssues } = useGst();

  if (!isOpen) return null;

  const errors = validationIssues.filter((i) => i.type === 'ERROR');
  const warnings = validationIssues.filter((i) => i.type === 'WARNING');
  const infos = validationIssues.filter((i) => i.type === 'INFO');

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-slate-900 text-sm">
              GST Data Validation &amp; Integrity Audit Report
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Highlights */}
        <div className="grid grid-cols-3 border-b border-slate-200 text-center py-2.5 px-4 bg-white text-xs divide-x divide-slate-100">
          <div>
            <span className="text-rose-600 font-bold font-mono text-base">{errors.length}</span>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Errors</div>
          </div>
          <div>
            <span className="text-amber-600 font-bold font-mono text-base">{warnings.length}</span>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Warnings</div>
          </div>
          <div>
            <span className="text-blue-600 font-bold font-mono text-base">{infos.length}</span>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Notices</div>
          </div>
        </div>

        {/* Issue List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs font-sans">
          {validationIssues.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <div className="font-bold text-slate-800">All Master Data Verified Clean!</div>
              <div className="text-xs text-slate-500 mt-1">
                No duplicate invoices, syntax bugs, or mathematical rounding inconsistencies found.
              </div>
            </div>
          ) : (
            validationIssues.map((issue) => {
              const isErr = issue.type === 'ERROR';
              const isWarn = issue.type === 'WARNING';

              return (
                <div
                  key={issue.id}
                  className={`p-3 rounded-lg border flex items-start gap-3 ${
                    isErr
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : isWarn
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {isErr ? (
                    <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : isWarn ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {issue.category}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600">
                        {issue.module}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{issue.message}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
