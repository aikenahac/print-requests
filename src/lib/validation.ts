export function validUsername(value: string) {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(value)
}

export function parseMakerworldUrl(value: string) {
  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase()
    if (url.protocol !== "https:" || (host !== "makerworld.com" && host !== "www.makerworld.com") || !/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?models\/\d+(?:-|\/|$)/i.test(url.pathname)) return null
    return url.toString()
  } catch {
    return null
  }
}

export type RequestInput = {
  title: string
  makerworldUrl: string
  quantity: number
  notes: string | null
  urgent: boolean
  urgentReason: string | null
  amsConfirmed: boolean
  filamentIds: string[]
}

export function parseRequestForm(form: FormData): RequestInput | string {
  const title = String(form.get("title") ?? "").trim()
  const makerworldUrl = parseMakerworldUrl(String(form.get("makerworldUrl") ?? ""))
  const quantity = Number(form.get("quantity"))
  const notes = String(form.get("notes") ?? "").trim()
  const urgent = form.get("urgent") === "on"
  const urgentReason = String(form.get("urgentReason") ?? "").trim()
  const amsConfirmed = form.get("amsConfirmed") === "on"
  const filamentIds = form.getAll("filamentIds").map(String)
  if (title.length < 3 || title.length > 100) return "Enter a title between 3 and 100 characters."
  if (!makerworldUrl) return "Enter a MakerWorld model link."
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return "Quantity must be between 1 and 100."
  if (notes.length > 2000) return "Notes must be 2,000 characters or fewer."
  if (urgent && (urgentReason.length < 3 || urgentReason.length > 500)) return "Explain why the request is urgent (3–500 characters)."
  if (filamentIds.length < 1 || filamentIds.length > 4 || new Set(filamentIds).size !== filamentIds.length) return "Choose between one and four distinct filaments."
  if (filamentIds.length > 1 && !amsConfirmed) return "Confirm that the MakerWorld print profile supports AMS."
  return { title, makerworldUrl, quantity, notes: notes || null, urgent, urgentReason: urgent ? urgentReason : null, amsConfirmed: filamentIds.length > 1, filamentIds }
}
