import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [frauds, setFrauds] = useState([]);
  const [highRiskTransactions, setHighRiskTransactions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState("checking");
  const [activeTab, setActiveTab] = useState("recent");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [amountFilter, setAmountFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    setApiStatus("checking");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const statsRes = await fetch("http://127.0.0.1:8000/stats", { signal: controller.signal });
      if (!statsRes.ok) throw new Error("Backend response error");
      const statsData = await statsRes.json();
      setStats(statsData);

      const [txRes, fraudRes, hrRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/transactions"),
        fetch("http://127.0.0.1:8000/frauds"),
        fetch("http://127.0.0.1:8000/high-risk")
      ]);

      const [txData, fraudData, hrData] = await Promise.all([
        txRes.json(),
        fraudRes.json(),
        hrRes.json()
      ]);

      setTransactions(txData);
      setFrauds(fraudData);
      setHighRiskTransactions(hrData);
      setLastUpdated(new Date());
      setApiStatus("online");
      setLoading(false);
      clearTimeout(timeoutId);
    } catch (error) {
      console.error("Fetch error:", error);
      setApiStatus("offline");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const getFilteredData = () => {
    let baseData = [];
    if (activeTab === "recent") baseData = transactions;
    else if (activeTab === "frauds") baseData = frauds;
    else if (activeTab === "highRisk") baseData = highRiskTransactions;

    return baseData.filter((tx) => {
      const idMatch = searchQuery ? tx.id?.toString() === searchQuery : true;
      
      let amountMatch = true;
      if (amountFilter === "high") {
        amountMatch = tx.Amount > 100;
      } else if (amountFilter === "veryHigh") {
        amountMatch = tx.Amount > 1000;
      }
      
      return idMatch && amountMatch;
    });
  };

  const filteredData = getFilteredData();

  const renderChart = () => {
    const chartData = [...transactions].slice(0, 10).reverse();
    if (chartData.length === 0) {
      return (
        <div className="chart-placeholder">
          <p>No transaction data available for chart</p>
        </div>
      );
    }

    const width = 800;
    const height = 220;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxRisk = 100;
    const pointsCount = chartData.length;

    const points = chartData.map((tx, idx) => {
      const x = paddingLeft + (idx / (pointsCount - 1)) * chartWidth;
      const y = height - paddingBottom - ((tx.risk_score || 0) / maxRisk) * chartHeight;
      return { x, y, tx };
    });

    let d = "";
    if (points.length > 0) {
      d = `M ${points[0].x} ${points[0].y} `;
      for (let i = 1; i < points.length; i++) {
        d += `L ${points[i].x} ${points[i].y} `;
      }
    }

    let dArea = "";
    if (points.length > 0) {
      dArea = `${d} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    }

    return (
      <div className="chart-wrapper">
        <div className="chart-header-row">
          <h4>Risk Score Timeline (Recent Transactions)</h4>
          {hoveredPoint && (
            <div className="chart-tooltip">
              <span>TX #{hoveredPoint.tx.id}</span>
              <span>Amount: ${hoveredPoint.tx.Amount?.toFixed(2)}</span>
              <span className="tooltip-risk">Risk: {hoveredPoint.tx.risk_score?.toFixed(2)}%</span>
            </div>
          )}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="analytics-svg">
          <defs>
            <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cyan-glow)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--purple-glow)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--cyan-glow)" />
              <stop offset="100%" stopColor="var(--purple-glow)" />
            </linearGradient>
          </defs>

          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="rgba(255,255,255,0.05)" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="rgba(255,255,255,0.05)" />
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="rgba(255,255,255,0.1)" />

          <text x={paddingLeft - 10} y={paddingTop + 4} textAnchor="end" className="chart-axis-label">100%</text>
          <text x={paddingLeft - 10} y={paddingTop + chartHeight / 2 + 4} textAnchor="end" className="chart-axis-label">50%</text>
          <text x={paddingLeft - 10} y={height - paddingBottom + 4} textAnchor="end" className="chart-axis-label">0%</text>

          {points.map((pt, idx) => (
            <text key={idx} x={pt.x} y={height - 10} textAnchor="middle" className="chart-axis-label">
              TX #{pt.tx.id}
            </text>
          ))}

          {dArea && <path d={dArea} fill="url(#chart-area-grad)" />}

          {d && <path d={d} fill="none" stroke="url(#chart-line-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint && hoveredPoint.tx.id === pt.tx.id ? "7" : "4"}
              fill={pt.tx.prediction === 1 ? "var(--red-glow)" : "var(--cyan-glow)"}
              stroke="var(--bg-glass)"
              strokeWidth="2"
              className="chart-circle"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={() => setSelectedTransaction(pt.tx)}
            />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="logo-glow"></div>
          <div className="brand-titles">
            <h1>VERITAS</h1>
            <h2>Real-Time Fraud Detection Platform</h2>
          </div>
        </div>

        <div className="controls-section">
          {lastUpdated && (
            <span className="last-updated-text">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className={`status-badge-pulsing ${apiStatus}`}>
            <span className="pulse-dot"></span>
            <span className="status-text">
              {apiStatus === "checking" && "Checking API..."}
              {apiStatus === "online" && "System Online"}
              {apiStatus === "offline" && "System Offline"}
            </span>
          </div>
          <button className="btn-refresh" onClick={fetchData} disabled={apiStatus === "checking"}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {apiStatus === "offline" && !stats ? (
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h3>Connection Error</h3>
          <p>Failed to connect to the Veritas API server. Please ensure the backend FastAPI service is running locally on port 8000.</p>
          <button className="btn-retry" onClick={fetchData}>
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          <section className="stats-grid">
            {loading || !stats ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="stat-card skeleton-card">
                  <div className="skeleton-title"></div>
                  <div className="skeleton-value"></div>
                </div>
              ))
            ) : (
              <>
                <div className="stat-card">
                  <div className="stat-icon-bg tx">📊</div>
                  <h4>Total Transactions</h4>
                  <p>{stats.total_transactions?.toLocaleString() ?? 0}</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-bg fraud">🛡️</div>
                  <h4>Total Frauds</h4>
                  <p className="text-fraud">{stats.total_frauds?.toLocaleString() ?? 0}</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-bg rate">📉</div>
                  <h4>Fraud Rate</h4>
                  <p>{stats.fraud_rate?.toFixed(3) ?? "0.000"}%</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-bg risk">⚡</div>
                  <h4>Average Risk Score</h4>
                  <p>{stats.average_risk_score?.toFixed(2) ?? "0.00"}</p>
                </div>
              </>
            )}
          </section>

          <section className="analytics-section glass-card">
            {loading ? (
              <div className="chart-skeleton">
                <div className="skeleton-chart-line"></div>
              </div>
            ) : (
              renderChart()
            )}
          </section>

          <section className="explorer-section glass-card">
            <div className="explorer-header">
              <div className="tabs-container">
                <button className={`tab-btn ${activeTab === "recent" ? "active" : ""}`} onClick={() => setActiveTab("recent")}>
                  Recent Logs
                </button>
                <button className={`tab-btn ${activeTab === "highRisk" ? "active" : ""}`} onClick={() => setActiveTab("highRisk")}>
                  High-Risk Alerts
                </button>
                <button className={`tab-btn ${activeTab === "frauds" ? "active" : ""}`} onClick={() => setActiveTab("frauds")}>
                  Confirmed Frauds
                </button>
              </div>

              <div className="toolbar-container">
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    placeholder="Search Transaction ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-field"
                  />
                  {searchQuery && (
                    <button className="clear-search" onClick={() => setSearchQuery("")}>
                      &times;
                    </button>
                  )}
                </div>

                <div className="select-wrapper">
                  <select value={amountFilter} onChange={(e) => setAmountFilter(e.target.value)} className="select-field">
                    <option value="all">All Amounts</option>
                    <option value="high">Amount &gt; $100</option>
                    <option value="veryHigh">Amount &gt; $1000</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="table-container">
              {loading ? (
                <div className="table-skeleton-container">
                  <div className="skeleton-row header"></div>
                  {Array(5).fill(0).map((_, idx) => (
                    <div key={idx} className="skeleton-row"></div>
                  ))}
                </div>
              ) : filteredData.length === 0 ? (
                <div className="empty-state">
                  <p>No matching transactions found</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Time / Timestamp</th>
                      <th>Amount</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(0, 15).map((transaction) => (
                      <tr key={transaction.id} onClick={() => setSelectedTransaction(transaction)} className="interactive-row">
                        <td className="tx-id">#{transaction.id}</td>
                        <td className="tx-time">
                          {transaction.transaction_timestamp
                            ? new Date(transaction.transaction_timestamp).toLocaleString()
                            : `Time step ${transaction.Time}`}
                        </td>
                        <td className="tx-amount">${(transaction.Amount ?? 0).toFixed(2)}</td>
                        <td>
                          <div className="risk-score-badge-wrapper">
                            <span className="risk-score-value">{(transaction.risk_score ?? 0).toFixed(2)}</span>
                            <div className="risk-bar-container">
                              <div
                                className={`risk-bar ${transaction.risk_score > 70 ? "high" : transaction.risk_score > 40 ? "medium" : "low"}`}
                                style={{ width: `${transaction.risk_score ?? 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${transaction.prediction === 1 ? "fraud" : "legitimate"}`}>
                            {transaction.prediction === 1 ? "Fraud" : "Legitimate"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="table-footer">
              <p>Showing {Math.min(filteredData.length, 15)} of {filteredData.length} records</p>
            </div>
          </section>
        </>
      )}

      {selectedTransaction && (
        <div className="modal-backdrop" onClick={() => setSelectedTransaction(null)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Investigation Details</h3>
              <button className="modal-close" onClick={() => setSelectedTransaction(null)}>
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <div className="modal-summary-grid">
                <div className="summary-item">
                  <span className="label">Transaction ID</span>
                  <span className="value">#{selectedTransaction.id}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Timestamp</span>
                  <span className="value">
                    {selectedTransaction.transaction_timestamp
                      ? new Date(selectedTransaction.transaction_timestamp).toLocaleString()
                      : `Time step ${selectedTransaction.Time}`}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Amount</span>
                  <span className="value text-amount">${(selectedTransaction.Amount ?? 0).toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Risk Assessment</span>
                  <span className={`value text-risk ${selectedTransaction.risk_score > 50 ? "danger" : "safe"}`}>
                    {(selectedTransaction.risk_score ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">System Verdict</span>
                  <span className={`status-badge ${selectedTransaction.prediction === 1 ? "fraud" : "legitimate"}`}>
                    {selectedTransaction.prediction === 1 ? "Fraud Detected" : "Legitimate"}
                  </span>
                </div>
              </div>

              <div className="features-section">
                <h4>Anonymized Features (V1 - V28)</h4>
                <p className="section-note">Anonymized principal components representing PCA-transformed transaction metrics.</p>
                <div className="features-grid">
                  {Array(28).fill(0).map((_, idx) => {
                    const featureKey = `V${idx + 1}`;
                    const val = selectedTransaction[featureKey];
                    const valFormatted = typeof val === "number" ? val.toFixed(4) : "N/A";
                    const isDeviant = typeof val === "number" && Math.abs(val) > 2.0;

                    return (
                      <div key={featureKey} className={`feature-badge ${isDeviant ? "deviant" : ""}`}>
                        <span className="f-name">{featureKey}</span>
                        <span className="f-val" title={valFormatted}>{valFormatted}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-close-modal" onClick={() => setSelectedTransaction(null)}>
                Close Investigation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

