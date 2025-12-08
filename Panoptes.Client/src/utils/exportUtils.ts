import { DeliveryLog } from '../types';

// Helper to trigger the browser download
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generates a clean filename: "my-sub-logs-2023-10-25.csv"
export const generateFilename = (name: string, ext: string) => {
  const date = new Date().toISOString().split('T')[0];
  const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return `${safeName}-logs-${date}.${ext}`;
};

// Safely extracts payload regardless of casing (matches your Detail View logic)
const getSafePayload = (log: any) => {
    return (
        log.payloadJson || 
        log.PayloadJson || 
        log.payload || 
        log.Payload || 
        log.requestPayload || 
        log.RequestPayload || 
        log.data || 
        log.body || 
        ''
    );
};

const getSafeResponse = (log: any) => {
    return (
        log.responseBody || 
        log.ResponseBody || 
        log.response || 
        log.Response || 
        ''
    );
};

export const convertToCSV = (logs: DeliveryLog[]): string => {
  if (!logs.length) return '';

  const headers = ['Time', 'Status', 'Latency (ms)', 'Payload', 'Response'];
  
  const rows = logs.map(log => {
    const time = (log as any).timestamp || (log as any).createdAt || new Date().toISOString();
    const payload = getSafePayload(log);
    const response = getSafeResponse(log);

    // Escape fields for CSV (handle quotes and commas)
    const escape = (field: any) => {
        if (field === null || field === undefined) return '""';
        const stringified = typeof field === 'object' ? JSON.stringify(field) : String(field);
        return `"${stringified.replace(/"/g, '""')}"`; // Double quote escape
    };

    return [
      escape(time),
      escape(log.responseStatusCode),
      escape(log.latencyMs),
      escape(payload),
      escape(response)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};