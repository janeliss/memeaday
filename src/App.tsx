import { useState, useMemo, useRef, useCallback } from 'react'
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

function App() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [memeImage, setMemeImage] = useState<string | null>(loadTodaysMeme)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dayIndex = getDayOfYear()
  const dailyMessage = DAILY_MESSAGES[dayIndex % DAILY_MESSAGES.length]
  const today = useMemo(getToday, [])
  const issueNumber = String(dayIndex).padStart(3, '0')

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
    const shareText = `${dailyMessage}\n\nSent via The Daily Meme Letter — Issue #${issueNumber}`

    // Try native share with image on mobile
    if (memeImage && navigator.share) {
      try {
        const res = await fetch(memeImage)
        const blob = await res.blob()
        const file = new File([blob], 'meme.png', { type: blob.type })
        await navigator.share({ text: shareText, files: [file] })
        return
      } catch { /* user cancelled or unsupported, fall through */ }
    }

    // Fallback: copy text to clipboard
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = shareText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <main className="app">
      {/* Masthead */}
      <header className="masthead">
        <div className="masthead-badge">EST. 2025</div>
        <h1 className="masthead-title">THE DAILY MEME LETTER</h1>
        <p className="masthead-sub">A curated dose of internet joy — delivered fresh</p>
      </header>

      {/* Issue bar */}
      <div className="issue-bar">
        <span className="issue-number">ISSUE #{issueNumber}</span>
        <span className="issue-divider" />
        <span className="issue-date">{today.weekday} — {today.month} {today.day}, {today.year}</span>
      </div>

      {/* Envelope */}
      <div className={`envelope ${isOpen ? 'envelope--open' : ''}`}>
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
            <span>NEW</span>
          </div>

          {/* Message area */}
          <div className="envelope-message">
            <p className="envelope-to">TO: YOU</p>
            <p className="envelope-body">{dailyMessage}</p>
            <div className="envelope-from">
              <span>FROM: THE INTERNET</span>
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
              OPEN LETTER
              <span className="open-btn-arrow">→</span>
            </button>
          )}
        </div>

        {/* Inside of envelope */}
        {isOpen && (
          <div className="envelope-inside">
            <div className="envelope-inside-header">
              <span className="inside-label">CONTENTS</span>
              <span className="inside-issue">#{issueNumber}</span>
            </div>

            <div className="meme-reveal">
              <div className="meme-reveal-badge">TODAY'S MEME</div>

              {memeImage ? (
                <div className="meme-uploaded">
                  <img src={memeImage} alt="Today's meme" className="meme-preview" />
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
              >
                {copied ? (
                  <>
                    <span className="share-icon">✓</span>
                    COPIED TO CLIPBOARD
                  </>
                ) : (
                  <>
                    <span className="share-icon">⎘</span>
                    SHARE THIS LETTER
                  </>
                )}
              </button>
              <p className="share-hint">
                {memeImage ? 'Shares meme image + message on mobile' : 'Copies letter text to clipboard'}
              </p>
            </div>

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
            <span className="stat-number">{issueNumber}</span>
            <span className="stat-label">ISSUES THIS YEAR</span>
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
