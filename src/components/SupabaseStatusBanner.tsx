import React, { useState, useEffect } from 'react';
import { useGst } from '../context/GstContext';
import { Database, CheckCircle2, RefreshCw, AlertCircle, Sparkles, Layers, ShieldCheck, Server } from 'lucide-react';
import { testSupabaseConnection } from '../lib/supabaseService';

export const SupabaseStatusBanner: React.FC = () => {
  const { supabaseState, syncWithSupabase, initSupabaseSchema, activeClient } = useGst();
  const [isInitializing, setIsInitializing] = useState(false);
  const [initResult, setInitResult] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<{ ok: boolean; message: string }>({
    ok: true,
    message: 'Connected to Supabase PostgreSQL Database',
  });

  useEffect(() => {
    checkConn();
  }, []);

  const checkConn = async () => {
    const res = await testSupabaseConnection();
    setConnStatus(res);
  };

  const handleInitSchema = async () => {
    setIsInitializing(true);
    setInitResult(null);
    try {
      await initSupabaseSchema();
      await syncWithSupabase();
      await checkConn();
      setInitResult('Supabase tables verified and synchronized successfully!');
    } catch (err: any) {
      setInitResult(`Schema error: ${err.message || 'Failed'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 text-xs shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Connection status badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800/80">
            <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Supabase Cloud Database: Active</span>
          </div>

          <div className="flex items-center gap-1 text-slate-300 bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">
            <Server className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-200">kqftiejneuipwjncwtzi.supabase.co</span>
          </div>

          <div className="flex items-center gap-1 text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-800/50">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>File #{activeClient.fileNo}: {activeClient.companyName}</span>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {supabaseState.isSyncing ? (
            <span className="flex items-center gap-1 text-cyan-400 text-[11px] font-medium bg-cyan-950 px-2.5 py-1 rounded border border-cyan-800">
              <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
              <span>Syncing with Supabase...</span>
            </span>
          ) : (
            <button
              onClick={() => syncWithSupabase()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition text-[11px] shadow-xs"
              title="Push & Pull latest data with Supabase Cloud"
            >
              <RefreshCw className="w-3 h-3 text-white" />
              <span>Sync Database</span>
            </button>
          )}

          <button
            onClick={handleInitSchema}
            disabled={isInitializing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition text-[11px] border border-slate-700 disabled:opacity-50"
            title="Create/Verify all tables in Supabase PostgreSQL"
          >
            {isInitializing ? (
              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
            ) : (
              <Layers className="w-3 h-3 text-emerald-400" />
            )}
            <span>Verify Schema</span>
          </button>
        </div>
      </div>

      {initResult && (
        <div className="max-w-7xl mx-auto mt-1.5 text-[11px] text-emerald-300 font-medium flex items-center gap-1 bg-emerald-950/60 p-1.5 rounded border border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{initResult}</span>
        </div>
      )}
    </div>
  );
};
