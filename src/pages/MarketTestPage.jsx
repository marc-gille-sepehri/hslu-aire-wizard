import { useState } from 'react'
import Chart from 'react-apexcharts'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  marketGeocode,
  marketSnapshot,
  marketListOfferings,
  marketPriceTrend,
} from '../api/marketMcpApi'
import './MarketTestPage.css'

const { Title, Paragraph, Text } = Typography

const chf = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 })
const fmtChf = (n) => (typeof n === 'number' ? chf.format(n) : '–')

const EXAMPLES = [
  { label: 'Zürich (prime)', address: 'Bahnhofstrasse 1, 8001 Zürich' },
  { label: 'Bern (urban)', address: 'Bundesplatz 3, 3011 Bern' },
  { label: 'Glarus (rural)', address: 'Hauptstrasse 1, 8750 Glarus' },
  { label: 'Lugano (Koordinaten)', lat: 46.0037, lon: 8.9511 },
]

const tierColor = { prime: 'magenta', urban: 'blue', suburban: 'green', rural: 'gold' }

function ResultCard({ title, error, children }) {
  return (
    <Card title={title} className="market-result-card" size="small">
      {error ? <Alert type="error" showIcon message={error} /> : children}
    </Card>
  )
}

function MarketTestPage() {
  // Shared location input.
  const [address, setAddress] = useState('Bahnhofstrasse 1, 8001 Zürich')
  const [lat, setLat] = useState(null)
  const [lon, setLon] = useState(null)
  const [propertyType, setPropertyType] = useState('any')

  // Per-tool params.
  const [transaction, setTransaction] = useState('any')
  const [minRooms, setMinRooms] = useState(null)
  const [maxPriceChf, setMaxPriceChf] = useState(null)
  const [limit, setLimit] = useState(10)
  const [metric, setMetric] = useState('sale')
  const [months, setMonths] = useState(24)

  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState(null)
  const [geo, setGeo] = useState(null)
  const [snap, setSnap] = useState(null)
  const [offers, setOffers] = useState(null)
  const [trend, setTrend] = useState(null)

  const buildLocationArgs = () => {
    if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon }
    if (address && address.trim().length >= 3) return { address: address.trim() }
    return null
  }

  const applyExample = (ex) => {
    if (ex.address) {
      setAddress(ex.address)
      setLat(null)
      setLon(null)
    } else {
      setAddress('')
      setLat(ex.lat)
      setLon(ex.lon)
    }
  }

  const settle = (promise) =>
    promise.then(
      (data) => ({ data }),
      (err) => ({ error: err.message || String(err) }),
    )

  const run = async () => {
    const loc = buildLocationArgs()
    if (!loc) {
      setGlobalError('Bitte eine Adresse (≥3 Zeichen) ODER Breiten- und Längengrad angeben.')
      return
    }
    setGlobalError(null)
    setLoading(true)
    const offeringsArgs = {
      ...loc,
      transaction,
      propertyType,
      ...(typeof minRooms === 'number' ? { minRooms } : {}),
      ...(typeof maxPriceChf === 'number' ? { maxPriceChf } : {}),
      limit,
    }
    const [g, s, o, t] = await Promise.all([
      settle(marketGeocode(loc)),
      settle(marketSnapshot({ ...loc, propertyType })),
      settle(marketListOfferings(offeringsArgs)),
      settle(marketPriceTrend({ ...loc, metric, months })),
    ])
    setGeo(g)
    setSnap(s)
    setOffers(o)
    setTrend(t)
    setLoading(false)
  }

  const disclaimer =
    snap?.data?.disclaimer || geo?.data?.disclaimer || trend?.data?.disclaimer

  const offeringColumns = [
    { title: 'Typ', dataIndex: 'propertyType', key: 'propertyType' },
    {
      title: 'Geschäft',
      dataIndex: 'transaction',
      key: 'transaction',
      render: (v) => (v === 'buy' ? 'Kauf' : 'Miete'),
    },
    { title: 'Zimmer', dataIndex: 'rooms', key: 'rooms' },
    { title: 'Fläche m²', dataIndex: 'livingAreaM2', key: 'livingAreaM2' },
    {
      title: 'Preis / Miete',
      key: 'price',
      render: (_, r) =>
        r.transaction === 'buy'
          ? `CHF ${fmtChf(r.priceChf)}`
          : `CHF ${fmtChf(r.rentChfPerMonth)}/Mt.`,
    },
    {
      title: 'CHF/m²',
      dataIndex: 'pricePerM2',
      key: 'pricePerM2',
      render: (v) => fmtChf(v),
    },
    { title: 'Distanz m', dataIndex: 'distanceM', key: 'distanceM' },
    { title: 'Inseriert (Tage)', dataIndex: 'listedDaysAgo', key: 'listedDaysAgo' },
  ]

  const trendData = trend?.data
  const trendChart = trendData
    ? {
        series: [
          {
            name: trendData.metric === 'sale' ? 'CHF/m²' : 'CHF/m²/Monat',
            data: trendData.points.map((p) => p.valueChfPerM2),
          },
        ],
        options: {
          chart: { id: 'price-trend', toolbar: { show: false }, fontFamily: 'inherit' },
          colors: ['#1677ff'],
          stroke: { curve: 'smooth', width: 2 },
          dataLabels: { enabled: false },
          xaxis: {
            categories: trendData.points.map((p) => p.month),
            tickAmount: 8,
          },
          yaxis: { labels: { formatter: (v) => fmtChf(v) } },
          tooltip: { y: { formatter: (v) => `CHF ${fmtChf(v)}` } },
          grid: { borderColor: '#eee' },
        },
      }
    : null

  return (
    <section className="market-test-section">
      <div className="container">
        <Title level={2}>Marktdaten (synthetisch)</Title>
        <Paragraph type="secondary">
          Testoberfläche für den <Text code>ch-market</Text> MCP-Server. Alle Werte sind
          deterministisch erzeugte Dummy-Daten – sie spiegeln keine realen Marktverhältnisse
          wider und dienen ausschliesslich dem Testen der Tool-Anbindung.
        </Paragraph>

        {disclaimer && (
          <Alert
            className="market-disclaimer"
            type="warning"
            showIcon
            message={disclaimer}
          />
        )}

        <Card title="Standort & Parameter" className="market-controls">
          <Form layout="vertical">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Adresse" help="Adresse ODER Koordinaten angeben.">
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="z. B. Bahnhofstrasse 1, 8001 Zürich"
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item label="Breitengrad (lat)">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={lat}
                    onChange={setLat}
                    step={0.001}
                    placeholder="47.3769"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item label="Längengrad (lon)">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={lon}
                    onChange={setLon}
                    step={0.001}
                    placeholder="8.5417"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item label="Objekttyp">
                  <Select
                    value={propertyType}
                    onChange={setPropertyType}
                    options={[
                      { value: 'any', label: 'Alle' },
                      { value: 'apartment', label: 'Wohnung' },
                      { value: 'house', label: 'Haus' },
                      { value: 'commercial', label: 'Gewerbe' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={12} md={4}>
                <Form.Item label="Geschäft (Angebote)">
                  <Select
                    value={transaction}
                    onChange={setTransaction}
                    options={[
                      { value: 'any', label: 'Alle' },
                      { value: 'buy', label: 'Kauf' },
                      { value: 'rent', label: 'Miete' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item label="Min. Zimmer">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={minRooms}
                    onChange={setMinRooms}
                    min={1}
                    max={12}
                    step={0.5}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item label="Max. Preis CHF">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={maxPriceChf}
                    onChange={setMaxPriceChf}
                    min={1}
                    step={100000}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item label="Anzahl Angebote">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={limit}
                    onChange={setLimit}
                    min={1}
                    max={50}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item label="Trend-Metrik">
                  <Select
                    value={metric}
                    onChange={setMetric}
                    options={[
                      { value: 'sale', label: 'Kaufpreis' },
                      { value: 'rent', label: 'Miete' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item label="Trend-Monate">
                  <InputNumber
                    style={{ width: '100%' }}
                    value={months}
                    onChange={setMonths}
                    min={6}
                    max={60}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Space wrap>
              <Button type="primary" onClick={run} loading={loading}>
                Abfragen
              </Button>
              <Text type="secondary">Beispiele:</Text>
              {EXAMPLES.map((ex) => (
                <Button key={ex.label} size="small" onClick={() => applyExample(ex)}>
                  {ex.label}
                </Button>
              ))}
            </Space>
          </Form>
        </Card>

        {globalError && (
          <Alert
            type="error"
            showIcon
            message={globalError}
            style={{ marginTop: 16 }}
          />
        )}

        {(geo || snap || offers || trend) && (
          <>
            <Divider />
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <ResultCard title="market_geocode" error={geo?.error}>
                  {geo?.data && (
                    <Space direction="vertical" size="small">
                      <Space wrap>
                        <Text strong>
                          {geo.data.municipality} ({geo.data.canton})
                        </Text>
                        <Tag color={tierColor[geo.data.tier]}>{geo.data.tier}</Tag>
                        <Text type="secondary">BFS {geo.data.bfsId}</Text>
                      </Space>
                      <Text>
                        Koordinaten: {geo.data.lat}, {geo.data.lon} · Distanz zur Referenz:{' '}
                        {fmtChf(geo.data.matchDistanceM)} m
                      </Text>
                    </Space>
                  )}
                </ResultCard>
              </Col>

              <Col xs={24} lg={12}>
                <ResultCard title="market_get_snapshot" error={snap?.error}>
                  {snap?.data && (
                    <Row gutter={[12, 12]}>
                      <Col span={12}>
                        <Statistic
                          title="Miete ⌀ (CHF/m²/Mt.)"
                          value={snap.data.rent.meanChfPerM2Month}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Kaufpreis ⌀ (CHF/m²)"
                          value={snap.data.sale.meanChfPerM2}
                          formatter={(v) => fmtChf(v)}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic title="Bruttorendite %" value={snap.data.grossYieldPct} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="Leerstand %" value={snap.data.vacancyRatePct} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="YoY %" value={snap.data.yoyTrendPct} />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Vermarktung (Tage)"
                          value={snap.data.daysOnMarketMedian}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic title="Stichprobe" value={snap.data.sampleSize} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="Konfidenz" value={snap.data.confidence} />
                      </Col>
                    </Row>
                  )}
                </ResultCard>
              </Col>

              <Col xs={24}>
                <ResultCard
                  title={`market_list_offerings${
                    offers?.data ? ` · ${offers.data.count} Treffer` : ''
                  }`}
                  error={offers?.error}
                >
                  {offers?.data && (
                    <Table
                      size="small"
                      rowKey="id"
                      dataSource={offers.data.listings}
                      columns={offeringColumns}
                      pagination={false}
                      scroll={{ x: true }}
                    />
                  )}
                </ResultCard>
              </Col>

              <Col xs={24}>
                <ResultCard title="market_get_price_trend" error={trend?.error}>
                  {trendData && trendChart && (
                    <>
                      <Space wrap size="large" style={{ marginBottom: 8 }}>
                        <Statistic
                          title="Start"
                          value={trendData.startValue}
                          formatter={(v) => `CHF ${fmtChf(v)}`}
                        />
                        <Statistic
                          title="Ende"
                          value={trendData.endValue}
                          formatter={(v) => `CHF ${fmtChf(v)}`}
                        />
                        <Statistic title="CAGR %" value={trendData.cagrPct} />
                      </Space>
                      <Chart
                        options={trendChart.options}
                        series={trendChart.series}
                        type="line"
                        height={320}
                      />
                    </>
                  )}
                </ResultCard>
              </Col>
            </Row>
          </>
        )}
      </div>
    </section>
  )
}

export default MarketTestPage
