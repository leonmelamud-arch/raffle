"use client";

import { useEffect, useState, useRef } from 'react';
import QRCode from "react-qr-code";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  ExternalLink,
  Save,
  QrCode,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  Eye,
  Calendar,
  BarChart3,
  Link2,
  ImagePlus,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/postgrest';
import { isExpired, generateSlug, downloadQRCode, QRDownloadOptions } from '@/lib/qr-utils';
import { QrRef } from '@/types';

// QR Style types
type QRStyle = {
  name: string;
  type: 'solid' | 'gradient';
  fg: string;
  accent: string;
  gradient?: string[]; // For gradient styles
  preview?: string; // CSS gradient for preview
};

// Color themes for QR codes - solid colors and gradients
const QR_STYLES: QRStyle[] = [
  // Solid Colors
  { name: 'Classic', type: 'solid', fg: '#1a1a2e', accent: '#6366f1' },
  { name: 'Indigo', type: 'solid', fg: '#4f46e5', accent: '#6366f1' },
  { name: 'Emerald', type: 'solid', fg: '#059669', accent: '#10b981' },
  { name: 'Rose', type: 'solid', fg: '#e11d48', accent: '#f43f5e' },
  { name: 'Amber', type: 'solid', fg: '#d97706', accent: '#f59e0b' },
  { name: 'Cyan', type: 'solid', fg: '#0891b2', accent: '#06b6d4' },
  { name: 'Purple', type: 'solid', fg: '#7c3aed', accent: '#8b5cf6' },
  { name: 'Slate', type: 'solid', fg: '#475569', accent: '#64748b' },
  { name: 'Pink', type: 'solid', fg: '#db2777', accent: '#ec4899' },
  { name: 'Lime', type: 'solid', fg: '#65a30d', accent: '#84cc16' },
  // Gradients
  {
    name: 'Rainbow',
    type: 'gradient',
    fg: '#ef4444',
    accent: '#8b5cf6',
    gradient: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'],
    preview: 'linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6)'
  },
  {
    name: 'Sunset',
    type: 'gradient',
    fg: '#f97316',
    accent: '#ec4899',
    gradient: ['#f97316', '#ef4444', '#ec4899'],
    preview: 'linear-gradient(135deg, #f97316, #ef4444, #ec4899)'
  },
  {
    name: 'Ocean',
    type: 'gradient',
    fg: '#06b6d4',
    accent: '#3b82f6',
    gradient: ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'],
    preview: 'linear-gradient(135deg, #06b6d4, #0ea5e9, #3b82f6, #6366f1)'
  },
  {
    name: 'Forest',
    type: 'gradient',
    fg: '#22c55e',
    accent: '#14b8a6',
    gradient: ['#22c55e', '#10b981', '#14b8a6', '#06b6d4'],
    preview: 'linear-gradient(135deg, #22c55e, #10b981, #14b8a6)'
  },
  {
    name: 'Fire',
    type: 'gradient',
    fg: '#ef4444',
    accent: '#f59e0b',
    gradient: ['#ef4444', '#f97316', '#f59e0b'],
    preview: 'linear-gradient(135deg, #ef4444, #f97316, #f59e0b)'
  },
  {
    name: 'Aurora',
    type: 'gradient',
    fg: '#8b5cf6',
    accent: '#06b6d4',
    gradient: ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6'],
    preview: 'linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6, #06b6d4, #14b8a6)'
  },
  {
    name: 'Berry',
    type: 'gradient',
    fg: '#ec4899',
    accent: '#a855f7',
    gradient: ['#ec4899', '#d946ef', '#a855f7'],
    preview: 'linear-gradient(135deg, #ec4899, #d946ef, #a855f7)'
  },
  {
    name: 'Gold',
    type: 'gradient',
    fg: '#ca8a04',
    accent: '#d97706',
    gradient: ['#fbbf24', '#f59e0b', '#d97706', '#b45309'],
    preview: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)'
  },
];

const CATEGORIES = [
  { value: 'social', label: 'Social Media' },
  { value: 'work', label: 'Work / Professional' },
  { value: 'personal', label: 'Personal' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  name: '',
  slug: '',
  target_url: '',
  description: '',
  category: 'personal',
  is_active: true,
  expires_at: '',
};

// Convert QrRef to form data
const qrToForm = (qr: QrRef) => ({
  name: qr.name,
  slug: qr.slug,
  target_url: qr.target_url,
  description: qr.description || '',
  category: qr.category || 'personal',
  is_active: qr.is_active,
  expires_at: qr.expires_at?.split('T')[0] || '',
});

export default function QRRefPage() {
  const [qrRefs, setQrRefs] = useState<QrRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQr, setSelectedQr] = useState<QrRef | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [qrStyle, setQrStyle] = useState<QRStyle>(QR_STYLES[0]);
  const [logoUrl, setLogoUrl] = useState<string | null>('/linkedin-qr-leon.svg');
  const [logoShape, setLogoShape] = useState<'square' | 'circle'>('circle');
  const [logoScale, setLogoScale] = useState<number>(1.0); // Border/container size: 0.5 to 1.5
  const [logoCrop, setLogoCrop] = useState<number>(1.0); // Image crop/zoom: 0.5 to 1.5
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadQrRefs();
  }, []);

  const loadQrRefs = async () => {
    setIsLoading(true);
    const { data, error } = await db
      .from<QrRef>('qr_refs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load QR codes.", variant: "destructive" });
    } else {
      setQrRefs((data as QrRef[]) || []);
      if ((data as QrRef[])?.length && !selectedQr) setSelectedQr((data as QrRef[])[0]);
    }
    setIsLoading(false);
  };

  const updateForm = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setIsCreating(true);
    setSelectedQr(null);
  };

  const validateForm = () => {
    if (!formData.name || !formData.slug || !formData.target_url) {
      toast({ title: "Validation Error", description: "Name, slug, and target URL are required.", variant: "destructive" });
      return false;
    }
    try {
      new URL(formData.target_url);
    } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid URL.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    const { data, error } = await db
      .from<QrRef>('qr_refs')
      .insert({
        name: formData.name,
        slug: formData.slug,
        target_url: formData.target_url,
        description: formData.description || null,
        category: formData.category,
        is_active: formData.is_active,
        expires_at: formData.expires_at || null,
      })
      .returning('*')
      .single();

    setIsSaving(false);

    if (error) {
      const msg = error.message?.includes('duplicate') ? "Slug already exists." : "Failed to create QR code.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } else {
      toast({ title: "Created!", description: "Your QR code has been saved." });
      await loadQrRefs();
      setSelectedQr(data as QrRef);
      setIsCreating(false);
      setFormData(qrToForm(data as QrRef));
    }
  };

  const handleUpdate = async () => {
    if (!selectedQr || !validateForm()) return;

    setIsSaving(true);
    const { data, error } = await db
      .from<QrRef>('qr_refs')
      .update({
        name: formData.name,
        slug: formData.slug,
        target_url: formData.target_url,
        description: formData.description || null,
        category: formData.category,
        is_active: formData.is_active,
        expires_at: formData.expires_at || null,
      })
      .eq('id', selectedQr.id)
      .returning('*')
      .single();

    setIsSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to update QR code.", variant: "destructive" });
    } else {
      toast({ title: "Updated!", description: "Your QR code has been updated." });
      setQrRefs(prev => prev.map(q => q.id === (data as QrRef).id ? (data as QrRef) : q));
      setSelectedQr(data as QrRef);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return;

    const { error } = await db.from('qr_refs').delete().eq('id', id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete QR code.", variant: "destructive" });
    } else {
      toast({ title: "Deleted!", description: "QR code has been removed." });
      await loadQrRefs();
      if (selectedQr?.id === id) {
        setSelectedQr(null);
        setFormData(EMPTY_FORM);
      }
    }
  };

  const handleSelectQr = (qr: QrRef) => {
    setSelectedQr(qr);
    setIsCreating(false);
    setFormData(qrToForm(qr));
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const getQrPageUrl = () =>
    typeof window !== 'undefined' ? `${window.location.origin}/qr-ref/${selectedQr?.slug}` : '';

  // Logo handling
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        toast({ title: "File too large", description: "Please use an image under 500KB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (format: 'png' | 'svg') => {
    if (!selectedQr) return;
    const options: QRDownloadOptions = {
      slug: selectedQr.slug,
      title: selectedQr.name,
      description: selectedQr.description || undefined,
      fgColor: qrStyle.fg,
      accentColor: qrStyle.accent,
      gradient: qrStyle.gradient,
      logoUrl: logoUrl || undefined,
      logoShape,
      logoScale,
      logoCrop,
    };
    downloadQRCode(format, options);
    toast({ title: "Downloaded!", description: `QR code saved as ${format.toUpperCase()}.` });
  };

  return (
    <main className="flex flex-col min-h-screen w-full p-4 md:p-8 bg-background">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <QrCode className="h-8 w-8 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-primary font-headline">
              QR Reference Manager
            </h1>
          </div>
          <p className="text-muted-foreground">
            Create and manage personal QR codes that redirect to your sites
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* QR List Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">
                My QR Codes {qrRefs.length > 0 && <Badge variant="secondary" className="ml-2">{qrRefs.length}</Badge>}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={loadQrRefs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : qrRefs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No QR codes yet</p>
                  <p className="text-sm">Fill the form to create one</p>
                </div>
              ) : (
                qrRefs.map((qr) => (
                  <div
                    key={qr.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedQr?.id === qr.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      }`}
                    onClick={() => handleSelectQr(qr)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{qr.name}</div>
                        <div className="text-xs text-muted-foreground truncate">/{qr.slug}</div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {!qr.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        {isExpired(qr.expires_at) && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                        {qr.scan_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />{qr.scan_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Form Panel */}
          <Card>
            <CardHeader>
              <CardTitle>{isCreating ? 'Create New QR Code' : 'Edit QR Code'}</CardTitle>
              <CardDescription>
                {isCreating ? 'Fill in the details' : selectedQr ? `Editing: ${selectedQr.name}` : 'Select or create a QR code'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input placeholder="My LinkedIn" value={formData.name} onChange={(e) => handleNameChange(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Slug *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">/qr-ref/</span>
                  <Input
                    placeholder="linkedin"
                    value={formData.slug}
                    onChange={(e) => updateForm('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target URL *</Label>
                <Input type="url" placeholder="https://linkedin.com/in/you" value={formData.target_url} onChange={(e) => updateForm('target_url', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Optional description" value={formData.description} onChange={(e) => updateForm('description', e.target.value)} rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => updateForm('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expires At (default: Never)</Label>
                <Input type="date" value={formData.expires_at} onChange={(e) => updateForm('expires_at', e.target.value)} min={new Date().toISOString().split('T')[0]} placeholder="Never" />
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={formData.is_active} onCheckedChange={(v) => updateForm('is_active', v)} />
              </div>

              <div className="flex gap-2 pt-4">
                {selectedQr && !isCreating ? (
                  <>
                    <Button onClick={handleUpdate} disabled={isSaving} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />{isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(selectedQr.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleCreate} disabled={isSaving} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />{isSaving ? 'Creating...' : 'Create'}
                  </Button>
                )}
              </div>

              <Button variant="outline" onClick={resetForm} className="w-full">
                <Plus className="h-4 w-4 mr-2" />Clear / New
              </Button>
            </CardContent>
          </Card>

          {/* QR Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle>QR Code Preview</CardTitle>
              <CardDescription>
                {selectedQr ? (
                  <a href={selectedQr.target_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    {selectedQr.target_url.slice(0, 40)}{selectedQr.target_url.length > 40 && '...'}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : 'Select or create a QR code'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              {/* Title above QR */}
              {selectedQr && (
                <h3 className="text-xl font-semibold text-center">{selectedQr.name}</h3>
              )}

              <div className="bg-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                {selectedQr ? (
                  <div className="relative">
                    {/* Gradient overlay for gradient styles */}
                    {qrStyle.type === 'gradient' && qrStyle.gradient && (
                      <svg width="0" height="0" style={{ position: 'absolute' }}>
                        <defs>
                          <linearGradient id="qr-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            {qrStyle.gradient.map((color, i) => (
                              <stop
                                key={i}
                                offset={`${(i / (qrStyle.gradient!.length - 1)) * 100}%`}
                                stopColor={color}
                              />
                            ))}
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                    <QRCode
                      id="qr-code-svg"
                      value={selectedQr.target_url}
                      size={200}
                      level="H"
                      fgColor={qrStyle.type === 'gradient' ? 'url(#qr-gradient)' : qrStyle.fg}
                    />
                    {/* Logo overlay in center */}
                    {logoUrl && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ pointerEvents: 'none' }}
                      >
                        <div
                          className={`bg-white p-1 shadow-md overflow-hidden ${logoShape === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
                          style={{ width: `${60 * logoScale}px`, height: `${60 * logoScale}px` }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoUrl}
                            alt="Logo"
                            className={`w-full h-full object-cover ${logoShape === 'circle' ? 'rounded-full' : 'rounded'}`}
                            style={{
                              transform: `scale(${logoCrop})`,
                              transformOrigin: 'center'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] bg-gray-100 rounded-md flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Description below QR */}
              {selectedQr?.description && (
                <p className="text-sm text-center max-w-[250px]" style={{ color: qrStyle.accent }}>{selectedQr.description}</p>
              )}

              {selectedQr && (
                <>
                  {/* Logo Upload */}
                  <div className="w-full space-y-2">
                    <Label className="text-xs text-muted-foreground block">Center Logo (Marketing QR)</Label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImagePlus className="h-4 w-4 mr-2" />
                        {logoUrl ? 'Change Logo' : 'Add Logo'}
                      </Button>
                      {logoUrl && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLogoShape(logoShape === 'circle' ? 'square' : 'circle')}
                            title={`Shape: ${logoShape}`}
                          >
                            {logoShape === 'circle' ? '○' : '□'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={removeLogo}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    {/* Logo Size & Crop Sliders */}
                    {logoUrl && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-10">Size:</span>
                          <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            value={logoScale}
                            onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-xs text-muted-foreground w-8">{Math.round(logoScale * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-10">Crop:</span>
                          <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            value={logoCrop}
                            onChange={(e) => setLogoCrop(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-xs text-muted-foreground w-8">{Math.round(logoCrop * 100)}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Style Picker */}
                  <div className="w-full space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Solid Colors</Label>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {QR_STYLES.filter(s => s.type === 'solid').map((style) => (
                          <button
                            key={style.name}
                            onClick={() => setQrStyle(style)}
                            className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${qrStyle.name === style.name ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/20' : 'border-transparent'
                              }`}
                            style={{ backgroundColor: style.fg }}
                            title={style.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Gradients ✨</Label>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {QR_STYLES.filter(s => s.type === 'gradient').map((style) => (
                          <button
                            key={style.name}
                            onClick={() => setQrStyle(style)}
                            className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${qrStyle.name === style.name ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/20' : 'border-transparent'
                              }`}
                            style={{ background: style.preview }}
                            title={style.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedQr.scan_count} scans</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(selectedQr.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="w-full p-3 bg-muted rounded-lg">
                    <Label className="text-xs text-muted-foreground">Target URL</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs flex-1 truncate">{selectedQr.target_url}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedQr.target_url, 'URL')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 w-full">
                    <Button variant="outline" onClick={() => copyToClipboard(selectedQr.target_url, 'Target URL')}>
                      <Link2 className="h-4 w-4 mr-2" />Copy URL
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button variant="secondary" onClick={() => handleDownload('png')}>
                      <Download className="h-4 w-4 mr-2" />PNG
                    </Button>
                    <Button variant="secondary" onClick={() => handleDownload('svg')}>
                      <Download className="h-4 w-4 mr-2" />SVG
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
