import { useState, useEffect } from 'react'
import Chart from 'react-apexcharts'
import { Select, Space, ConfigProvider } from 'antd'
import { dimensions } from '../data/questions'
import { apiBaseUrl } from '../config/configuration'
import './Statistics.css'

// Mock statistics for local dev when backend is unavailable
const getMockStatistics = () => {
  const dimCounts = (s1, s2, s3, s4, s5) => ({ 1: s1, 2: s2, 3: s3, 4: s4, 5: s5 })
  const dimensionsData = {}
  dimensions.forEach(dim => {
    dimensionsData[dim.id.toString()] = {
      title: dim.title,
      counts: dimCounts(2, 5, 8, 12, 6),
    }
  })
  const overall = dimCounts(14, 35, 56, 84, 42)
  return {
    totalSubmissions: 42,
    overall,
    dimensions: dimensionsData,
  }
}

function Statistics() {
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  const [filters, setFilters] = useState({
    companySize: [],
    companyCountry: [],
    companyBusiness: []
  })

  const companySizeOptions = [
    { value: '1-10', label: '1-10 Mitarbeitende' },
    { value: '11-50', label: '11-50 Mitarbeitende' },
    { value: '51-250', label: '51-250 Mitarbeitende' },
    { value: '251-1000', label: '251-1000 Mitarbeitende' },
    { value: '1000+', label: 'Mehr als 1000 Mitarbeitende' },
  ]

  const companyBusinessOptions = [
    { value: 'Asset Management', label: 'Asset Management' },
    { value: 'Facility Management', label: 'Facility Management' },
    { value: 'Makler', label: 'Makler' },
    { value: 'Immobilienentwicklung', label: 'Immobilienentwicklung' },
    { value: 'Immobilienverwaltung', label: 'Immobilienverwaltung' },
    { value: 'Immobilienberatung', label: 'Immobilienberatung' },
    { value: 'Projektentwicklung', label: 'Projektentwicklung' },
    { value: 'Immobilienfinanzierung', label: 'Immobilienfinanzierung' },
    { value: 'Andere', label: 'Andere' },
  ]

  const countryOptions = [
    { value: 'DE', label: 'Deutschland' },
    { value: 'AT', label: 'Österreich' },
    { value: 'CH', label: 'Schweiz' },
  ]

  useEffect(() => {
    fetchStatistics()
  }, [filters])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      filters.companySize.forEach(val => params.append('companySize', val))
      filters.companyCountry.forEach(val => params.append('companyCountry', val))
      filters.companyBusiness.forEach(val => params.append('companyBusiness', val))
      
      const url = `${apiBaseUrl}/wizard-statistics${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }

      const data = await response.json()
      setStatistics(data)
      setError(null)
      setUseMockData(false)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('API unavailable, using mock statistics:', err.message)
        setStatistics(getMockStatistics())
        setError(null)
        setUseMockData(true)
      } else {
        console.error('Error fetching statistics:', err)
        setError('Fehler beim Laden der Statistiken')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (category, values) => {
    if (values.includes('all')) {
      setFilters(prev => ({ ...prev, [category]: [] }))
    } else {
      setFilters(prev => ({ ...prev, [category]: values }))
    }
  }

  // CI: Navy ist die Hauptfarbe der Datenreihen, Gold bleibt der Hervorhebung
  // eines einzelnen Werts vorbehalten. Sequenzielle Navy-Rampe Mist -> Navy.
  const chartColors = [
    '#e4e9f2', // Mist (Score 1)
    '#b7c4da', // (Score 2)
    '#7e8fac', // (Score 3)
    '#3d5578', // (Score 4)
    '#0b2447'  // AI@RE Navy (Score 5)
  ]

  // Textfarbe der Datenlabels je Rampenstufe (dunkel auf hell, weiss auf dunkel)
  const chartLabelColors = ['#0b2447', '#0b2447', '#ffffff', '#ffffff', '#ffffff']

  const CHART_FONT = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
  const DISPLAY_FONT = "'Space Grotesk', 'Helvetica Neue', Helvetica, sans-serif"

  const computeAverageScore = (counts) => {
    const total = [1, 2, 3, 4, 5].reduce((sum, score) => sum + (counts[score] || 0), 0)
    if (total === 0) return 0
    const weightedSum = [1, 2, 3, 4, 5].reduce((sum, score) => sum + score * (counts[score] || 0), 0)
    return Math.round((weightedSum / total) * 10) / 10
  }

  const scoreLegendLabels = [
    'Score 1 - Trifft gar nicht zu',
    'Score 2 - Trifft eher nicht zu',
    'Score 3 - Neutral',
    'Score 4 - Trifft eher zu',
    'Score 5 - Trifft voll zu',
  ]

  const createStackedBarChartOptions = () => {
    const categories = dimensions.map(d => d.title)

    const series = [1, 2, 3, 4, 5].map((score, idx) => {
      const data = dimensions.map(dim => {
        const counts = statistics.dimensions[dim.id.toString()]?.counts || {}
        return counts[score] || 0
      })
      return { name: scoreLegendLabels[idx], data }
    })

    return {
      series,
      options: {
        chart: {
          type: 'bar',
          stacked: true,
          stackType: '100%',
          fontFamily: CHART_FONT,
          toolbar: { show: false },
          animations: { enabled: true },
        },
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 2,
          },
        },
        colors: chartColors,
        xaxis: { categories },
        stroke: {
          width: 1,
          colors: ['#ffffff'],
        },
        fill: { opacity: 1 },
        dataLabels: {
          enabled: true,
          formatter: (val) => {
            const n = Number(val)
            return !isNaN(n) && n > 5 ? `${Math.round(n)}%` : ''
          },
          style: {
            fontSize: '12px',
            fontWeight: 600,
            colors: chartLabelColors,
          },
        },
        legend: {
          show: false,
        },
        tooltip: {
          y: {
            formatter: (val) => {
              const n = Number(val)
              return !isNaN(n) ? `${n.toFixed(1)}%` : ''
            },
          },
        },
      },
    }
  }

  const createRadarChartOptions = () => {
    const categories = dimensions.map(d => d.title)
    const data = dimensions.map(dim => {
      const counts = statistics.dimensions[dim.id.toString()]?.counts || {}
      return computeAverageScore(counts)
    })

    return {
      series: [{ name: 'Durchschnitt', data }],
      options: {
        chart: {
          type: 'radar',
          fontFamily: CHART_FONT,
          toolbar: { show: false },
          animations: { enabled: true },
          offsetY: -15,
        },
        grid: {
          padding: {
            top: -40,
            bottom: -40,
          },
        },
        xaxis: { categories },
        yaxis: {
          min: 0,
          max: 5,
          tickAmount: 5,
          labels: {
            formatter: (val) => val.toFixed(1),
          },
        },
        colors: ['#0b2447'],
        stroke: { width: 2 },
        fill: { opacity: 0.2 },
        markers: { size: 4 },
        dataLabels: { enabled: false },
        plotOptions: {
          radar: {
            size: undefined,
            polygons: {
              strokeColors: '#e4e9f2',
              connectorColors: '#e4e9f2',
              fill: { colors: undefined },
            },
          },
        },
        tooltip: {
          y: {
            formatter: (val) => `Ø ${val.toFixed(1)}`,
          },
        },
      },
    }
  }

  const createDonutChartOptions = (title, counts, isOverall = false) => {
    const labels = ['1', '2', '3', '4', '5']
    const series = labels.map(label => counts[label] || 0)
    const total = series.reduce((sum, val) => sum + val, 0)

    const options = {
      chart: {
        type: 'donut',
        fontFamily: CHART_FONT,
        toolbar: { show: false },
        animations: { enabled: true },
        offsetY: isOverall ? -20 : 0,
      },
      grid: isOverall ? { padding: { top: -40, bottom: -40 } } : undefined,
      labels: labels.map(label => `Score ${label}`),
      colors: chartColors,
      fill: { type: 'solid', opacity: 1 },
      dataLabels: {
        enabled: true,
        formatter: function (val) {
          if (total === 0) return '0%'
          const value = Math.round(val)
          return value > 0 ? `${value}%` : ''
        },
        style: {
          fontSize: '12px',
          fontWeight: 600,
          colors: chartLabelColors,
        },
      },
      stroke: {
        width: 2,
        show: true,
        colors: '#ffffff',
      },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: isOverall ? '70%' : '65%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: isOverall ? '14px' : '12px',
                fontWeight: 600,
                color: '#5b6b85',
              },
              value: {
                show: true,
                fontFamily: DISPLAY_FONT,
                fontSize: isOverall ? '20px' : '16px',
                fontWeight: 700,
                color: '#0b2447',
                formatter: (val) => total > 0 ? Math.round(val) : '0',
              },
              total: {
                show: true,
                label: 'Total',
                fontSize: isOverall ? '14px' : '12px',
                fontWeight: 600,
                color: '#5b6b85',
                formatter: () => total.toString(),
              },
            },
          },
        },
      },
      title: {
        text: title || ' ',
        align: 'center',
        show: !!title,
        style: {
          fontFamily: DISPLAY_FONT,
          fontSize: '16px',
          fontWeight: 700,
          color: '#0b2447',
        },
      },
      tooltip: {
        y: {
          formatter: function (val, { seriesIndex }) {
            const count = series[seriesIndex]
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0
            return `${count} Antworten (${percentage}%)`
          },
        },
      },
    }
    
    return { series, options }
  }

  if (loading) {
    return (
      <div className="statistics-container">
        <div className="statistics-loading">
          <p>Statistiken werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="statistics-container">
        <div className="statistics-error">
          <p>{error}</p>
          <button onClick={fetchStatistics} className="retry-button">
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="statistics-container">
        <div className="statistics-error">
          <p>Keine Daten verfügbar</p>
        </div>
      </div>
    )
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0b2447',
          colorLink: '#0b2447',
          colorBorder: '#e4e9f2',
          colorText: '#5b6b85',
          colorTextHeading: '#0b2447',
          fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
          borderRadius: 8,
        },
      }}
    >
      <div className="statistics-container apexcharts-wrapper">
        <div className="statistics-header">
          <h1 className="statistics-title">Ist die Immobilienwirtschaft bereit für AI?</h1>
          <p className="statistics-subtitle">
            Hier der aktuelle Stand unserer Umfrage.
          </p>
        </div>

        <div className="statistics-content">
          <div className="statistics-filters">
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              <div className="filter-group">
                <label>Unternehmensgröße:</label>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Alle"
                  value={filters.companySize}
                  onChange={(values) => handleFilterChange('companySize', values)}
                  allowClear
                  options={[{ value: 'all', label: 'Alle' }, ...companySizeOptions]}
                />
              </div>

              <div className="filter-group">
                <label>Land:</label>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Alle"
                  value={filters.companyCountry}
                  onChange={(values) => handleFilterChange('companyCountry', values)}
                  allowClear
                  options={[{ value: 'all', label: 'Alle' }, ...countryOptions]}
                />
              </div>

              <div className="filter-group">
                <label>Branche:</label>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Alle"
                  value={filters.companyBusiness}
                  onChange={(values) => handleFilterChange('companyBusiness', values)}
                  allowClear
                  options={[{ value: 'all', label: 'Alle' }, ...companyBusinessOptions]}
                />
              </div>
            </Space>
          </div>

          <div className="statistics-meta">
            <span className="statistics-total">
              Gesamt: <strong>{statistics.totalSubmissions}</strong> Einreichungen
            </span>
            {useMockData && (
              <span className="statistics-mock-banner">
                Demo-Daten (Backend nicht erreichbar). Filter haben keine Wirkung.
              </span>
            )}
          </div>

          <div className="charts-grid">
            <div className="chart-card chart-card-large gesamtbewertung-section">
              <h3 className="gesamtbewertung-title">Gesamtbewertung</h3>
              <div className="gesamtbewertung-charts">
                <div className="gesamtbewertung-donut">
                  {(() => {
                    const chartData = createDonutChartOptions('', statistics.overall, true)
                    return (
                      <Chart
                        series={chartData.series}
                        options={chartData.options}
                        type="donut"
                        height={480}
                      />
                    )
                  })()}
                </div>
                <div className="gesamtbewertung-radar">
                  {(() => {
                    const radarData = createRadarChartOptions()
                    return (
                      <Chart
                        series={radarData.series}
                        options={radarData.options}
                        type="radar"
                        height={480}
                      />
                    )
                  })()}
                </div>
              </div>
            </div>

            <div className="chart-card chart-card-stacked-bar apexcharts-wrapper">
              <h3 className="stacked-bar-title">Verteilung nach Dimensionen</h3>
              <div className="apexcharts-wrapper">
                {(() => {
                  const barData = createStackedBarChartOptions()
                  return (
                    <Chart
                      series={barData.series}
                      options={barData.options}
                      type="bar"
                      height={400}
                      width="100%"
                    />
                  )
                })()}
              </div>
            </div>
          </div>

          <div className="statistics-legend">
            <div className="legend-items">
              {['Score 1 - Trifft gar nicht zu', 'Score 2 - Trifft eher nicht zu', 'Score 3 - Neutral', 'Score 4 - Trifft eher zu', 'Score 5 - Trifft voll zu'].map((label, i) => (
                <div key={i} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: chartColors[i] }}></span>
                  <span className="legend-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}

export default Statistics
