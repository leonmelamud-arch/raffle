// QR Reference utilities

// Parse user agent to get device info
export function parseUserAgent(ua: string) {
  const result = {
    device_type: 'desktop',
    os: 'Unknown',
    browser: 'Unknown',
  };

  // Detect OS
  if (/iPhone|iPad|iPod/.test(ua)) {
    result.os = 'iOS';
    result.device_type = /iPad/.test(ua) ? 'tablet' : 'mobile';
  } else if (/Android/.test(ua)) {
    result.os = 'Android';
    result.device_type = /Mobile/.test(ua) ? 'mobile' : 'tablet';
  } else if (/Windows/.test(ua)) {
    result.os = 'Windows';
  } else if (/Mac OS X/.test(ua)) {
    result.os = 'macOS';
  } else if (/Linux/.test(ua)) {
    result.os = 'Linux';
  }

  // Detect Browser
  if (/Chrome/.test(ua) && !/Chromium|Edg/.test(ua)) {
    result.browser = 'Chrome';
  } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    result.browser = 'Safari';
  } else if (/Firefox/.test(ua)) {
    result.browser = 'Firefox';
  } else if (/Edg/.test(ua)) {
    result.browser = 'Edge';
  } else if (/Opera|OPR/.test(ua)) {
    result.browser = 'Opera';
  }

  return result;
}

// Fetch IP geolocation data
export async function getGeoData() {
  try {
    const response = await fetch('https://ipapi.co/json/', { 
      cache: 'no-store',
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const data = await response.json();
      return {
        ip_address: data.ip,
        country: data.country_name,
        country_code: data.country_code,
        city: data.city,
        region: data.region,
      };
    }
  } catch {
    // Silently fail - geo data is optional
  }
  return null;
}

// Check if a QR code is expired
export function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// Generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export interface QRDownloadOptions {
  title?: string;
  description?: string;
  slug: string;
  fgColor?: string;
  bgColor?: string;
  accentColor?: string;
  gradient?: string[]; // Array of colors for gradient QR
  logoUrl?: string; // Base64 or URL of logo to embed in center
  logoShape?: 'square' | 'circle'; // Shape of logo container
  logoScale?: number; // Scale factor for border/container size (0.5 to 1.5, default 1.0)
  logoCrop?: number; // Scale factor for image crop/zoom (0.5 to 1.5, default 1.0)
}

// Download QR code as PNG or SVG with title, description, and colors
export function downloadQRCode(format: 'png' | 'svg', options: QRDownloadOptions | string) {
  // Support legacy string parameter (just slug)
  const opts: QRDownloadOptions = typeof options === 'string' 
    ? { slug: options } 
    : options;
  
  const { 
    title, 
    description, 
    slug, 
    fgColor = '#1a1a2e',
    bgColor = '#ffffff',
    accentColor = '#6366f1',
    gradient,
    logoUrl,
    logoShape = 'circle',
    logoScale = 1.0,
    logoCrop = 1.0
  } = opts;

  const svg = document.getElementById('qr-code-svg');
  if (!svg) return;

  // Clone the SVG
  const svgClone = svg.cloneNode(true) as SVGElement;
  
  // Ensure SVG has proper dimensions for rendering
  svgClone.setAttribute('width', '256');
  svgClone.setAttribute('height', '256');
  
  // Remove any existing defs to avoid conflicts
  const existingDefs = svgClone.querySelector('defs');
  if (existingDefs) existingDefs.remove();
  
  // For PNG export: always use solid black for QR paths (we'll apply gradient on canvas)
  // For SVG export: embed the gradient definition
  
  if (format === 'png') {
    // For PNG: Replace all fills with solid black (for canvas masking)
    // The QR code SVG has two paths: one for bg (white) and one for fg (qr pattern)
    // We need the fg path to be black so we can detect it in pixel manipulation
    const whiteFills = ['#ffffff', '#fff', 'white'];
    
    svgClone.querySelectorAll('path, rect').forEach(el => {
      const fill = (el.getAttribute('fill') || '').toLowerCase().trim();
      // If it's not a white fill, make it black
      // This handles: solid colors, url() gradient refs, or any other fill
      const isWhiteFill = whiteFills.some(w => fill === w || fill.startsWith(w));
      if (!isWhiteFill && fill !== 'none' && fill !== 'transparent') {
        el.setAttribute('fill', '#000000');
      }
    });
  } else {
    // For SVG: embed gradient if needed
    if (gradient && gradient.length > 1) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      linearGradient.setAttribute('id', 'qrGradientExport');
      linearGradient.setAttribute('x1', '0%');
      linearGradient.setAttribute('y1', '0%');
      linearGradient.setAttribute('x2', '100%');
      linearGradient.setAttribute('y2', '100%');
      
      gradient.forEach((color, i) => {
        const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop.setAttribute('offset', `${(i / (gradient.length - 1)) * 100}%`);
        stop.setAttribute('stop-color', color);
        linearGradient.appendChild(stop);
      });
      
      defs.appendChild(linearGradient);
      svgClone.insertBefore(defs, svgClone.firstChild);
      
      // Apply gradient to paths
      svgClone.querySelectorAll('path').forEach(path => {
        const fill = path.getAttribute('fill');
        if (fill && fill !== '#ffffff' && fill !== 'white' && fill !== 'none' && fill !== 'transparent') {
          path.setAttribute('fill', 'url(#qrGradientExport)');
        }
      });
    } else {
      // Solid color for SVG
      svgClone.querySelectorAll('path').forEach(path => {
        const fill = path.getAttribute('fill');
        if (fill && fill !== '#ffffff' && fill !== 'white' && fill !== 'none' && fill !== 'transparent') {
          path.setAttribute('fill', fgColor);
        }
      });
    }
  }

  // Ensure SVG has proper namespace
  if (!svgClone.getAttribute('xmlns')) {
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  
  const svgData = new XMLSerializer().serializeToString(svgClone);

  if (format === 'svg') {
    // Create decorated SVG with title and description
    const decoratedSvg = createDecoratedSVG(svgData, { title, description, fgColor, bgColor, accentColor, gradient, logoUrl, logoShape, logoScale, logoCrop });
    const blob = new Blob([decoratedSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${slug}_qr.svg`);
    URL.revokeObjectURL(url);
  } else {
    // Create decorated PNG - pass gradient so we can apply it on canvas
    createDecoratedPNG(svgData, { title, description, slug, fgColor, bgColor, accentColor, gradient, logoUrl, logoShape, logoScale, logoCrop });
  }
}

function createDecoratedSVG(
  qrSvgData: string, 
  opts: { title?: string; description?: string; fgColor: string; bgColor: string; accentColor: string; gradient?: string[]; logoUrl?: string; logoShape?: 'square' | 'circle'; logoScale?: number; logoCrop?: number }
): string {
  const { title, description, fgColor, bgColor, accentColor, gradient, logoUrl, logoShape = 'circle', logoScale = 1.0, logoCrop = 1.0 } = opts;
  
  const hasTitle = !!title;
  const hasDesc = !!description;
  const titleHeight = hasTitle ? 60 : 0;
  const descHeight = hasDesc ? 50 : 0;
  const padding = 40;
  const qrSize = 300;
  const totalWidth = qrSize + padding * 2;
  const totalHeight = qrSize + padding * 2 + titleHeight + descHeight;

  // Extract inner content from QR SVG
  const qrContent = qrSvgData.replace(/<\?xml[^>]*\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
  
  // Build gradient stops for header
  const headerGradientStops = gradient && gradient.length > 1
    ? gradient.map((color, i) => `<stop offset="${(i / (gradient.length - 1)) * 100}%" style="stop-color:${color};stop-opacity:1" />`).join('\n      ')
    : `<stop offset="0%" style="stop-color:${accentColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${fgColor};stop-opacity:1" />`;

  const titleColor = gradient && gradient.length > 0 ? gradient[0] : fgColor;
  const descColor = gradient && gradient.length > 1 ? gradient[gradient.length - 1] : accentColor;
  
  // Logo in center of QR - logoScale controls container size, logoCrop controls image zoom
  const baseLogoSize = 70; // Base size ~23% of QR
  const logoContainerSize = Math.round(baseLogoSize * logoScale); // Container resizes with logoScale
  const logoCenterX = padding + qrSize / 2;
  const logoCenterY = titleHeight + padding + qrSize / 2;
  const logoInnerSize = logoContainerSize - 4; // Inner drawable area (after border)
  const logoClipPath = logoShape === 'circle' 
    ? `<clipPath id="logoClip"><circle cx="${logoCenterX}" cy="${logoCenterY}" r="${logoInnerSize / 2}"/></clipPath>`
    : `<clipPath id="logoClip"><rect x="${logoCenterX - logoInnerSize / 2}" y="${logoCenterY - logoInnerSize / 2}" width="${logoInnerSize}" height="${logoInnerSize}" rx="4"/></clipPath>`;
  
  // For crop/zoom: when logoCrop > 1, image should appear larger (zoomed in) so edges get cropped
  // scaledImageSize is the size we draw the image at, clip-path cuts it to logoInnerSize
  const scaledImageSize = Math.round(logoInnerSize * logoCrop);
  const imageOffset = (logoInnerSize - scaledImageSize) / 2; // Negative when logoCrop > 1, centers the larger image

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <defs>
    <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      ${headerGradientStops}
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.15"/>
    </filter>
    ${logoUrl ? logoClipPath : ''}
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="${bgColor}"/>
  
  ${hasTitle ? `
  <!-- Title -->
  <text x="${totalWidth / 2}" y="${padding + 30}" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="24" 
        font-weight="bold" 
        fill="${titleColor}" 
        text-anchor="middle">${escapeXml(title)}</text>
  ` : ''}
  
  <!-- QR Code Container with shadow -->
  <g filter="url(#shadow)">
    <rect x="${padding - 10}" y="${titleHeight + padding - 10}" 
          width="${qrSize + 20}" height="${qrSize + 20}" 
          rx="12" fill="white"/>
  </g>
  
  <!-- QR Code -->
  <g transform="translate(${padding}, ${titleHeight + padding}) scale(${qrSize / 256})">
    ${qrContent}
  </g>
  
  ${logoUrl ? `
  <!-- Logo in center -->
  <${logoShape === 'circle' ? 'circle' : 'rect'} 
    ${logoShape === 'circle' 
      ? `cx="${logoCenterX}" cy="${logoCenterY}" r="${logoContainerSize / 2}"` 
      : `x="${logoCenterX - logoContainerSize / 2}" y="${logoCenterY - logoContainerSize / 2}" width="${logoContainerSize}" height="${logoContainerSize}" rx="6"`
    }
    fill="white" 
    stroke="${gradient?.[0] || accentColor}" 
    stroke-width="2"/>
  <image 
    x="${logoCenterX - logoInnerSize / 2 + imageOffset}" 
    y="${logoCenterY - logoInnerSize / 2 + imageOffset}" 
    width="${scaledImageSize}" 
    height="${scaledImageSize}" 
    xlink:href="${logoUrl}"
    clip-path="url(#logoClip)"
    preserveAspectRatio="xMidYMid slice"/>
  ` : ''}
  
  ${hasDesc ? `
  <!-- Description -->
  <text x="${totalWidth / 2}" y="${titleHeight + qrSize + padding + 35}" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="14" 
        fill="${descColor}" 
        text-anchor="middle">${escapeXml(description)}</text>
  ` : ''}
</svg>`;
}

function createDecoratedPNG(
  qrSvgData: string,
  opts: QRDownloadOptions
) {
  const { title, description, slug, fgColor = '#1a1a2e', bgColor = '#ffffff', accentColor = '#6366f1', gradient, logoUrl, logoShape = 'circle', logoScale = 1.0, logoCrop = 1.0 } = opts;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const hasTitle = !!title;
  const hasDesc = !!description;
  const titleHeight = hasTitle ? 80 : 0;
  const descHeight = hasDesc ? 60 : 0;
  const padding = 60;
  const qrSize = 400;
  const totalWidth = qrSize + padding * 2;
  const totalHeight = qrSize + padding * 2 + titleHeight + descHeight;
  
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  
  const img = new Image();
  
  img.onload = () => {
    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    
    // Title (use first gradient color if gradient)
    if (hasTitle) {
      ctx.fillStyle = gradient && gradient.length > 0 ? gradient[0] : fgColor;
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title!, totalWidth / 2, padding + 35);
    }
    
    // QR Code background (white card with shadow)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'white';
    roundRect(ctx, padding - 15, titleHeight + padding - 15, qrSize + 30, qrSize + 30, 16);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw QR code - if gradient, apply it using canvas compositing
    if (gradient && gradient.length > 1) {
      // Create temporary canvas for the gradient QR compositing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = qrSize;
      tempCanvas.height = qrSize;
      const tempCtx = tempCanvas.getContext('2d')!;
      
      // Draw the QR code (black on transparent)
      // Note: SVG should have white bg path and black fg path
      tempCtx.drawImage(img, 0, 0, qrSize, qrSize);
      
      // Get image data to check what we got
      const imageData = tempCtx.getImageData(0, 0, qrSize, qrSize);
      const data = imageData.data;
      
      // Parse gradient colors to RGB
      const gradientColors = gradient.map(hex => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
      });
      
      // Apply gradient to dark pixels, keep white pixels white
      for (let y = 0; y < qrSize; y++) {
        for (let x = 0; x < qrSize; x++) {
          const i = (y * qrSize + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Check if pixel is dark (part of QR code foreground)
          // Using a threshold to detect "dark" pixels
          const luminance = (r * 299 + g * 587 + b * 114) / 1000;
          
          if (luminance < 128) {
            // Calculate gradient position (diagonal)
            const t = (x + y) / (qrSize * 2);
            
            // Interpolate between gradient colors
            const colorIndex = t * (gradientColors.length - 1);
            const colorLow = Math.floor(colorIndex);
            const colorHigh = Math.min(colorLow + 1, gradientColors.length - 1);
            const colorT = colorIndex - colorLow;
            
            const c1 = gradientColors[colorLow];
            const c2 = gradientColors[colorHigh];
            
            data[i] = Math.round(c1.r + (c2.r - c1.r) * colorT);
            data[i + 1] = Math.round(c1.g + (c2.g - c1.g) * colorT);
            data[i + 2] = Math.round(c1.b + (c2.b - c1.b) * colorT);
            data[i + 3] = 255; // full opacity
          } else {
            // Keep white pixels white (for background)
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
          }
        }
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      
      // Draw the gradient QR to main canvas
      ctx.drawImage(tempCanvas, padding, titleHeight + padding, qrSize, qrSize);
      
    } else {
      // Solid color - need to colorize the black QR
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = qrSize;
      tempCanvas.height = qrSize;
      const tempCtx = tempCanvas.getContext('2d')!;
      
      // Fill with white background first
      tempCtx.fillStyle = 'white';
      tempCtx.fillRect(0, 0, qrSize, qrSize);
      
      // Draw QR code
      tempCtx.drawImage(img, 0, 0, qrSize, qrSize);
      
      // Get image data to manipulate pixels
      const imageData = tempCtx.getImageData(0, 0, qrSize, qrSize);
      const data = imageData.data;
      
      // Parse fgColor to RGB
      const fgR = parseInt(fgColor.slice(1, 3), 16);
      const fgG = parseInt(fgColor.slice(3, 5), 16);
      const fgB = parseInt(fgColor.slice(5, 7), 16);
      
      // Replace black pixels with fgColor
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if pixel is dark (part of QR code)
        if (r < 128 && g < 128 && b < 128) {
          data[i] = fgR;
          data[i + 1] = fgG;
          data[i + 2] = fgB;
        }
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, padding, titleHeight + padding, qrSize, qrSize);
    }
    
    // Helper function to draw logo on canvas with crop/zoom effect
    const drawLogo = (logoImg: HTMLImageElement) => {
      const baseLogoSize = 90; // Base size ~22% of QR
      const logoContainerSize = Math.round(baseLogoSize * logoScale); // Container resizes with logoScale
      const logoCenterX = padding + qrSize / 2;
      const logoCenterY = titleHeight + padding + qrSize / 2;
      
      // Calculate source crop region based on logoCrop
      const imgWidth = logoImg.naturalWidth;
      const imgHeight = logoImg.naturalHeight;
      
      // Crop from center: show 1/logoCrop portion of image
      const cropRatio = 1 / logoCrop;
      const sWidth = Math.round(imgWidth * cropRatio);
      const sHeight = Math.round(imgHeight * cropRatio);
      const sx = Math.round((imgWidth - sWidth) / 2);
      const sy = Math.round((imgHeight - sHeight) / 2);
      
      // White background circle/square with border
      ctx.fillStyle = 'white';
      ctx.strokeStyle = gradient?.[0] || accentColor;
      ctx.lineWidth = 3;
      
      if (logoShape === 'circle') {
        ctx.beginPath();
        ctx.arc(logoCenterX, logoCenterY, logoContainerSize / 2 + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Clip to circle and draw logo
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCenterX, logoCenterY, logoContainerSize / 2, 0, Math.PI * 2);
        ctx.clip();
        
        // Draw with crop/zoom using 9-argument drawImage
        ctx.drawImage(
          logoImg, 
          sx, sy, sWidth, sHeight,  // Source crop region
          logoCenterX - logoContainerSize / 2, logoCenterY - logoContainerSize / 2, logoContainerSize, logoContainerSize  // Destination
        );
        ctx.restore();
      } else {
        roundRect(ctx, logoCenterX - logoContainerSize / 2 - 4, logoCenterY - logoContainerSize / 2 - 4, logoContainerSize + 8, logoContainerSize + 8, 8);
        ctx.fill();
        ctx.stroke();
        
        // Clip to rounded rect and draw logo
        ctx.save();
        roundRect(ctx, logoCenterX - logoContainerSize / 2, logoCenterY - logoContainerSize / 2, logoContainerSize, logoContainerSize, 6);
        ctx.clip();
        
        // Draw with crop/zoom using 9-argument drawImage
        ctx.drawImage(
          logoImg, 
          sx, sy, sWidth, sHeight,  // Source crop region
          logoCenterX - logoContainerSize / 2, logoCenterY - logoContainerSize / 2, logoContainerSize, logoContainerSize  // Destination
        );
        ctx.restore();
      }
    };

    // Helper function to finish the PNG (draw description and trigger download)
    const finishPng = () => {
      // Description (use last gradient color if gradient)
      if (hasDesc) {
        ctx.fillStyle = gradient && gradient.length > 1 ? gradient[gradient.length - 1] : accentColor;
        ctx.font = '18px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(description!, totalWidth / 2, titleHeight + qrSize + padding + 45);
      }
      
      triggerDownload(canvas.toDataURL('image/png'), `${slug}_qr.png`);
    };

    // Draw logo in center if provided
    if (logoUrl) {
      const logoImg = new Image();
      logoImg.onload = () => {
        drawLogo(logoImg);
        finishPng();
      };
      logoImg.onerror = () => {
        // Logo failed to load, just finish without it
        console.warn('Failed to load logo image, continuing without it');
        finishPng();
      };
      // Only set crossOrigin for non-data URLs (external URLs)
      if (!logoUrl.startsWith('data:')) {
        logoImg.crossOrigin = 'anonymous';
      }
      logoImg.src = logoUrl;
    } else {
      // Description (use last gradient color if gradient)
      if (hasDesc) {
        ctx.fillStyle = gradient && gradient.length > 1 ? gradient[gradient.length - 1] : accentColor;
        ctx.font = '18px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(description!, totalWidth / 2, titleHeight + qrSize + padding + 45);
      }
      
      triggerDownload(canvas.toDataURL('image/png'), `${slug}_qr.png`);
    }
  };
  
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(qrSvgData)));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}
