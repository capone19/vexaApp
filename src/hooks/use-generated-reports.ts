import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTenant } from './use-effective-tenant';

export interface GeneratedReport {
  id: string;
  tenant_id: string;
  report_type: string;
  file_url: string | null;
  html_content: string | null;
  file_name: string;
  file_size: number | null;
  period_start: string;
  period_end: string;
  status: 'generated' | 'sent' | 'downloaded';
  sent_at: string | null;
  downloaded_at: string | null;
  download_count: number;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface UseGeneratedReportsReturn {
  reports: GeneratedReport[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsDownloaded: (reportId: string) => Promise<void>;
}

export function useGeneratedReports(reportType?: string): UseGeneratedReportsReturn {
  const { tenantId } = useEffectiveTenant();
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!tenantId) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('generated_reports')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (reportType) {
        query = query.eq('report_type', reportType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[useGeneratedReports] Error:', fetchError);
        setError(fetchError.message);
        setReports([]);
      } else {
        setReports((data as GeneratedReport[]) || []);
      }
    } catch (err) {
      console.error('[useGeneratedReports] Error:', err);
      setError(err instanceof Error ? err.message : 'Error cargando reportes');
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsDownloaded = async (reportId: string) => {
    if (!tenantId) return;

    try {
      // Primero obtener el reporte actual para incrementar el contador
      const { data: currentReport, error: fetchError } = await supabase
        .from('generated_reports')
        .select('download_count')
        .eq('id', reportId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError || !currentReport) {
        throw fetchError || new Error('Reporte no encontrado');
      }

      const { error: updateError } = await supabase
        .from('generated_reports')
        .update({
          status: 'downloaded',
          downloaded_at: new Date().toISOString(),
          download_count: (currentReport.download_count || 0) + 1,
        })
        .eq('id', reportId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.error('[useGeneratedReports] Error marking as downloaded:', updateError);
        throw updateError;
      }

      // Actualizar el estado local
      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status: 'downloaded' as const,
                downloaded_at: new Date().toISOString(),
                download_count: report.download_count + 1,
              }
            : report
        )
      );
    } catch (err) {
      console.error('[useGeneratedReports] Error marking as downloaded:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchReports();
  }, [tenantId, reportType]);

  return {
    reports,
    isLoading,
    error,
    refetch: fetchReports,
    markAsDownloaded,
  };
}
