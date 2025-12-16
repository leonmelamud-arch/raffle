"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { parseUserAgent, getGeoData } from '@/lib/qr-utils';
import { QrRef } from '@/types';
import { AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Status = 'loading' | 'redirecting' | 'error' | 'expired' | 'inactive';

// Reusable status card component
function StatusCard({ icon, iconBg, title, children }: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full p-4 bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-2xl text-center">
        <div className={`h-16 w-16 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-card-foreground mb-2">{title}</h2>
        {children}
      </div>
    </main>
  );
}

export default function QRRefRedirectPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [qrRef, setQrRef] = useState<QrRef | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!slug) {
      setStatus('error');
      setErrorMessage('No QR code slug provided.');
      return;
    }

    const fetchAndRedirect = async () => {
      const { data, error } = await supabase
        .from('qr_refs')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setStatus('error');
        setErrorMessage('QR code not found. It may have been deleted.');
        return;
      }

      setQrRef(data);

      if (!data.is_active) {
        setStatus('inactive');
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }

      // Track scan (fire and forget)
      trackScan(data);

      setStatus('redirecting');
      setTimeout(() => {
        window.location.href = data.target_url;
      }, 300);
    };

    fetchAndRedirect();
  }, [slug]);

  const trackScan = async (data: QrRef) => {
    const deviceInfo = parseUserAgent(navigator.userAgent);
    const geoData = await getGeoData();

    // Update count
    supabase
      .from('qr_refs')
      .update({
        scan_count: (data.scan_count || 0) + 1,
        last_scanned_at: new Date().toISOString()
      })
      .eq('id', data.id)
      .then(() => { });

    // Insert detailed scan
    supabase.from('qr_scans').insert({
      qr_ref_id: data.id,
      slug: data.slug,
      user_agent: navigator.userAgent,
      ...deviceInfo,
      referrer: document.referrer || null,
      language: navigator.language || null,
      ...geoData,
    }).then(() => { });
  };

  if (status === 'loading') {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen w-full p-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (status === 'redirecting') {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen w-full p-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="mt-4 text-2xl font-bold">Redirecting...</h2>
        <p className="text-muted-foreground mt-2">Taking you to {qrRef?.name || 'your destination'}</p>
        {qrRef && (
          <a href={qrRef.target_url} className="mt-4 text-primary hover:underline inline-flex items-center gap-1">
            Click here if not redirected <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </main>
    );
  }

  if (status === 'expired') {
    return (
      <StatusCard
        icon={<AlertCircle className="h-8 w-8 text-amber-600" />}
        iconBg="bg-amber-100"
        title="QR Code Expired"
      >
        <p className="text-muted-foreground">This QR code has expired and is no longer active.</p>
        {qrRef?.expires_at && (
          <p className="text-sm text-muted-foreground mt-2">
            Expired on: {new Date(qrRef.expires_at).toLocaleDateString()}
          </p>
        )}
      </StatusCard>
    );
  }

  if (status === 'inactive') {
    return (
      <StatusCard
        icon={<AlertCircle className="h-8 w-8 text-gray-600" />}
        iconBg="bg-gray-100"
        title="QR Code Inactive"
      >
        <p className="text-muted-foreground">This QR code has been deactivated by the owner.</p>
      </StatusCard>
    );
  }

  return (
    <StatusCard
      icon={<AlertCircle className="h-8 w-8 text-red-600" />}
      iconBg="bg-red-100"
      title="QR Code Not Found"
    >
      <p className="text-muted-foreground mb-6">{errorMessage}</p>
      <Button onClick={() => router.push('/qr-ref')} variant="outline">
        Go to QR Manager
      </Button>
    </StatusCard>
  );
}

export async function generateStaticParams() {
  return [];
}
