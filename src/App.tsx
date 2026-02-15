import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import './App.css'

const DAILY_MESSAGES = [
  "You're someone's reason to smile today.",
  "The algorithm chose you. Feel special.",
  "Today's vibe: unhinged excellence.",
  "Plot twist: you ARE the main character.",
  "Certified fresh. Emotionally available meme enclosed.",
  "Handle with care. Contents may cause snorting.",
  "This meme was hand-selected by the universe.",
  "Open immediately. Serotonin inside.",
  "First class delivery. No cap.",
  "Warning: may improve your entire day.",
]

interface SharedData {
  m: string   // message
  i: string   // image data URL
  n: string   // issue number
}

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
}

function getToday() {
  const now = new Date()
  const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const day = now.getDate()
  const year = now.getFullYear()
  const weekday = now.toLocaleString('en-US', { weekday: 'long' }).toUpperCase()
  return { month, day, year, weekday }
}

function loadTodaysMeme(): string | null {
  const saved = localStorage.getItem('memeaday-meme')
  if (!saved) return null
  try {
    const { date, dataUrl } = JSON.parse(saved)
    if (date === getTodayKey()) return dataUrl
  } catch { /* corrupted, ignore */ }
  return null
}

function compressImage(dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

function encodeShareData(data: SharedData): string {
  const json = JSON.stringify(data)
  return btoa(unescape(encodeURIComponent(json)))
}

function decodeShareData(encoded: string): SharedData | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)))
    const data = JSON.parse(json)
    if (data.m && data.i && data.n) return data as SharedData
  } catch { /* invalid data */ }
  return null
}

function parseSharedFromHash(): SharedData | null {
  const hash = window.location.hash
  if (!hash.startsWith('#data=')) return null
  return decodeShareData(hash.slice(6))
}

function App() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [memeImage, setMemeImage] = useState<string | null>(loadTodaysMeme)
  const [sharedData, setSharedData] = useState<SharedData | null>(parseSharedFromHash)
  const [sharing, setSharing] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dayIndex = getDayOfYear()
  const dailyMessage = DAILY_MESSAGES[dayIndex % DAILY_MESSAGES.length]
  const today = useMemo(getToday, [])
  const issueNumber = String(dayIndex).padStart(3, '0')

  // Auto-open the envelope when viewing a shared letter
  useEffect(() => {
    if (sharedData) setIsOpen(true)
  }, [sharedData])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setMemeImage(dataUrl)
      localStorage.setItem('memeaday-meme', JSON.stringify({
        date: getTodayKey(),
        dataUrl,
      }))
    }
    reader.readAsDataURL(file)
  }, [])

  const handleRemoveMeme = useCallback(() => {
    setMemeImage(null)
    localStorage.removeItem('memeaday-meme')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleShare = async () => {
    if (!memeImage) return
    setSharing(true)
    try {
      const compressed = await compressImage(memeImage)
      const payload = encodeShareData({
        m: customMessage || dailyMessage,
        i: compressed,
        n: issueNumber,
      })
      const shareUrl = `${window.location.origin}${window.location.pathname}#data=${payload}`

      // Try native share on mobile
      if (navigator.share) {
        try {
          await navigator.share({ url: shareUrl })
          setSharing(false)
          return
        } catch { /* user cancelled, fall through to clipboard */ }
      }

      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
      } catch {
        const textarea = document.createElement('textarea')
        textarea.value = shareUrl
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } finally {
      setSharing(false)
    }
  }

  const handleSendOwn = () => {
    setSharedData(null)
    setIsOpen(false)
    setMemeImage(null)
    localStorage.removeItem('memeaday-meme')
    if (fileInputRef.current) fileInputRef.current.value = ''
    window.history.replaceState(null, '', window.location.pathname)
  }

  // Determine what to display
  const displayIssue = sharedData ? sharedData.n : issueNumber
  const displayImage = sharedData ? sharedData.i : memeImage
  const isReceived = !!sharedData

  return (
    <main className="app">
      {/* Masthead */}
      <header className="masthead">
        <div className="masthead-badge">EST. 2025</div>
        <h1 className="masthead-title">THE DAILY MEME LETTER</h1>
        <p className="masthead-sub">A curated dose of internet joy — delivered fresh</p>
      </header>

      {/* Received banner */}
      {isReceived && (
        <div className="received-banner">
          <span className="received-banner-icon">✉</span>
          <span>Someone sent you a meme letter!</span>
        </div>
      )}

      {/* Issue bar */}
      <div className="issue-bar">
        <span className="issue-number">ISSUE #{displayIssue}</span>
        <span className="issue-divider" />
        <span className="issue-date">{today.weekday} — {today.month} {today.day}, {today.year}</span>
      </div>

      {/* Envelope */}
      <div className={`envelope ${isOpen ? 'envelope--open' : ''} ${isReceived ? 'envelope--received' : ''}`}>
        {/* Front of envelope */}
        <div className="envelope-front" onClick={() => !isOpen && setIsOpen(true)}>
          {/* Stamp */}
          <div className="stamp">
            <div className="stamp-inner">
              <span className="stamp-number">{today.day}</span>
              <span className="stamp-month">{today.month}</span>
            </div>
          </div>

          {/* Starburst accent */}
          <div className="starburst" aria-hidden>
            <span>{isReceived ? '♥' : 'NEW'}</span>
          </div>

          {/* Message area */}
          <div className="envelope-message">
            <p className="envelope-to">TO: YOU</p>
            {isReceived ? (
              <p className="envelope-body">{sharedData!.m}</p>
            ) : (
              <textarea
                className="envelope-body envelope-body--editable"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={dailyMessage}
                rows={2}
                maxLength={120}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="envelope-from">
              <span>{isReceived ? 'FROM: A FRIEND' : 'FROM: THE INTERNET'}</span>
              <span className="envelope-heart" aria-hidden>♥</span>
            </div>
          </div>

          {/* Postal marks */}
          <div className="postal-marks">
            <span className="postal-mark">FIRST CLASS</span>
            <span className="postal-mark">PRIORITY MEME</span>
            <span className="postal-mark postal-mark--stamp">✦ VERIFIED FUNNY ✦</span>
          </div>

          {!isOpen && (
            <button className="open-btn" type="button">
              {isReceived ? 'OPEN YOUR LETTER' : 'OPEN LETTER'}
              <span className="open-btn-arrow">→</span>
            </button>
          )}
        </div>

        {/* Inside of envelope */}
        {isOpen && (
          <div className="envelope-inside">
            <div className="envelope-inside-header">
              <span className="inside-label">{isReceived ? 'YOU RECEIVED' : 'CONTENTS'}</span>
              <span className="inside-issue">#{displayIssue}</span>
            </div>

            {/* Shared meme view OR upload flow */}
            {isReceived ? (
              <>
                <div className="meme-reveal">
                  <div className="meme-reveal-badge">THEIR MEME</div>
                  <div className="meme-uploaded">
                    <img src={displayImage!} alt="Shared meme" className="meme-preview" />
                  </div>
                </div>

                <div className="share-section">
                  <button
                    className="send-own-btn"
                    onClick={handleSendOwn}
                    type="button"
                  >
                    <span className="send-own-icon">+</span>
                    SEND YOUR OWN MEME LETTER
                  </button>
                  <p className="share-hint">Upload your meme and send the chain forward</p>
                </div>
              </>
            ) : (
              <>
                <div className="meme-reveal">
                  <div className="meme-reveal-badge">TODAY'S MEME</div>

                  {displayImage ? (
                    <div className="meme-uploaded">
                      <img src={displayImage} alt="Today's meme" className="meme-preview" />
                      <button
                        className="meme-remove"
                        onClick={handleRemoveMeme}
                        type="button"
                      >
                        ✕ REMOVE
                      </button>
                    </div>
                  ) : (
                    <div className="meme-upload">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="meme-file-input"
                        id="meme-upload"
                      />
                      <label htmlFor="meme-upload" className="meme-upload-label">
                        <span className="meme-upload-icon">+</span>
                        <span className="meme-upload-text">UPLOAD MEME</span>
                        <span className="meme-upload-hint">Tap to pick from camera roll</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="share-section">
                  <button
                    className="share-btn"
                    onClick={handleShare}
                    type="button"
                    disabled={!memeImage || sharing}
                  >
                    {sharing ? (
                      <>
                        <span className="share-icon">⟳</span>
                        GENERATING LINK...
                      </>
                    ) : copied ? (
                      <>
                        <span className="share-icon">✓</span>
                        LINK COPIED!
                      </>
                    ) : (
                      <>
                        <span className="share-icon">⎘</span>
                        SHARE THIS LETTER
                      </>
                    )}
                  </button>
                  <p className="share-hint">
                    {!memeImage
                      ? 'Upload a meme first to share'
                      : 'Creates a shareable link with your meme inside'}
                  </p>
                </div>
              </>
            )}

            <button
              className="close-btn"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ← SEAL ENVELOPE
            </button>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <footer className="footer">
        <div className="footer-stats">
          <div className="stat-block">
            <span className="stat-number">{dayIndex}</span>
            <span className="stat-label">DAYS INTO {today.year}</span>
          </div>
          <div className="stat-block">
            <span className="stat-number">1</span>
            <span className="stat-label">MEME PER DAY</span>
          </div>
          <div className="stat-block">
            <span className="stat-number">∞</span>
            <span className="stat-label">GOOD VIBES</span>
          </div>
        </div>
        <p className="footer-tagline">
          Good design is a conversation between intention and emotion.
        </p>
      </footer>
    </main>
  )
}

export default App
