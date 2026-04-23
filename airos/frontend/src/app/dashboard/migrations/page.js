'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';

const IMPORT_TYPES = [
  {
    id: 'conversations',
    title: 'Conversations',
    description: 'Import historical threads as customer + conversation + first inbound message records.',
    fields: ['customer_name', 'customer_email / customer_phone', 'channel', 'message / content', 'status', 'created_at'],
  },
  {
    id: 'pipeline-leads',
    title: 'Pipeline Leads',
    description: 'Import lead pipeline rows directly into the deals table with value, score, and stage.',
    fields: ['customer_name', 'customer_email / customer_phone', 'stage', 'estimated_value / value', 'lead_score', 'currency'],
  },
  {
    id: 'tickets',
    title: 'Tickets',
    description: 'Import historical support tickets with title, priority, status, and linked customer.',
    fields: ['customer_name', 'customer_email / customer_phone', 'title / subject', 'description / body', 'priority', 'status'],
  },
];

function fileToBinary(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function fileToText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function parseCsv(text = '') {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];

  const parseLine = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    cells.push(current.trim());
    return cells;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

async function parseWorkbook(file) {
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await fileToText(file);
    return parseCsv(text);
  }

  const XLSX = await import('xlsx');
  const binary = await fileToBinary(file);
  const workbook = XLSX.read(binary, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

export default function MigrationsPage() {
  const [files, setFiles] = useState({});
  const [busyType, setBusyType] = useState('');
  const [results, setResults] = useState({});

  const summaries = useMemo(() => (
    Object.values(results).filter(Boolean)
  ), [results]);

  async function handleImport(type) {
    const file = files[type];
    if (!file) {
      toast.error('Select a CSV or Excel file first');
      return;
    }

    setBusyType(type);
    try {
      const rows = await parseWorkbook(file);
      if (!rows.length) throw new Error('The file is empty or could not be parsed');

      const result = await api.post(`/api/migrations/import/${type}`, { rows });
      setResults((current) => ({ ...current, [type]: result }));
      toast.success(`${IMPORT_TYPES.find((entry) => entry.id === type)?.title || type} imported`);
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setBusyType('');
    }
  }

  return (
    <div style={{ padding:'28px', display:'grid', gap:22, maxWidth:1180 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:900, marginBottom:6 }}>Data Migration</h1>
        <p style={{ fontSize:13, color:'var(--t3)' }}>
          Upload CSV or Excel files for conversations, pipeline leads, and tickets. External helpdesk imports were removed from this flow.
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:16 }}>
        {IMPORT_TYPES.map((type) => {
          const result = results[type.id];
          return (
            <section key={type.id} style={{ padding:'22px', borderRadius:18, background:'var(--bg2)', border:'1px solid var(--b1)', display:'grid', gap:14 }}>
              <div>
                <p style={{ fontSize:12, color:'#67e8f9', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{type.id}</p>
                <h2 style={{ fontSize:18, fontWeight:900, marginBottom:6 }}>{type.title}</h2>
                <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6 }}>{type.description}</p>
              </div>

              <div style={{ padding:'12px 14px', borderRadius:14, background:'var(--s1)', border:'1px solid var(--b1)' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--t2)', marginBottom:8 }}>Expected columns</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {type.fields.map((field) => (
                    <span key={field} style={{ fontSize:11.5, padding:'4px 10px', borderRadius:99, background:'rgba(99,102,241,0.1)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.2)' }}>
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              <input
                className="input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(event) => setFiles((current) => ({ ...current, [type.id]: event.target.files?.[0] || null }))}
              />

              <button className="btn btn-primary" onClick={() => handleImport(type.id)} disabled={busyType === type.id}>
                {busyType === type.id ? 'Importing…' : `Import ${type.title}`}
              </button>

              {result && (
                <div style={{ fontSize:12.5, color:'var(--t3)', borderTop:'1px solid var(--b1)', paddingTop:12 }}>
                  Imported <strong>{result.imported || 0}</strong> of <strong>{result.total || 0}</strong> rows
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section style={{ borderRadius:18, background:'var(--bg2)', border:'1px solid var(--b1)', padding:'18px 20px' }}>
        <h2 style={{ fontSize:16, fontWeight:900, marginBottom:10 }}>Recent import results</h2>
        {summaries.length === 0 ? (
          <p style={{ color:'var(--t4)', fontSize:13 }}>No imports have been run from this page yet.</p>
        ) : (
          <div style={{ display:'grid', gap:10 }}>
            {summaries.map((summary) => (
              <div key={summary.type} style={{ padding:'12px 14px', borderRadius:12, background:'var(--s1)', border:'1px solid var(--b1)', display:'flex', justifyContent:'space-between', gap:12 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)', textTransform:'capitalize' }}>{summary.type.replace('-', ' ')}</span>
                <span style={{ fontSize:12, color:'var(--t3)' }}>{summary.imported || 0} imported · {summary.errors || 0} errors</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
