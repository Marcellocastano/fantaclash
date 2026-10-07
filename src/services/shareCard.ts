import { TournamentSummary, shareText } from '../domain/tournament';
import { PlayerRole } from '../types';

/**
 * Esportazione della card del torneo come immagine PNG (1080x1350, formato
 * 4:5 adatto ai social) disegnata con Canvas 2D, senza dipendenze.
 * Riproduce la composizione di TournamentSummaryCard con i colori fissi
 * del marchio.
 */

const W = 1080;
const H = 1350;
const FOREST = '#344B43';
const IVORY = '#F5F3EE';
const PEACH = '#E7BFA8';
const DISPLAY = "'Big Shoulders', sans-serif";
const SANS = "'Public Sans', sans-serif";
const ROLE_LABEL: Record<PlayerRole, string> = { P: 'POR', D: 'DIF', C: 'CEN', A: 'ATT' };

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}...`).width > maxWidth) t = t.slice(0, -1);
  return `${t}...`;
}

/**
 * Riduce il corpo del font finché il testo entra in maxWidth (come la card
 * a schermo); solo sotto minPx ripiega sui puntini di `fit`.
 */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: number,
  family: string,
  px: number,
  minPx: number
): string {
  let size = px;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > minPx && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return fit(ctx, text, maxWidth);
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const k = size / 32;
  ctx.fillStyle = FOREST;
  ctx.strokeStyle = IVORY;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);
  ctx.lineWidth = 4.5 * k;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(x + 6 * k, y + 8.5 * k);
  ctx.lineTo(x + 13.5 * k, y + 16 * k);
  ctx.lineTo(x + 6 * k, y + 23.5 * k);
  ctx.stroke();
  ctx.strokeStyle = PEACH;
  ctx.beginPath();
  ctx.moveTo(x + 26 * k, y + 8.5 * k);
  ctx.lineTo(x + 18.5 * k, y + 16 * k);
  ctx.lineTo(x + 26 * k, y + 23.5 * k);
  ctx.stroke();
}

function drawTrophy(ctx: CanvasRenderingContext2D, cx: number, y: number, size: number) {
  const k = size / 20;
  const x = cx - size / 2;
  ctx.strokeStyle = PEACH;
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.moveTo(x + 6 * k, y + 3 * k);
  ctx.lineTo(x + 14 * k, y + 3 * k);
  ctx.lineTo(x + 14 * k, y + 8 * k);
  ctx.arc(x + 10 * k, y + 8 * k, 4 * k, 0, Math.PI);
  ctx.closePath();
  ctx.moveTo(x + 10 * k, y + 12 * k);
  ctx.lineTo(x + 10 * k, y + 15 * k);
  ctx.moveTo(x + 6.5 * k, y + 17 * k);
  ctx.lineTo(x + 13.5 * k, y + 17 * k);
  ctx.stroke();
}

/** Disegna la card e restituisce il PNG */
export async function renderSummaryCard(summary: TournamentSummary): Promise<Blob> {
  if (document.fonts) {
    await Promise.all([
      document.fonts.load(`800 64px ${DISPLAY}`),
      document.fonts.load(`700 64px ${DISPLAY}`),
      document.fonts.load(`400 32px ${SANS}`),
      document.fonts.load(`600 32px ${SANS}`),
    ]).catch(() => undefined);
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');

  const pad = 80;
  ctx.fillStyle = FOREST;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = PEACH;
  ctx.lineWidth = 24;
  ctx.strokeRect(12, 12, W - 24, H - 24);

  // Testata
  drawLogo(ctx, pad, pad, 56);
  ctx.fillStyle = IVORY;
  ctx.textBaseline = 'middle';
  ctx.font = `800 44px ${DISPLAY}`;
  ctx.fillText('FantaClash', pad + 72, pad + 30);
  ctx.textAlign = 'right';
  ctx.font = `400 28px ${SANS}`;
  ctx.fillText(`Serie A ${summary.seasonId}`, W - pad, pad + 30);

  // Titolo e posizione
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = IVORY;
  ctx.font = `700 46px ${DISPLAY}`;
  ctx.fillText(summary.tournamentName, W / 2, 235);
  let y = 265;
  const champion = summary.placement === 'campione';
  if (champion) {
    drawTrophy(ctx, W / 2, y, 100);
    y += 115;
  } else {
    y += 30;
  }
  ctx.fillStyle = champion ? PEACH : IVORY;
  ctx.font = `800 ${champion ? 120 : 88}px ${DISPLAY}`;
  ctx.fillText(fit(ctx, summary.placementLabel, W - 2 * pad), W / 2, y + (champion ? 95 : 72));
  y += champion ? 165 : 140;
  ctx.fillStyle = IVORY;
  ctx.fillText(fitFont(ctx, summary.teamName, W - 2 * pad, 800, DISPLAY, 72, 40), W / 2, y);
  y += 46;

  // Risultati
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'rgba(245, 243, 238, 0.3)';
  ctx.lineWidth = 2;
  const line = (yy: number) => {
    ctx.beginPath();
    ctx.moveTo(pad, yy);
    ctx.lineTo(W - pad, yy);
    ctx.stroke();
  };
  line(y);
  for (const m of summary.matches) {
    const rowY = y + 54;
    ctx.fillStyle = IVORY;
    ctx.font = `700 40px ${DISPLAY}`;
    ctx.fillText(m.roundShort, pad, rowY);
    ctx.fillText(fitFont(ctx, m.opponentName, 500, 400, SANS, 34, 24), pad + 90, rowY);
    ctx.textAlign = 'right';
    ctx.font = `800 44px ${DISPLAY}`;
    const so = m.shootout ? ` (${m.shootout.for}-${m.shootout.against} rig.)` : '';
    ctx.fillText(`${m.goalsFor}-${m.goalsAgainst}${so}`, W - pad - 60, rowY);
    ctx.fillStyle = m.won ? PEACH : IVORY;
    ctx.fillText(m.won ? 'V' : 'P', W - pad, rowY);
    ctx.textAlign = 'left';
    y += 78;
    line(y);
  }

  // MVP e numeri
  y += 56;
  ctx.fillStyle = IVORY;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText('MVP', pad, y);
  ctx.fillText('Gol fatti / subiti', W / 2, y);
  ctx.fillText(fitFont(ctx, summary.mvp?.name ?? '-', W / 2 - pad - 20, 800, DISPLAY, 52, 34), pad, y + 52);
  ctx.font = `800 52px ${DISPLAY}`;
  ctx.fillText(`${summary.stats.goalsFor} / ${summary.stats.goalsAgainst}`, W / 2, y + 52);
  y += 96;
  if (summary.scorers.length) {
    ctx.font = `400 26px ${SANS}`;
    ctx.fillText('Marcatori', pad, y);
    ctx.fillText(
      fitFont(ctx, summary.scorers.slice(0, 3).map(s => `${s.name} ${s.goals}`).join('  ·  '), W - 2 * pad, 600, SANS, 30, 20),
      pad,
      y + 42
    );
    y += 68;
  }

  // Formazione
  line(y);
  y += 42;
  for (const role of ['P', 'D', 'C', 'A'] as PlayerRole[]) {
    ctx.font = `700 32px ${DISPLAY}`;
    ctx.fillText(ROLE_LABEL[role], pad, y);
    const names = summary.lineup.filter(p => p.role === role).map(p => p.name).join(', ');
    ctx.fillText(fitFont(ctx, names, W - 2 * pad - 100, 400, SANS, 26, 18), pad + 100, y);
    y += 40;
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Esportazione fallita'))), 'image/png')
  );
}

export function cardFileName(summary: TournamentSummary): string {
  const slug = summary.teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'squadra';
  return `fantaclash-${slug}-${summary.seasonId}.png`;
}

/** Scarica il PNG */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copia l'immagine negli appunti (se il browser lo consente) */
export async function copyImage(blob: Blob): Promise<boolean> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/** Condivisione nativa con file (mobile); false se non supportata */
export async function shareNative(blob: Blob, summary: TournamentSummary): Promise<boolean> {
  const file = new File([blob], cardFileName(summary), { type: 'image/png' });
  const data = { files: [file], text: shareText(summary), title: summary.tournamentName };
  if (!navigator.canShare?.(data)) return false;
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}

export function xShareUrl(summary: TournamentSummary): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText(summary))}`;
}

export function whatsappShareUrl(summary: TournamentSummary): string {
  return `https://wa.me/?text=${encodeURIComponent(shareText(summary))}`;
}
