// ---------------------------------------------------------------------------
// Palette system — Task 15
// Named color tokens applied to mascot body + head materials at runtime.
// 'original' is a sentinel that restores the mascot's built-in colors.
// ---------------------------------------------------------------------------

export type PaletteId =
  | 'original'
  | 'snow'
  | 'midnight'
  | 'sakura'
  | 'matcha'
  | 'tangerine'
  | 'lavender'

export interface Palette {
  id:     PaletteId
  label:  string
  swatch: number        // CSS hex for the UI circle
  body?:  number        // Three.js hex — undefined = restore original
}

export const PALETTE_LIST: Palette[] = [
  { id: 'original',  label: 'Original',  swatch: 0x888896 },
  { id: 'snow',      label: 'Snow',      swatch: 0xF0EDEA, body: 0xF0EDEA },
  { id: 'midnight',  label: 'Midnight',  swatch: 0x1C2540, body: 0x1C2540 },
  { id: 'sakura',    label: 'Sakura',    swatch: 0xF5B8C8, body: 0xF5B8C8 },
  { id: 'matcha',    label: 'Matcha',    swatch: 0x7CAD72, body: 0x7CAD72 },
  { id: 'tangerine', label: 'Tangerine', swatch: 0xF87B2C, body: 0xF87B2C },
  { id: 'lavender',  label: 'Lavender',  swatch: 0xA084C8, body: 0xA084C8 },
]
