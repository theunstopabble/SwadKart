/**
 * Admin Chatbot Analytics Dashboard
 *
 * Displays chatbot usage and performance metrics:
 * - Total conversations (number tile)
 * - Average response time in ms (number tile)
 * - Chat-to-order conversion rate % (number tile)
 * - Intent distribution (bar chart)
 * - Sentiment distribution (bar chart)
 * - Date-range picker (default last 7 days UTC)
 * - Per-metric error indicators with retry controls
 *
 * Requirements: 9.1, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10
 */

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RefreshCw, AlertTriangle, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { BASEURL } from "../../config";

/**
 * Returns an ISO date string (YYYY-MM-DD) for a Date object in UTC.
 */
function toUTCDateString(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Returns the start of today in UTC as a Date.
 */
function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Returns a Date that is `days` days before today in UTC.
 */
function daysAgoUTC(days) {
  const today = todayUTC();
  today.setUTCDate(today.getUTCDate() - days);
  return today;
}

const ChatbotAnalytics = () => {
  // Date range state — default last 7 days
  const [fromDate, setFromDate] = useState(() => toUTCDateString(daysAgoUTC(6)));
  const [toDate, setToDate] = useState(() => toUTCDateString(todayUTC()));
  const [dateError, setDateError] = useState("");

  // Data states
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sectionErrors = { tiles: null, intents: null, sentiment: null };

  /**
   * Validates the date range:
   * - start ≤ end
   * - end ≤ now (UTC)
   * Returns error message or empty string if valid.
   */
  const validateDateRange = useCallback((from, to) => {
    if (!from || !to) return "Please select both start and end dates.";
    const fromD = new Date(from + "T00:00:00Z");
    const toD = new Date(to + "T23:59:59Z");
    const now = new Date();

    if (isNaN(fromD.getTime()) || isNaN(toD.getTime())) {
      return "Invalid date format.";
    }
    if (fromD > toD) {
      return "Start date must be on or before end date.";
    }
    if (new Date(to + "T00:00:00Z") > now) {
      return "End date cannot be in the future.";
    }
    return "";
  }, []);

  /**
   * Fetches analytics data from the backend.
   */
  const fetchAnalytics = useCallback(async () => {
    const validationError = validateDateRange(fromDate, toDate);
    if (validationError) {
      setDateError(validationError);
      return;
    }
    setDateError("");
    setLoading(true);
    setError(null);
    // sectionErrors is static; retry uses global error

    try {
      const fromISO = new Date(fromDate + "T00:00:00Z").toISOString();
      const toISO = new Date(toDate + "T23:59:59Z").toISOString();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${BASEURL}/api/v1/admin/chatbot-analytics?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`,
        {
          credentials: "include",
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError(err.message || "Failed to load analytics.");
      }
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, validateDateRange]);

  // Fetch on mount and when dates change (with validation)
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /**
   * Retry handler for individual sections.
   */
  const handleRetry = () => {
    fetchAnalytics();
  };

  // Prepare chart data
  const intentData = metrics?.intentDistribution || [];
  const sentimentData = metrics?.sentimentDistribution
    ? [
        { bucket: "Negative", count: metrics.sentimentDistribution.negative },
        { bucket: "Neutral", count: metrics.sentimentDistribution.neutral },
        { bucket: "Positive", count: metrics.sentimentDistribution.positive },
      ]
    : [];

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-10 px-4 md:px-10 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold italic uppercase tracking-tighter flex items-center gap-3">
            <span className="bg-primary text-white p-2.5 rounded-xl shadow-lg shadow-primary/25 rotate-1">
              <MessageSquare size={24} />
            </span>
            Chatbot <span className="text-primary">Analytics</span>
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.5em] mt-2 pl-1">
            Usage metrics & performance insights
          </p>
        </header>

        {/* Date Range Picker */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="analytics-from" className="text-xs text-gray-400 font-semibold uppercase">
              From
            </label>
            <input
              id="analytics-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toUTCDateString(new Date())}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="analytics-to" className="text-xs text-gray-400 font-semibold uppercase">
              To
            </label>
            <input
              id="analytics-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              max={toUTCDateString(new Date())}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {dateError && (
            <p className="text-red-400 text-xs font-medium flex items-center gap-1">
              <AlertTriangle size={12} />
              {dateError}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            <span className="ml-3 text-gray-400 text-sm">Loading analytics...</span>
          </div>
        )}

        {/* Global Error State */}
        {!loading && error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
            <AlertTriangle size={32} className="mx-auto text-red-400 mb-3" />
            <p className="text-red-300 text-sm mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {/* Metrics Content */}
        {!loading && !error && metrics && (
          <div className="space-y-6">
            {/* Number Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumberTile
                title="Total Conversations"
                value={metrics.totalConversations}
                icon={<MessageSquare size={20} />}
                error={sectionErrors.tiles}
                onRetry={handleRetry}
              />
              <NumberTile
                title="Avg Response Time"
                value={`${metrics.avgResponseTimeMs} ms`}
                icon={<Clock size={20} />}
                error={sectionErrors.tiles}
                onRetry={handleRetry}
              />
              <NumberTile
                title="Conversion Rate"
                value={`${metrics.conversionRate}%`}
                icon={<TrendingUp size={20} />}
                error={sectionErrors.tiles}
                onRetry={handleRetry}
              />
            </div>

            {/* Intent Distribution Chart */}
            <ChartSection
              title="Intent Distribution"
              error={sectionErrors.intents}
              onRetry={handleRetry}
            >
              {intentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={intentData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#9CA3AF", fontSize: 11 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#F9FAFB",
                      }}
                    />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-sm text-center py-10">No intent data available for this period.</p>
              )}
            </ChartSection>

            {/* Sentiment Distribution Chart */}
            <ChartSection
              title="Sentiment Distribution"
              error={sectionErrors.sentiment}
              onRetry={handleRetry}
            >
              {sentimentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sentimentData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="bucket" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#F9FAFB",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      fill="#10B981"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-sm text-center py-10">No sentiment data available for this period.</p>
              )}
            </ChartSection>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Number tile component for displaying a single metric.
 */
function NumberTile({ title, value, icon, error, onRetry }) {
  if (error) {
    return (
      <div className="bg-gray-900 border border-red-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-semibold uppercase">{title}</span>
          <AlertTriangle size={16} className="text-red-400" />
        </div>
        <p className="text-red-300 text-xs mb-3">{error}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{title}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="text-2xl md:text-3xl font-extrabold text-white">{value}</p>
    </div>
  );
}

/**
 * Chart section wrapper with error/retry support.
 */
function ChartSection({ title, error, onRetry, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">{title}</h2>
        {error && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        )}
      </div>
      {error ? (
        <div className="flex flex-col items-center py-8">
          <AlertTriangle size={24} className="text-red-400 mb-2" />
          <p className="text-red-300 text-xs mb-3">{error}</p>
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default ChatbotAnalytics;
