
import { useRef, useState, type ReactNode } from 'react'
import {
  Waves, Camera, Radio, LayoutDashboard, ScanSearch, MapPin,
  Clock3, Bell, BarChart3, Settings, Search, ChevronDown,
  ArrowUpRight, Recycle, Image as ImageIcon, Menu, X, Plus,
  Activity, AlertTriangle, CheckCircle2, FileImage, Upload,
  Droplets, ExternalLink
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts'
import './App.css'

type DetectionResult = {
  filename: string
  image_width: number
  image_height: number
  detection_count: number
  detections: {
    label: string
    confidence: number
    box: { x1: number; y1: number; x2: number; y2: number }
  }[]
  annotated_image: string
  model: string
  mode: string
  warning: string
}

type AlertItem = {
  id: number
  name: string
  code: string
  level: 'High' | 'Medium' | 'Low'
  time: string
  detail: string
}

const initialAlerts: AlertItem[] = [
  { id: 1, name: 'Ganges Upper', code: 'GU-08', level: 'High', time: '2 mins ago', detail: 'High visible debris density detected.' },
  { id: 2, name: 'Coom River', code: 'CR-03', level: 'Medium', time: '18 mins ago', detail: 'Debris accumulation requires review.' },
  { id: 3, name: 'Yamuna Delhi', code: 'YD-12', level: 'High', time: '45 mins ago', detail: 'Priority inspection recommended.' },
  { id: 4, name: 'Adyar Estuary', code: 'AE-02', level: 'Low', time: '1h 20m ago', detail: 'Low sample debris density.' },
]

const activity = [
  { day: 'Oct 10', plastic: 42, other: 12 },
  { day: 'Oct 11', plastic: 58, other: 18 },
  { day: 'Oct 12', plastic: 47, other: 14 },
  { day: 'Oct 13', plastic: 83, other: 24 },
  { day: 'Oct 14', plastic: 67, other: 19 },
  { day: 'Oct 15', plastic: 112, other: 34 },
  { day: 'Oct 16', plastic: 91, other: 27 },
  { day: 'Oct 17', plastic: 138, other: 43 },
  { day: 'Oct 18', plastic: 105, other: 31 },
]

const sampleScans = [
  { date: 'Oct 18, 11:42 AM', location: 'Ganges Upper', objects: 142, level: 'High' },
  { date: 'Oct 18, 10:18 AM', location: 'Coom River', objects: 67, level: 'Medium' },
  { date: 'Oct 18, 09:05 AM', location: 'Adyar Estuary', objects: 12, level: 'Low' },
  { date: 'Oct 17, 04:21 PM', location: 'Yamuna Delhi', objects: 98, level: 'High' },
]

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Detection Lab', icon: ScanSearch },
  { label: 'Hotspot Map', icon: MapPin },
  { label: 'Scan History', icon: Clock3 },
  { label: 'Pollution Alerts', icon: Bell },
  { label: 'Reports', icon: BarChart3 },
]

const API_URL = 'http://127.0.0.1:8000'

function App() {
  const [page, setPage] = useState('Overview')
  const [filter, setFilter] = useState('All')
  const [menuOpen, setMenuOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null)
  const [detectionError, setDetectionError] = useState('')
  const [resolved, setResolved] = useState<number[]>([4])
  const [notice, setNotice] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const activeAlertCount = initialAlerts.filter(
    alert => !resolved.includes(alert.id)
  ).length

  const visibleAlerts = initialAlerts.filter(alert => {
    const isResolved = resolved.includes(alert.id)

    if (filter === 'All') return true
    if (filter === 'Active') return !isResolved
    if (filter === 'Resolved') return isResolved

    return alert.level === filter
  })

  function openPage(label: string) {
    setPage(label)
    setMenuOpen(false)
    setNotice('')
  }

  function chooseFile(selected: File | undefined) {
    if (!selected) return

    if (!selected.type.startsWith('image/')) {
      setDetectionError('Please choose a valid image file.')
      return
    }

    setFile(selected)
    setDetectionResult(null)
    setDetectionError('')
    setNotice('')
  }

  async function runDetection() {
    if (!file) {
      setDetectionError('Choose a water-body image before running detection.')
      return
    }

    setDetecting(true)
    setDetectionError('')
    setDetectionResult(null)
    setNotice('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_URL}/api/detect`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Image analysis failed.')
      }

      setDetectionResult(result as DetectionResult)
      setNotice('The API returned results for your uploaded image.')
    } catch (error) {
      setDetectionError(
        error instanceof Error
          ? `${error.message} Check that the Python API is running on port 8000.`
          : 'Could not connect to the detection API.'
      )
    } finally {
      setDetecting(false)
    }
  }

  function markResolved(id: number) {
    setResolved(old =>
      old.includes(id)
        ? old.filter(item => item !== id)
        : [...old, id]
    )
  }

  function openDetectionLab() {
    setScanOpen(false)
    setPage('Detection Lab')
    setMenuOpen(false)
    setDetectionError('')
  }

  const displayScans = detectionResult
    ? [
        {
          date: 'Just now',
          location: 'Manual image upload',
          objects: detectionResult.detection_count,
          level: 'Analysis',
        },
        ...sampleScans,
      ]
    : sampleScans

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Waves size={30} /></div>
          <div>
            <div className="brand-name">DebriScan</div>
            <div className="brand-subtitle">Smart Water Intelligence</div>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => openPage(label)}
              className={`nav-item ${page === label ? 'nav-active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === 'Pollution Alerts' && (
                <span className="nav-count">{activeAlertCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="network-card">
            <div className="network-heading">
              <span className="live-dot" /> Prototype status
            </div>
            <p>Frontend operational</p>
            <div className="network-progress"><span /></div>
            <small>Camera and sensor integration pending</small>
          </div>

          <button
            className={`nav-item ${page === 'Settings' ? 'nav-active' : ''}`}
            onClick={() => openPage('Settings')}
          >
            <Settings size={19} /><span>Settings</span>
          </button>

          <div className="profile">
            <div className="avatar">D</div>
            <div className="profile-info">
              <strong>DebriScan Team</strong>
              <span>Research prototype</span>
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            <span>DebriScan</span>
            <span className="crumb-slash">/</span>
            <strong>{page}</strong>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input
                placeholder="Search locations or scans..."
                aria-label="Search"
                onChange={() => {}}
              />
            </label>

            <span className="demo-badge">
              <span className="live-dot" /> Prototype
            </span>

            <button
              className="primary-button"
              onClick={() => {
                setFile(null)
                setDetectionResult(null)
                setDetectionError('')
                setScanOpen(true)
              }}
            >
              <Plus size={18} /> Run New Scan
            </button>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <Droplets size={14} /> WATER-BODY MONITORING
              </div>
              <h1>
                {page === 'Overview' ? 'Monitoring Dashboard' : page}
              </h1>
              <p>
                {page === 'Overview'
                  ? 'A clearer view of visible debris across rivers, lakes, ponds and other water bodies.'
                  : `Explore ${page.toLowerCase()} across your DebriScan monitoring workflow.`}
              </p>
            </div>
            <div className="updated-label">
              <span className="live-dot" /> Prototype online
            </div>
          </div>

          {notice && (
            <div className="notice">
              <Activity size={17} />
              <span>{notice}</span>
              <button onClick={() => setNotice('')} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}

          {page === 'Overview' && (
            <>
              <div className="demo-notice">
                <Activity size={16} />
                <span>
                  <strong>Demo data</strong> — monitoring statistics, map
                  checkpoints and historical trends are illustrative.
                  Actual image results appear after a successful API scan.
                </span>
              </div>

              <section className="stats-grid">
                <StatCard
                  title="Images Analysed"
                  value={String(128 + (detectionResult ? 1 : 0))}
                  unit="scans"
                  change="Sample + current session"
                  icon={<ImageIcon />}
                  tone="blue"
                />
                <StatCard
                  title="Detected Objects"
                  value={String(864 + (detectionResult?.detection_count ?? 0))}
                  unit="objects"
                  change="Sample + latest result"
                  icon={<Recycle />}
                  tone="teal"
                />
                <StatCard
                  title="Priority Hotspots"
                  value="06"
                  unit="locations"
                  change="Sample locations"
                  icon={<MapPin />}
                  tone="amber"
                />
                <StatCard
                  title="Active Alerts"
                  value={String(activeAlertCount)}
                  unit="alerts"
                  change="Sample alerts"
                  icon={<Bell />}
                  tone="red"
                />
              </section>

              <section className="camera-panel">
                <div className="camera-visual">
                  <div className="camera-visual-icon">
                    <Camera size={30} />
                  </div>
                  <span className="camera-preview-label">CAMERA PREVIEW</span>
                  <div className="camera-offline-message">
                    <Radio size={19} />
                    <strong>Awaiting hardware integration</strong>
                    <span>
                      Live footage will appear here once a camera is
                      connected to the backend.
                    </span>
                  </div>
                  <div className="camera-corner camera-corner-tl" />
                  <div className="camera-corner camera-corner-tr" />
                  <div className="camera-corner camera-corner-bl" />
                  <div className="camera-corner camera-corner-br" />
                </div>

                <div className="camera-details">
                  <div className="camera-title-row">
                    <div>
                      <div className="camera-eyebrow">
                        PRIMARY MONITORING SOURCE
                      </div>
                      <h2>Fixed Camera Monitoring</h2>
                      <p>
                        Monitor water surfaces and receive new debris
                        detection results automatically.
                      </p>
                    </div>
                    <span className="camera-status">
                      <span className="status-dot" /> Awaiting setup
                    </span>
                  </div>

                  <div className="camera-info-grid">
                    <div>
                      <span>Connection</span>
                      <strong>Not configured</strong>
                    </div>
                    <div>
                      <span>Last capture</span>
                      <strong>Not available</strong>
                    </div>
                    <div>
                      <span>Detection engine</span>
                      <strong>API baseline</strong>
                    </div>
                  </div>

                  <button
                    className="primary-button camera-test-button"
                    onClick={openDetectionLab}
                  >
                    <ScanSearch size={17} />
                    Test with an image
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              </section>

              <section className="main-grid">
                <article className="panel map-panel">
                  <PanelHeader
                    icon={<MapPin />}
                    title="Monitoring Network"
                    subtitle="Illustrative checkpoints across different water bodies"
                    action="Map view"
                    onAction={() => openPage('Hotspot Map')}
                  />
                  <div className="map-illustration">
                    <div className="map-water water-one" />
                    <div className="map-water water-two" />
                    <div className="map-water water-three" />
                    <div className="map-grid" />
                    <div className="map-label map-label-one">MONITORING ZONE 01</div>
                    <div className="map-label map-label-two">WATER BODY 02</div>

                    {[
                      { x: 20, y: 31, name: 'Ganges Upper', level: 'High' },
                      { x: 55, y: 25, name: 'Coom River', level: 'Medium' },
                      { x: 72, y: 57, name: 'Adyar Estuary', level: 'Low' },
                      { x: 39, y: 70, name: 'Checkpoint 04', level: 'Low' },
                      { x: 83, y: 34, name: 'Zone 05', level: 'Medium' },
                    ].map(point => (
                      <div
                        key={point.name}
                        className={`map-pin pin-${point.level.toLowerCase()}`}
                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                        title={`${point.name}: ${point.level}`}
                      >
                        <span className="pin-dot" />
                        <span className="pin-label">
                          {point.name}
                          <small>{point.level} priority</small>
                        </span>
                      </div>
                    ))}

                    <div className="map-legend">
                      <span><i className="legend-dot low" />Low</span>
                      <span><i className="legend-dot medium" />Medium</span>
                      <span><i className="legend-dot high" />High</span>
                    </div>
                    <div className="map-attribution">
                      Illustrative map · not live geospatial data
                    </div>
                  </div>
                </article>

                <article className="panel alerts-panel">
                  <PanelHeader
                    icon={<Bell />}
                    title="Pollution Alerts"
                    subtitle="Sample events requiring attention"
                    action="View all"
                    onAction={() => openPage('Pollution Alerts')}
                  />
                  <div className="alert-list">
                    {initialAlerts.slice(0, 4).map(alert => (
                      <div className="alert-row" key={alert.id}>
                        <div className={`alert-symbol ${alert.level.toLowerCase()}`}>
                          {alert.level === 'High'
                            ? <AlertTriangle size={17} />
                            : alert.level === 'Medium'
                              ? <Activity size={17} />
                              : <CheckCircle2 size={17} />}
                        </div>
                        <div className="alert-copy">
                          <strong>{alert.name}</strong>
                          <span>Checkpoint {alert.code}</span>
                          <small>{alert.detail}</small>
                        </div>
                        <div className="alert-meta">
                          <span className={`severity ${alert.level.toLowerCase()}`}>
                            {alert.level}
                          </span>
                          <small>
                            {resolved.includes(alert.id) ? 'Resolved' : alert.time}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel chart-panel">
                  <PanelHeader
                    icon={<BarChart3 />}
                    title="Detection Activity"
                    subtitle="Illustrative object counts over the last 9 days"
                  />
                  <div className="chart-legend">
                    <span><i className="chart-dot plastic" />Visible plastic</span>
                    <span><i className="chart-dot other" />Other debris</span>
                  </div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="plasticFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1689d4" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#1689d4" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="otherFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#16b89a" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="#16b89a" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e8eff7" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8091a9' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#8091a9' }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e1eaf4', fontSize: 12 }} />
                        <Area type="monotone" dataKey="plastic" name="Visible plastic" stroke="#1689d4" strokeWidth={2.5} fill="url(#plasticFill)" />
                        <Area type="monotone" dataKey="other" name="Other debris" stroke="#16b89a" strokeWidth={2} fill="url(#otherFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-foot">
                    <span><span className="live-dot" /> Sample trend data</span>
                    <span>Counts are illustrative</span>
                  </div>
                </article>

                <article className="panel scans-panel">
                  <PanelHeader
                    icon={<Clock3 />}
                    title="Recent Scans"
                    subtitle="Sample records and current-session analysis"
                    action="View history"
                    onAction={() => openPage('Scan History')}
                  />
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr><th>Location / Source</th><th>Objects</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {displayScans.slice(0, 5).map((scan, index) => (
                          <tr key={`${scan.location}-${index}`}>
                            <td>
                              <strong>{scan.location}</strong>
                              <small>{scan.date}</small>
                            </td>
                            <td>{scan.objects}</td>
                            <td>
                              {scan.level === 'Analysis'
                                ? <span className="severity low">API result</span>
                                : <span className={`severity ${scan.level.toLowerCase()}`}>{scan.level}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button className="text-link" onClick={() => openPage('Scan History')}>
                    Explore scan history <ExternalLink size={14} />
                  </button>
                </article>
              </section>
            </>
          )}

          {page === 'Detection Lab' && (
            <section className="panel workspace-panel">
              <PanelHeader
                icon={<ScanSearch />}
                title="Debris Detection Lab"
                subtitle="Upload an image of a water body to run the connected Python API."
              />

              <div
                className="upload-zone"
                onClick={() => inputRef.current?.click()}
                onDragOver={event => event.preventDefault()}
                onDrop={event => {
                  event.preventDefault()
                  chooseFile(event.dataTransfer.files[0])
                }}
              >
                {file ? <FileImage size={42} /> : <Upload size={42} />}
                <h3>{file ? file.name : 'Upload a water-body image'}</h3>
                <p>
                  {file
                    ? `${(file.size / 1024).toFixed(0)} KB · Ready for analysis`
                    : 'Drag and drop an image here, or click to browse.'}
                </p>
                <span className="secondary-button">Choose image</span>
                <small>JPG, PNG or WEBP · Maximum 10 MB</small>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={event => chooseFile(event.target.files?.[0])}
              />

              {file && (
                <div className="upload-actions">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setFile(null)
                      setDetectionResult(null)
                      setDetectionError('')
                    }}
                  >
                    Remove image
                  </button>
                  <button
                    className="primary-button"
                    onClick={runDetection}
                    disabled={detecting}
                  >
                    <ScanSearch size={17} />
                    {detecting ? 'Analysing image...' : 'Run Detection'}
                  </button>
                </div>
              )}

              {detectionError && (
                <div className="notice detection-error">
                  <AlertTriangle size={17} />
                  <span>{detectionError}</span>
                  <button onClick={() => setDetectionError('')} aria-label="Dismiss">
                    <X size={16} />
                  </button>
                </div>
              )}

              {detecting && (
                <div className="info-banner">
                  <Activity size={18} />
                  <span>Processing your image. The first model run may take longer.</span>
                </div>
              )}

              {detectionResult && (
                <section className="detection-results">
                  <div className="results-heading">
                    <div>
                      <div className="camera-eyebrow">IMAGE ANALYSIS COMPLETE</div>
                      <h2>Detection Results</h2>
                      <p>
                        {detectionResult.filename} · {detectionResult.image_width} × {detectionResult.image_height}
                      </p>
                    </div>
                    <span className="severity medium">
                      {detectionResult.detection_count} objects
                    </span>
                  </div>

                  <img
                    className="annotated-image"
                    src={detectionResult.annotated_image}
                    alt="Uploaded image annotated with model-generated bounding boxes"
                  />

                  <div className="info-banner">
                    <AlertTriangle size={18} />
                    <span>{detectionResult.warning}</span>
                  </div>

                  <h3 className="results-subtitle">Detected objects</h3>

                  {detectionResult.detections.length === 0 ? (
                    <p className="empty-state">
                      No objects were detected above the model's confidence
                      threshold. This does not prove the water is free of debris.
                    </p>
                  ) : (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr><th>Object label</th><th>Confidence</th><th>Bounding box</th></tr>
                        </thead>
                        <tbody>
                          {detectionResult.detections.map((item, index) => (
                            <tr key={`${item.label}-${index}`}>
                              <td><strong>{item.label}</strong></td>
                              <td>{(item.confidence * 100).toFixed(1)}%</td>
                              <td>
                                {Math.round(item.box.x1)}, {Math.round(item.box.y1)} –{' '}
                                {Math.round(item.box.x2)}, {Math.round(item.box.y2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="results-model">
                    Model: {detectionResult.model} · Baseline evaluation only
                  </p>
                </section>
              )}

              <div className="info-banner">
                <Activity size={18} />
                <span>
                  <strong>Model limitation:</strong> the current pretrained model
                  is not specifically trained to identify all water debris.
                  We must validate and improve it before using results for
                  environmental decisions.
                </span>
              </div>
            </section>
          )}

          {page === 'Pollution Alerts' && (
            <section className="panel workspace-panel">
              <PanelHeader
                icon={<Bell />}
                title="Pollution Alerts"
                subtitle="Review illustrative alerts and update their status."
              />
              <div className="filter-row">
                {['All', 'High', 'Medium', 'Low', 'Active', 'Resolved'].map(value => (
                  <button
                    key={value}
                    className={`filter-chip ${filter === value ? 'filter-selected' : ''}`}
                    onClick={() => setFilter(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="full-alert-list">
                {visibleAlerts.map(alert => (
                  <div className="full-alert" key={alert.id}>
                    <div className={`alert-symbol ${alert.level.toLowerCase()}`}>
                      <AlertTriangle size={19} />
                    </div>
                    <div className="alert-copy">
                      <strong>{alert.name}</strong>
                      <span>Checkpoint {alert.code} · {alert.level} priority · {alert.time}</span>
                      <p>{alert.detail}</p>
                    </div>
                    <div className="full-alert-action">
                      <span className={`severity ${alert.level.toLowerCase()}`}>
                        {alert.level}
                      </span>
                      <button className="secondary-button" onClick={() => markResolved(alert.id)}>
                        {resolved.includes(alert.id) ? 'Reopen alert' : 'Mark resolved'}
                      </button>
                    </div>
                  </div>
                ))}
                {visibleAlerts.length === 0 && (
                  <p className="empty-state">No alerts match this filter.</p>
                )}
              </div>
            </section>
          )}

          {page === 'Hotspot Map' && (
            <section className="panel workspace-panel">
              <PanelHeader
                icon={<MapPin />}
                title="Monitoring Hotspots"
                subtitle="Illustrative checkpoints; live geospatial data is not connected."
              />
              <div className="map-illustration large-map">
                <div className="map-water water-one" />
                <div className="map-water water-two" />
                <div className="map-water water-three" />
                <div className="map-grid" />
                {[
                  { x: 20, y: 31, name: 'Ganges Upper', level: 'High' },
                  { x: 55, y: 25, name: 'Coom River', level: 'Medium' },
                  { x: 72, y: 57, name: 'Adyar Estuary', level: 'Low' },
                  { x: 39, y: 70, name: 'Checkpoint 04', level: 'Low' },
                  { x: 83, y: 34, name: 'Zone 05', level: 'Medium' },
                ].map(point => (
                  <div
                    key={point.name}
                    className={`map-pin pin-${point.level.toLowerCase()}`}
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  >
                    <span className="pin-dot" />
                    <span className="pin-label">
                      {point.name}<small>{point.level} priority</small>
                    </span>
                  </div>
                ))}
                <div className="map-attribution">Illustrative checkpoint layout · not live map data</div>
              </div>
            </section>
          )}

          {page === 'Scan History' && (
            <section className="panel workspace-panel">
              <PanelHeader
                icon={<Clock3 />}
                title="Scan History"
                subtitle="Sample history and results from the current browser session."
              />
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Date & time</th><th>Location / Source</th><th>Objects</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {displayScans.map((scan, index) => (
                      <tr key={`${scan.location}-${index}`}>
                        <td>{scan.date}</td>
                        <td><strong>{scan.location}</strong></td>
                        <td>{scan.objects}</td>
                        <td>
                          {scan.level === 'Analysis'
                            ? <span className="severity low">API result</span>
                            : <span className={`severity ${scan.level.toLowerCase()}`}>{scan.level}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="info-banner">
                <Clock3 size={18} />
                <span>Persistent scan history will require database integration. The current-session result is held in browser memory.</span>
              </div>
            </section>
          )}

          {page === 'Reports' && (
            <section className="panel workspace-panel">
              <PanelHeader
                icon={<BarChart3 />}
                title="Environmental Reports"
                subtitle="Reporting will use verified scan results once persistence is implemented."
              />
              <div className="empty-state">
                <BarChart3 size={32} />
                <h3>Reports are under development</h3>
                <p>Exportable summaries and validated pollution trends will be added after database integration.</p>
              </div>
            </section>
          )}

          {page === 'Settings' && (
            <section className="panel workspace-panel">
              <PanelHeader
                icon={<Settings />}
                title="Settings"
                subtitle="Current prototype configuration."
              />
              <div className="settings-list">
                <div><strong>Data mode</strong><span>Demo + current-session analysis</span></div>
                <div><strong>Detection API</strong><span>{API_URL}</span></div>
                <div><strong>Detection model</strong><span>Pretrained baseline</span></div>
                <div><strong>Camera integration</strong><span>Pending hardware setup</span></div>
                <div><strong>Database</strong><span>Not connected</span></div>
              </div>
            </section>
          )}

          <footer className="footer">
            <span><Waves size={15} /> DebriScan <span className="footer-muted">· Smart Water Intelligence</span></span>
            <span>Research prototype · Demo data clearly labelled</span>
          </footer>
        </div>
      </main>

      {scanOpen && (
        <div className="modal-backdrop" onClick={() => setScanOpen(false)}>
          <div className="scan-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <div className="modal-icon"><ScanSearch size={22} /></div>
                <h2>Start a new scan</h2>
                <p>Select an image to send to the DebriScan detection API.</p>
              </div>
              <button className="icon-button" onClick={() => setScanOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <button
              className="modal-upload"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={24} />
              <strong>{file ? file.name : 'Choose an image'}</strong>
              <span>JPG, PNG or WEBP · Maximum 10 MB</span>
            </button>

            <div className="info-banner">
              <Activity size={17} />
              <span>This will run the current pretrained baseline. It is not yet a validated debris-specific model.</span>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setScanOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={openDetectionLab}>
                Continue to Detection Lab <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  title, value, unit, change, icon, tone,
}: {
  title: string
  value: string
  unit: string
  change: string
  icon: ReactNode
  tone: string
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <div className={`stat-icon ${tone}`}>{icon}</div>
      </div>
      <div className="stat-value">{value}<span>{unit}</span></div>
      <div className="stat-foot">
        <span className={`stat-trend ${tone}`}>
          <ArrowUpRight size={14} />{change}
        </span>
      </div>
    </article>
  )
}

function PanelHeader({
  icon, title, subtitle, action, onAction,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="panel-header">
      <div className="panel-heading-icon">{icon}</div>
      <div className="panel-heading-copy">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && (
        <button className="panel-action" onClick={onAction}>
          {action} <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  )
}

export default App
