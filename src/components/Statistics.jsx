import { useState, useEffect } from 'react'
import Chart from 'react-apexcharts'
import { Select, Space, ConfigProvider } from 'antd'
import { dimensions } from '../data/questions'
import { apiBaseUrl } from '../config/configuration'
import './Statistics.css'

function Statistics() {
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
    } catch (err) {
      console.error('Error fetching statistics:', err)
      setError('Fehler beim Laden der Statistiken')
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

  // Define CI color with shades from light to dark
  const chartColors = [
    '#e6f2f5', // Very light (Score 1)
    '#b8d9e3', // Light (Score 2)
    '#8bc0d1', // Medium (Score 3)
    '#5a9fb2', // Base color (Score 4)
    '#3d6f7d'  // Dark (Score 5)
  ]

  const createDonutChartOptions = (title, counts, isOverall = false) => {
    const labels = ['1', '2', '3', '4', '5']
    const series = labels.map(label => counts[label] || 0)
    const total = series.reduce((sum, val) => sum + val, 0)

    const options = {
      chart: {
        type: 'donut',
        fontFamily: 'Helvetica, Arial, sans-serif',
        toolbar: { show: false },
        animations: { enabled: true },
      },
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
          colors: ['#ffffff'],
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
                color: '#2c3e50',
              },
              value: {
                show: true,
                fontSize: isOverall ? '20px' : '16px',
                fontWeight: 700,
                color: '#5a9fb2',
                formatter: (val) => total > 0 ? Math.round(val) : '0',
              },
              total: {
                show: true,
                label: 'Total',
                fontSize: isOverall ? '14px' : '12px',
                fontWeight: 600,
                color: '#6c757d',
                formatter: () => total.toString(),
              },
            },
          },
        },
      },
      title: {
        text: title,
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: 600,
          color: '#2c3e50',
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

  const dimensionTitles = {}
  dimensions.forEach(dim => {
    dimensionTitles[dim.id.toString()] = dim.title
  })

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#5a9fb2',
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
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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
          </div>

          <div className="charts-grid">
            <div className="chart-card chart-card-large">
              {(() => {
                const chartData = createDonutChartOptions('Gesamtbewertung', statistics.overall, true)
                return (
                  <Chart
                    series={chartData.series}
                    options={chartData.options}
                    type="donut"
                    height={240}
                  />
                )
              })()}
            </div>

            {Object.keys(statistics.dimensions).map((dimId) => {
              const dim = statistics.dimensions[dimId]
              const title = dimensionTitles[dimId] || dim.title || `Dimension ${dimId}`
              const chartData = createDonutChartOptions(title, dim.counts, false)
              return (
                <div key={dimId} className="chart-card chart-card-small">
                  <Chart
                    series={chartData.series}
                    options={chartData.options}
                    type="donut"
                    height={180}
                  />
                </div>
              )
            })}
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
