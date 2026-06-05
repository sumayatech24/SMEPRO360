import React, { useEffect, useState, useCallback } from 'react';
import api, { downloadExcel } from '../api/client';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';

interface GenericPageConfig {
  title: string;
  subtitle: string;
  apiBase: string;
  exportUrl?: string;
  exportFilename?: string;
  columns: any[];
  FormComponent?: React.ComponentType<{ form: any; setForm: any; editItem: any }>;
  defaultForm?: any;
  addLabel?: string;
}

export const createGenericPage = (config: GenericPageConfig) => {
  return function GenericPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetch = useCallback(async () => {
      setLoading(true);
      try {
        const res = await api.get(config.apiBase, { params: { search, limit: 100 } });
        setItems(Array.isArray(res.data) ? res.data : res.data.items || []);
      } catch {} finally { setLoading(false); }
    }, [search]);

    useEffect(() => { fetch(); }, [fetch]);

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{config.title}</h1>
          <p className="text-slate-500 text-sm">{config.subtitle}</p>
        </div>
        <DataTable
          title={config.title}
          columns={config.columns}
          data={items}
          loading={loading}
          onSearch={setSearch}
          onExport={config.exportUrl ? () => downloadExcel(config.exportUrl!, config.exportFilename || 'export.xlsx') : undefined}
        />
      </div>
    );
  };
};

export default createGenericPage;
