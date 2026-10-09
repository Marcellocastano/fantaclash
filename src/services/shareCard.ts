import { TournamentSummary, shareText } from '../domain/tournament';
import type { Placement, SummaryMatch } from '../domain/tournament';
import { PlayerRole } from '../types';
import { TIER_COLORS, tierOf } from './playerTier';

/**
 * Card del torneo come immagine PNG (1080x1350, formato 4:5 adatto ai
 * social) disegnata con Canvas 2D, senza dipendenze. È la stessa immagine
 * mostrata nel riepilogo, quindi ciò che si vede è ciò che si scarica.
 *
 * Composizione: fascia verde con esito e squadra, timbro dell'annata, il
 * percorso come tre "biglietti", la formazione 1-2-3-2 su un mini campo e
 * in fondo MVP, gol e marcatori.
 */

const W = 1080;
const H = 1350;
const M = 60;
const FOREST = '#07492A';
const INK = '#15201A';
const CREAM = '#F4EEDF';
const MUTED = '#5C665F';
const YELLOW = '#FFD23F';
const RED = '#D22D28';
const FIELD_DARK = '#1F7A45';
const FIELD_LIGHT = '#2A8A51';
const FIELD_LINE = 'rgba(228, 240, 223, 0.75)';
const DISPLAY = "'Big Shoulders', sans-serif";
const SANS = "'Public Sans', sans-serif";

/** Colore dell'esito: oro, argento, bronzo, crema */
const PLACEMENT_COLOR: Record<Placement, string> = {
  campione: YELLOW,
  finalista: '#D5DADD',
  semifinalista: '#D9A577',
  quarti: CREAM,
};

const ROUND_NAME: Record<SummaryMatch['round'], string> = {
  quarterfinals: 'Quarti',
  semifinals: 'Semifinale',
  final: 'Finale',
};

/** Colonne della formazione sul mini campo (attacco verso destra), in % */
const FORMATION_X: Record<PlayerRole, number> = { P: 0.09, D: 0.3, C: 0.56, A: 0.84 };
/** Altezze dei giocatori di un reparto, in % (il centrale dei 3 è più avanzato) */
const FORMATION_Y: Record<number, number[]> = { 1: [0.5], 2: [0.3, 0.7], 3: [0.2, 0.5, 0.8] };

type Ctx = CanvasRenderingContext2D;

function fit(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/**
 * Riduce il corpo del font finché il testo entra in maxWidth; solo sotto
 * minPx ripiega sui puntini di `fit`.
 */
function fitFont(ctx: Ctx, text: string, maxWidth: number, weight: number, family: string, px: number, minPx: number): string {
  let size = px;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > minPx && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return fit(ctx, text, maxWidth);
}

/** Blocco con bordo inchiostro e ombra piena (linguaggio "figurina") */
function block(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, shadow = 8) {
  if (shadow) {
    ctx.fillStyle = INK;
    ctx.fillRect(x + shadow, y + shadow, w, h);
  }
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
}

function drawLogo(ctx: Ctx, x: number, y: number, size: number) {
  const k = size / 32;
  ctx.fillStyle = FOREST;
  ctx.fillRect(x, y, size, size);
  ctx.lineWidth = 4.5 * k;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  const chevron = (color: string, a: number, b: number) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + a * k, y + 8.5 * k);
    ctx.lineTo(x + b * k, y + 16 * k);
    ctx.lineTo(x + a * k, y + 23.5 * k);
    ctx.stroke();
  };
  chevron(CREAM, 6, 13.5);
  chevron(YELLOW, 26, 18.5);
}

function drawTrophy(ctx: Ctx, cx: number, y: number, size: number, color: string) {
  const k = size / 20;
  const x = cx - size / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * k;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(x + 6 * k, y + 3 * k);
  ctx.lineTo(x + 14 * k, y + 3 * k);
  ctx.lineTo(x + 14 * k, y + 8 * k);
  ctx.arc(x + 10 * k, y + 8 * k, 4 * k, 0, Math.PI);
  ctx.closePath();
  ctx.moveTo(x + 6 * k, y + 5 * k);
  ctx.lineTo(x + 3 * k, y + 5 * k);
  ctx.lineTo(x + 3 * k, y + 6 * k);
  ctx.quadraticCurveTo(x + 3 * k, y + 9 * k, x + 6 * k, y + 9 * k);
  ctx.moveTo(x + 14 * k, y + 5 * k);
  ctx.lineTo(x + 17 * k, y + 5 * k);
  ctx.lineTo(x + 17 * k, y + 6 * k);
  ctx.quadraticCurveTo(x + 17 * k, y + 9 * k, x + 14 * k, y + 9 * k);
  ctx.moveTo(x + 10 * k, y + 12 * k);
  ctx.lineTo(x + 10 * k, y + 15 * k);
  ctx.moveTo(x + 6.5 * k, y + 17 * k);
  ctx.lineTo(x + 13.5 * k, y + 17 * k);
  ctx.stroke();
}

/** Timbro circolare inclinato con l'annata */
function drawSeasonStamp(ctx: Ctx, cx: number, cy: number, season: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = YELLOW;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 22px ${SANS}`;
  ctx.fillText('SERIE A', 0, -24);
  ctx.fillText(fitFont(ctx, season, 120, 900, DISPLAY, 46, 28), 0, 16);
  ctx.restore();
}

/** Biglietto di un turno: avversario, punteggio e timbro V/P */
function drawTicket(ctx: Ctx, x: number, y: number, w: number, h: number, round: SummaryMatch['round'], m: SummaryMatch | undefined) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (!m) {
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = MUTED;
    ctx.font = `700 28px ${DISPLAY}`;
    ctx.fillText(ROUND_NAME[round], x + 22, y + 44);
    ctx.font = `400 24px ${SANS}`;
    ctx.fillText('Non giocata', x + 22, y + h - 30);
    return;
  }
  block(ctx, x, y, w, h, CREAM);
  ctx.fillStyle = MUTED;
  ctx.font = `800 28px ${DISPLAY}`;
  ctx.fillText(ROUND_NAME[round], x + 22, y + 44);
  ctx.fillStyle = INK;
  ctx.fillText(fitFont(ctx, `vs ${m.opponentName}`, w - 44, 600, SANS, 24, 16), x + 22, y + 80);
  ctx.font = `900 92px ${DISPLAY}`;
  ctx.fillText(`${m.goalsFor}-${m.goalsAgainst}`, x + 22, y + h - 28);
  if (m.shootout) {
    ctx.fillStyle = MUTED;
    ctx.font = `700 22px ${SANS}`;
    ctx.textAlign = 'right';
    ctx.fillText(`rig. ${m.shootout.for}-${m.shootout.against}`, x + w - 22, y + 44);
    ctx.textAlign = 'left';
  }
  // Timbro V/P
  const sx = x + w - 62;
  const sy = y + h - 66;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-0.2);
  ctx.fillStyle = m.won ? YELLOW : RED;
  ctx.fillRect(-34, -34, 68, 68);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(-34, -34, 68, 68);
  ctx.fillStyle = m.won ? INK : '#FFFFFF';
  ctx.font = `900 48px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(m.won ? 'V' : 'P', 0, 3);
  ctx.restore();
}

/** Mini campo a strisce con la formazione 1-2-3-2 e i cognomi */
function drawLineup(ctx: Ctx, x: number, y: number, w: number, h: number, lineup: TournamentSummary['lineup']) {
  const stripes = 12;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? FIELD_LIGHT : FIELD_DARK;
    ctx.fillRect(x + (i * w) / stripes, y, w / stripes + 1, h);
  }
  ctx.strokeStyle = FIELD_LINE;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 10);
  ctx.lineTo(x + w / 2, y + h - 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, 56, 0, Math.PI * 2);
  ctx.stroke();
  const boxH = h * 0.56;
  ctx.strokeRect(x + 10, y + (h - boxH) / 2, 120, boxH);
  ctx.strokeRect(x + w - 130, y + (h - boxH) / 2, 120, boxH);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);

  for (const role of ['P', 'D', 'C', 'A'] as PlayerRole[]) {
    const players = lineup.filter(p => p.role === role);
    players.forEach((p, i) => {
      const ys = FORMATION_Y[players.length] ?? players.map((_, k) => (k + 1) / (players.length + 1));
      const forward = players.length === 3 && i === 1 ? 0.07 : 0;
      const cx = x + w * (FORMATION_X[role] + forward);
      const cy = y + h * ys[i] - 12;
      const tier = TIER_COLORS[tierOf(p.overall)];
      // Badge overall
      block(ctx, cx - 30, cy - 30, 60, 48, tier.bg, 4);
      ctx.fillStyle = tier.ink;
      ctx.font = `900 34px ${DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(p.overall), cx, cy - 5);
      // Cognome su etichetta scura per la leggibilità sulle strisce
      const label = fitFont(ctx, p.name, 170, 700, SANS, 22, 15);
      const lw = ctx.measureText(label).width + 16;
      ctx.fillStyle = 'rgba(7, 73, 42, 0.85)';
      ctx.fillRect(cx - lw / 2, cy + 24, lw, 30);
      ctx.fillStyle = CREAM;
      ctx.fillText(label, cx, cy + 40);
    });
  }
}

/** Disegna la card e restituisce il PNG */
export async function renderSummaryCard(summary: TournamentSummary): Promise<Blob> {
  if (document.fonts) {
    await Promise.all([
      document.fonts.load(`900 64px ${DISPLAY}`),
      document.fonts.load(`800 64px ${DISPLAY}`),
      document.fonts.load(`400 32px ${SANS}`),
      document.fonts.load(`700 32px ${SANS}`),
    ]).catch(() => undefined);
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');

  const champion = summary.placement === 'campione';
  const accent = PLACEMENT_COLOR[summary.placement];

  // Fondo carta e fascia verde dell'esito
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  const bandH = 500;
  ctx.fillStyle = FOREST;
  ctx.fillRect(0, 0, W, bandH);
  ctx.strokeStyle = 'rgba(244, 238, 223, 0.12)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(W / 2, bandH, 190, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillRect(0, bandH, W, 8);

  // Testata: logo e timbro dell'annata
  drawLogo(ctx, M, M, 64);
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `800 50px ${DISPLAY}`;
  ctx.fillText('FantaClash', M + 82, M + 34);
  ctx.font = `800 46px ${DISPLAY}`;
  ctx.fillStyle = YELLOW;
  ctx.fillText(fitFont(ctx, summary.tournamentName, 680, 800, DISPLAY, 46, 28), M + 82, M + 90);
  drawSeasonStamp(ctx, W - M - 82, M + 88, summary.seasonId);

  // Esito e squadra
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (champion) drawTrophy(ctx, W / 2, 175, 96, accent);
  ctx.fillStyle = accent;
  ctx.fillText(fitFont(ctx, summary.placementLabel.toUpperCase(), W - 2 * M, 900, DISPLAY, champion ? 150 : 120, 70), W / 2, champion ? 400 : 350);
  ctx.fillStyle = CREAM;
  ctx.fillText(fitFont(ctx, summary.teamName, W - 2 * M, 800, DISPLAY, 64, 34), W / 2, champion ? 462 : 440);

  // Percorso: tre biglietti
  const ticketY = 548;
  const ticketH = 200;
  const gap = 28;
  const ticketW = (W - 2 * M - 2 * gap) / 3;
  (['quarterfinals', 'semifinals', 'final'] as const).forEach((round, i) => {
    drawTicket(ctx, M + i * (ticketW + gap), ticketY, ticketW, ticketH, round, summary.matches.find(m => m.round === round));
  });

  // Formazione
  drawLineup(ctx, M, 790, W - 2 * M, 330, summary.lineup);

  // In fondo: MVP, gol, marcatori
  const footY = 1170;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const stat = (x: number, label: string, value: string, maxW: number) => {
    ctx.fillStyle = MUTED;
    ctx.font = `600 24px ${SANS}`;
    ctx.fillText(label, x, footY);
    ctx.fillStyle = INK;
    ctx.fillText(fitFont(ctx, value, maxW, 900, DISPLAY, 60, 36), x, footY + 60);
  };
  stat(M, 'MVP', summary.mvp?.name ?? '-', 400);
  stat(M + 440, 'Gol fatti / subiti', `${summary.stats.goalsFor} / ${summary.stats.goalsAgainst}`, 260);
  stat(M + 720, 'Vittorie', `${summary.stats.wins} su ${summary.stats.played}`, 240);
  if (summary.scorers.length) {
    ctx.fillStyle = INK;
    ctx.fillText(
      fitFont(ctx, `Marcatori: ${summary.scorers.slice(0, 4).map(s => `${s.name} ${s.goals}`).join(' · ')}`, W - 2 * M - 260, 600, SANS, 26, 18),
      M,
      footY + 120
    );
  }
  // Indirizzo del sito: ogni card condivisa fa da biglietto da visita
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'right';
  ctx.fillText('fantaclash.it', W - M, footY + 120);

  // Cornice
  ctx.strokeStyle = INK;
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, W - 16, H - 16);

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
